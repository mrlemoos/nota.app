# Nota Electron Shell

Desktop wrapper for nota.app using Electron.

## Development

1. Start the Vite dev server (in another terminal), from the monorepo root:
   ```bash
   npx nx dev @nota.app/nota.app
   ```

2. Run Electron, from the monorepo root:
   ```bash
   npx nx dev @nota.app/nota-electron
   ```

   Or start **Vite and Electron together** (both expose a `dev` target):
   ```bash
   npx nx run-many -t dev
   ```

## Production build (local)

From the monorepo root, pack macOS artefacts without publishing (no GitHub token required):

```bash
npx nx run @nota.app/nota-electron:electron:pack
```

Or the equivalent shorthand:

```bash
npm run electron:pack
```

`electron-builder` copies `../nota.app/dist` into the app bundle. Output is under `apps/nota-electron/release/` (DMG and ZIP per architecture). **macOS** is required for the current `electron-builder.yml` targets.

## Publish to GitHub Releases (local)

Set **`GH_TOKEN`** or **`GITHUB_TOKEN`** to a token with **`repo`** scope (classic PAT or fine-grained with contents read/write for this repository). Then from the monorepo root:

```bash
npm run release:electron
```

Same as:

```bash
npx nx run @nota.app/nota-electron:electron:release
```

Optional: bump `apps/nota-electron/package.json` for this run only (same as CI’s `npm version`):

```bash
npx nx run @nota.app/nota-electron:electron:release -- --version 1.2.3
```

If you omit `--version`, the version already in `apps/nota-electron/package.json` is used.

## GitHub Releases and auto-updates

- **`electron-builder`** is configured with **`publish.provider: github`** (`owner` / `repo` in `electron-builder.yml`). Packaged apps embed **`app-update.yml`** for **`electron-updater`**.
- **`main.ts`** calls **`checkForUpdatesAndNotify()`** only when **`app.isPackaged`**. Updates use the **ZIP** assets attached to each release (DMG is for first install).
- **CI**: `.github/workflows/release-electron.yml` runs on **`v*`** tags and on **`workflow_dispatch`** (semver input). It syncs `apps/nota-electron/package.json` version, then runs **`npx nx run @nota.app/nota-electron:electron:release`** (build + **`electron-builder --publish always`** via [`tools/electron-github-release.mjs`](../../tools/electron-github-release.mjs)). Actions sets **`GH_TOKEN`** from **`GITHUB_TOKEN`** to upload assets and `latest-mac.yml`.

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

- **Dev mode**: Loads from `http://localhost:4200` (Vite dev server).
- **Prod mode**: Serves the embedded **`nota.app/dist`** static build from inside the app bundle via a small Node **`http`** server on **`http://127.0.0.1:4378`** (SPA fallback). `/api/*` is not implemented in the desktop bundle.
