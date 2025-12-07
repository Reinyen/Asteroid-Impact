/**
 * Babylon.js Engine Factory with WebGPU-first strategy
 * Falls back to WebGL if WebGPU is not supported
 */

import { Engine } from 'https://cdn.babylonjs.com/babylon.module.js';
import { WebGPUEngine } from 'https://cdn.babylonjs.com/webgpuEngine.module.js';

/**
 * Create a Babylon.js engine with WebGPU support when available
 * @param {HTMLCanvasElement} canvas - The canvas element to render to
 * @returns {Promise<Engine|WebGPUEngine>} The created engine instance
 */
export async function createBabylonEngine(canvas) {
  try {
    // Check if WebGPU is supported
    const webgpuSupported = await WebGPUEngine.IsSupportedAsync;

    if (webgpuSupported) {
      console.log('✓ WebGPU supported - initializing WebGPU engine');

      // Create WebGPU engine
      const engine = new WebGPUEngine(canvas, {
        antialias: true,
        stencil: true,
        powerPreference: 'high-performance',
      });

      // Initialize WebGPU engine (required async step)
      await engine.initAsync();

      console.log('✓ WebGPU engine initialized successfully');
      return engine;
    } else {
      console.log('⚠ WebGPU not supported - falling back to WebGL');
      return createWebGLEngine(canvas);
    }
  } catch (error) {
    console.warn('⚠ WebGPU initialization failed - falling back to WebGL:', error.message);
    return createWebGLEngine(canvas);
  }
}

/**
 * Create a WebGL-based engine as fallback
 * @param {HTMLCanvasElement} canvas - The canvas element to render to
 * @returns {Engine} The created WebGL engine instance
 */
function createWebGLEngine(canvas) {
  const engine = new Engine(canvas, true, {
    antialias: true,
    stencil: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
    premultipliedAlpha: false,
  });

  console.log('✓ WebGL engine initialized successfully');
  return engine;
}
