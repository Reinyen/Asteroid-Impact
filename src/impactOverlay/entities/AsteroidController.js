/**
 * AsteroidController.js
 * Task 8: Complete asteroid approach + atmospheric entry heating module
 *
 * Features:
 * - Procedural icosphere mesh with deterministic displacement
 * - Physically-believable cubic Bézier trajectory
 * - Kinematics calculation (position, velocity, speed, altitude)
 * - Heat ramp driven by speed + altitude (not timeline T)
 * - Atmospheric plasma sheath with procedural shader
 * - Seeded rotation and precession
 * - Distance-based LOD system
 * - Acceptance checks for physical correctness
 */

import {
  Mesh,
  Vector3,
  VertexData,
  StandardMaterial,
  ShaderMaterial,
  Color3,
  Color4,
  Effect,
} from 'https://esm.sh/@babylonjs/core@7';
import { fbm } from '../proceduralTextures/noise.js';
import { SeededRNG } from '../../utils/rng.js';

/**
 * Default asteroid configuration
 * All values use real-world scale (meters, m/s, etc.)
 */
const DEFAULT_CONFIG = {
  // Mesh configuration
  mesh: {
    radiusMeters: 30,           // Asteroid radius in meters
    subdivisions: 32,           // UV sphere subdivisions (32x32 = ~2048 tris)
    uvScale: 1.0,               // UV coordinate scale for texturing
    displacementScale: 3.5,     // Maximum displacement amplitude (meters)
    displacementOctaves: 5,     // Multi-octave noise detail
    microPittingScale: 0.3,     // Small-scale surface detail
    microPittingOctaves: 3,     // High-frequency detail octaves
  },

  // Trajectory configuration (cubic Bézier control points in world space)
  // Optimized for dramatic visible descent: starts on-screen, descends to camera in ~4 seconds
  trajectory: {
    p0: { x: 0, y: 120, z: -30 },     // Start high and visible (centered, far but on-screen)
    p1: { x: -15, y: 80, z: -5 },     // Arc left, descending
    p2: { x: 10, y: 30, z: 10 },      // Arc right, close approach
    p3: { x: 0, y: 5, z: 18 },        // Impact near camera center (just in front)
  },

  // Material configuration
  material: {
    baseColor: { r: 0.25, g: 0.22, b: 0.20 },  // Dark rocky color
    specularPower: 10,
    roughness: 0.85,
  },

  // Heat/emissive configuration
  heat: {
    heatColor: { r: 1.0, g: 0.5, b: 0.15 },    // Orange-red glow
    emissiveMin: 0.0,
    emissiveMax: 3.5,             // Increased for more dramatic glow
    speedThresholdMin: 5.0,       // m/s - heating starts (lowered for shorter trajectory)
    speedThresholdMax: 80.0,      // m/s - max heating (lowered for visible range)
    altitudeThresholdMax: 120.0,  // meters - above this, no heating (matches start height)
    altitudeThresholdMin: 10.0,   // meters - below this, max heating contribution
  },

  // Plasma sheath configuration
  plasma: {
    enabled: true,
    inflationFactor: 1.15,        // Scale plasma mesh 15% larger than asteroid
    heatThreshold: 0.15,          // heat01 threshold to show plasma (lowered for earlier appearance)
    baseColor: { r: 0.8, g: 0.4, b: 1.0 },  // Purple-ish plasma
    fresnelPower: 3.0,
    turbulenceScale: 2.0,
    turbulenceSpeed: 1.5,
    bloomContribution: 2.0,       // Brightness multiplier for bloom
  },

  // Rotation configuration
  rotation: {
    primaryAxis: { x: 0.3, y: 0.5, z: 0.2 },  // rad/sec angular velocity
    precessionAxis: { x: 0.1, y: 0.0, z: 0.08 }, // rad/sec precession
    precessionPeriod: 10.0,       // seconds for one precession cycle
  },

  // LOD configuration
  lod: {
    farDistance: 300,             // meters - simplified rendering
    midDistance: 100,             // meters - full quality
    nearDistance: 50,             // meters - max detail
  },

  // Quality scale multiplier
  qualityScale: 1.0,              // Global quality knob [0, 1+]

  // Seed for deterministic randomness
  seed: 12345,
};

/**
 * Create an AsteroidController instance
 *
 * @param {Scene} scene - Babylon.js scene
 * @param {Camera} camera - Active camera for kinematics calculations
 * @param {Object} cfg - Configuration object (merged with defaults)
 * @returns {AsteroidController} Controller instance
 */
export function createAsteroidController(scene, camera, cfg = {}) {
  // Merge configuration with defaults
  const config = mergeDeep(DEFAULT_CONFIG, cfg);

  // Create RNG from seed
  const rng = new SeededRNG(config.seed);

  // Create asteroid mesh with procedural displacement
  const asteroidMesh = createAsteroidMesh(scene, config, rng);

  // Create plasma sheath (if enabled)
  const plasmaMesh = config.plasma.enabled
    ? createPlasmaSheath(scene, asteroidMesh, config, rng)
    : null;

  // Create material
  const material = createAsteroidMaterial(scene, config);
  asteroidMesh.material = material;

  // Ensure asteroid is visible
  asteroidMesh.isVisible = true;
  asteroidMesh.visibility = 1.0;

  console.log('[AsteroidController] Created asteroid at initial position:', {
    position: asteroidMesh.position,
    radius: config.mesh.radiusMeters,
    isVisible: asteroidMesh.isVisible,
  });

  // Initialize kinematics state
  const kinematics = {
    positionWS: Vector3.Zero(),
    velocityWS: Vector3.Zero(),
    speed: 0,
    heat01: 0,
    altitude01: 0,
    distanceToCamera: 0,
    prevPositionWS: Vector3.Zero(),
    prevTime: 0,
  };

  // Initialize rotation state (seeded)
  const rotationState = initializeRotation(config, rng);

  // Set initial position at trajectory start (p0)
  const p0 = new Vector3(
    config.trajectory.p0.x,
    config.trajectory.p0.y,
    config.trajectory.p0.z
  );
  asteroidMesh.position.copyFrom(p0);
  kinematics.positionWS.copyFrom(p0);
  kinematics.prevPositionWS.copyFrom(p0);

  // Acceptance checks state
  const checks = {
    enabled: true, // Enable dev-only assertions
    prevDistance: Infinity,
    prevSpeed: 0,
    frameCount: 0,
  };

  // Return controller instance with API
  return {
    // Public update method
    update(dtMs, tSec) {
      updateController(
        asteroidMesh,
        plasmaMesh,
        material,
        camera,
        config,
        kinematics,
        rotationState,
        checks,
        dtMs,
        tSec
      );
    },

    // Public getter for kinematics data
    getKinematics() {
      return {
        positionWS: kinematics.positionWS.clone(),
        velocityWS: kinematics.velocityWS.clone(),
        speed: kinematics.speed,
        heat01: kinematics.heat01,
        altitude01: kinematics.altitude01,
        distanceToCamera: kinematics.distanceToCamera,
      };
    },

    // Expose meshes for debugging/integration
    getMesh() {
      return asteroidMesh;
    },

    getPlasmaMesh() {
      return plasmaMesh;
    },

    // Dispose resources
    dispose() {
      asteroidMesh.dispose();
      if (plasmaMesh) plasmaMesh.dispose();
      material.dispose();
    },
  };
}

/**
 * Main update loop for AsteroidController
 */
function updateController(
  asteroidMesh,
  plasmaMesh,
  material,
  camera,
  config,
  kinematics,
  rotationState,
  checks,
  dtMs,
  tSec
) {
  const dtSec = dtMs / 1000.0;

  // 1. Update position along Bézier trajectory
  const u = Math.min(tSec, 1.0); // Clamp to [0, 1]
  const newPosition = evaluateCubicBezier(
    config.trajectory.p0,
    config.trajectory.p1,
    config.trajectory.p2,
    config.trajectory.p3,
    u
  );

  asteroidMesh.position.copyFrom(newPosition);

  // 2. Calculate kinematics (velocity, speed, altitude)
  updateKinematics(kinematics, newPosition, dtSec, camera);

  // 3. Update rotation and precession
  updateRotation(asteroidMesh, rotationState, dtSec, config);

  // 4. Calculate heat based on speed and altitude (not T)
  const heat01 = calculateHeat(kinematics.speed, kinematics.altitude01, config);
  kinematics.heat01 = heat01;

  // 5. Update material emissive
  updateMaterialEmissive(material, heat01, config);

  // 6. Update plasma sheath
  if (plasmaMesh) {
    updatePlasmaSheath(plasmaMesh, asteroidMesh, heat01, tSec, config);
  }

  // 7. Update LOD (distance-based quality)
  updateLOD(asteroidMesh, plasmaMesh, kinematics.distanceToCamera, config);

  // 8. Run acceptance checks (dev assertions)
  if (checks.enabled) {
    runAcceptanceChecks(checks, kinematics, u);
  }

  // Debug: Log first few frames
  if (checks.frameCount < 5 || checks.frameCount % 120 === 0) {
    console.log(`[AsteroidController] Frame ${checks.frameCount}: u=${u.toFixed(3)} pos=(${asteroidMesh.position.x.toFixed(1)}, ${asteroidMesh.position.y.toFixed(1)}, ${asteroidMesh.position.z.toFixed(1)}) speed=${kinematics.speed.toFixed(1)} heat=${heat01.toFixed(3)}`);
  }

  checks.frameCount++;
}

/**
 * Create asteroid mesh with procedural icosphere + displacement
 */
function createAsteroidMesh(scene, config, rng) {
  const meshCfg = config.mesh;

  // Generate displaced sphere vertex data
  const vertexData = createDisplacedIcosphere(
    meshCfg.radiusMeters,
    meshCfg.subdivisions,
    meshCfg.displacementScale,
    meshCfg.displacementOctaves,
    meshCfg.microPittingScale,
    meshCfg.microPittingOctaves,
    config.seed
  );

  // Create mesh and apply vertex data
  const mesh = new Mesh('asteroid', scene);
  vertexData.applyToMesh(mesh);

  console.log('✓ Asteroid icosphere created:', {
    vertices: vertexData.positions.length / 3,
    triangles: vertexData.indices.length / 3,
    radius: meshCfg.radiusMeters,
  });

  return mesh;
}

/**
 * Create displaced icosphere vertex data
 * Uses UV sphere generation with multi-octave noise displacement
 */
function createDisplacedIcosphere(
  radius,
  subdivisions,
  displacementScale,
  octaves,
  microScale,
  microOctaves,
  seed
) {
  const positions = [];
  const indices = [];
  const uvs = [];

  // Generate UV sphere
  for (let lat = 0; lat <= subdivisions; lat++) {
    const theta = (lat * Math.PI) / subdivisions;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= subdivisions; lon++) {
      const phi = (lon * 2 * Math.PI) / subdivisions;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      // Base sphere normal (unit vector)
      const nx = cosPhi * sinTheta;
      const ny = cosTheta;
      const nz = sinPhi * sinTheta;

      // Primary displacement (large features)
      const noise1 = fbm(
        nx * 2.0,
        ny * 2.0,
        octaves,
        0.5,
        3.0,
        seed
      );

      const noise2 = fbm(
        nz * 2.0,
        nx * 2.0,
        octaves - 1,
        0.4,
        2.0,
        seed + 1
      );

      // Micro-pitting (small details for specular breakup)
      const microNoise = fbm(
        nx * 8.0,
        ny * 8.0,
        microOctaves,
        0.6,
        5.0,
        seed + 2
      );

      // Combine noise: primary + secondary + micro
      const totalDisplacement =
        (0.5 + noise1) * displacementScale +
        noise2 * 0.5 * displacementScale +
        microNoise * microScale;

      const displacedRadius = radius + totalDisplacement;

      // Final vertex position
      positions.push(
        nx * displacedRadius,
        ny * displacedRadius,
        nz * displacedRadius
      );

      // UVs
      uvs.push(lon / subdivisions, 1 - lat / subdivisions);
    }
  }

  // Generate indices (two triangles per quad)
  for (let lat = 0; lat < subdivisions; lat++) {
    for (let lon = 0; lon < subdivisions; lon++) {
      const first = lat * (subdivisions + 1) + lon;
      const second = first + subdivisions + 1;

      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  // Compute normals based on displaced geometry
  const normals = [];
  VertexData.ComputeNormals(positions, indices, normals);

  // Create VertexData
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = normals;
  vertexData.uvs = uvs;

  return vertexData;
}

/**
 * Create asteroid material with emissive capability
 */
function createAsteroidMaterial(scene, config) {
  const material = new StandardMaterial('asteroidMaterial', scene);

  material.diffuseColor = new Color3(
    config.material.baseColor.r,
    config.material.baseColor.g,
    config.material.baseColor.b
  );

  material.specularColor = new Color3(0.1, 0.1, 0.1);
  material.specularPower = config.material.specularPower;
  material.emissiveColor = new Color3(0, 0, 0); // Start with no glow

  return material;
}

/**
 * Evaluate cubic Bézier curve at parameter u ∈ [0, 1]
 * B(u) = (1-u)³P₀ + 3(1-u)²u P₁ + 3(1-u)u² P₂ + u³ P₃
 */
function evaluateCubicBezier(p0, p1, p2, p3, u) {
  const u2 = u * u;
  const u3 = u2 * u;
  const oneMinusU = 1 - u;
  const oneMinusU2 = oneMinusU * oneMinusU;
  const oneMinusU3 = oneMinusU2 * oneMinusU;

  const x =
    oneMinusU3 * p0.x +
    3 * oneMinusU2 * u * p1.x +
    3 * oneMinusU * u2 * p2.x +
    u3 * p3.x;

  const y =
    oneMinusU3 * p0.y +
    3 * oneMinusU2 * u * p1.y +
    3 * oneMinusU * u2 * p2.y +
    u3 * p3.y;

  const z =
    oneMinusU3 * p0.z +
    3 * oneMinusU2 * u * p1.z +
    3 * oneMinusU * u2 * p2.z +
    u3 * p3.z;

  return new Vector3(x, y, z);
}

/**
 * Update kinematics: velocity, speed, altitude, camera distance
 */
function updateKinematics(kinematics, newPosition, dtSec, camera) {
  // Store previous position
  kinematics.prevPositionWS.copyFrom(kinematics.positionWS);
  kinematics.positionWS.copyFrom(newPosition);

  // Calculate velocity (finite difference)
  if (dtSec > 0) {
    const delta = kinematics.positionWS.subtract(kinematics.prevPositionWS);
    kinematics.velocityWS.copyFrom(delta.scale(1.0 / dtSec));
    kinematics.speed = kinematics.velocityWS.length();
  }

  // Calculate altitude (Y above ground plane at Y=0)
  const altitude = Math.max(0, newPosition.y);
  kinematics.altitude01 = altitude; // Keep as raw meters for now

  // Calculate distance to camera
  kinematics.distanceToCamera = Vector3.Distance(newPosition, camera.position);
}

/**
 * Calculate heat01 based on speed and altitude (physics-driven, not timeline T)
 */
function calculateHeat(speed, altitude, config) {
  const heatCfg = config.heat;

  // Speed contribution: smoothstep from speedMin to speedMax
  const speedFactor = smoothstep(
    heatCfg.speedThresholdMin,
    heatCfg.speedThresholdMax,
    speed
  );

  // Altitude contribution: inverse smoothstep (lower altitude = more heat)
  const altitudeFactor = 1.0 - smoothstep(
    heatCfg.altitudeThresholdMin,
    heatCfg.altitudeThresholdMax,
    altitude
  );

  // Combine: primary is speed, altitude modulates
  const heat01 = speedFactor * 0.7 + altitudeFactor * 0.3;

  return clamp(heat01, 0, 1);
}

/**
 * Update material emissive color based on heat01
 */
function updateMaterialEmissive(material, heat01, config) {
  const heatCfg = config.heat;

  const intensity = lerp(heatCfg.emissiveMin, heatCfg.emissiveMax, heat01);

  material.emissiveColor = new Color3(
    heatCfg.heatColor.r * intensity,
    heatCfg.heatColor.g * intensity,
    heatCfg.heatColor.b * intensity
  );
}

/**
 * Initialize seeded rotation state
 */
function initializeRotation(config, rng) {
  // Use RNG to vary initial orientation
  const initialRotation = new Vector3(
    rng.next() * Math.PI * 2,
    rng.next() * Math.PI * 2,
    rng.next() * Math.PI * 2
  );

  return {
    rotation: initialRotation,
    precessionPhase: rng.next() * Math.PI * 2,
  };
}

/**
 * Update rotation with constant angular velocity + precession
 */
function updateRotation(mesh, rotationState, dtSec, config) {
  const rotCfg = config.rotation;

  // Primary rotation (constant tumble)
  rotationState.rotation.x += rotCfg.primaryAxis.x * dtSec;
  rotationState.rotation.y += rotCfg.primaryAxis.y * dtSec;
  rotationState.rotation.z += rotCfg.primaryAxis.z * dtSec;

  // Precession (slow wobble)
  rotationState.precessionPhase += (2 * Math.PI / rotCfg.precessionPeriod) * dtSec;

  const precessionX = Math.sin(rotationState.precessionPhase) * rotCfg.precessionAxis.x * dtSec;
  const precessionZ = Math.cos(rotationState.precessionPhase * 1.3) * rotCfg.precessionAxis.z * dtSec;

  // Apply to mesh
  mesh.rotation.x = rotationState.rotation.x + precessionX;
  mesh.rotation.y = rotationState.rotation.y;
  mesh.rotation.z = rotationState.rotation.z + precessionZ;
}

/**
 * Create plasma sheath mesh (inflated clone + shader)
 */
function createPlasmaSheath(scene, asteroidMesh, config, rng) {
  const plasmaCfg = config.plasma;

  // Clone asteroid geometry and inflate
  const plasmaMesh = asteroidMesh.clone('plasmaSheath');
  plasmaMesh.scaling = new Vector3(
    plasmaCfg.inflationFactor,
    plasmaCfg.inflationFactor,
    plasmaCfg.inflationFactor
  );

  // Create plasma shader material
  const plasmaShader = createPlasmaShaderMaterial(scene, config);
  plasmaMesh.material = plasmaShader;

  // Initially invisible (heat01 = 0)
  plasmaMesh.visibility = 0;

  return plasmaMesh;
}

/**
 * Create plasma shader material (GLSL, converted to WGSL by Babylon)
 */
function createPlasmaShaderMaterial(scene, config) {
  const plasmaCfg = config.plasma;

  // Register shader code
  Effect.ShadersStore['plasmaVertexShader'] = `
    precision highp float;

    // Attributes
    attribute vec3 position;
    attribute vec3 normal;

    // Uniforms
    uniform mat4 worldViewProjection;
    uniform mat4 world;
    uniform vec3 cameraPosition;

    // Varyings
    varying vec3 vNormalWS;
    varying vec3 vPositionWS;
    varying vec3 vViewDir;

    void main() {
      vec4 worldPos = world * vec4(position, 1.0);
      vPositionWS = worldPos.xyz;
      vNormalWS = normalize((world * vec4(normal, 0.0)).xyz);
      vViewDir = normalize(cameraPosition - worldPos.xyz);

      gl_Position = worldViewProjection * vec4(position, 1.0);
    }
  `;

  Effect.ShadersStore['plasmaFragmentShader'] = `
    precision highp float;

    // Varyings
    varying vec3 vNormalWS;
    varying vec3 vPositionWS;
    varying vec3 vViewDir;

    // Uniforms
    uniform vec3 baseColor;
    uniform float heat01;
    uniform float time;
    uniform float fresnelPower;
    uniform float turbulenceScale;
    uniform float turbulenceSpeed;
    uniform float bloomContribution;

    // Simple 3D noise function (Perlin-like)
    float hash(vec3 p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }

    float noise3D(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);

      return mix(
        mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
            mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
            mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
        f.z
      );
    }

    void main() {
      // Fresnel effect (rim lighting)
      float fresnel = pow(1.0 - max(dot(vViewDir, vNormalWS), 0.0), fresnelPower);

      // Turbulent noise distortion
      vec3 noiseCoord = vPositionWS * turbulenceScale + vec3(0.0, time * turbulenceSpeed, 0.0);
      float turbulence = noise3D(noiseCoord);

      // Combine effects
      float intensity = fresnel * heat01 * (0.5 + 0.5 * turbulence);

      // Color ramp (blue -> purple -> orange as heat increases)
      vec3 color = mix(
        baseColor,
        vec3(1.0, 0.6, 0.2),
        heat01 * 0.5
      );

      // Boost for bloom
      vec3 finalColor = color * intensity * bloomContribution;
      float alpha = intensity * heat01;

      gl_FragColor = vec4(finalColor, alpha);
    }
  `;

  // Create shader material
  const shaderMaterial = new ShaderMaterial('plasmaShader', scene, {
    vertex: 'plasma',
    fragment: 'plasma',
  }, {
    attributes: ['position', 'normal'],
    uniforms: [
      'worldViewProjection', 'world', 'cameraPosition',
      'baseColor', 'heat01', 'time',
      'fresnelPower', 'turbulenceScale', 'turbulenceSpeed', 'bloomContribution'
    ],
  });

  // Set initial uniform values
  shaderMaterial.setVector3('baseColor', new Vector3(
    plasmaCfg.baseColor.r,
    plasmaCfg.baseColor.g,
    plasmaCfg.baseColor.b
  ));
  shaderMaterial.setFloat('heat01', 0);
  shaderMaterial.setFloat('time', 0);
  shaderMaterial.setFloat('fresnelPower', plasmaCfg.fresnelPower);
  shaderMaterial.setFloat('turbulenceScale', plasmaCfg.turbulenceScale);
  shaderMaterial.setFloat('turbulenceSpeed', plasmaCfg.turbulenceSpeed);
  shaderMaterial.setFloat('bloomContribution', plasmaCfg.bloomContribution);

  // Enable transparency (alpha blending)
  shaderMaterial.alphaMode = 2; // BABYLON.Engine.ALPHA_ADD or use additive blending
  shaderMaterial.backFaceCulling = false;
  shaderMaterial.needAlphaBlending = () => true;

  return shaderMaterial;
}

/**
 * Update plasma sheath visibility and shader uniforms
 */
function updatePlasmaSheath(plasmaMesh, asteroidMesh, heat01, tSec, config) {
  const plasmaCfg = config.plasma;

  // Position plasma at asteroid position
  plasmaMesh.position.copyFrom(asteroidMesh.position);
  plasmaMesh.rotation.copyFrom(asteroidMesh.rotation);

  // Show plasma only above heat threshold
  if (heat01 >= plasmaCfg.heatThreshold) {
    const visibilityFactor = (heat01 - plasmaCfg.heatThreshold) / (1.0 - plasmaCfg.heatThreshold);
    plasmaMesh.visibility = Math.min(visibilityFactor, 1.0);

    // Update shader uniforms
    const material = plasmaMesh.material;
    if (material.setFloat) {
      material.setFloat('heat01', heat01);
      material.setFloat('time', tSec);
    }
  } else {
    plasmaMesh.visibility = 0;
  }
}

/**
 * Update LOD based on distance to camera
 */
function updateLOD(asteroidMesh, plasmaMesh, distance, config) {
  const lodCfg = config.lod;
  const quality = config.qualityScale;

  // Far: simplified (could reduce subdivisions, disable plasma, etc.)
  if (distance > lodCfg.farDistance) {
    // Future: switch to simplified mesh
    if (plasmaMesh) plasmaMesh.isVisible = false;
  }
  // Mid: full quality
  else if (distance > lodCfg.midDistance) {
    if (plasmaMesh) plasmaMesh.isVisible = true;
  }
  // Near: max detail (could enable extra debris, etc.)
  else {
    if (plasmaMesh) plasmaMesh.isVisible = true;
  }
}

/**
 * Run acceptance checks (dev-only assertions)
 */
function runAcceptanceChecks(checks, kinematics, u) {
  const frame = checks.frameCount;

  // Check 1: Distance to camera strictly decreases
  if (frame > 0 && kinematics.distanceToCamera > checks.prevDistance + 0.1) {
    console.warn(`[Acceptance Check] Distance increased! Frame ${frame}: ${kinematics.distanceToCamera.toFixed(2)} > ${checks.prevDistance.toFixed(2)}`);
  }

  // Check 2: Speed increases smoothly (no sudden spikes)
  if (frame > 0) {
    const speedDelta = Math.abs(kinematics.speed - checks.prevSpeed);
    const maxAllowedDelta = 50.0; // m/s per frame (adjust based on timestep)

    if (speedDelta > maxAllowedDelta) {
      console.warn(`[Acceptance Check] Speed spike! Frame ${frame}: Δspeed = ${speedDelta.toFixed(2)} m/s`);
    }
  }

  // Check 3: heat01 is ~0 at start, ~1 near impact
  if (u < 0.1 && kinematics.heat01 > 0.1) {
    console.warn(`[Acceptance Check] Heat too high at start: heat01=${kinematics.heat01.toFixed(3)} at u=${u.toFixed(3)}`);
  }

  if (u > 0.9 && kinematics.heat01 < 0.5) {
    console.warn(`[Acceptance Check] Heat too low near impact: heat01=${kinematics.heat01.toFixed(3)} at u=${u.toFixed(3)}`);
  }

  // Log every 60 frames for debugging
  if (frame % 60 === 0 && u > 0) {
    console.log(`[Kinematics] u=${u.toFixed(3)} dist=${kinematics.distanceToCamera.toFixed(1)}m speed=${kinematics.speed.toFixed(1)}m/s heat=${kinematics.heat01.toFixed(3)}`);
  }

  // Update state for next frame
  checks.prevDistance = kinematics.distanceToCamera;
  checks.prevSpeed = kinematics.speed;
}

// ============================================================================
// Utility functions
// ============================================================================

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp(x, min, max) {
  return Math.max(min, Math.min(max, x));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mergeDeep(target, source) {
  const output = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = mergeDeep(target[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }

  return output;
}
