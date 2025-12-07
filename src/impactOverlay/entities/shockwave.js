/**
 * Shockwave Ring Effect
 * Fast expanding energy ring with purple/teal glow
 * Designed for future starfield distortion integration
 */

import {
  Mesh,
  MeshBuilder,
  ShaderMaterial,
  Vector3,
  Effect,
  Color3,
} from 'https://esm.sh/@babylonjs/core@7';

/**
 * Shockwave configuration
 */
const SHOCKWAVE_CONFIG = {
  // Timing
  triggerT: 0.95,           // Timeline T when shockwave starts
  delay: 0.1,               // Delay after explosion trigger (seconds)
  duration: 1.5,            // Shockwave duration (seconds)

  // Expansion
  initialRadius: 5,         // Starting radius (meters)
  maxRadius: 300,           // Maximum expansion radius (meters)
  expansionSpeed: 200,      // Meters per second (very fast)

  // Ring geometry
  thickness: 8,             // Ring thickness (meters)
  segments: 64,             // Ring segments (higher = smoother)

  // Visual
  color: { r: 0.3, g: 0.9, b: 1.0 },        // Bright cyan/teal
  edgeColor: { r: 0.6, g: 0.4, b: 1.0 },    // Purple edge glow

  // Intensity
  peakIntensity: 6.0,       // Peak brightness
  fadeStart: 0.4,           // When fade begins (fraction of duration)

  // Future: distortion parameters (for starfield warping)
  distortionStrength: 0.5,  // Placeholder for future implementation
  distortionFalloff: 2.0,   // How quickly distortion fades
};

/**
 * Create shockwave controller
 * @param {Scene} scene - Babylon.js scene
 * @param {Vector3} position - Shockwave origin position
 * @param {Object} cfg - Optional config overrides
 * @returns {Object} Shockwave controller
 */
export function createShockwave(scene, position, cfg = {}) {
  const config = { ...SHOCKWAVE_CONFIG, ...cfg };

  // Create torus (ring) mesh
  const shockwaveMesh = MeshBuilder.CreateTorus(
    'shockwave',
    {
      diameter: config.initialRadius * 2,
      thickness: config.thickness,
      tessellation: config.segments,
    },
    scene
  );

  shockwaveMesh.position.copyFrom(position);
  shockwaveMesh.rotation.x = Math.PI / 2; // Rotate to horizontal
  shockwaveMesh.isVisible = false; // Start hidden

  // Create shader material for glowing ring
  const material = createShockwaveShader(scene, config);
  shockwaveMesh.material = material;

  // Shockwave state
  const state = {
    active: false,
    triggered: false,
    age: 0,                 // Time since shockwave started (seconds)
    currentRadius: config.initialRadius,
    intensity: 0,
  };

  console.log('✓ Shockwave effect created at position:', position);

  return {
    // Trigger shockwave
    trigger(impactPosition) {
      state.triggered = true;
      shockwaveMesh.position.copyFrom(impactPosition);
      console.log('⚡ Shockwave triggered (with delay)');
    },

    // Update shockwave animation
    update(dtSec) {
      // Handle delayed trigger
      if (state.triggered && !state.active) {
        state.age += dtSec;
        if (state.age >= config.delay) {
          state.active = true;
          state.age = 0;
          shockwaveMesh.isVisible = true;
        }
        return;
      }

      if (!state.active) return;

      state.age += dtSec;

      // Check if shockwave finished
      if (state.age >= config.duration) {
        state.active = false;
        state.triggered = false;
        shockwaveMesh.isVisible = false;
        return;
      }

      // Calculate progress [0, 1]
      const progress = state.age / config.duration;

      // Linear expansion (constant speed)
      state.currentRadius = config.initialRadius + config.expansionSpeed * state.age;

      // Update mesh scale
      const scale = state.currentRadius / (config.initialRadius / 2);
      shockwaveMesh.scaling.set(scale, scale, 1.0); // Don't scale thickness (z)

      // Intensity curve: peak quickly, then fade
      if (progress < config.fadeStart) {
        // Rising phase
        const riseProgress = progress / config.fadeStart;
        state.intensity = riseProgress * config.peakIntensity;
      } else {
        // Fade phase
        const fadeProgress = (progress - config.fadeStart) / (1.0 - config.fadeStart);
        state.intensity = config.peakIntensity * (1.0 - fadeProgress);
      }

      // Update shader uniforms
      material.setFloat('progress', progress);
      material.setFloat('intensity', state.intensity);
      material.setFloat('time', state.age);
    },

    // Check if shockwave is active
    isActive() {
      return state.active || state.triggered;
    },

    // Get current state (useful for future distortion calculations)
    getState() {
      return {
        active: state.active,
        age: state.age,
        radius: state.currentRadius,
        intensity: state.intensity,
        thickness: config.thickness,
      };
    },

    // Dispose resources
    dispose() {
      shockwaveMesh.dispose();
      material.dispose();
    },
  };
}

/**
 * Create shockwave shader material with glowing ring effect
 */
function createShockwaveShader(scene, config) {
  // Vertex shader
  Effect.ShadersStore['shockwaveVertexShader'] = `
    precision highp float;

    // Attributes
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;

    // Uniforms
    uniform mat4 worldViewProjection;
    uniform mat4 world;
    uniform vec3 cameraPosition;

    // Varyings
    varying vec3 vNormalWS;
    varying vec3 vPositionWS;
    varying vec3 vViewDir;
    varying vec2 vUV;

    void main() {
      vec4 worldPos = world * vec4(position, 1.0);
      vPositionWS = worldPos.xyz;
      vNormalWS = normalize((world * vec4(normal, 0.0)).xyz);
      vViewDir = normalize(cameraPosition - worldPos.xyz);
      vUV = uv;

      gl_Position = worldViewProjection * vec4(position, 1.0);
    }
  `;

  // Fragment shader
  Effect.ShadersStore['shockwaveFragmentShader'] = `
    precision highp float;

    // Varyings
    varying vec3 vNormalWS;
    varying vec3 vPositionWS;
    varying vec3 vViewDir;
    varying vec2 vUV;

    // Uniforms
    uniform vec3 ringColor;      // Main ring color (cyan/teal)
    uniform vec3 edgeColor;      // Edge glow color (purple)
    uniform float progress;      // Progress [0, 1]
    uniform float intensity;     // Brightness multiplier
    uniform float time;          // Time for animation

    // Simple noise function for energy ripples
    float hash(vec2 p) {
      p = fract(p * vec2(0.3183099, 0.1));
      p *= 17.0;
      return fract(p.x * p.y * (p.x + p.y));
    }

    float noise2D(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);

      return mix(
        mix(hash(i), hash(i + vec2(1,0)), f.x),
        mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
        f.y
      );
    }

    void main() {
      // Radial gradient from inner to outer edge of ring
      float radialGradient = abs(vUV.y - 0.5) * 2.0; // 0 at center, 1 at edges

      // Energy ripples (animated noise)
      float ripples = noise2D(vec2(vUV.x * 20.0, time * 5.0));
      radialGradient = mix(radialGradient, ripples, 0.3);

      // Color gradient: core (cyan) to edge (purple)
      vec3 color = mix(ringColor, edgeColor, radialGradient);

      // Fresnel effect (edge brightening)
      float fresnel = pow(1.0 - max(dot(vViewDir, vNormalWS), 0.0), 1.5);

      // Combine color with intensity and fresnel
      vec3 finalColor = color * intensity * (1.0 + fresnel * 2.0);

      // Alpha: fade at edges and with progress
      float alpha = (1.0 - radialGradient * 0.7) * (1.0 - progress * 0.5);
      alpha = clamp(alpha, 0.0, 1.0);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `;

  // Create shader material
  const shaderMaterial = new ShaderMaterial('shockwaveShader', scene, {
    vertex: 'shockwave',
    fragment: 'shockwave',
  }, {
    attributes: ['position', 'normal', 'uv'],
    uniforms: [
      'worldViewProjection', 'world', 'cameraPosition',
      'ringColor', 'edgeColor',
      'progress', 'intensity', 'time'
    ],
  });

  // Set initial uniform values
  shaderMaterial.setVector3('ringColor', new Vector3(
    config.color.r,
    config.color.g,
    config.color.b
  ));
  shaderMaterial.setVector3('edgeColor', new Vector3(
    config.edgeColor.r,
    config.edgeColor.g,
    config.edgeColor.b
  ));
  shaderMaterial.setFloat('progress', 0);
  shaderMaterial.setFloat('intensity', 0);
  shaderMaterial.setFloat('time', 0);

  // Enable transparency (additive blending)
  shaderMaterial.alphaMode = 2; // Additive
  shaderMaterial.backFaceCulling = false;
  shaderMaterial.needAlphaBlending = () => true;

  return shaderMaterial;
}
