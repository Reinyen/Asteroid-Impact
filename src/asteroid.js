/**
 * Asteroid module - handles asteroid geometry, motion, and visual effects
 * Enhanced with LOD system and heating/ablation effects
 */

import {
  Mesh,
  SphereGeometry,
  MeshStandardMaterial,
  Vector3,
  Color,
} from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';
import { T_IMPACT, IMPACT_POINT, ease } from './timeline.js';

/**
 * Create procedural asteroid geometry with varying LOD levels
 */
function createAsteroidGeometry(lodLevel = 'mid', quality = 'High') {
  let geometry;
  let baseRadius = 1.2;
  let noiseIntensity = 0.2;

  if (lodLevel === 'far') {
    // Far LOD: Simple impostor/low poly for distant view
    const segments = quality === 'High' ? 8 : 6;
    geometry = new SphereGeometry(baseRadius, segments, segments);
    noiseIntensity = 0.15;
  } else if (lodLevel === 'mid') {
    // Mid LOD: Medium detail with normal variation
    const widthSegments = quality === 'High' ? 24 : 16;
    const heightSegments = quality === 'High' ? 24 : 16;
    geometry = new SphereGeometry(baseRadius, widthSegments, heightSegments);
    noiseIntensity = 0.22;
  } else if (lodLevel === 'near') {
    // Near LOD: Highest detail with procedural variation
    const widthSegments = quality === 'High' ? 40 : 28;
    const heightSegments = quality === 'High' ? 40 : 28;
    geometry = new SphereGeometry(baseRadius, widthSegments, heightSegments);
    noiseIntensity = 0.28;
  }

  // Add procedural irregularity to vertices for rocky appearance
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const vertex = new Vector3(
      positions.getX(i),
      positions.getY(i),
      positions.getZ(i)
    );

    // Multi-octave noise for more natural appearance
    const noise1 =
      Math.sin(vertex.x * 3.7 + vertex.y * 2.3) *
      Math.cos(vertex.z * 4.1 + vertex.y * 1.9);

    const noise2 =
      Math.sin(vertex.x * 7.3 + vertex.z * 5.1) *
      Math.cos(vertex.y * 6.7 + vertex.x * 4.9) * 0.5;

    const noise3 =
      Math.sin(vertex.z * 11.3 + vertex.y * 9.7) *
      Math.cos(vertex.x * 8.9 + vertex.z * 7.3) * 0.25;

    const combinedNoise = (noise1 + noise2 + noise3) * noiseIntensity;

    vertex.multiplyScalar(1 + combinedNoise);
    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Create material for asteroid with heating effects
 */
function createAsteroidMaterial(heatingIntensity = 0) {
  // Base color: dark rocky gray
  const baseColor = new Color(0x4a4a52);

  // Heating color progression: gray -> dark red -> orange -> yellow-white
  const heatingColor = new Color();
  if (heatingIntensity < 0.3) {
    // No visible heating
    heatingColor.setRGB(0, 0, 0);
  } else if (heatingIntensity < 0.5) {
    // Start to glow dark red
    const t = (heatingIntensity - 0.3) / 0.2;
    heatingColor.setRGB(0.3 * t, 0, 0);
  } else if (heatingIntensity < 0.75) {
    // Red to orange
    const t = (heatingIntensity - 0.5) / 0.25;
    heatingColor.setRGB(0.3 + 0.5 * t, 0.15 * t, 0);
  } else {
    // Orange to yellow-white (intense heating)
    const t = (heatingIntensity - 0.75) / 0.25;
    heatingColor.setRGB(0.8 + 0.2 * t, 0.15 + 0.45 * t, 0.05 * t);
  }

  // Emissive intensity increases dramatically near impact
  const emissiveIntensity = Math.pow(heatingIntensity, 2) * 3.5;

  const material = new MeshStandardMaterial({
    color: baseColor,
    roughness: 0.9 - heatingIntensity * 0.3, // Smoother when hot
    metalness: 0.1 + heatingIntensity * 0.15, // Slight metallic sheen when hot
    emissive: heatingColor,
    emissiveIntensity: emissiveIntensity,
  });

  return material;
}

/**
 * Asteroid class - manages single asteroid instance with LOD and heating
 */
export class Asteroid {
  constructor(quality = 'High') {
    this.quality = quality;

    // Create LOD meshes
    this.lodMeshes = {
      far: null,
      mid: null,
      near: null,
    };

    this.currentLOD = 'mid';
    this.activeMesh = null;
    this.heatingIntensity = 0;

    // Initialize all LOD levels
    this.initializeLODs();

    // Motion configuration
    this.startPosition = new Vector3(12, 45, -80);
    this.impactPoint = new Vector3(IMPACT_POINT.x, IMPACT_POINT.y, IMPACT_POINT.z);

    // Scale configuration
    this.startScale = 0.15; // Tiny speck at start
    this.midScale = 2.5; // Medium size during approach
    this.finalScale = 4.5; // Large at impact

    // Rotation speed (for visual interest)
    this.rotationSpeed = new Vector3(0.3, 0.7, 0.4);

    // Turbulence for breakup effect
    this.turbulenceOffset = new Vector3();
    this.turbulenceSpeed = new Vector3(
      Math.random() * 0.5,
      Math.random() * 0.5,
      Math.random() * 0.5
    );

    // Temporary vectors
    this._currentPos = new Vector3();
    this._temp = new Vector3();

    // Initialize
    this.reset();
  }

  initializeLODs() {
    try {
      // Create geometries for each LOD level
      const farGeo = createAsteroidGeometry('far', this.quality);
      const midGeo = createAsteroidGeometry('mid', this.quality);
      const nearGeo = createAsteroidGeometry('near', this.quality);

      // Create materials (will be updated each frame)
      const farMat = createAsteroidMaterial(0);
      const midMat = createAsteroidMaterial(0);
      const nearMat = createAsteroidMaterial(0);

      // Create meshes
      this.lodMeshes.far = new Mesh(farGeo, farMat);
      this.lodMeshes.mid = new Mesh(midGeo, midMat);
      this.lodMeshes.near = new Mesh(nearGeo, nearMat);

      // Configure shadow casting
      Object.values(this.lodMeshes).forEach(mesh => {
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        mesh.visible = false; // Start hidden
      });

      // Set initial active mesh
      this.activeMesh = this.lodMeshes.mid;
      this.activeMesh.visible = true;

      console.log('Asteroid LODs initialized successfully');
    } catch (error) {
      console.error('Error initializing asteroid LODs:', error);
      throw error;
    }
  }

  /**
   * Update quality setting and recreate LODs if needed
   */
  setQuality(quality) {
    if (this.quality === quality) return;

    this.quality = quality;

    // Store current state
    const position = this.activeMesh.position.clone();
    const scale = this.activeMesh.scale.clone();
    const rotation = this.activeMesh.rotation.clone();

    // Dispose old geometries
    Object.values(this.lodMeshes).forEach(mesh => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    });

    // Recreate LODs
    this.initializeLODs();

    // Restore state
    this.activeMesh.position.copy(position);
    this.activeMesh.scale.copy(scale);
    this.activeMesh.rotation.copy(rotation);
  }

  /**
   * Switch to appropriate LOD level based on timeline phase
   */
  updateLOD(timeline) {
    const phase = timeline.getCurrentPhase();
    let desiredLOD = 'mid';

    if (phase.key === 'FAR_APPROACH') {
      desiredLOD = 'far';
    } else if (phase.key === 'MID_APPROACH') {
      desiredLOD = 'mid';
    } else if (phase.key === 'NEAR_RUSH' || phase.key === 'IMPACT' || phase.key === 'AFTERMATH') {
      desiredLOD = 'near';
    }

    if (desiredLOD !== this.currentLOD) {
      // Switch LOD
      const oldMesh = this.activeMesh;
      this.activeMesh = this.lodMeshes[desiredLOD];

      // Copy transform from old mesh
      this.activeMesh.position.copy(oldMesh.position);
      this.activeMesh.scale.copy(oldMesh.scale);
      this.activeMesh.rotation.copy(oldMesh.rotation);

      // Toggle visibility
      oldMesh.visible = false;
      this.activeMesh.visible = true;

      this.currentLOD = desiredLOD;
    }
  }

  /**
   * Calculate heating intensity based on timeline
   */
  calculateHeating(timeline) {
    const t = timeline.t;
    const phase = timeline.getCurrentPhase();

    if (phase.key === 'FAR_APPROACH') {
      return 0; // No heating at far distance
    } else if (phase.key === 'MID_APPROACH') {
      // Start to heat up slightly
      const progress = timeline.getPhaseProgress();
      return ease.inQuad(progress) * 0.35;
    } else if (phase.key === 'NEAR_RUSH') {
      // Rapidly heat up
      const progress = timeline.getPhaseProgress();
      return 0.35 + ease.inQuart(progress) * 0.50;
    } else if (phase.key === 'IMPACT') {
      // Peak heating at impact
      const progress = timeline.getPhaseProgress();
      return 0.85 + ease.outQuad(progress) * 0.15;
    } else if (phase.key === 'AFTERMATH') {
      // Maintain intense heat then fade
      const timeSince = timeline.getTimeSinceImpact();
      if (timeSince < 0.05) {
        return 1.0; // Peak glow
      } else {
        const fadeProgress = (timeSince - 0.05) / 0.1;
        return Math.max(0, 1.0 - ease.outQuad(fadeProgress));
      }
    }

    return 0;
  }

  /**
   * Update material heating effect
   */
  updateMaterial(heatingIntensity) {
    // Update all materials to keep them in sync
    Object.values(this.lodMeshes).forEach(mesh => {
      const material = mesh.material;

      // Update heating color progression
      if (heatingIntensity < 0.3) {
        material.emissive.setRGB(0, 0, 0);
        material.emissiveIntensity = 0;
      } else if (heatingIntensity < 0.5) {
        const t = (heatingIntensity - 0.3) / 0.2;
        material.emissive.setRGB(0.3 * t, 0, 0);
        material.emissiveIntensity = t * 0.5;
      } else if (heatingIntensity < 0.75) {
        const t = (heatingIntensity - 0.5) / 0.25;
        material.emissive.setRGB(0.3 + 0.5 * t, 0.15 * t, 0);
        material.emissiveIntensity = 0.5 + t * 1.5;
      } else {
        const t = (heatingIntensity - 0.75) / 0.25;
        material.emissive.setRGB(0.8 + 0.2 * t, 0.15 + 0.45 * t, 0.05 * t);
        material.emissiveIntensity = 2.0 + t * 1.5;
      }

      // Surface properties change with heating
      material.roughness = 0.9 - heatingIntensity * 0.3;
      material.metalness = 0.1 + heatingIntensity * 0.15;
    });
  }

  reset() {
    this.activeMesh.position.copy(this.startPosition);
    this.activeMesh.scale.setScalar(this.startScale);
    this.activeMesh.rotation.set(0, 0, 0);
    this.turbulenceOffset.set(0, 0, 0);
    this.heatingIntensity = 0;
    this.updateMaterial(0);
  }

  /**
   * Calculate position along asteroid path based on timeline
   */
  calculatePosition(timeline) {
    const t = timeline.t;
    const phase = timeline.getCurrentPhase();

    // Before impact: arc from start to impact point
    if (t < T_IMPACT) {
      // Normalized progress to impact (0 -> 1)
      const progress = t / T_IMPACT;

      // Use cubic easing for dramatic acceleration
      const easedProgress = ease.inCubic(progress);

      // Interpolate position
      this._currentPos.lerpVectors(this.startPosition, this.impactPoint, easedProgress);

      // Add slight arc trajectory (parabolic path)
      const arcHeight = Math.sin(progress * Math.PI) * 8;
      this._currentPos.y += arcHeight;

      // Add turbulence effect during NEAR_RUSH
      if (phase.key === 'NEAR_RUSH') {
        const turbulenceIntensity = timeline.getPhaseProgress() * 0.3;
        this._currentPos.x += Math.sin(t * 50 * this.turbulenceSpeed.x) * turbulenceIntensity;
        this._currentPos.y += Math.sin(t * 45 * this.turbulenceSpeed.y) * turbulenceIntensity;
        this._currentPos.z += Math.sin(t * 55 * this.turbulenceSpeed.z) * turbulenceIntensity * 0.5;
      }

      return this._currentPos;
    } else {
      // Post-impact: stay at impact point (could add debris later)
      return this.impactPoint;
    }
  }

  /**
   * Calculate scale based on timeline (asteroid appears to grow as it approaches)
   */
  calculateScale(timeline) {
    const t = timeline.t;
    const phase = timeline.getCurrentPhase();

    if (phase.key === 'FAR_APPROACH') {
      // Very small, barely visible
      const progress = timeline.getPhaseProgress();
      return this.startScale + ease.outQuad(progress) * (this.midScale * 0.3 - this.startScale);
    }

    if (phase.key === 'MID_APPROACH') {
      // Growing to medium size
      const progress = timeline.getPhaseProgress();
      const startVal = this.midScale * 0.3;
      const endVal = this.midScale;
      return startVal + ease.inOutQuad(progress) * (endVal - startVal);
    }

    if (phase.key === 'NEAR_RUSH') {
      // Rapidly growing to full size
      const progress = timeline.getPhaseProgress();
      return this.midScale + ease.inQuart(progress) * (this.finalScale - this.midScale);
    }

    if (phase.key === 'IMPACT') {
      // At impact, briefly expand (impact flash)
      const progress = timeline.getPhaseProgress();
      return this.finalScale * (1 + progress * 0.3);
    }

    if (phase.key === 'AFTERMATH') {
      // Could shrink/fade or explode - for now stay visible
      const timeSince = timeline.getTimeSinceImpact();
      const fadeStart = 0.1;
      if (timeSince > fadeStart) {
        const fadeProgress = (timeSince - fadeStart) / 0.05;
        return this.finalScale * 1.3 * Math.max(0, 1 - fadeProgress);
      }
      return this.finalScale * 1.3;
    }

    return this.finalScale;
  }

  /**
   * Update asteroid - call every frame
   */
  update(timeline, deltaTime) {
    // Update LOD level
    this.updateLOD(timeline);

    // Update heating intensity
    this.heatingIntensity = this.calculateHeating(timeline);
    this.updateMaterial(this.heatingIntensity);

    // Update position
    const position = this.calculatePosition(timeline);
    this.activeMesh.position.copy(position);

    // Update scale
    const scale = this.calculateScale(timeline);
    this.activeMesh.scale.setScalar(scale);

    // Rotate for visual interest (deterministic based on timeline)
    if (timeline.t < T_IMPACT) {
      this.activeMesh.rotation.x = timeline.t * this.rotationSpeed.x * Math.PI * 2;
      this.activeMesh.rotation.y = timeline.t * this.rotationSpeed.y * Math.PI * 2;
      this.activeMesh.rotation.z = timeline.t * this.rotationSpeed.z * Math.PI * 2;
    }

    // Visibility toggle (hide after aftermath)
    this.activeMesh.visible = scale > 0.01;

    // Safety check
    if (
      !isFinite(this.activeMesh.position.x) ||
      !isFinite(this.activeMesh.scale.x)
    ) {
      console.warn('Asteroid state became NaN, resetting');
      this.reset();
    }
  }

  /**
   * Get current position (for camera tracking)
   */
  getPosition() {
    return this.activeMesh.position;
  }

  /**
   * Add to scene
   */
  addToScene(scene) {
    // Add all LOD meshes to scene
    Object.values(this.lodMeshes).forEach(mesh => {
      scene.add(mesh);
    });
  }

  /**
   * Remove from scene
   */
  removeFromScene(scene) {
    Object.values(this.lodMeshes).forEach(mesh => {
      scene.remove(mesh);
    });
  }

  /**
   * Dispose resources
   */
  dispose() {
    Object.values(this.lodMeshes).forEach(mesh => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
  }
}
