/**
 * Camera Shake System
 * Subtle shake with configurable intensity
 * Applied during impact event
 */

import { Vector3 } from 'https://esm.sh/@babylonjs/core@7';

/**
 * Camera shake configuration
 */
const SHAKE_CONFIG = {
  // Timing
  duration: 1.2,            // Shake duration (seconds)

  // Intensity (configurable)
  intensity: 1.0,           // Base intensity multiplier [0, 2+]

  // Amplitude
  maxAmplitude: 1.5,        // Maximum position offset (meters)

  // Frequency
  frequency: 25,            // Oscillation frequency (Hz)

  // Damping
  dampingCurve: 2.0,        // Exponential damping (higher = faster decay)

  // Rotation shake (subtle)
  rotationAmplitude: 0.05,  // Maximum rotation offset (radians, ~3 degrees)
};

/**
 * Create camera shake controller
 * @param {Camera} camera - Babylon.js camera to shake
 * @param {Object} cfg - Optional config overrides
 * @returns {Object} Camera shake controller
 */
export function createCameraShake(camera, cfg = {}) {
  const config = { ...SHAKE_CONFIG, ...cfg };

  // Store original camera position and rotation
  const originalPosition = camera.position.clone();
  const originalRotation = camera.rotation ? camera.rotation.clone() : new Vector3(0, 0, 0);

  // Shake state
  const state = {
    active: false,
    age: 0,                 // Time since shake started (seconds)
    phaseOffset: 0,         // Random phase offset for variety
  };

  // Random offsets for each shake instance (deterministic if seeded)
  let phaseX = Math.random() * Math.PI * 2;
  let phaseY = Math.random() * Math.PI * 2;
  let phaseZ = Math.random() * Math.PI * 2;

  console.log('✓ Camera shake system created with intensity:', config.intensity);

  return {
    // Trigger shake
    trigger(intensityOverride = null) {
      state.active = true;
      state.age = 0;

      // Store current position as original (in case camera moved)
      originalPosition.copyFrom(camera.position);
      if (camera.rotation) {
        originalRotation.copyFrom(camera.rotation);
      }

      // Random phase offsets for variety
      phaseX = Math.random() * Math.PI * 2;
      phaseY = Math.random() * Math.PI * 2;
      phaseZ = Math.random() * Math.PI * 2;

      // Apply intensity override if provided
      if (intensityOverride !== null) {
        config.intensity = intensityOverride;
      }

      console.log('📷 Camera shake triggered (intensity: ' + config.intensity + ')');
    },

    // Update shake animation
    update(dtSec) {
      if (!state.active) return;

      state.age += dtSec;

      // Check if shake finished
      if (state.age >= config.duration) {
        state.active = false;
        // Reset camera to original position
        camera.position.copyFrom(originalPosition);
        if (camera.rotation) {
          camera.rotation.copyFrom(originalRotation);
        }
        return;
      }

      // Calculate progress [0, 1]
      const progress = state.age / config.duration;

      // Damping envelope (exponential decay)
      const damping = Math.pow(1.0 - progress, config.dampingCurve);

      // Current amplitude (scales with damping and intensity)
      const amplitude = config.maxAmplitude * damping * config.intensity;

      // Oscillation phase (increases with time)
      const phase = state.age * config.frequency * Math.PI * 2;

      // Calculate shake offsets using different frequencies for each axis
      const offsetX = Math.sin(phase + phaseX) * amplitude;
      const offsetY = Math.sin(phase * 1.3 + phaseY) * amplitude * 0.7; // Less vertical shake
      const offsetZ = Math.sin(phase * 0.8 + phaseZ) * amplitude * 0.5; // Even less Z shake

      // Apply position offset
      camera.position.x = originalPosition.x + offsetX;
      camera.position.y = originalPosition.y + offsetY;
      camera.position.z = originalPosition.z + offsetZ;

      // Apply subtle rotation shake (if camera supports rotation)
      if (camera.rotation) {
        const rotAmplitude = config.rotationAmplitude * damping * config.intensity;

        camera.rotation.x = originalRotation.x + Math.sin(phase * 1.5 + phaseX) * rotAmplitude;
        camera.rotation.y = originalRotation.y + Math.sin(phase * 1.2 + phaseY) * rotAmplitude;
        camera.rotation.z = originalRotation.z + Math.sin(phase * 1.8 + phaseZ) * rotAmplitude * 0.5;
      }
    },

    // Check if shake is active
    isActive() {
      return state.active;
    },

    // Stop shake immediately
    stop() {
      state.active = false;
      camera.position.copyFrom(originalPosition);
      if (camera.rotation) {
        camera.rotation.copyFrom(originalRotation);
      }
    },

    // Set intensity (useful for runtime configuration)
    setIntensity(newIntensity) {
      config.intensity = newIntensity;
      console.log('Camera shake intensity updated to:', newIntensity);
    },

    // Get current intensity
    getIntensity() {
      return config.intensity;
    },
  };
}
