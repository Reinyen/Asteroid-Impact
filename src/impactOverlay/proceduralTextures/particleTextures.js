/**
 * Procedural Particle Textures
 * Generate textures for fire, smoke, and debris particles
 */

import { RawTexture } from 'https://esm.sh/@babylonjs/core@7';
import { fbm } from './noise.js';

/**
 * Generate a procedural fire/plasma particle texture
 * Radial gradient with noise for organic appearance
 * @param {Scene} scene - Babylon scene
 * @param {number} size - Texture size (power of 2)
 * @param {Object} options - Generation options
 * @returns {RawTexture} Fire particle texture
 */
export function generateFireTexture(scene, size = 128, options = {}) {
  const {
    seed = 0,
    coreIntensity = 1.0,
    edgeSoftness = 0.3,
  } = options;

  const data = new Uint8Array(size * size * 4); // RGBA

  const center = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - center) / center;
      const dy = (y - center) / center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Radial falloff
      let alpha = 1.0 - dist;

      // Add noise for organic shape
      const noise = fbm(x / size * 4, y / size * 4, 3, 0.5, 4.0, seed);
      alpha = alpha * (0.7 + noise * 0.3);

      // Soft edge falloff
      alpha = Math.pow(Math.max(0, alpha), 1.0 / edgeSoftness);

      // Core is brighter (for bloom)
      const brightness = Math.max(0, 1.0 - dist * 0.8) * coreIntensity;

      const idx = (y * size + x) * 4;
      data[idx + 0] = 255; // R (full red for fire)
      data[idx + 1] = Math.floor(brightness * 200); // G (some orange)
      data[idx + 2] = Math.floor(brightness * 100); // B (less blue)
      data[idx + 3] = Math.floor(Math.max(0, Math.min(1, alpha)) * 255); // A
    }
  }

  const texture = RawTexture.CreateRGBATexture(
    data,
    size,
    size,
    scene,
    true, // generateMipMaps
    false, // invertY
    RawTexture.BILINEAR_SAMPLINGMODE
  );

  texture.name = 'fireParticleTexture';
  texture.hasAlpha = true;

  console.log(`✓ Generated fire particle texture (${size}x${size})`);
  return texture;
}

/**
 * Generate a procedural smoke particle texture
 * Softer, more diffuse appearance than fire
 * @param {Scene} scene - Babylon scene
 * @param {number} size - Texture size (power of 2)
 * @param {Object} options - Generation options
 * @returns {RawTexture} Smoke particle texture
 */
export function generateSmokeTexture(scene, size = 128, options = {}) {
  const {
    seed = 1,
    density = 0.6,
    turbulence = 0.4,
  } = options;

  const data = new Uint8Array(size * size * 4); // RGBA

  const center = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - center) / center;
      const dy = (y - center) / center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Soft radial falloff
      let alpha = 1.0 - Math.pow(dist, 1.5);

      // Heavy noise for turbulent smoke appearance
      const noise1 = fbm(x / size * 3, y / size * 3, 4, 0.6, 3.0, seed);
      const noise2 = fbm(x / size * 5, y / size * 5, 3, 0.5, 5.0, seed + 10);
      alpha = alpha * (0.5 + noise1 * 0.3 + noise2 * 0.2);

      // Apply density and turbulence
      alpha = alpha * density + (noise2 - 0.5) * turbulence;

      // Very soft edge
      alpha = Math.pow(Math.max(0, alpha), 2.0);

      // Smoke is grayscale (will be tinted in particle system)
      const gray = Math.floor(alpha * 180); // Darker smoke

      const idx = (y * size + x) * 4;
      data[idx + 0] = gray; // R
      data[idx + 1] = gray; // G
      data[idx + 2] = gray; // B
      data[idx + 3] = Math.floor(Math.max(0, Math.min(1, alpha)) * 255); // A
    }
  }

  const texture = RawTexture.CreateRGBATexture(
    data,
    size,
    size,
    scene,
    true, // generateMipMaps
    false, // invertY
    RawTexture.BILINEAR_SAMPLINGMODE
  );

  texture.name = 'smokeParticleTexture';
  texture.hasAlpha = true;

  console.log(`✓ Generated smoke particle texture (${size}x${size})`);
  return texture;
}

/**
 * Generate a procedural spark/debris particle texture
 * Sharp, bright core for sparks and ablated material
 * @param {Scene} scene - Babylon scene
 * @param {number} size - Texture size (power of 2)
 * @param {Object} options - Generation options
 * @returns {RawTexture} Spark particle texture
 */
export function generateSparkTexture(scene, size = 64, options = {}) {
  const {
    seed = 2,
    sharpness = 4.0,
  } = options;

  const data = new Uint8Array(size * size * 4); // RGBA

  const center = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - center) / center;
      const dy = (y - center) / center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Very sharp falloff for point-like sparks
      let alpha = 1.0 - dist;
      alpha = Math.pow(Math.max(0, alpha), sharpness);

      // Bright core
      const brightness = Math.pow(Math.max(0, 1.0 - dist), 2.0);

      const idx = (y * size + x) * 4;
      data[idx + 0] = 255; // R (bright)
      data[idx + 1] = Math.floor(brightness * 255); // G
      data[idx + 2] = Math.floor(brightness * 150); // B (orange-white)
      data[idx + 3] = Math.floor(alpha * 255); // A
    }
  }

  const texture = RawTexture.CreateRGBATexture(
    data,
    size,
    size,
    scene,
    true, // generateMipMaps
    false, // invertY
    RawTexture.BILINEAR_SAMPLINGMODE
  );

  texture.name = 'sparkParticleTexture';
  texture.hasAlpha = true;

  console.log(`✓ Generated spark particle texture (${size}x${size})`);
  return texture;
}
