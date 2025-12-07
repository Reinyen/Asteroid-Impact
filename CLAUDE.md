# Claude Code Project Memory

## Commands (Exact)

```bash
# Install
npm install

# Test
npm test

# Dev server
npm run dev
# → Opens at http://localhost:4173
```

## Directory Map

```
/
├── index.html              # Entry HTML
├── server.js               # Minimal static server
├── package.json            # Scripts + metadata
└── src/
    ├── main.js             # Bootstrap renderer, scene, camera, loop
    ├── config/
    │   └── presets.js      # Quality presets + global constants
    ├── core/
    │   └── timeline.js     # Deterministic timeline with fixed timestep
    ├── utils/
    │   └── rng.js          # Seeded PRNG (Mulberry32)
    ├── ui/
    │   └── overlay.js      # UI controls (play, quality, seed)
    └── world/
        └── environment.js  # Sky, ground, lighting
```

## Non-Negotiables

1. **Determinism**: Same seed + same timeline settings → identical motion/visuals across restarts
   - Timeline uses fixed timestep (1/60s)
   - RNG uses Mulberry32 seeded PRNG
   - No `Math.random()` in simulation code

2. **Performance**: No unoptimized refactors
   - Quality presets control poly count, star count, etc.
   - Pixel ratio capped at 2x

3. **No unrelated refactors**: Only modify code directly related to task requirements

4. **Vanilla three.js only**: No React, no Babylon, no external rendering engines

## Quality Gates (MUST PASS BEFORE COMPLETION)

1. ✓ `npm install` completes successfully
2. ✓ `npm test` passes (currently stub that logs success)
3. ✓ `npm run dev` starts server
4. ✓ Page loads at http://localhost:4173 with no console errors
5. ✓ Play button starts timeline and T advances from 0.000 → 1.000
6. ✓ Restart button resets timeline and produces identical T progression
7. ✓ Seed input changes seed and restarting produces deterministic results
