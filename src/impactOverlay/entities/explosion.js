/**
 * Explosion Effect
 * Fast, realistic fireball explosion with purple/teal/blue colors
 * Triggered at impact (T ≈ 0.95)
 */

import {
  Mesh,
  MeshBuilder,
  StandardMaterial,
  ShaderMaterial,
  Color3,
  Vector3,
  Effect,
} from 'https://esm.sh/@babylonjs/core@7';

/**
 * Explosion configuration
 */
const EXPLOSION_CONFIG = {
  // Timing
  triggerT: 0.95,           // Timeline T when explosion starts
  duration: 0.8,            // Explosion duration in seconds (fast, realistic)
  fadeStart: 0.5,           // When fade-out begins (fraction of duration)

  // Expansion
  initialRadius: 1,         // Starting radius (meters)
  maxRadius: 150,           // Maximum expansion radius (meters)
  expansionCurve: 2.5,      // Power curve for expansion (>1 = faster initial expansion)

  // Visual
  coreColor: { r: 0.8, g: 1.0, b: 1.0 },     // Bright cyan core
  midColor: { r: 0.4, g: 0.7, b: 1.0 },      // Teal mid-range
  outerColor: { r: 0.6, g: 0.3, b: 1.0 },    // Purple outer edge

  // Intensity
  peakIntensity: 8.0,       // Peak emissive/bloom intensity

  // Mesh detail
  segments: 32,             // Sphere segments (quality vs performance)
};

/**
 * Create explosion controller
 * @param {Scene} scene - Babylon.js scene
 * @param {Vector3} position - Explosion center position
 * @param {Object} cfg - Optional config overrides
 * @returns {Object} Explosion controller
 */
export function createExplosion(scene, position, cfg = {}) {
  const config = { ...EXPLOSION_CONFIG, ...cfg };

  // Create explosion sphere mesh
  const explosionMesh = MeshBuilder.CreateSphere(
    'explosion',
    {
      diameter: config.initialRadius * 2,
      segments: config.segments,
    },
    scene
  );

  explosionMesh.position.copyFrom(position);
  explosionMesh.isVisible = false; // Start hidden

  // Create shader material for dynamic color gradient
  const material = createExplosionShader(scene, config);
  explosionMesh.material = material;

  // Explosion state
  const state = {
    active: false,
    age: 0,                 // Time since explosion started (seconds)
    currentRadius: config.initialRadius,
    intensity: 0,
  };

  console.log('✓ Explosion effect created at position:', position);

  return {
    // Trigger explosion
    trigger(impactPosition) {
      state.active = true;
      state.age = 0;
      explosionMesh.position.copyFrom(impactPosition);
      explosionMesh.isVisible = true;
      console.log('💥 Explosion triggered at T=' + impactPosition);
    },

    // Update explosion animation
    update(dtSec) {
      if (!state.active) return;

      state.age += dtSec;

      // Check if explosion finished
      if (state.age >= config.duration) {
        state.active = false;
        explosionMesh.isVisible = false;
        return;
      }

      // Calculate explosion progress [0, 1]
      const progress = state.age / config.duration;

      // Expansion with power curve (fast initial expansion)
      const expansionFactor = Math.pow(progress, 1.0 / config.expansionCurve);
      state.currentRadius = config.initialRadius +
        (config.maxRadius - config.initialRadius) * expansionFactor;

      // Update mesh scale
      const scale = state.currentRadius / (config.initialRadius / 2);
      explosionMesh.scaling.set(scale, scale, scale);

      // Intensity curve: ramp up quickly, fade out gradually
      if (progress < config.fadeStart) {
        // Rising phase: exponential growth
        const riseProgress = progress / config.fadeStart;
        state.intensity = Math.pow(riseProgress, 0.5) * config.peakIntensity;
      } else {
        // Fade phase: exponential decay
        const fadeProgress = (progress - config.fadeStart) / (1.0 - config.fadeStart);
        state.intensity = config.peakIntensity * Math.pow(1.0 - fadeProgress, 2.0);
      }

      // Update shader uniforms
      material.setFloat('progress', progress);
      material.setFloat('intensity', state.intensity);
      material.setFloat('time', state.age);
    },

    // Check if explosion is active
    isActive() {
      return state.active;
    },

    // Get current state
    getState() {
      return {
        active: state.active,
        age: state.age,
        radius: state.currentRadius,
        intensity: state.intensity,
      };
    },

    // Dispose resources
    dispose() {
      explosionMesh.dispose();
      material.dispose();
    },
  };
}

/**
 * Create explosion shader material with dynamic color gradient
 */
function createExplosionShader(scene, config) {
  // Vertex shader
  Effect.ShadersStore['explosionVertexShader'] = `
    precision highp float;

    // Attributes
    attribute vec3 position;
    attribute vec3 normal;

    // Uniforms
    uniform mat4 worldViewProjection;
    uniform mat4 world;
    uniform vec3 cameraPosition;

    // Varyings
    varying vec3 vNormalWS;
    varying vec3 vPositionWS;
    varying vec3 vViewDir;
    varying float vDistanceFromCenter;

    void main() {
      vec4 worldPos = world * vec4(position, 1.0);
      vPositionWS = worldPos.xyz;
      vNormalWS = normalize((world * vec4(normal, 0.0)).xyz);
      vViewDir = normalize(cameraPosition - worldPos.xyz);

      // Distance from sphere center (0 at center, 1 at surface)
      vDistanceFromCenter = length(position);

      gl_Position = worldViewProjection * vec4(position, 1.0);
    }
  `;

  // Fragment shader
  Effect.ShadersStore['explosionFragmentShader'] = `
    precision highp float;

    // Varyings
    varying vec3 vNormalWS;
    varying vec3 vPositionWS;
    varying vec3 vViewDir;
    varying float vDistanceFromCenter;

    // Uniforms
    uniform vec3 coreColor;      // Bright cyan core
    uniform vec3 midColor;       // Teal mid-range
    uniform vec3 outerColor;     // Purple outer edge
    uniform float progress;      // Explosion progress [0, 1]
    uniform float intensity;     // Brightness multiplier
    uniform float time;          // Time for animation

    // Simple noise function
    float hash(vec3 p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }

    float noise3D(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);

      return mix(
        mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
            mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
            mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
        f.z
      );
    }

    void main() {
      // Radial gradient from center to edge
      float radialGradient = vDistanceFromCenter;

      // Add turbulence
      vec3 noiseCoord = vPositionWS * 2.0 + vec3(0.0, time * 2.0, 0.0);
      float turbulence = noise3D(noiseCoord);
      radialGradient = mix(radialGradient, turbulence, 0.3);

      // Three-color gradient: core (cyan) -> mid (teal) -> outer (purple)
      vec3 color;
      if (radialGradient < 0.5) {
        // Core to mid transition
        float t = radialGradient / 0.5;
        color = mix(coreColor, midColor, t);
      } else {
        // Mid to outer transition
        float t = (radialGradient - 0.5) / 0.5;
        color = mix(midColor, outerColor, t);
      }

      // Fresnel effect (edge glow)
      float fresnel = pow(1.0 - max(dot(vViewDir, vNormalWS), 0.0), 2.0);

      // Combine color with intensity and fresnel
      vec3 finalColor = color * intensity * (1.0 + fresnel * 0.5);

      // Alpha: more opaque at edges, fade with progress
      float alpha = (1.0 - radialGradient * 0.5) * (1.0 - progress * 0.3);
      alpha = clamp(alpha, 0.0, 1.0);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `;

  // Create shader material
  const shaderMaterial = new ShaderMaterial('explosionShader', scene, {
    vertex: 'explosion',
    fragment: 'explosion',
  }, {
    attributes: ['position', 'normal'],
    uniforms: [
      'worldViewProjection', 'world', 'cameraPosition',
      'coreColor', 'midColor', 'outerColor',
      'progress', 'intensity', 'time'
    ],
  });

  // Set initial uniform values
  shaderMaterial.setVector3('coreColor', new Vector3(
    config.coreColor.r,
    config.coreColor.g,
    config.coreColor.b
  ));
  shaderMaterial.setVector3('midColor', new Vector3(
    config.midColor.r,
    config.midColor.g,
    config.midColor.b
  ));
  shaderMaterial.setVector3('outerColor', new Vector3(
    config.outerColor.r,
    config.outerColor.g,
    config.outerColor.b
  ));
  shaderMaterial.setFloat('progress', 0);
  shaderMaterial.setFloat('intensity', 0);
  shaderMaterial.setFloat('time', 0);

  // Enable transparency (additive blending for bright explosion)
  shaderMaterial.alphaMode = 2; // Additive blending
  shaderMaterial.backFaceCulling = false;
  shaderMaterial.needAlphaBlending = () => true;

  return shaderMaterial;
}
