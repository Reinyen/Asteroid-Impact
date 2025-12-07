/**
 * UI Overlay - User interface controls and status display
 */

export class UIOverlay {
  constructor(timeline, onRestart, onQualityChange, onSeedChange) {
    this.timeline = timeline;
    this.onRestart = onRestart;
    this.onQualityChange = onQualityChange;
    this.onSeedChange = onSeedChange;

    // UI Elements
    this.btnPlay = document.getElementById('btn-play');
    this.btnQuality = document.getElementById('btn-quality');
    this.inputSeed = document.getElementById('input-seed');

    // Status display elements
    this.statusState = document.getElementById('status-state');
    this.statusT = document.getElementById('status-t');
    this.statusTime = document.getElementById('status-time');
    this.statusPhase = document.getElementById('status-phase');
    this.statusSeed = document.getElementById('status-seed');

    // State
    this.currentQuality = 'High';

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Play / Restart button
    this.btnPlay.addEventListener('click', () => {
      if (this.timeline.isPlaying) {
        this.timeline.pause();
        this.btnPlay.classList.remove('active');
      } else {
        const currentTime = performance.now() / 1000;
        this.onRestart(currentTime);
        this.btnPlay.classList.add('active');
      }
    });

    // Quality toggle
    this.btnQuality.addEventListener('click', () => {
      this.currentQuality = this.currentQuality === 'High' ? 'Low' : 'High';
      this.btnQuality.textContent = this.currentQuality;
      this.onQualityChange(this.currentQuality);
    });

    // Seed input
    this.inputSeed.addEventListener('change', (e) => {
      const newSeed = parseInt(e.target.value, 10);
      if (!isNaN(newSeed)) {
        this.onSeedChange(newSeed);
      }
    });

    // Also trigger on Enter key
    this.inputSeed.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const newSeed = parseInt(e.target.value, 10);
        if (!isNaN(newSeed)) {
          this.onSeedChange(newSeed);
        }
      }
    });
  }

  /**
   * Update status display
   */
  update() {
    const state = this.timeline.getState();

    this.statusState.textContent = state.isPlaying ? 'Playing' : 'Idle';
    this.statusT.textContent = state.T.toFixed(3);
    this.statusTime.textContent = state.timeSeconds.toFixed(2) + 's';
    this.statusPhase.textContent = state.phaseName;
    this.statusSeed.textContent = state.seed.toString();

    // Update button state
    if (state.isPlaying) {
      this.btnPlay.classList.add('active');
    } else {
      this.btnPlay.classList.remove('active');
    }
  }

  /**
   * Set seed input value
   */
  setSeedValue(seed) {
    this.inputSeed.value = seed;
  }

  /**
   * Get current quality setting
   */
  getQuality() {
    return this.currentQuality;
  }
}
