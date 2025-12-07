/**
 * Asteroid Entity - Custom Vertex Data Approach
 * WebGPU-compatible implementation using custom vertex data
 */

import {
  Mesh,
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
  subdivisions: 32, // Reduced for performance (32x32 = 1024 quads = 2048 triangles)
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
  startPosition: { x: 80, y: 120, z: -150 }, // Far distance (closer for better visibility)
  endPosition: { x: 0, y: 2, z: 8 }, // Near camera/ground impact point

  // Rotation properties
  rotationSpeed: { x: 0.3, y: 0.5, z: 0.2 }, // Radians per second
  precessionSpeed: 0.1,
};

/**
 * Create procedural asteroid mesh using custom vertex data
 * This approach is WebGPU-compatible as it builds vertex data before mesh creation
 */
export function createAsteroid(scene, seed = 0) {
  const config = ASTEROID_CONFIG;

  // Generate custom vertex data with displacement
  const vertexData = createDisplacedSphereData(config.radius, config.subdivisions, seed);

  // Create mesh from custom vertex data
  const asteroid = new Mesh('asteroid', scene);
  vertexData.applyToMesh(asteroid);

  // Create material with heat/emissive capability
  const material = createAsteroidMaterial(scene);
  asteroid.material = material;

  // Set initial position (far away)
  asteroid.position = new Vector3(
    config.startPosition.x,
    config.startPosition.y,
    config.startPosition.z
  );

  console.log('✓ Asteroid mesh created with custom vertex data (WebGPU-compatible)');

  return {
    mesh: asteroid,
    material: material,
  };
}

/**
 * Create displaced sphere vertex data from scratch
 * WebGPU-compatible: builds all data before GPU upload
 */
function createDisplacedSphereData(radius, subdivisions, seed) {
  const config = ASTEROID_CONFIG;
  const positions = [];
  const indices = [];
  const normals = [];
  const uvs = [];

  // Generate UV sphere with displacement
  for (let lat = 0; lat <= subdivisions; lat++) {
    const theta = (lat * Math.PI) / subdivisions;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= subdivisions; lon++) {
      const phi = (lon * 2 * Math.PI) / subdivisions;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      // Base sphere position (normalized)
      const nx = cosPhi * sinTheta;
      const ny = cosTheta;
      const nz = sinPhi * sinTheta;

      // Sample noise for displacement
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

      // Calculate displacement (0.5-1.5 range)
      const displacement = 0.5 + noiseValue;
      const displacedRadius = radius + displacement * config.displacementScale;

      // Final vertex position
      positions.push(
        nx * displacedRadius,
        ny * displacedRadius,
        nz * displacedRadius
      );

      // UVs
      uvs.push(lon / subdivisions, 1 - lat / subdivisions);

      // Normals (will be recalculated for accuracy)
      normals.push(nx, ny, nz);
    }
  }

  // Generate indices
  for (let lat = 0; lat < subdivisions; lat++) {
    for (let lon = 0; lon < subdivisions; lon++) {
      const first = lat * (subdivisions + 1) + lon;
      const second = first + subdivisions + 1;

      // Two triangles per quad
      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  // Create VertexData object
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.uvs = uvs;

  // Compute accurate normals based on displaced geometry
  const computedNormals = [];
  VertexData.ComputeNormals(positions, indices, computedNormals);
  vertexData.normals = computedNormals;

  console.log(`✓ Generated displaced sphere: ${positions.length / 3} vertices, ${indices.length / 3} triangles`);

  return vertexData;
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

  // Base emissive for visibility even when far away
  const baseEmissive = 0.1;

  // Heating starts at threshold and increases to impact
  let heatIntensity = baseEmissive;

  if (T >= config.heatThreshold) {
    // Normalize to [0, 1] range after threshold
    const normalizedHeat = (T - config.heatThreshold) / (1.0 - config.heatThreshold);

    // Use quadratic curve for rapid heating near impact
    heatIntensity = baseEmissive + normalizedHeat * normalizedHeat;
  }

  // Apply emissive color (orange-red glow)
  material.emissiveColor = new Color3(
    config.heatColor.r * heatIntensity * config.maxEmissive,
    config.heatColor.g * heatIntensity * config.maxEmissive,
    config.heatColor.b * heatIntensity * config.maxEmissive
  );
}
