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
 * Create procedural starfield with realistic appearance
 */
function createStarfield(rng, starCount) {
  const positions = [];
  const colors = [];

  for (let i = 0; i < starCount; i++) {
    // Full sky dome distribution
    const radius = rng.range(150, 800);
    const theta = rng.range(0, Math.PI * 2);
    const phi = rng.range(0.1, Math.PI * 0.65);

    const x = radius * Math.cos(theta) * Math.sin(phi);
    const y = radius * Math.cos(phi) + 15;
    const z = radius * Math.sin(theta) * Math.sin(phi);

    positions.push(x, y, z);

    // Realistic star colors: bright white to subtle blue/yellow tints
    const temp = rng.range(0, 1);
    if (temp < 0.7) {
      // White stars (majority)
      colors.push(1.0, 1.0, 1.0);
    } else if (temp < 0.85) {
      // Blue-white stars
      colors.push(0.8, 0.9, 1.0);
    } else {
      // Yellow-white stars
      colors.push(1.0, 0.95, 0.8);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));

  const material = new PointsMaterial({
    size: 8,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    blending: 2, // AdditiveBlending for glow
  });

  return new Points(geometry, material);
}

/**
 * Create ground plane with clear visibility
 */
function createGround(segments) {
  const geometry = new PlaneGeometry(300, 300, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const material = new MeshStandardMaterial({
    color: 0x2a3545,
    roughness: 0.9,
    metalness: 0.1,
  });

  const ground = new Mesh(geometry, material);
  ground.receiveShadow = true;
  ground.position.y = 0;

  return ground;
}

/**
 * Create lighting setup
 */
function createLighting() {
  const lights = [];

  // Strong ambient for ground visibility
  const ambient = new AmbientLight(0x7799bb, 1.2);
  lights.push(ambient);

  // Bright directional moonlight
  const moonLight = new DirectionalLight(0xddeeff, 2.0);
  moonLight.position.set(-15, 30, 10);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.width = 2048;
  moonLight.shadow.mapSize.height = 2048;
  moonLight.shadow.camera.left = -100;
  moonLight.shadow.camera.right = 100;
  moonLight.shadow.camera.top = 100;
  moonLight.shadow.camera.bottom = -100;
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
