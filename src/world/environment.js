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

  for (let i = 0; i < starCount; i++) {
    // Spherical distribution favoring upper hemisphere
    const radius = rng.range(80, 300);
    const theta = rng.range(0, Math.PI * 2);
    const phi = rng.range(0, Math.PI * 0.55); // Favor upper hemisphere

    const x = radius * Math.cos(theta) * Math.sin(phi);
    const y = radius * Math.cos(phi) + 12; // Offset upward
    const z = radius * Math.sin(theta) * Math.sin(phi);

    positions.push(x, y, z);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

  const material = new PointsMaterial({
    color: 0xcdd6f4,
    size: 1.2,
    sizeAttenuation: true,
  });

  return new Points(geometry, material);
}

/**
 * Create ground plane
 */
function createGround(segments) {
  const geometry = new PlaneGeometry(120, 120, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const material = new MeshStandardMaterial({
    color: 0x0b0d13,
    roughness: 0.9,
    metalness: 0.05,
  });

  const ground = new Mesh(geometry, material);
  ground.receiveShadow = true;

  return ground;
}

/**
 * Create lighting setup
 */
function createLighting() {
  const lights = [];

  // Ambient light (soft fill)
  const ambient = new AmbientLight(0x8899aa, 0.6);
  lights.push(ambient);

  // Moon light (key light)
  const moonLight = new DirectionalLight(0xbdd3ff, 1.1);
  moonLight.position.set(-8, 12, 6);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.width = 1024;
  moonLight.shadow.mapSize.height = 1024;
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
