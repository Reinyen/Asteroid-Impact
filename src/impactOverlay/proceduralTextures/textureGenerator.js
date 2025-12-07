/**
 * Procedural Texture Generator
 * Creates textures from raw arrays using Babylon RawTexture
 */

import { RawTexture } from 'https://esm.sh/@babylonjs/core@7';
import { fbm } from './noise.js';

/**
 * Generate a procedural normal map
 * @param {Scene} scene - Babylon scene
 * @param {number} size - Texture size (power of 2)
 * @param {Object} options - Generation options
 * @returns {RawTexture} Normal map texture
 */
export function generateNormalMap(scene, size = 512, options = {}) {
  const {
    octaves = 4,
    persistence = 0.5,
    scale = 8.0,
    strength = 1.0,
    seed = 0,
  } = options;

  const data = new Uint8Array(size * size * 4); // RGBA

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;

      // Sample height at center and neighbors for normal calculation
      const offset = 1.0 / size;
      const hC = fbm(nx, ny, octaves, persistence, scale, seed);
      const hL = fbm(nx - offset, ny, octaves, persistence, scale, seed);
      const hR = fbm(nx + offset, ny, octaves, persistence, scale, seed);
      const hT = fbm(nx, ny - offset, octaves, persistence, scale, seed);
      const hB = fbm(nx, ny + offset, octaves, persistence, scale, seed);

      // Calculate gradients
      const dX = (hR - hL) * strength;
      const dY = (hB - hT) * strength;

      // Compute normal (OpenGL convention: +Y is up)
      const normal = {
        x: -dX,
        y: -dY,
        z: 1.0,
      };

      // Normalize
      const len = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
      normal.x /= len;
      normal.y /= len;
      normal.z /= len;

      // Convert to RGB (map from [-1,1] to [0,255])
      const idx = (y * size + x) * 4;
      data[idx + 0] = Math.floor((normal.x * 0.5 + 0.5) * 255); // R
      data[idx + 1] = Math.floor((normal.y * 0.5 + 0.5) * 255); // G
      data[idx + 2] = Math.floor((normal.z * 0.5 + 0.5) * 255); // B
      data[idx + 3] = 255; // A
    }
  }

  const texture = RawTexture.CreateRGBATexture(
    data,
    size,
    size,
    scene,
    false, // generateMipMaps
    false, // invertY
    RawTexture.TRILINEAR_SAMPLINGMODE
  );

  texture.name = 'proceduralNormalMap';
  console.log(`✓ Generated procedural normal map (${size}x${size})`);

  return texture;
}

/**
 * Generate a procedural roughness map
 * @param {Scene} scene - Babylon scene
 * @param {number} size - Texture size (power of 2)
 * @param {Object} options - Generation options
 * @returns {RawTexture} Roughness map texture
 */
export function generateRoughnessMap(scene, size = 512, options = {}) {
  const {
    octaves = 3,
    persistence = 0.4,
    scale = 4.0,
    baseRoughness = 0.7,
    variation = 0.3,
    seed = 1,
  } = options;

  const data = new Uint8Array(size * size * 4); // RGBA (roughness in R channel)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;

      // Generate noise-based variation
      const noiseValue = fbm(nx, ny, octaves, persistence, scale, seed);
      const roughness = baseRoughness + (noiseValue - 0.5) * variation;

      // Clamp to valid range
      const clampedRoughness = Math.max(0, Math.min(1, roughness));
      const byteValue = Math.floor(clampedRoughness * 255);

      const idx = (y * size + x) * 4;
      data[idx + 0] = byteValue; // R (roughness)
      data[idx + 1] = byteValue; // G
      data[idx + 2] = byteValue; // B
      data[idx + 3] = 255; // A
    }
  }

  const texture = RawTexture.CreateRGBATexture(
    data,
    size,
    size,
    scene,
    false, // generateMipMaps
    false, // invertY
    RawTexture.TRILINEAR_SAMPLINGMODE
  );

  texture.name = 'proceduralRoughnessMap';
  console.log(`✓ Generated procedural roughness map (${size}x${size})`);

  return texture;
}

/**
 * Generate a procedural ambient occlusion map
 * @param {Scene} scene - Babylon scene
 * @param {number} size - Texture size (power of 2)
 * @param {Object} options - Generation options
 * @returns {RawTexture} AO map texture
 */
export function generateAOMap(scene, size = 512, options = {}) {
  const {
    octaves = 2,
    persistence = 0.5,
    scale = 2.0,
    intensity = 0.5,
    seed = 2,
  } = options;

  const data = new Uint8Array(size * size * 4); // RGBA

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;

      // Generate AO (darker in crevices)
      const noiseValue = fbm(nx, ny, octaves, persistence, scale, seed);
      const ao = 1.0 - (1.0 - noiseValue) * intensity;

      const byteValue = Math.floor(ao * 255);

      const idx = (y * size + x) * 4;
      data[idx + 0] = byteValue; // R
      data[idx + 1] = byteValue; // G
      data[idx + 2] = byteValue; // B
      data[idx + 3] = 255; // A
    }
  }

  const texture = RawTexture.CreateRGBATexture(
    data,
    size,
    size,
    scene,
    false,
    false,
    RawTexture.TRILINEAR_SAMPLINGMODE
  );

  texture.name = 'proceduralAOMap';
  console.log(`✓ Generated procedural AO map (${size}x${size})`);

  return texture;
}
