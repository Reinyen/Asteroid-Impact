# Run Instructions

This is a baseline three.js web app with deterministic timeline control for asteroid impact visualization.

## Prerequisites

- **Node.js** v20+ (recommended: use `nvm` if `.nvmrc` is present)
- **npm** (comes with Node.js)

## Setup

1. **Install dependencies** (note: no external packages required beyond npm metadata):
   ```bash
   npm install
   ```

2. **Start dev server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**:
   ```
   http://localhost:4173
   ```

## What You'll See

### Scene
- **Night sky** with procedural starfield (500 stars on High, 200 on Low)
- **Ground plane** with dark material
- **Lighting**: Ambient + directional moonlight

### Controls
- **Play / Restart**: Start/restart the deterministic timeline
  - Timeline runs from T=0.000 to T=1.000 over 22 seconds
  - Loops automatically when playing
  - Clicking again pauses the timeline

- **Quality: High / Low**: Toggle rendering quality
  - Affects star count, ground segments, pixel ratio
  - *Note: Requires restart to fully apply changes*

- **Seed**: Numeric input for RNG seed
  - Default: 12345
  - Change and restart to see deterministic variation
  - Same seed always produces identical motion/visuals

### Status Display
Bottom-left corner shows:
- **State**: Playing / Idle
- **T**: Normalized timeline (0.000 - 1.000)
- **Time**: Actual time in seconds (0.00s - 22.00s)
- **Phase**: Current cinematic phase (Far Approach, Mid Approach, Near Rush, Impact, Aftermath)
- **Seed**: Current RNG seed

## Verification Checklist

✓ Page loads with no console errors
✓ Night sky and ground are visible
✓ Click "Play / Restart" and T advances from 0.000 → 1.000
✓ Timeline loops after reaching 1.000
✓ Click "Play / Restart" again and T progression is identical (determinism)
✓ Change seed to 99999, restart, and observe different starfield (deterministic variation)

## Troubleshooting

### Port 4173 already in use
```bash
# Kill existing process or change port:
PORT=8080 npm run dev
```

### Page shows but scene is black
- Check browser console for three.js CDN loading errors
- Ensure you have internet connection (three.js loads from CDN)

### Timeline doesn't advance
- Check that you clicked "Play / Restart" button
- Look for JavaScript errors in browser console
- Verify status display shows "State: Playing"

### Seed changes don't seem to work
- Seed changes require clicking "Play / Restart" to take effect
- Observe starfield positions change with different seeds

## Testing

```bash
npm test
```

Currently runs a stub test that confirms no automated tests are configured. Manual verification via the checklist above is required.

## Development Notes

- Timeline uses **fixed timestep** (1/60s) for deterministic simulation
- RNG uses **Mulberry32** algorithm for reproducible randomness
- No `Math.random()` in simulation code - always use `SeededRNG`
- Quality changes affect visual detail but maintain determinism
