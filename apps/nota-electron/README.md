# Nota Electron Shell

Desktop wrapper for nota.app using Electron.

## Development

1. Start the Vite dev server (in another terminal):
   ```bash
   cd ../nota.app
   npm run dev
   ```

2. Run Electron:
   ```bash
   npm run dev
   ```

## Production Build

1. Build the web app:
   ```bash
   cd ../nota.app
   npm run build
   ```

2. Build Electron and create distributables:
   ```bash
   npm run dist
   ```

Output will be in `release/` directory.

## Architecture

- **Dev mode**: Loads from `http://localhost:4200` (Vite dev server)
- **Prod mode**: Spawns `react-router-serve` with the built server bundle on `http://127.0.0.1:4378`

This approach preserves SSR and cookie-based authentication that the web app relies on.
