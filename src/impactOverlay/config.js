/**
 * Babylon.js Overlay Configuration
 * All scene, rendering, and pipeline settings
 */

export const OVERLAY_CONFIG = {
  // Camera settings
  camera: {
    fov: 60, // Match three.js camera
    position: { x: 0, y: 6, z: 16 },
    target: { x: 0, y: 0, z: 0 },
    minZ: 0.1,
    maxZ: 2000,
  },

  // Ground plane settings
  ground: {
    width: 100,
    height: 100,
    subdivisions: 64,
    material: {
      // PBR base properties
      albedo: { r: 0.15, g: 0.12, b: 0.1 }, // Dark soil/rock
      metallic: 0.0,
      roughness: 0.85,
      // Procedural texture settings
      normalStrength: 0.5,
      roughnessVariation: 0.3,
    },
  },

  // Lighting settings
  lighting: {
    // Primary directional light (moon/sun)
    primary: {
      direction: { x: -0.5, y: -1, z: -0.3 },
      intensity: 1.2,
      color: { r: 0.95, g: 0.95, b: 1.0 }, // Slight blue tint
    },
    // Ambient hemispheric light
    ambient: {
      direction: { x: 0, y: 1, z: 0 },
      intensity: 0.3,
      groundColor: { r: 0.1, g: 0.08, b: 0.06 },
      skyColor: { r: 0.2, g: 0.2, b: 0.3 },
    },
  },

  // Post-processing pipeline settings
  postProcessing: {
    enabled: true,
    samples: 4, // MSAA samples
    fxaa: {
      enabled: true,
    },
    bloom: {
      enabled: true,
      threshold: 0.8,
      weight: 0.3,
      kernel: 64,
    },
    imageProcessing: {
      enabled: true,
      contrast: 1.1,
      exposure: 1.0,
      toneMappingEnabled: true,
      toneMappingType: 0, // 0 = Standard, 1 = ACES
    },
    depthOfField: {
      enabled: false, // Can enable for cinematic effect
      focalLength: 50,
      fStop: 1.4,
      focusDistance: 2000,
    },
  },

  // Procedural texture settings
  proceduralTextures: {
    normalMap: {
      size: 512,
      octaves: 4,
      persistence: 0.5,
      scale: 8.0,
    },
    roughnessMap: {
      size: 512,
      octaves: 3,
      persistence: 0.4,
      scale: 4.0,
    },
  },
};
