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
    width: 30,              // Reduced from 100 to minimize viewport coverage
    height: 30,             // Reduced from 100
    subdivisions: 32,       // Reduced subdivisions for smaller area
    material: {
      // PBR base properties
      albedo: { r: 0.01, g: 0.008, b: 0.006 }, // Even darker to reduce prominence
      metallic: 0.0,
      roughness: 0.95,      // Increased roughness to reduce reflections
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
      intensity: 0.4,          // Reduced from 0.6 to darken ground
      color: { r: 0.95, g: 0.95, b: 1.0 }, // Slight blue tint
    },
    // Ambient hemispheric light
    ambient: {
      direction: { x: 0, y: 1, z: 0 },
      intensity: 0.08,         // Reduced from 0.15 to minimize ground visibility
      groundColor: { r: 0.02, g: 0.015, b: 0.01 }, // Darker ground color
      skyColor: { r: 0.05, g: 0.05, b: 0.08 },     // Darker sky color
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
