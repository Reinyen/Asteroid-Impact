/**
 * Timeline module - defines cinematic phases and timing
 * Single source of truth for impact event and sequencing
 */

// Impact configuration - single source of truth
export const T_IMPACT = 0.85;
export const IMPACT_POINT = { x: 0, y: 0, z: -8 };
export const TIMELINE_DURATION_MS = 12000;

// Phase boundaries (normalized time 0-1)
export const PHASES = {
  FAR_APPROACH: { start: 0.0, end: 0.3, name: 'Far Approach' },
  MID_APPROACH: { start: 0.3, end: 0.6, name: 'Mid Approach' },
  NEAR_RUSH: { start: 0.6, end: T_IMPACT, name: 'Near Rush' },
  IMPACT: { start: T_IMPACT, end: T_IMPACT + 0.02, name: 'Impact' },
  AFTERMATH: { start: T_IMPACT + 0.02, end: 1.0, name: 'Aftermath' },
};

/**
 * TimelineDriver - manages deterministic playback
 */
export class TimelineDriver {
  constructor(durationMs = TIMELINE_DURATION_MS) {
    this.duration = durationMs;
    this.playing = false;
    this.t = 0;
    this._startTime = null;
    this._pausedAt = 0;
  }

  restart(startTimeMs) {
    this.playing = true;
    this._startTime = startTimeMs ?? performance.now();
    this._pausedAt = 0;
    this.t = 0;
  }

  stop() {
    this.playing = false;
    this._pausedAt = this.t * this.duration;
  }

  update(nowMs) {
    if (!this.playing || this._startTime === null) return this.t;

    const elapsed = nowMs - this._startTime;
    const looped = elapsed % this.duration;
    this.t = Math.min(1, looped / this.duration);

    return this.t;
  }

  getCurrentPhase() {
    for (const [key, phase] of Object.entries(PHASES)) {
      if (this.t >= phase.start && this.t < phase.end) {
        return { ...phase, key };
      }
    }
    return { ...PHASES.AFTERMATH, key: 'AFTERMATH' };
  }

  /**
   * Get normalized progress within current phase (0-1)
   */
  getPhaseProgress() {
    const phase = this.getCurrentPhase();
    const phaseLength = phase.end - phase.start;
    if (phaseLength === 0) return 1.0;
    return Math.min(1, (this.t - phase.start) / phaseLength);
  }

  /**
   * Check if impact has occurred
   */
  hasImpacted() {
    return this.t >= T_IMPACT;
  }

  /**
   * Get time since impact (0 if not yet impacted)
   */
  getTimeSinceImpact() {
    return this.hasImpacted() ? this.t - T_IMPACT : 0;
  }
}

/**
 * Easing functions for smooth motion
 */
export const ease = {
  inQuad: (t) => t * t,
  outQuad: (t) => t * (2 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  inCubic: (t) => t * t * t,
  outCubic: (t) => --t * t * t + 1,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  inQuart: (t) => t * t * t * t,
  outQuart: (t) => 1 - --t * t * t * t,
};
