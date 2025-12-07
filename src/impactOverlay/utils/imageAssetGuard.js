/**
 * Image Asset Guard
 * Runtime monitor to prevent loading image assets (enforce procedural-only policy)
 */

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ktx', '.dds', '.bmp', '.tga'];

/**
 * Check if URL is an image asset
 */
function isImageAsset(url) {
  const lowerUrl = url.toLowerCase();
  return IMAGE_EXTENSIONS.some(ext => lowerUrl.endsWith(ext));
}

/**
 * Monitor network requests for image assets
 */
export function initImageAssetGuard() {
  // Override Image constructor
  const OriginalImage = window.Image;
  window.Image = function(...args) {
    const img = new OriginalImage(...args);

    const originalSrcSet = Object.getOwnPropertyDescriptor(Image.prototype, 'src').set;
    Object.defineProperty(img, 'src', {
      set: function(value) {
        if (isImageAsset(value)) {
          console.error(`🚫 Image asset guard: Blocked image load: ${value}`);
          console.error(`   Procedural-only policy violated!`);
          throw new Error(`Image asset loading blocked: ${value} (procedural-only policy)`);
        }
        originalSrcSet.call(this, value);
      },
      get: function() {
        return this.getAttribute('src');
      }
    });

    return img;
  };
  window.Image.prototype = OriginalImage.prototype;

  // Monitor fetch/XHR for image requests
  const originalFetch = window.fetch;
  window.fetch = function(url, ...args) {
    if (typeof url === 'string' && isImageAsset(url)) {
      console.error(`🚫 Image asset guard: Blocked fetch: ${url}`);
      throw new Error(`Image asset fetch blocked: ${url} (procedural-only policy)`);
    }
    return originalFetch.call(this, url, ...args);
  };

  // Monitor Performance API for image resources
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.initiatorType === 'img' || entry.initiatorType === 'css') {
        const url = entry.name;
        if (isImageAsset(url)) {
          console.warn(`⚠️  Image asset guard: Detected image load via ${entry.initiatorType}: ${url}`);
        }
      }
    }
  });

  try {
    observer.observe({ entryTypes: ['resource'] });
  } catch (e) {
    console.warn('Performance Observer not available for image monitoring');
  }

  console.log('✓ Image asset guard initialized (procedural-only policy enforced)');
  console.log(`  Blocked extensions: ${IMAGE_EXTENSIONS.join(', ')}`);
}

/**
 * Check build for image assets (use in CI/test)
 */
export function checkForImageAssets() {
  // This would be run as a Node.js script in CI
  // Scans the repo for image files in relevant directories
  console.log('Running image asset check...');
  // Implementation would use fs.readdir recursively
  // For now, just a placeholder
  return true;
}
