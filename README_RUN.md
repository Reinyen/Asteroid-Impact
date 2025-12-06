# Run Instructions

This project now serves as a static three.js page without external build tooling.

## Setup

1. Ensure the expected Node.js version is active (via `nvm`):
   ```bash
   nvm use 20.19.5
   ```

2. Install local metadata (no external packages are fetched, so this succeeds even when the sandbox blocks `registry.npmjs.org`):
   ```bash
   npm install
   ```

   > Note: Direct HTTPS requests to `https://registry.npmjs.org/` return `403 Forbidden` in this environment. Because the project has no external dependencies, `npm install` does not need to reach the registry and therefore completes successfully.

## Run

Start the lightweight static server:
```bash
npm run dev
```

Open the printed URL (default http://localhost:4173) to view the scene.

## Controls

- **Play / Restart** toggles the placeholder cinematic timeline. When starting, the normalized timeline time `T` runs from 0 → 1 over the fixed loop duration.
- **Quality: High / Low** toggles a stub setting (no rendering differences yet).
