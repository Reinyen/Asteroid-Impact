/**
 * Particle Systems for Asteroid Trail
 * Fire/plasma, smoke, and debris particle systems
 */

import {
  ParticleSystem,
  Color4,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Matrix,
  Quaternion,
} from 'https://esm.sh/@babylonjs/core@7';
import {
  generateFireTexture,
  generateSmokeTexture,
  generateSparkTexture,
} from '../proceduralTextures/particleTextures.js';

/**
 * Particle system configuration
 */
export const PARTICLE_CONFIG = {
  // Fire/plasma system
  fire: {
    capacity: 2000,
    emitRate: 300,
    minLifeTime: 0.3,
    maxLifeTime: 0.8,
    minSize: 2.0,
    maxSize: 6.0,
    minEmitPower: 5,
    maxEmitPower: 10,
    color1: { r: 1.0, g: 0.6, b: 0.2, a: 1.0 }, // Orange
    color2: { r: 1.0, g: 0.3, b: 0.1, a: 0.8 }, // Red-orange
    colorDead: { r: 0.5, g: 0.1, b: 0.05, a: 0.0 }, // Faded red
    gravity: { x: 0, y: -2, z: 0 },
    updateSpeed: 0.01,
  },

  // Smoke system
  smoke: {
    capacity: 3000,
    emitRate: 150,
    minLifeTime: 1.5,
    maxLifeTime: 3.0,
    minSize: 4.0,
    maxSize: 12.0,
    minEmitPower: 2,
    maxEmitPower: 5,
    color1: { r: 0.3, g: 0.3, b: 0.35, a: 0.8 }, // Gray
    color2: { r: 0.2, g: 0.2, b: 0.25, a: 0.5 }, // Dark gray
    colorDead: { r: 0.1, g: 0.1, b: 0.15, a: 0.0 }, // Faded
    gravity: { x: 0, y: 1, z: 0 }, // Smoke rises
    updateSpeed: 0.005,
  },

  // Spark/debris system
  sparks: {
    capacity: 500,
    emitRate: 100,
    minLifeTime: 0.2,
    maxLifeTime: 0.6,
    minSize: 0.5,
    maxSize: 1.5,
    minEmitPower: 8,
    maxEmitPower: 15,
    color1: { r: 1.0, g: 0.9, b: 0.6, a: 1.0 }, // Bright yellow-white
    color2: { r: 1.0, g: 0.5, b: 0.2, a: 0.9 }, // Orange
    colorDead: { r: 0.3, g: 0.1, b: 0.05, a: 0.0 }, // Dim red
    gravity: { x: 0, y: -15, z: 0 }, // Heavy gravity for ballistic arcs
    updateSpeed: 0.02,
  },

  // Thin instance debris (mesh-based)
  debris: {
    count: 50, // Number of debris chunks
    minSize: 0.3,
    maxSize: 1.2,
    minSpeed: 5,
    maxSpeed: 15,
    lifetime: 2.0,
  },
};

/**
 * Create all particle systems for asteroid trail
 * @param {Scene} scene - Babylon scene
 * @param {Mesh} emitter - Emitter mesh (asteroid)
 * @param {number} seed - Random seed for determinism
 * @returns {Object} Particle systems and controls
 */
export function createParticleSystems(scene, emitter, seed = 0) {
  // Generate procedural textures
  const fireTexture = generateFireTexture(scene, 128, { seed });
  const smokeTexture = generateSmokeTexture(scene, 128, { seed: seed + 1 });
  const sparkTexture = generateSparkTexture(scene, 64, { seed: seed + 2 });

  // Create particle systems
  const fireSystem = createFireSystem(scene, emitter, fireTexture);
  const smokeSystem = createSmokeSystem(scene, emitter, smokeTexture);
  const sparkSystem = createSparkSystem(scene, emitter, sparkTexture);

  // Create debris system (thin instances)
  const debrisSystem = createDebrisSystem(scene, emitter, seed);

  console.log('✓ All particle systems created');

  return {
    fire: fireSystem,
    smoke: smokeSystem,
    sparks: sparkSystem,
    debris: debrisSystem,
  };
}

/**
 * Create fire/plasma particle system
 */
function createFireSystem(scene, emitter, texture) {
  const config = PARTICLE_CONFIG.fire;

  const system = new ParticleSystem('fireSystem', config.capacity, scene);

  // Texture
  system.particleTexture = texture;

  // Emitter
  system.emitter = emitter;
  system.minEmitBox = new Vector3(-1, -1, -1);
  system.maxEmitBox = new Vector3(1, 1, 1);

  // Emission rate
  system.emitRate = config.emitRate;

  // Lifetime
  system.minLifeTime = config.minLifeTime;
  system.maxLifeTime = config.maxLifeTime;

  // Size
  system.minSize = config.minSize;
  system.maxSize = config.maxSize;

  // Emit power/speed
  system.minEmitPower = config.minEmitPower;
  system.maxEmitPower = config.maxEmitPower;

  // Colors
  system.color1 = new Color4(
    config.color1.r,
    config.color1.g,
    config.color1.b,
    config.color1.a
  );
  system.color2 = new Color4(
    config.color2.r,
    config.color2.g,
    config.color2.b,
    config.color2.a
  );
  system.colorDead = new Color4(
    config.colorDead.r,
    config.colorDead.g,
    config.colorDead.b,
    config.colorDead.a
  );

  // Gravity
  system.gravity = new Vector3(config.gravity.x, config.gravity.y, config.gravity.z);

  // Direction
  system.direction1 = new Vector3(-1, -1, -1);
  system.direction2 = new Vector3(1, 1, 1);

  // Blending
  system.blendMode = ParticleSystem.BLENDMODE_ADD; // Additive for bright fire

  // Update speed
  system.updateSpeed = config.updateSpeed;

  // Start stopped (will start when asteroid is visible)
  system.start();

  console.log('✓ Fire particle system created');
  return system;
}

/**
 * Create smoke particle system
 */
function createSmokeSystem(scene, emitter, texture) {
  const config = PARTICLE_CONFIG.smoke;

  const system = new ParticleSystem('smokeSystem', config.capacity, scene);

  // Texture
  system.particleTexture = texture;

  // Emitter
  system.emitter = emitter;
  system.minEmitBox = new Vector3(-1.5, -1.5, -1.5);
  system.maxEmitBox = new Vector3(1.5, 1.5, 1.5);

  // Emission rate
  system.emitRate = config.emitRate;

  // Lifetime
  system.minLifeTime = config.minLifeTime;
  system.maxLifeTime = config.maxLifeTime;

  // Size
  system.minSize = config.minSize;
  system.maxSize = config.maxSize;

  // Emit power/speed
  system.minEmitPower = config.minEmitPower;
  system.maxEmitPower = config.maxEmitPower;

  // Colors
  system.color1 = new Color4(
    config.color1.r,
    config.color1.g,
    config.color1.b,
    config.color1.a
  );
  system.color2 = new Color4(
    config.color2.r,
    config.color2.g,
    config.color2.b,
    config.color2.a
  );
  system.colorDead = new Color4(
    config.colorDead.r,
    config.colorDead.g,
    config.colorDead.b,
    config.colorDead.a
  );

  // Gravity
  system.gravity = new Vector3(config.gravity.x, config.gravity.y, config.gravity.z);

  // Direction
  system.direction1 = new Vector3(-0.5, -0.5, -0.5);
  system.direction2 = new Vector3(0.5, 0.5, 0.5);

  // Blending
  system.blendMode = ParticleSystem.BLENDMODE_STANDARD; // Standard alpha blending

  // Update speed
  system.updateSpeed = config.updateSpeed;

  // Start stopped
  system.start();

  console.log('✓ Smoke particle system created');
  return system;
}

/**
 * Create spark/ablated material particle system
 */
function createSparkSystem(scene, emitter, texture) {
  const config = PARTICLE_CONFIG.sparks;

  const system = new ParticleSystem('sparkSystem', config.capacity, scene);

  // Texture
  system.particleTexture = texture;

  // Emitter
  system.emitter = emitter;
  system.minEmitBox = new Vector3(-0.5, -0.5, -0.5);
  system.maxEmitBox = new Vector3(0.5, 0.5, 0.5);

  // Emission rate
  system.emitRate = config.emitRate;

  // Lifetime
  system.minLifeTime = config.minLifeTime;
  system.maxLifeTime = config.maxLifeTime;

  // Size
  system.minSize = config.minSize;
  system.maxSize = config.maxSize;

  // Emit power/speed
  system.minEmitPower = config.minEmitPower;
  system.maxEmitPower = config.maxEmitPower;

  // Colors
  system.color1 = new Color4(
    config.color1.r,
    config.color1.g,
    config.color1.b,
    config.color1.a
  );
  system.color2 = new Color4(
    config.color2.r,
    config.color2.g,
    config.color2.b,
    config.color2.a
  );
  system.colorDead = new Color4(
    config.colorDead.r,
    config.colorDead.g,
    config.colorDead.b,
    config.colorDead.a
  );

  // Gravity
  system.gravity = new Vector3(config.gravity.x, config.gravity.y, config.gravity.z);

  // Direction
  system.direction1 = new Vector3(-1, -1, -1);
  system.direction2 = new Vector3(1, 1, 1);

  // Blending
  system.blendMode = ParticleSystem.BLENDMODE_ADD; // Additive for bright sparks

  // Update speed
  system.updateSpeed = config.updateSpeed;

  // Start stopped
  system.start();

  console.log('✓ Spark particle system created');
  return system;
}

/**
 * Create debris system using thin instances
 * More performant than individual meshes
 */
function createDebrisSystem(scene, emitter, seed) {
  const config = PARTICLE_CONFIG.debris;

  // Create base debris mesh (small irregular rock)
  const baseMesh = MeshBuilder.CreateBox('debrisBase', { size: 1 }, scene);
  baseMesh.isVisible = false; // Base mesh is not rendered

  // Create material
  const material = new StandardMaterial('debrisMaterial', scene);
  material.diffuseColor = new Color3(0.2, 0.18, 0.15); // Dark rock
  material.specularColor = new Color3(0.05, 0.05, 0.05);
  material.emissiveColor = new Color3(0.5, 0.2, 0.1); // Slight glow from heat
  baseMesh.material = material;

  // Prepare for thin instances
  baseMesh.thinInstanceEnablePicking = false;

  // Initialize debris particles
  const debrisParticles = [];
  for (let i = 0; i < config.count; i++) {
    debrisParticles.push({
      position: new Vector3(0, 0, 0),
      velocity: new Vector3(0, 0, 0),
      rotation: new Vector3(0, 0, 0),
      angularVelocity: new Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      ),
      scale: config.minSize + Math.random() * (config.maxSize - config.minSize),
      age: 0,
      active: false,
    });
  }

  // Create matrix buffer for thin instances
  const matrices = [];
  for (let i = 0; i < config.count; i++) {
    matrices.push(Matrix.Identity());
  }

  baseMesh.thinInstanceSetBuffer('matrix', matrices, 16, false);

  console.log('✓ Debris system created with thin instances');

  return {
    baseMesh,
    particles: debrisParticles,
    matrices,
    config,
  };
}

/**
 * Update particle system emission based on timeline
 * @param {Object} systems - Particle systems from createParticleSystems
 * @param {number} T - Normalized timeline [0, 1]
 * @param {Vector3} emitterPosition - Current asteroid position
 * @param {Vector3} impactPosition - Impact center position (for post-impact behavior)
 */
export function updateParticleSystems(systems, T, emitterPosition, impactPosition = null) {
  // Particles start emitting at T=0.3 (mid approach)
  // Increase intensity as asteroid approaches
  const particleStartT = 0.3;
  const impactT = 0.95;
  const particleIntensity = T < particleStartT ? 0 : (T - particleStartT) / (1.0 - particleStartT);

  // Update emission rates based on intensity
  const fireConfig = PARTICLE_CONFIG.fire;
  const smokeConfig = PARTICLE_CONFIG.smoke;
  const sparkConfig = PARTICLE_CONFIG.sparks;

  // Pre-impact: normal emission
  if (T < impactT) {
    systems.fire.emitRate = fireConfig.emitRate * particleIntensity;
    systems.smoke.emitRate = smokeConfig.emitRate * particleIntensity;
    systems.sparks.emitRate = sparkConfig.emitRate * particleIntensity;
  }
  // Impact moment: massive burst
  else if (T >= impactT && T < impactT + 0.02) {
    systems.fire.emitRate = fireConfig.emitRate * 5.0; // Massive burst
    systems.smoke.emitRate = smokeConfig.emitRate * 3.0;
    systems.sparks.emitRate = sparkConfig.emitRate * 10.0;
  }
  // Post-impact: settling smoke only
  else {
    systems.fire.stop();
    systems.smoke.emitRate = smokeConfig.emitRate * 0.3; // Gentle settling smoke
    systems.sparks.stop();

    // Update smoke to drift upward (settling behavior)
    systems.smoke.gravity = new Vector3(0, 3, 0); // Smoke rises slowly
    systems.smoke.minEmitPower = 1;
    systems.smoke.maxEmitPower = 3;
  }
}

/**
 * Update debris system (thin instances)
 * @param {Object} debrisSystem - Debris system from createDebrisSystem
 * @param {number} deltaTime - Time since last update
 * @param {Vector3} emitterPosition - Current asteroid position
 * @param {number} T - Normalized timeline [0, 1]
 * @param {Vector3} impactPosition - Impact center position (for coalescing)
 */
export function updateDebrisSystem(debrisSystem, deltaTime, emitterPosition, T, impactPosition = null) {
  const { particles, matrices, baseMesh, config } = debrisSystem;

  // Spawn new debris during entry phase
  const spawnStartT = 0.4;
  const spawnEndT = 0.95; // Spawn up to impact
  const impactT = 0.95;

  if (T >= spawnStartT && T < spawnEndT) {
    // Try to spawn debris
    const spawnChance = 0.05; // 5% chance per frame
    if (Math.random() < spawnChance) {
      // Find inactive particle
      const inactive = particles.find(p => !p.active);
      if (inactive) {
        // Spawn at emitter position
        inactive.position.copyFrom(emitterPosition);

        // Random velocity away from asteroid
        const speed = config.minSpeed + Math.random() * (config.maxSpeed - config.minSpeed);
        inactive.velocity = new Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ).normalize().scale(speed);

        inactive.age = 0;
        inactive.active = true;
      }
    }
  }

  // Impact moment: spawn burst of debris
  if (T >= impactT && T < impactT + 0.02) {
    // Spawn many debris pieces at once
    for (let burst = 0; burst < 10; burst++) {
      const inactive = particles.find(p => !p.active);
      if (inactive) {
        inactive.position.copyFrom(emitterPosition);

        // High-speed radial explosion
        const speed = 20 + Math.random() * 30;
        inactive.velocity = new Vector3(
          (Math.random() - 0.5) * 2,
          Math.random(), // Bias upward
          (Math.random() - 0.5) * 2
        ).normalize().scale(speed);

        inactive.age = 0;
        inactive.active = true;
      }
    }
  }

  // Update active particles
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    if (!p.active) {
      // Hide inactive particles (scale to zero)
      matrices[i] = Matrix.Scaling(0, 0, 0);
      continue;
    }

    // Update physics
    p.velocity.y -= 9.8 * deltaTime; // Gravity

    // Post-impact: add coalescing force (attraction to impact center)
    if (T >= impactT && impactPosition) {
      const toCenter = impactPosition.subtract(p.position);
      const distance = toCenter.length();

      if (distance > 0.1) {
        // Attraction force (stronger when closer, weaker when farther)
        const attractionStrength = 15.0; // Configurable
        const attractionForce = toCenter.normalize().scale(attractionStrength / Math.max(distance, 1.0));
        p.velocity.addInPlace(attractionForce.scale(deltaTime));
      }

      // Add drag to slow down debris over time
      const dragFactor = 0.98; // 2% velocity loss per frame
      p.velocity.scaleInPlace(Math.pow(dragFactor, deltaTime * 60));
    }

    p.position.addInPlace(p.velocity.scale(deltaTime));

    // Update rotation
    p.rotation.x += p.angularVelocity.x * deltaTime;
    p.rotation.y += p.angularVelocity.y * deltaTime;
    p.rotation.z += p.angularVelocity.z * deltaTime;

    // Update age
    p.age += deltaTime;

    // Deactivate if lifetime exceeded or below ground
    if (p.age >= config.lifetime || p.position.y < 0) {
      p.active = false;
      continue;
    }

    // Update matrix (position, rotation, scale)
    const quaternion = Quaternion.FromEulerAngles(p.rotation.x, p.rotation.y, p.rotation.z);
    const matrix = Matrix.Compose(
      new Vector3(p.scale, p.scale, p.scale),
      quaternion,
      p.position
    );
    matrices[i] = matrix;
  }

  // Update thin instance buffer
  baseMesh.thinInstanceSetBuffer('matrix', matrices, 16, false);
}
