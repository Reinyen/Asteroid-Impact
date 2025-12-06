/**
 * Asteroid module - handles asteroid geometry, motion, and visual effects
 */

import {
  Mesh,
  SphereGeometry,
  MeshStandardMaterial,
  Vector3,
} from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';
import { T_IMPACT, IMPACT_POINT, ease } from './timeline.js';

/**
 * Create procedural asteroid geometry
 */
function createAsteroidGeometry(baseRadius = 1.2) {
  // Use sphere as placeholder - can add noise later
  const geometry = new SphereGeometry(baseRadius, 16, 16);

  // Add some irregularity to vertices for rocky appearance
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const vertex = new Vector3(
      positions.getX(i),
      positions.getY(i),
      positions.getZ(i)
    );

    // Add deterministic noise based on vertex position
    const noise =
      Math.sin(vertex.x * 3.7 + vertex.y * 2.3) *
      Math.cos(vertex.z * 4.1 + vertex.y * 1.9) *
      0.2;

    vertex.multiplyScalar(1 + noise);
    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Asteroid class - manages single asteroid instance
 */
export class Asteroid {
  constructor() {
    // Create mesh
    const geometry = createAsteroidGeometry(1.2);
    const material = new MeshStandardMaterial({
      color: 0x4a4a52,
      roughness: 0.9,
      metalness: 0.1,
    });

    this.mesh = new Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = false;

    // Motion configuration
    this.startPosition = new Vector3(12, 45, -80);
    this.impactPoint = new Vector3(IMPACT_POINT.x, IMPACT_POINT.y, IMPACT_POINT.z);

    // Scale configuration
    this.startScale = 0.15; // Tiny speck at start
    this.midScale = 2.5; // Medium size during approach
    this.finalScale = 4.5; // Large at impact

    // Rotation speed (for visual interest)
    this.rotationSpeed = new Vector3(0.3, 0.7, 0.4);

    // Temporary vectors
    this._currentPos = new Vector3();
    this._temp = new Vector3();

    // Initialize
    this.reset();
  }

  reset() {
    this.mesh.position.copy(this.startPosition);
    this.mesh.scale.setScalar(this.startScale);
    this.mesh.rotation.set(0, 0, 0);
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
    // Update position
    const position = this.calculatePosition(timeline);
    this.mesh.position.copy(position);

    // Update scale
    const scale = this.calculateScale(timeline);
    this.mesh.scale.setScalar(scale);

    // Rotate for visual interest (deterministic based on timeline)
    if (timeline.t < T_IMPACT) {
      this.mesh.rotation.x = timeline.t * this.rotationSpeed.x * Math.PI * 2;
      this.mesh.rotation.y = timeline.t * this.rotationSpeed.y * Math.PI * 2;
      this.mesh.rotation.z = timeline.t * this.rotationSpeed.z * Math.PI * 2;
    }

    // Visibility toggle (hide after aftermath)
    this.mesh.visible = scale > 0.01;

    // Safety check
    if (
      !isFinite(this.mesh.position.x) ||
      !isFinite(this.mesh.scale.x)
    ) {
      console.warn('Asteroid state became NaN, resetting');
      this.reset();
    }
  }

  /**
   * Get current position (for camera tracking)
   */
  getPosition() {
    return this.mesh.position;
  }

  /**
   * Add to scene
   */
  addToScene(scene) {
    scene.add(this.mesh);
  }

  /**
   * Remove from scene
   */
  removeFromScene(scene) {
    scene.remove(this.mesh);
  }
}
