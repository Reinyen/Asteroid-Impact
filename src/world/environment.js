/**
 * Environment module - Scene and lighting setup
 */

import {
  AmbientLight,
  Color,
  DirectionalLight,
  FogExp2,
  Scene,
} from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

import { SCENE_CONFIG } from '../config/presets.js';

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
  const scene = new Scene();

  // Background and fog - using transparent background for HTML starfield
  scene.background = null; // Transparent to show HTML background
  scene.fog = new FogExp2(SCENE_CONFIG.fogColor, SCENE_CONFIG.fogDensity);

  // Lighting
  const lights = createLighting();
  lights.forEach((light) => scene.add(light));

  return {
    scene,
    lights,
  };
}
