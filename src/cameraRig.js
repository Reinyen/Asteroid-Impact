/**
 * Camera rig module - handles camera positioning and shake effects
 */

import { Vector3 } from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';
import { T_IMPACT, IMPACT_POINT, ease } from './timeline.js';

/**
 * Deterministic pseudo-random number generator
 * Uses sine-based hash for repeatability
 */
class SeededRandom {
  constructor(seed = 12345) {
    this.seed = seed;
  }

  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  range(min, max) {
    return min + this.next() * (max - min);
  }
}

/**
 * CameraRig - manages camera movement and shake
 */
export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.basePosition = new Vector3(0, 6, 16);
    this.baseLookAt = new Vector3(0, 2, 0);
    this.shakeOffset = new Vector3();
    this.lookAtOffset = new Vector3();
    this.random = new SeededRandom(42);

    // Shake configuration
    this.shakeIntensity = 0;
    this.maxShakeDistance = 0.8;
    this.maxShakeRotation = 0.15;
    this.shakeFrequency = 0.05;

    // Temporary vectors for calculations
    this._targetPos = new Vector3();
    this._targetLookAt = new Vector3();
    this._currentVel = new Vector3();
  }

  /**
   * Reset to base framing
   */
  reset() {
    this.basePosition.set(0, 6, 16);
    this.baseLookAt.set(0, 2, 0);
    this.shakeOffset.set(0, 0, 0);
    this.lookAtOffset.set(0, 0, 0);
    this.shakeIntensity = 0;
    this.random = new SeededRandom(42);
  }

  /**
   * Calculate shake intensity based on timeline
   */
  calculateShakeIntensity(timeline) {
    const t = timeline.t;
    const phase = timeline.getCurrentPhase();

    // No shake in far approach
    if (phase.key === 'FAR_APPROACH') {
      return 0;
    }

    // Gentle rumble in mid approach
    if (phase.key === 'MID_APPROACH') {
      const progress = timeline.getPhaseProgress();
      return ease.inQuad(progress) * 0.15;
    }

    // Ramp up dramatically during near rush
    if (phase.key === 'NEAR_RUSH') {
      const progress = timeline.getPhaseProgress();
      return 0.15 + ease.inCubic(progress) * 0.55; // 0.15 -> 0.7
    }

    // Peak at impact
    if (phase.key === 'IMPACT') {
      return 1.0;
    }

    // Decay in aftermath
    if (phase.key === 'AFTERMATH') {
      const timeSinceImpact = timeline.getTimeSinceImpact();
      const decayDuration = 0.15; // Normalized time
      const decayProgress = Math.min(1, timeSinceImpact / decayDuration);
      return 1.0 * (1 - ease.outCubic(decayProgress));
    }

    return 0;
  }

  /**
   * Generate deterministic shake offset
   */
  generateShake(t, intensity) {
    if (intensity <= 0.001) {
      this.shakeOffset.set(0, 0, 0);
      this.lookAtOffset.set(0, 0, 0);
      return;
    }

    // Use time-based deterministic noise
    const freq = this.shakeFrequency;
    const seed1 = Math.sin(t * freq * 100 + 0.1) * Math.cos(t * freq * 73 + 0.5);
    const seed2 = Math.sin(t * freq * 87 + 0.3) * Math.cos(t * freq * 129 + 0.7);
    const seed3 = Math.sin(t * freq * 151 + 0.9) * Math.cos(t * freq * 97 + 1.1);

    // Position shake
    const shakeAmount = intensity * this.maxShakeDistance;
    this.shakeOffset.set(
      seed1 * shakeAmount,
      seed2 * shakeAmount * 0.7, // Less vertical shake
      seed3 * shakeAmount * 0.5
    );

    // Look-at shake (rotation)
    const rotAmount = intensity * this.maxShakeRotation;
    this.lookAtOffset.set(
      seed2 * rotAmount,
      seed3 * rotAmount,
      seed1 * rotAmount * 0.3
    );
  }

  /**
   * Update camera framing based on asteroid position
   */
  updateFraming(asteroidPosition, timeline) {
    const phase = timeline.getCurrentPhase();
    const progress = timeline.getPhaseProgress();

    // Adjust base position and look-at based on phase
    if (phase.key === 'FAR_APPROACH') {
      // Wide establishing shot
      this.basePosition.set(0, 8, 18);
      this.baseLookAt.set(0, 10, -20);
    } else if (phase.key === 'MID_APPROACH') {
      // Track asteroid as it approaches
      const targetY = 5 + asteroidPosition.y * 0.3;
      this.basePosition.set(0, 6, 16);
      this.baseLookAt.lerp(asteroidPosition, 0.3);
      this.baseLookAt.y = targetY;
    } else if (phase.key === 'NEAR_RUSH') {
      // Dynamic tracking, camera pulls back slightly
      this.basePosition.set(0, 5, 17);
      this.baseLookAt.copy(asteroidPosition);
    } else if (phase.key === 'IMPACT' || phase.key === 'AFTERMATH') {
      // Focus on impact point
      this.basePosition.set(0, 4, 15);
      this.baseLookAt.set(IMPACT_POINT.x, IMPACT_POINT.y, IMPACT_POINT.z);
    }
  }

  /**
   * Update camera rig - call every frame
   */
  update(timeline, asteroidPosition) {
    // Calculate shake intensity
    this.shakeIntensity = this.calculateShakeIntensity(timeline);

    // Update framing
    this.updateFraming(asteroidPosition, timeline);

    // Generate shake
    this.generateShake(timeline.t, this.shakeIntensity);

    // Apply to camera
    this._targetPos.copy(this.basePosition).add(this.shakeOffset);
    this._targetLookAt.copy(this.baseLookAt).add(this.lookAtOffset);

    // Smooth interpolation to avoid jitter
    this.camera.position.lerp(this._targetPos, 0.1);
    this.camera.lookAt(this._targetLookAt);

    // Safety check for NaN
    if (
      !isFinite(this.camera.position.x) ||
      !isFinite(this.camera.position.y) ||
      !isFinite(this.camera.position.z)
    ) {
      console.warn('Camera position became NaN, resetting');
      this.camera.position.copy(this.basePosition);
    }
  }
}
