/**
 * Seeded Pseudo-Random Number Generator (Mulberry32)
 * Provides deterministic random numbers for reproducible simulations.
 */

export class SeededRNG {
  constructor(seed = 12345) {
    this.seed = seed >>> 0; // Ensure unsigned 32-bit integer
    this.state = this.seed;
  }

  /**
   * Reset RNG to initial seed
   */
  reset() {
    this.state = this.seed;
  }

  /**
   * Set new seed and reset state
   */
  setSeed(newSeed) {
    this.seed = newSeed >>> 0;
    this.state = this.seed;
  }

  /**
   * Generate next random number in [0, 1)
   * Uses Mulberry32 algorithm
   */
  next() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generate random number in range [min, max)
   */
  range(min, max) {
    return min + this.next() * (max - min);
  }

  /**
   * Generate random integer in range [min, max]
   */
  rangeInt(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * Generate random boolean
   */
  bool() {
    return this.next() < 0.5;
  }

  /**
   * Pick random element from array
   */
  pick(array) {
    return array[this.rangeInt(0, array.length - 1)];
  }
}
