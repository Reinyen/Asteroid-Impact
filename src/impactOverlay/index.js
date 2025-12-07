/**
 * Babylon.js Impact Overlay Module
 * Public API for initializing and managing the overlay layer
 */

import { createBabylonEngine } from './engine/createEngine.js';
import { createScene } from './scene/createScene.js';

/**
 * Initialize the Babylon.js overlay
 * @param {string} canvasId - ID of the canvas element
 * @returns {Promise<{engine: Engine, scene: Scene, dispose: Function}>}
 */
export async function initImpactOverlay(canvasId = 'impact-overlay-canvas') {
  const canvas = document.getElementById(canvasId);

  if (!canvas) {
    throw new Error(`Canvas element #${canvasId} not found`);
  }

  console.log('Initializing Babylon.js impact overlay...');

  // Create engine (WebGPU-first with WebGL fallback)
  const engine = await createBabylonEngine(canvas);

  // Create scene
  const scene = createScene(engine);

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
