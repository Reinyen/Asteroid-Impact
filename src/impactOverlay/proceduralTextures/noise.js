/**
 * Procedural Noise Generation
 * Perlin-like noise for texture generation (no image assets)
 */

/**
 * Simple hash function for pseudo-random values
 */
function hash(x, y, seed = 0) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43758.5453) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Smooth interpolation (smoothstep)
 */
function smoothstep(t) {
  return t * t * (3.0 - 2.0 * t);
}

/**
 * Linear interpolation
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * 2D Perlin-like noise (simplified version)
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} seed - Random seed
 * @returns {number} Noise value in range [0, 1]
 */
export function noise2D(x, y, seed = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  // Get noise values at grid corners
  const n00 = hash(xi, yi, seed);
  const n10 = hash(xi + 1, yi, seed);
  const n01 = hash(xi, yi + 1, seed);
  const n11 = hash(xi + 1, yi + 1, seed);

  // Smooth interpolation
  const sx = smoothstep(xf);
  const sy = smoothstep(yf);

  // Bilinear interpolation
  const nx0 = lerp(n00, n10, sx);
  const nx1 = lerp(n01, n11, sx);
  return lerp(nx0, nx1, sy);
}

/**
 * Fractal Brownian Motion (fBm) - layered noise
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} octaves - Number of noise layers
 * @param {number} persistence - Amplitude decrease per octave
 * @param {number} scale - Overall scale
 * @param {number} seed - Random seed
 * @returns {number} Noise value in range [0, 1]
 */
export function fbm(x, y, octaves = 4, persistence = 0.5, scale = 1.0, seed = 0) {
  let value = 0.0;
  let amplitude = 1.0;
  let frequency = 1.0;
  let maxValue = 0.0;

  for (let i = 0; i < octaves; i++) {
    value += noise2D(x * frequency * scale, y * frequency * scale, seed + i) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= 2.0;
  }

  // Normalize to [0, 1]
  return value / maxValue;
}

/**
 * Radial falloff/gradient
 * @param {number} x - X coordinate (0 to 1)
 * @param {number} y - Y coordinate (0 to 1)
 * @param {number} centerX - Center X (0 to 1)
 * @param {number} centerY - Center Y (0 to 1)
 * @param {number} radius - Falloff radius
 * @param {number} smoothness - Edge smoothness
 * @returns {number} Falloff value in range [0, 1]
 */
export function radialFalloff(x, y, centerX = 0.5, centerY = 0.5, radius = 0.5, smoothness = 0.1) {
  const dx = x - centerX;
  const dy = y - centerY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const t = Math.max(0, Math.min(1, (radius - dist) / smoothness));
  return smoothstep(t);
}
