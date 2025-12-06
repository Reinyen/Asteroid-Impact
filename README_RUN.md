# Run Instructions

This project is a baseline three.js web app with a night sky, ground, and simple timeline control.

## Setup

1. Ensure Node.js is active (project uses v20.19.5):
   ```bash
   nvm use 20.19.5
   ```

2. Install (no external packages required):
   ```bash
   npm install
   ```

## Run

Start the dev server:
```bash
npm run dev
```

Open the printed URL: **http://localhost:4173**

## What to Expect

- **Scene**: Night sky with stars, dark ground plane, ambient lighting
- **Controls**:
  - **Play / Restart**: Starts timeline advancing from T=0 to T=1 over 12 seconds
  - **Quality: High / Low**: Toggle button (stub, no rendering changes)
- **Status Display**: Shows "Playing" or "Idle" and current T value (0.000 to 1.000)

## Verification

✓ Page loads with no console errors
✓ Night sky and ground are visible
✓ Clicking "Play / Restart" makes T advance from 0.000 → 1.000
✓ Timeline loops automatically when playing
✓ Clicking again stops the timeline
