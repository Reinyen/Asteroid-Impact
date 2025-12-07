/**
 * Babylon.js Scene Setup
 * Creates a basic transparent scene for the impact overlay
 */

import { Scene, Color4 } from 'https://cdn.babylonjs.com/babylon.module.js';

/**
 * Create and configure the Babylon.js scene
 * @param {Engine|WebGPUEngine} engine - The Babylon engine instance
 * @returns {Scene} The configured scene
 */
export function createScene(engine) {
  const scene = new Scene(engine);

  // Set transparent background (alpha: 0) to allow starfield/three.js to show through
  scene.clearColor = new Color4(0, 0, 0, 0);

  // Disable automatic camera/lighting creation
  scene.autoClear = true;
  scene.autoClearDepthAndStencil = true;

  console.log('✓ Babylon.js scene created with transparent background');

  return scene;
}
