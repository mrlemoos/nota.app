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

### Required repository secrets (embedded SPA)

The release job injects these into the **`nota.app`** Vite build. Add them under **GitHub → Settings → Secrets and variables → Actions** (mirror Vercel / [`apps/nota.app/.env.example`](../nota.app/.env.example)). If a secret is missing, the build still runs but the desktop app may ship with empty client config.

| Secret | Purpose |
|--------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `VITE_REVENUECAT_API_KEY` | RevenueCat Web Billing public SDK key |
| `VITE_NOTA_SERVER_API_URL` | nota-server HTTPS origin, no trailing slash (production Railway example: `https://notaappnota-server-production.up.railway.app`) |

### Triggering CI release

- **Tag:** `git tag v1.2.3 && git push origin v1.2.3`
- **Manual:** **Actions → Release Electron (macOS) → Run workflow**, enter semver (e.g. `1.2.3`).

Confirm the new **Release** lists DMG and ZIP assets per architecture plus **`latest-mac.yml`** (used by auto-update).

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
- **Prod mode**: Serves the embedded **`nota.app/dist`** static build from inside the app bundle via a small Node **`http`** server on **`http://127.0.0.1:4378`** (SPA fallback).
- **Link preview**: **`GET /api/og-preview`** is handled locally via **`electron-og-api.mjs`** and **`nota-public-env.json`** from the nota.app build (Supabase session cookies + OG fetch; no RevenueCat secret in the shell).
- **Nota Pro entitlement**: Build **`nota.app`** with **`VITE_NOTA_SERVER_API_URL`** pointing at **[`nota-server`](../nota-server)** so entitlement and invalidate use Bearer auth against that service. Other **`/api/*`** paths still return **502** in the desktop static server.
