/**
 * Babylon.js Scene Setup
 * Creates scene with camera, ground, lighting, and post-processing
 */

import {
  Scene,
  Color4,
  ArcRotateCamera,
  Vector3,
  MeshBuilder,
  PBRMaterial,
  DirectionalLight,
  HemisphericLight,
  Color3,
  DefaultRenderingPipeline,
  ImageProcessingConfiguration,
} from 'https://esm.sh/@babylonjs/core@7';

import { OVERLAY_CONFIG } from '../config.js';
import { generateNormalMap, generateRoughnessMap, generateAOMap } from '../proceduralTextures/textureGenerator.js';
import { createAsteroidController } from '../entities/AsteroidController.js';
import { createParticleSystems, updateParticleSystems, updateDebrisSystem } from '../entities/particleSystems.js';
import { createExplosion } from '../entities/explosion.js';
import { createShockwave } from '../entities/shockwave.js';
import { createCameraShake } from '../entities/cameraShake.js';

/**
 * Create and configure the Babylon.js scene
 * @param {Engine|WebGPUEngine} engine - The Babylon engine instance
 * @param {number} seed - Random seed for procedural generation
 * @returns {Scene} The configured scene
 */
export function createScene(engine, seed = 12345) {
  const scene = new Scene(engine);

  // Set transparent background (alpha: 0) to allow starfield/three.js to show through
  scene.clearColor = new Color4(0, 0, 0, 0);

  // IMPORTANT: Disable autoClear to allow starfield/three.js to show through
  // BUT keep depth clearing enabled so Babylon objects can render correctly
  scene.autoClear = false;
  scene.autoClearDepthAndStencil = true;

  console.log('✓ Babylon.js scene created with transparent background');

  // Create camera
  createCamera(scene);

  // Create lighting
  createLighting(scene);

  // Ground plane disabled - not needed for asteroid impact visualization
  // createGround(scene, seed);

  // Setup post-processing
  createPostProcessing(scene);

  // Create camera reference for controller
  const camera = scene.activeCamera;

  // Create asteroid controller (Task 8 implementation)
  const asteroidController = createAsteroidController(scene, camera, { seed });

  // Create particle systems (attach to asteroid mesh)
  const asteroidMesh = asteroidController.getMesh();
  const particleSystems = createParticleSystems(scene, asteroidMesh, seed);

  // Create explosion effect (triggered at impact)
  const impactPosition = new Vector3(0, 0, 5); // Center of screen, slightly in front of camera
  const explosion = createExplosion(scene, impactPosition, {});

  // Create shockwave effect (triggered at impact)
  const shockwave = createShockwave(scene, impactPosition, {});

  // Create camera shake controller
  const cameraShake = createCameraShake(camera, { intensity: 1.0 });

  // Store entities on scene for animation updates
  scene.metadata = {
    asteroidController,
    particleSystems,
    explosion,
    shockwave,
    cameraShake,
    impactPosition,
    impactTriggered: false, // Track if impact effects have been triggered
    seed,
    lastUpdateTime: performance.now() / 1000,
  };

  // Register update loop for asteroid and particles
  scene.onBeforeRenderObservable.add(() => {
    updateSceneEntities(scene);
  });

  return scene;
}

/**
 * Update asteroid and particle systems based on timeline
 * Called every frame by scene.onBeforeRenderObservable
 */
function updateSceneEntities(scene) {
  const metadata = scene.metadata;
  if (!metadata) return;

  const {
    asteroidController,
    particleSystems,
    explosion,
    shockwave,
    cameraShake,
    impactPosition
  } = metadata;

  // Get timeline state from window (set by main.js)
  const timelineState = window.__timelineState;
  if (!timelineState) return;

  const { T, isPlaying } = timelineState;

  // Calculate delta time
  const currentTime = performance.now() / 1000;
  const deltaTime = currentTime - metadata.lastUpdateTime;
  metadata.lastUpdateTime = currentTime;

  // Only update if timeline is playing
  if (!isPlaying) return;

  // Impact trigger threshold
  const impactT = 0.95;

  // Reset impact trigger if timeline restarted (T went back below threshold)
  if (T < impactT && metadata.impactTriggered) {
    metadata.impactTriggered = false;
    console.log('Timeline restarted, reset impact trigger');
  }

  // Update asteroid controller (Task 8: uses dtMs and tSec)
  const dtMs = deltaTime * 1000;
  asteroidController.update(dtMs, T);

  // Get asteroid kinematics for particle systems
  const kinematics = asteroidController.getKinematics();

  // Trigger impact effects at T >= 0.95
  if (T >= impactT && !metadata.impactTriggered) {
    metadata.impactTriggered = true;

    // Trigger explosion
    explosion.trigger(impactPosition);

    // Trigger shockwave
    shockwave.trigger(impactPosition);

    // Trigger camera shake
    cameraShake.trigger();

    console.log('💥 IMPACT! All effects triggered at T=' + T.toFixed(3));
  }

  // Update particle systems (with impact position for coalescing)
  updateParticleSystems(particleSystems, T, kinematics.positionWS, impactPosition);

  // Update debris system (with coalescing behavior)
  updateDebrisSystem(particleSystems.debris, deltaTime, kinematics.positionWS, T, impactPosition);

  // Update explosion effect
  if (explosion.isActive()) {
    explosion.update(deltaTime);
  }

  // Update shockwave effect
  if (shockwave.isActive()) {
    shockwave.update(deltaTime);
  }

  // Update camera shake
  if (cameraShake.isActive()) {
    cameraShake.update(deltaTime);
  }
}

/**
 * Create and configure camera
 */
function createCamera(scene) {
  const config = OVERLAY_CONFIG.camera;

  const camera = new ArcRotateCamera(
    'mainCamera',
    0, // alpha (rotation around Y)
    0, // beta (rotation around X)
    1, // radius (will be set by position)
    new Vector3(config.target.x, config.target.y, config.target.z),
    scene
  );

  // Set camera position
  camera.position = new Vector3(config.position.x, config.position.y, config.position.z);

  // Set FOV and clipping planes
  camera.fov = (config.fov * Math.PI) / 180; // Convert to radians
  camera.minZ = config.minZ;
  camera.maxZ = config.maxZ;

  // Disable user controls (camera is fixed for now)
  camera.attachControl(scene.getEngine().getRenderingCanvas(), false);
  camera.inputs.clear();

  scene.activeCamera = camera;

  console.log('✓ Camera created and configured');
  return camera;
}

/**
 * Create scene lighting
 */
function createLighting(scene) {
  const config = OVERLAY_CONFIG.lighting;

  // Primary directional light (sun/moon)
  const primaryLight = new DirectionalLight(
    'primaryLight',
    new Vector3(config.primary.direction.x, config.primary.direction.y, config.primary.direction.z),
    scene
  );
  primaryLight.intensity = config.primary.intensity;
  primaryLight.diffuse = new Color3(
    config.primary.color.r,
    config.primary.color.g,
    config.primary.color.b
  );
  primaryLight.specular = new Color3(
    config.primary.color.r * 0.5,
    config.primary.color.g * 0.5,
    config.primary.color.b * 0.5
  );

  // Ambient hemispheric light
  const ambientLight = new HemisphericLight(
    'ambientLight',
    new Vector3(config.ambient.direction.x, config.ambient.direction.y, config.ambient.direction.z),
    scene
  );
  ambientLight.intensity = config.ambient.intensity;
  ambientLight.diffuse = new Color3(
    config.ambient.skyColor.r,
    config.ambient.skyColor.g,
    config.ambient.skyColor.b
  );
  ambientLight.groundColor = new Color3(
    config.ambient.groundColor.r,
    config.ambient.groundColor.g,
    config.ambient.groundColor.b
  );

  console.log('✓ Lighting created (directional + hemispheric)');
  return { primaryLight, ambientLight };
}

/**
 * Create ground plane with PBR material and procedural textures
 */
function createGround(scene, seed) {
  const config = OVERLAY_CONFIG.ground;
  const texConfig = OVERLAY_CONFIG.proceduralTextures;

  // Create ground mesh
  const ground = MeshBuilder.CreateGround(
    'ground',
    {
      width: config.width,
      height: config.height,
      subdivisions: config.subdivisions,
    },
    scene
  );

  // Create PBR material
  const material = new PBRMaterial('groundMaterial', scene);

  // Base PBR properties
  material.albedoColor = new Color3(
    config.material.albedo.r,
    config.material.albedo.g,
    config.material.albedo.b
  );
  material.metallic = config.material.metallic;
  material.roughness = config.material.roughness;

  // Generate procedural textures
  const normalMap = generateNormalMap(scene, texConfig.normalMap.size, {
    octaves: texConfig.normalMap.octaves,
    persistence: texConfig.normalMap.persistence,
    scale: texConfig.normalMap.scale,
    strength: config.material.normalStrength,
    seed: seed,
  });

  const roughnessMap = generateRoughnessMap(scene, texConfig.roughnessMap.size, {
    octaves: texConfig.roughnessMap.octaves,
    persistence: texConfig.roughnessMap.persistence,
    scale: texConfig.roughnessMap.scale,
    baseRoughness: config.material.roughness,
    variation: config.material.roughnessVariation,
    seed: seed + 1,
  });

  const aoMap = generateAOMap(scene, 512, {
    octaves: 2,
    persistence: 0.5,
    scale: 2.0,
    intensity: 0.3,
    seed: seed + 2,
  });

  // Apply textures
  material.bumpTexture = normalMap;
  material.metallicTexture = roughnessMap; // Roughness is in metallic texture
  material.lightmapTexture = aoMap;
  material.useLightmapAsShadowmap = true;

  // Enable texture UV coordinates
  material.bumpTexture.coordinatesIndex = 0;
  material.metallicTexture.coordinatesIndex = 0;
  material.lightmapTexture.coordinatesIndex = 0;

  ground.material = material;

  console.log('✓ Ground plane created with PBR material and procedural textures');
  return ground;
}

/**
 * Setup post-processing pipeline
 */
function createPostProcessing(scene) {
  const config = OVERLAY_CONFIG.postProcessing;

  if (!config.enabled) {
    console.log('⊘ Post-processing disabled');
    return null;
  }

  const pipeline = new DefaultRenderingPipeline(
    'defaultPipeline',
    true, // HDR
    scene,
    [scene.activeCamera]
  );

  // FXAA (fast anti-aliasing)
  if (config.fxaa.enabled) {
    pipeline.fxaaEnabled = true;
  }

  // Bloom
  if (config.bloom.enabled) {
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = config.bloom.threshold;
    pipeline.bloomWeight = config.bloom.weight;
    pipeline.bloomKernel = config.bloom.kernel;
  }

  // Image processing (tone mapping, contrast, exposure)
  if (config.imageProcessing.enabled) {
    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.contrast = config.imageProcessing.contrast;
    pipeline.imageProcessing.exposure = config.imageProcessing.exposure;

    if (config.imageProcessing.toneMappingEnabled) {
      pipeline.imageProcessing.toneMappingEnabled = true;
      pipeline.imageProcessing.toneMappingType = config.imageProcessing.toneMappingType;
    }
  }

  // Depth of Field
  if (config.depthOfField.enabled) {
    pipeline.depthOfFieldEnabled = true;
    pipeline.depthOfField.focalLength = config.depthOfField.focalLength;
    pipeline.depthOfField.fStop = config.depthOfField.fStop;
    pipeline.depthOfField.focusDistance = config.depthOfField.focusDistance;
  }

  // MSAA samples
  pipeline.samples = config.samples;

  console.log('✓ Post-processing pipeline configured (FXAA, Bloom, Tone Mapping)');
  return pipeline;
}
