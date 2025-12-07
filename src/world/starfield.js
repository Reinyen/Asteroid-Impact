/**
 * HTML/CSS Starfield module
 * Generates and manages DOM-based starfield with gradient background
 */

import { SeededRNG } from '../utils/rng.js';

const STAR_COUNT = 5000;

/**
 * Create and initialize the starfield
 */
export function createStarfield(seed) {
  const container = document.getElementById('starfield-container');
  if (!container) {
    console.error('Starfield container not found');
    return null;
  }

  // Clear existing stars
  container.innerHTML = '';

  // Create RNG for deterministic star placement
  const rng = new SeededRNG(seed);

  // Generate stars
  const stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    const star = document.createElement('div');
    star.className = 'star';

    // Randomly add twinkling to some stars (30% chance)
    if (rng.range(0, 1) < 0.3) {
      star.classList.add('twinkle');
      // Random animation delay for varied twinkling
      star.style.animationDelay = `${rng.range(0, 3)}s`;
    }

    stars.push(star);
    container.appendChild(star);
  }

  // Position stars
  positionStars(container, rng);

  // Handle window resize
  const handleResize = () => {
    // Recreate RNG with same seed for deterministic repositioning
    const resizeRng = new SeededRNG(seed);
    positionStars(container, resizeRng);
  };

  window.addEventListener('resize', handleResize);

  return {
    container,
    stars,
    dispose: () => {
      window.removeEventListener('resize', handleResize);
      container.innerHTML = '';
    },
  };
}

/**
 * Position stars randomly within the viewport
 */
function positionStars(container, rng) {
  const width = window.innerWidth;
  const height = window.innerHeight;

  const stars = container.querySelectorAll('.star');
  stars.forEach((star) => {
    const top = rng.range(0, height);
    const left = rng.range(0, width);

    star.style.top = `${top}px`;
    star.style.left = `${left}px`;
  });
}
