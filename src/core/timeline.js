/**
 * Deterministic Timeline Driver with Fixed Timestep
 * Ensures reproducible simulation across restarts
 */

import { TIMELINE_CONFIG } from '../config/presets.js';

export class Timeline {
  constructor(seed = 12345) {
    this.seed = seed;
    this.totalDuration = TIMELINE_CONFIG.totalDuration;
    this.fixedTimeStep = TIMELINE_CONFIG.fixedTimeStep;

    // State
    this.isPlaying = false;
    this.timeSeconds = 0.0;
    this.accumulator = 0.0;
    this.lastRealTime = 0.0;

    // Derived
    this.T = 0.0; // Normalized time [0, 1]
    this.phaseName = 'Idle';
  }

  /**
   * Start or restart timeline
   */
  restart(currentRealTime) {
    this.isPlaying = true;
    this.timeSeconds = 0.0;
    this.accumulator = 0.0;
    this.lastRealTime = currentRealTime;
    this.T = 0.0;
    this.updatePhase();
  }

  /**
   * Pause timeline
   */
  pause() {
    this.isPlaying = false;
  }

  /**
   * Resume timeline
   */
  resume(currentRealTime) {
    this.isPlaying = true;
    this.lastRealTime = currentRealTime;
  }

  /**
   * Update timeline with fixed timestep simulation
   * @param {number} currentRealTime - Current real time in seconds
   */
  update(currentRealTime) {
    if (!this.isPlaying) {
      return;
    }

    // Calculate delta time since last update
    const deltaTime = currentRealTime - this.lastRealTime;
    this.lastRealTime = currentRealTime;

    // Accumulate time
    this.accumulator += deltaTime;

    // Fixed timestep updates
    while (this.accumulator >= this.fixedTimeStep) {
      this.timeSeconds += this.fixedTimeStep;
      this.accumulator -= this.fixedTimeStep;

      // Loop timeline
      if (this.timeSeconds >= this.totalDuration) {
        this.timeSeconds = this.timeSeconds % this.totalDuration;
      }
    }

    // Update normalized T
    this.T = Math.min(1.0, this.timeSeconds / this.totalDuration);

    // Update phase
    this.updatePhase();
  }

  /**
   * Update current phase based on T
   * Phase boundaries can be customized here
   */
  updatePhase() {
    if (!this.isPlaying) {
      this.phaseName = 'Idle';
    } else if (this.T < 0.3) {
      this.phaseName = 'Far Approach';
    } else if (this.T < 0.6) {
      this.phaseName = 'Mid Approach';
    } else if (this.T < 0.85) {
      this.phaseName = 'Near Rush';
    } else if (this.T < 0.87) {
      this.phaseName = 'Impact';
    } else {
      this.phaseName = 'Aftermath';
    }
  }

  /**
   * Get current timeline state
   */
  getState() {
    return {
      T: this.T,
      timeSeconds: this.timeSeconds,
      phaseName: this.phaseName,
      isPlaying: this.isPlaying,
      seed: this.seed,
    };
  }

  /**
   * Set new seed (requires restart to take effect)
   */
  setSeed(newSeed) {
    this.seed = newSeed;
  }
}
