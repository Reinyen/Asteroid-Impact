/**
 * Main entry point - Bootstrap renderer, scene, camera, and main loop
 */

import {
  PerspectiveCamera,
  WebGLRenderer,
} from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

import { Timeline } from './core/timeline.js';
import { createEnvironment } from './world/environment.js';
import { createStarfield } from './world/starfield.js';
import { UIOverlay } from './ui/overlay.js';
import { DEFAULT_SEED, QUALITY_PRESETS } from './config/presets.js';
import { initImpactOverlay } from './impactOverlay/index.js';

// ============================================================================
// Application State
// ============================================================================

let currentSeed = DEFAULT_SEED;
let currentQuality = 'High';
let timeline = null;
let ui = null;
let renderer = null;
let camera = null;
let environment = null;
let starfield = null;
let babylonOverlay = null;

// ============================================================================
// Initialization
// ============================================================================

function init() {
  const app = document.getElementById('app');

  // Create renderer with alpha for transparent background
  const qualityPreset = QUALITY_PRESETS[currentQuality];
  renderer = new WebGLRenderer({
    antialias: qualityPreset.antialias,
    alpha: true,
  });
  renderer.setSize(app.clientWidth, app.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, qualityPreset.pixelRatio));
  renderer.shadowMap.enabled = true;
  renderer.setClearColor(0x000000, 0); // Transparent clear color
  app.insertBefore(renderer.domElement, app.firstChild);

  // Create camera
  camera = new PerspectiveCamera(
    60,
    app.clientWidth / app.clientHeight,
    0.1,
    2000
  );
  camera.position.set(0, 6, 16);
  camera.lookAt(0, 0, 0);

  // Create timeline
  timeline = new Timeline(currentSeed);

  // Create HTML/CSS starfield
  starfield = createStarfield(currentSeed);

  // Create environment (scene, ground, lights)
  environment = createEnvironment(currentSeed, currentQuality);

  // Create UI overlay
  ui = new UIOverlay(
    timeline,
    handleRestart,
    handleQualityChange,
    handleSeedChange
  );

  // Initialize Babylon.js overlay (async)
  initBabylonOverlay();

  // Window resize handler
  window.addEventListener('resize', handleResize);

  console.log('✓ Application initialized');
  console.log(`  Seed: ${currentSeed}`);
  console.log(`  Quality: ${currentQuality}`);
}

async function initBabylonOverlay() {
  try {
    babylonOverlay = await initImpactOverlay();
    console.log('✓ Babylon.js overlay ready');
  } catch (error) {
    console.error('Failed to initialize Babylon.js overlay:', error);
  }
}

// ============================================================================
// Event Handlers
// ============================================================================

function handleRestart(currentTime) {
  timeline.restart(currentTime);
  console.log(`✓ Timeline restarted with seed ${currentSeed}`);
}

function handleQualityChange(newQuality) {
  currentQuality = newQuality;
  console.log(`✓ Quality changed to ${newQuality} (requires restart to apply)`);
  // Note: Full quality change requires rebuilding the scene
  // For now, just update the setting. A full implementation would:
  // 1. Dispose current scene
  // 2. Rebuild environment with new quality preset
  // 3. Restart timeline
}

function handleSeedChange(newSeed) {
  currentSeed = newSeed;
  timeline.setSeed(newSeed);
  ui.setSeedValue(newSeed);
  console.log(`✓ Seed changed to ${newSeed} (restart to apply)`);
}

function handleResize() {
  const app = document.getElementById('app');
  const width = app.clientWidth;
  const height = app.clientHeight;

  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

// ============================================================================
// Animation Loop
// ============================================================================

function animate() {
  const currentTime = performance.now() / 1000; // Convert to seconds

  // Update timeline
  timeline.update(currentTime);

  // Update UI
  ui.update();

  // Render three.js scene
  renderer.render(environment.scene, camera);

  // Render Babylon.js overlay (if initialized)
  if (babylonOverlay) {
    babylonOverlay.scene.render();
  }

  // Continue loop
  requestAnimationFrame(animate);
}

// ============================================================================
// Bootstrap
// ============================================================================

init();
animate();

console.log('✓ Animation loop started');
console.log('  Click "Play / Restart" to begin timeline');
