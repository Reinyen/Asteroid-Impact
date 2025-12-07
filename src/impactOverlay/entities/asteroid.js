/**
 * Asteroid Entity
 * Procedurally generated asteroid with atmospheric entry heating
 */

import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  VertexData,
} from 'https://esm.sh/@babylonjs/core@7';
import { fbm } from '../proceduralTextures/noise.js';

/**
 * Asteroid configuration
 */
export const ASTEROID_CONFIG = {
  // Base mesh properties
  radius: 30,
  subdivisions: 4, // Icosphere detail level (4 = ~2560 triangles)
  displacementScale: 3.5,
  displacementOctaves: 5,

  // Material properties
  baseColor: { r: 0.25, g: 0.22, b: 0.20 }, // Dark rocky color
  specularPower: 10,

  // Heat/emissive properties
  heatColor: { r: 1.0, g: 0.4, b: 0.1 }, // Orange-red glow
  maxEmissive: 2.5, // Peak emissive intensity
  heatThreshold: 0.4, // Timeline T when heating starts (40%)

  // Trajectory properties
  startPosition: { x: 150, y: 180, z: -300 }, // Far distance
  endPosition: { x: 0, y: 2, z: 8 }, // Near camera/ground impact point

  // Rotation properties
  rotationSpeed: { x: 0.3, y: 0.5, z: 0.2 }, // Radians per second
  precessionSpeed: 0.1,
};

/**
 * Create procedural asteroid mesh with displacement
 */
export function createAsteroid(scene, seed = 0) {
  const config = ASTEROID_CONFIG;

  // Create icosphere base mesh
  const sphere = MeshBuilder.CreateSphere(
    'asteroid',
    {
      diameter: config.radius * 2,
      segments: Math.pow(2, config.subdivisions),
      updatable: true, // Required to modify vertex data
    },
    scene
  );

  // Apply procedural displacement to vertices
  applyDisplacement(sphere, seed);

  // Create material with heat/emissive capability
  const material = createAsteroidMaterial(scene);
  sphere.material = material;

  // Set initial position (far away)
  sphere.position = new Vector3(
    config.startPosition.x,
    config.startPosition.y,
    config.startPosition.z
  );

  console.log('✓ Asteroid mesh created with procedural displacement');

  return {
    mesh: sphere,
    material: material,
  };
}

/**
 * Apply procedural displacement to mesh vertices
 */
function applyDisplacement(mesh, seed) {
  const config = ASTEROID_CONFIG;
  const positions = mesh.getVerticesData(VertexData.PositionKind);

  if (!positions) {
    console.error('Failed to get vertex positions for displacement');
    return;
  }

  // Displace each vertex along its normal
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];

    // Normalize to get direction
    const length = Math.sqrt(x * x + y * y + z * z);
    const nx = x / length;
    const ny = y / length;
    const nz = z / length;

    // Sample 3D noise using spherical coordinates
    // Use position on unit sphere as texture coordinate
    const noiseValue = fbm(
      nx * 2.0,
      ny * 2.0,
      config.displacementOctaves,
      0.5,
      3.0,
      seed
    ) + fbm(
      nz * 2.0,
      nx * 2.0,
      config.displacementOctaves - 1,
      0.4,
      2.0,
      seed + 1
    ) * 0.5;

    // Scale displacement (0.5-1.5 range)
    const displacement = 0.5 + noiseValue;
    const displacementAmount = displacement * config.displacementScale;

    // Apply displacement along normal
    positions[i] = nx * (length + displacementAmount);
    positions[i + 1] = ny * (length + displacementAmount);
    positions[i + 2] = nz * (length + displacementAmount);
  }

  // Update mesh with displaced vertices
  mesh.updateVerticesData(VertexData.PositionKind, positions);

  // Recalculate normals for proper lighting
  const normals = [];
  VertexData.ComputeNormals(positions, mesh.getIndices(), normals);
  mesh.updateVerticesData(VertexData.NormalKind, normals);

  console.log('✓ Applied procedural displacement to asteroid vertices');
}

/**
 * Create asteroid material with emissive heating capability
 */
function createAsteroidMaterial(scene) {
  const config = ASTEROID_CONFIG;

  const material = new StandardMaterial('asteroidMaterial', scene);

  // Base diffuse color (dark rock)
  material.diffuseColor = new Color3(
    config.baseColor.r,
    config.baseColor.g,
    config.baseColor.b
  );

  // Specular highlights (minimal for rough rock)
  material.specularColor = new Color3(0.1, 0.1, 0.1);
  material.specularPower = config.specularPower;

  // Emissive starts at zero (no glow initially)
  material.emissiveColor = new Color3(0, 0, 0);

  console.log('✓ Asteroid material created');

  return material;
}

/**
 * Update asteroid position, rotation, and heating based on timeline
 * @param {Object} asteroid - Asteroid object from createAsteroid
 * @param {number} T - Normalized timeline [0, 1]
 * @param {number} deltaTime - Time since last update (seconds)
 * @param {number} seed - Random seed for variation
 */
export function updateAsteroid(asteroid, T, deltaTime, seed = 0) {
  const config = ASTEROID_CONFIG;
  const { mesh, material } = asteroid;

  // 1. Update position along trajectory curve
  updatePosition(mesh, T);

  // 2. Update rotation with precession
  updateRotation(mesh, deltaTime, seed);

  // 3. Update heating/emissive based on velocity and altitude
  updateHeating(material, T);
}

/**
 * Update asteroid position along approach curve
 */
function updatePosition(mesh, T) {
  const config = ASTEROID_CONFIG;
  const start = config.startPosition;
  const end = config.endPosition;

  // Use easing curve for more dramatic acceleration near end
  // Cubic ease-in: t^3
  const easedT = T * T * T;

  // Interpolate position
  mesh.position.x = start.x + (end.x - start.x) * easedT;
  mesh.position.y = start.y + (end.y - start.y) * easedT;
  mesh.position.z = start.z + (end.z - start.z) * easedT;
}

/**
 * Update asteroid rotation with tumbling and precession
 */
function updateRotation(mesh, deltaTime, seed) {
  const config = ASTEROID_CONFIG;

  // Primary rotation (tumbling)
  mesh.rotation.x += config.rotationSpeed.x * deltaTime;
  mesh.rotation.y += config.rotationSpeed.y * deltaTime;
  mesh.rotation.z += config.rotationSpeed.z * deltaTime;

  // Add slight precession wobble
  const precessionPhase = performance.now() * 0.001 * config.precessionSpeed;
  mesh.rotation.x += Math.sin(precessionPhase) * 0.01;
  mesh.rotation.z += Math.cos(precessionPhase * 1.3) * 0.01;
}

/**
 * Update heating/emissive color based on atmospheric entry
 */
function updateHeating(material, T) {
  const config = ASTEROID_CONFIG;

  // Heating starts at threshold and increases to impact
  let heatIntensity = 0;

  if (T >= config.heatThreshold) {
    // Normalize to [0, 1] range after threshold
    const normalizedHeat = (T - config.heatThreshold) / (1.0 - config.heatThreshold);

    // Use quadratic curve for rapid heating near impact
    heatIntensity = normalizedHeat * normalizedHeat;
  }

  // Apply emissive color (orange-red glow)
  material.emissiveColor = new Color3(
    config.heatColor.r * heatIntensity * config.maxEmissive,
    config.heatColor.g * heatIntensity * config.maxEmissive,
    config.heatColor.b * heatIntensity * config.maxEmissive
  );
}
