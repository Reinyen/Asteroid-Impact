/**
 * Quality presets and global constants
 */

export const QUALITY_PRESETS = {
  High: {
    starCount: 500,
    groundSegments: 40,
    pixelRatio: 2,
    antialias: true,
    shadowMapSize: 1024,
  },
  Low: {
    starCount: 200,
    groundSegments: 20,
    pixelRatio: 1,
    antialias: false,
    shadowMapSize: 512,
  },
};

export const TIMELINE_CONFIG = {
  totalDuration: 22.0, // seconds
  fixedTimeStep: 1 / 60, // 60 FPS fixed timestep for determinism
};

export const SCENE_CONFIG = {
  backgroundColor: 0x04060f,
  fogColor: 0x04060f,
  fogDensity: 0.015,
};

export const DEFAULT_SEED = 12345;
