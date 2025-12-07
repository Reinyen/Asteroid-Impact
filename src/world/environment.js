/**
 * Environment module - Night sky, ground, and lighting
 */

import {
  AmbientLight,
  BufferGeometry,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  FogExp2,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Scene,
} from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

import { SeededRNG } from '../utils/rng.js';
import { SCENE_CONFIG } from '../config/presets.js';

/**
 * Create procedural starfield
 */
function createStarfield(rng, starCount) {
  const positions = [];
  const sizes = [];
  const colors = [];

  for (let i = 0; i < starCount; i++) {
    // Spherical distribution covering full sky dome
    const radius = rng.range(100, 500);
    const theta = rng.range(0, Math.PI * 2);
    const phi = rng.range(0, Math.PI * 0.7); // Cover more of the sky

    const x = radius * Math.cos(theta) * Math.sin(phi);
    const y = Math.abs(radius * Math.cos(phi)) + 5; // Keep above horizon
    const z = radius * Math.sin(theta) * Math.sin(phi);

    positions.push(x, y, z);

    // Vary star sizes for realism (most small, some larger)
    const starSize = rng.next() < 0.9 ? rng.range(2, 4) : rng.range(5, 8);
    sizes.push(starSize);

    // Slight color variation (bluish-white to warm white)
    const colorVar = rng.range(0.85, 1.0);
    colors.push(colorVar, colorVar, 1.0); // R, G, B
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('size', new Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));

  const material = new PointsMaterial({
    size: 3,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
  });

  return new Points(geometry, material);
}

/**
 * Create ground plane
 */
function createGround(segments) {
  const geometry = new PlaneGeometry(200, 200, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const material = new MeshStandardMaterial({
    color: 0x1a1f2e, // Darker blue-gray, but distinguishable from sky
    roughness: 0.95,
    metalness: 0.02,
  });

  const ground = new Mesh(geometry, material);
  ground.receiveShadow = true;
  ground.position.y = -0.1; // Slightly below y=0 for clarity

  return ground;
}

/**
 * Create lighting setup
 */
function createLighting() {
  const lights = [];

  // Ambient light (soft fill) - increased for better ground visibility
  const ambient = new AmbientLight(0x6688aa, 0.8);
  lights.push(ambient);

  // Moon light (key light) - stronger and better positioned
  const moonLight = new DirectionalLight(0xc8d9ff, 1.5);
  moonLight.position.set(-10, 20, 8);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.width = 2048;
  moonLight.shadow.mapSize.height = 2048;
  moonLight.shadow.camera.left = -50;
  moonLight.shadow.camera.right = 50;
  moonLight.shadow.camera.top = 50;
  moonLight.shadow.camera.bottom = -50;
  lights.push(moonLight);

  return lights;
}

/**
 * Initialize scene environment
 */
export function createEnvironment(seed, quality) {
  const rng = new SeededRNG(seed);
  const scene = new Scene();

  // Background and fog
  scene.background = new Color(SCENE_CONFIG.backgroundColor);
  scene.fog = new FogExp2(SCENE_CONFIG.fogColor, SCENE_CONFIG.fogDensity);

  // Starfield
  const starCount = quality === 'High' ? 500 : 200;
  const starfield = createStarfield(rng, starCount);
  scene.add(starfield);

  // Ground
  const groundSegments = quality === 'High' ? 40 : 20;
  const ground = createGround(groundSegments);
  scene.add(ground);

  // Lighting
  const lights = createLighting();
  lights.forEach((light) => scene.add(light));

  return {
    scene,
    starfield,
    ground,
    lights,
  };
}
