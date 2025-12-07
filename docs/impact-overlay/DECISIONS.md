# Babylon.js + WebGPU Overlay - Implementation Decisions

## Task 0 — Repo Discovery

**Date**: 2025-12-07
**Scope**: Add Babylon.js with WebGPU overlay layer on top of existing three.js starfield

---

## 1. Build System & Package Manager

### Package Manager
- **npm** (confirmed by `package.json` and `package-lock.json`)

### Bundler
- **None** - Uses native ES modules
- Dependencies loaded via CDN (three.js from jsdelivr.net)
- Entry point: `<script type="module" src="/src/main.js">` in `index.html:231`

### Language
- **JavaScript** (not TypeScript)
- All files use `.js` extension

### Dev Server
- Custom Node.js HTTP server (`server.js`)
- Serves static files from project root
- Runs on port 4173 (default)
- Command: `npm run dev`

---

## 2. Current Application Structure

### Entry Points
- **HTML**: `/index.html` (root template)
- **JS Bootstrap**: `/src/main.js` (initializes three.js, timeline, UI)

### Existing Layers (Z-index Stack)
```
z-index: 0  → #starfield-container (HTML/CSS stars)
z-index: 1  → <canvas> (three.js WebGL renderer)
z-index: 2  → .ui-overlay (controls and status display)
```

### Starfield Implementation
- **Type**: HTML/CSS-based (NOT three.js)
- **Module**: `/src/world/starfield.js`
- **Mount point**: `#starfield-container` div in `index.html:191`
- **DOM structure**:
  ```html
  <div id="starfield-container">
    <div class="star"></div>  <!-- x5000 -->
  </div>
  ```
- **Styling**: Inline styles in `index.html:132-186`
- **Features**: Deterministic positioning via seeded RNG, CSS animations (twinkle, pulse)

### Three.js Usage
- **Purpose**: Renders 3D environment (ground plane, lighting, future asteroid impact)
- **Renderer**: WebGLRenderer with alpha transparency (`alpha: true`, `setClearColor(0x000000, 0)`)
- **Canvas**: Created dynamically in `src/main.js:46`, inserted into `#app` before first child
- **Scene**: Created in `/src/world/environment.js`
- **Keep**: Will remain untouched; Babylon overlay is purely additive

---

## 3. Overlay Layer Plan

### DOM Structure
Add new overlay between three.js canvas and UI overlay:

```html
<!-- In index.html, after starfield-container -->
<div id="impact-overlay-root">
  <canvas id="impact-overlay-canvas"></canvas>
</div>
```

**Insert location**: After `#starfield-container` div (line 191), before `.ui-overlay` (line 193)

### CSS Styling
```css
#impact-overlay-root {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;  /* Same layer as three.js canvas */
}

#impact-overlay-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
```

**Rationale**:
- `z-index: 1` places it at same layer as three.js (both render 3D content)
- `pointer-events: none` unless overlay needs interaction
- Both canvases have transparent backgrounds, allowing starfield to show through

---

## 4. Babylon.js Integration Strategy

### Dependency Management
**Option A**: CDN imports (matches existing pattern)
```javascript
import { Engine, Scene } from 'https://cdn.babylonjs.com/babylon.module.js';
import { WebGPUEngine } from 'https://cdn.babylonjs.com/webgpuEngine.module.js';
```

**Option B**: npm packages (better versioning, offline dev)
```bash
npm install @babylonjs/core
```

**Decision**: Start with **Option B (npm)** for:
- Version locking
- TypeScript definitions (if needed later)
- Easier debugging
- Can switch to CDN later if bundle size is concern

### Module Location
Create new module tree under `/src/`:
```
/src/impactOverlay/
  ├── engine/
  │   └── createEngine.js      # WebGPU-first engine factory
  ├── scene/
  │   └── createScene.js       # Babylon scene setup
  └── index.js                 # Public API
```

### Bootstrap Integration
Modify `/src/main.js`:
- Import overlay bootstrap after three.js setup
- Initialize Babylon engine/scene after three.js renderer
- Run Babylon render loop independently (or sync with three.js loop)

---

## 5. Static Asset Serving

### WebGPU Dependencies
Babylon.js WebGPU requires external WASM/JS files:
- `glslang.wasm` / `glslang.js` (GLSL → SPIR-V compiler)
- `twgsl.wasm` / `twgsl.js` (WGSL compiler)

### Serving Strategy
**Option A**: CDN (recommended)
- Babylon's CDN hosts these files
- Pass CDN path to `WebGPUEngine.initAsync({ wasmPath: '...' })`

**Option B**: Local copy
- Download to `/public/` or `/static/`
- Update `server.js` mime types if needed (already handles `.wasm` via default)
- Serve from project root

**Decision**: **Option A (CDN)** unless network restrictions apply
- Simpler setup
- Babylon manages versioning
- Fallback to Option B if needed

---

## 6. Non-Negotiables Compliance

### Determinism
- Babylon overlay must use same seeded RNG (`/src/utils/rng.js`)
- Timeline integration via existing `/src/core/timeline.js`
- No `Math.random()` in overlay code

### Performance
- Babylon engine respects quality presets (defined in `/src/config/presets.js`)
- Pixel ratio capping: `Math.min(devicePixelRatio, preset.pixelRatio)`
- Conditional rendering based on timeline state

### Three.js Preservation
- No modifications to existing three.js code
- Babylon runs in parallel, not as replacement
- Starfield remains HTML/CSS (no migration to Babylon or three.js)

---

## 7. File Paths Summary

| Purpose | Path |
|---------|------|
| Entry HTML | `/index.html` |
| JS Bootstrap | `/src/main.js` |
| Overlay Module | `/src/impactOverlay/index.js` (NEW) |
| Engine Factory | `/src/impactOverlay/engine/createEngine.js` (NEW) |
| Starfield (keep as-is) | `/src/world/starfield.js` |
| Three.js Environment | `/src/world/environment.js` |
| Seeded RNG | `/src/utils/rng.js` |
| Timeline | `/src/core/timeline.js` |
| Quality Presets | `/src/config/presets.js` |

---

## 8. Next Steps (Tasks 1-3)

1. **Task 1**: Add `@babylonjs/core` to `package.json`, run `npm install`
2. **Task 2**: Add overlay DOM structure to `index.html`, add CSS
3. **Task 3**: Implement `/src/impactOverlay/engine/createEngine.js` with WebGPU-first logic

---

## Notes

- Server.js already handles all file types needed (js, wasm, etc.)
- No build step required (native ES modules)
- Babylon modules will use ES6 imports to match existing code style
- WebGPU availability check: `await WebGPUEngine.IsSupportedAsync()`
