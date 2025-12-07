/**
 * Babylon.js Impact Overlay Module
 * Public API for initializing and managing the overlay layer
 */

import { createBabylonEngine } from './engine/createEngine.js';
import { createScene } from './scene/createScene.js';
import { initImageAssetGuard } from './utils/imageAssetGuard.js';

/**
 * Initialize the Babylon.js overlay
 * @param {string} canvasId - ID of the canvas element
 * @param {number} seed - Random seed for procedural generation
 * @returns {Promise<{engine: Engine, scene: Scene, dispose: Function}>}
 */
export async function initImpactOverlay(canvasId = 'impact-overlay-canvas', seed = 12345) {
  const canvas = document.getElementById(canvasId);

  if (!canvas) {
    throw new Error(`Canvas element #${canvasId} not found`);
  }

  console.log('Initializing Babylon.js impact overlay...');

  // Initialize image asset guard (prevent loading image files)
  initImageAssetGuard();

  // Create engine (WebGPU-first with WebGL fallback)
  const engine = await createBabylonEngine(canvas);

  // Create scene with seed for deterministic procedural generation
  const scene = createScene(engine, seed);

  // Handle window resize
  const handleResize = () => {
    engine.resize();
  };
  window.addEventListener('resize', handleResize);

  console.log('✓ Babylon.js overlay initialized successfully');

  return {
    engine,
    scene,
    dispose: () => {
      window.removeEventListener('resize', handleResize);
      scene.dispose();
      engine.dispose();
      console.log('✓ Babylon.js overlay disposed');
    },
  };
}
