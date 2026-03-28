# Nota Electron Shell

Desktop wrapper for nota.app using Electron.

## Development

1. Start the Vite dev server (in another terminal), from the monorepo root:
   ```bash
   npx nx dev @nota.app/nota.app
   ```

2. Run Electron, from the monorepo root:
   ```bash
   npx nx run @nota.app/nota-electron:electron:dev
   ```

## Production build (local)

From the monorepo root:

```bash
npx nx build @nota.app/nota.app
cd apps/nota-electron && npm run build && npx electron-builder
```

Output is under `apps/nota-electron/release/` (DMG and ZIP per architecture).

## GitHub Releases and auto-updates

- **`electron-builder`** is configured with **`publish.provider: github`** (`owner` / `repo` in `electron-builder.yml`). Packaged apps embed **`app-update.yml`** for **`electron-updater`**.
- **`main.ts`** calls **`checkForUpdatesAndNotify()`** only when **`app.isPackaged`**. Updates use the **ZIP** assets attached to each release (DMG is for first install).
- **CI**: `.github/workflows/release-electron.yml` runs on **`v*`** tags and on **`workflow_dispatch`** (semver input). It syncs `apps/nota-electron/package.json` version, runs **`electron-builder --publish always`**, and uses **`GITHUB_TOKEN`** to upload assets and `latest-mac.yml`.

### Optional repository secrets (macOS signing / notarisation)

| Secret | Purpose |
|--------|---------|
| `APPLE_CERTIFICATE_BASE64` | Base64-encoded `.p12` (Developer ID Application) |
| `APPLE_CERTIFICATE_PASSWORD` | `.p12` password; also **`CSC_KEY_PASSWORD`** for the build |
| `APPLE_ID` | Apple ID email (for notarisation, when enabled) |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password |
| `APPLE_TEAM_ID` | Team ID |

With `APPLE_CERTIFICATE_BASE64` unset, CI still produces **unsigned** artefacts. Set **`mac.notarize: true`** in `electron-builder.yml` when the Apple ID secrets above are configured.

## Architecture

- **Dev mode**: Loads from `http://localhost:4200` (Vite dev server)
- **Prod mode**: Spawns `react-router-serve` with the built server bundle on `http://127.0.0.1:4378`

This approach preserves SSR and cookie-based authentication that the web app relies on.
