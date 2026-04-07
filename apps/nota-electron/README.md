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

### Required secrets (embedded SPA, CI)

The **`macos` job** in [`.github/workflows/release-electron.yml`](../../.github/workflows/release-electron.yml) uses **`environment: Production`**, so **`${{ secrets.* }}`** resolves **Production environment secrets** first (and repository secrets where you do not override by name). Define the `VITE_*` keys there (or duplicate them as **repository** secrets if you prefer not to use an environment). Mirror Vercel / [`apps/nota.app/.env.example`](../nota.app/.env.example). **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`** are required: the workflow **fails** if either is unset so the app cannot ship with a broken login. Other `VITE_*` secrets may still be empty (features degrade until you add them).

If **Production** has protection rules (required reviewers, wait timers), each release run waits for them before the build starts.

| Secret | Purpose |
|--------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (same instance as the web app) |
| `CLERK_SECRET_KEY` | Clerk secret key (server-only); bundled into `electron-og-api.mjs` at web build time so packaged link previews can verify the session |
| `VITE_NOTA_SERVER_API_URL` | nota-server HTTPS origin, no trailing slash (production Railway example: `https://notaappnota-server-production.up.railway.app`) |

### Triggering CI release

- **Tag:** `git tag v1.2.3 && git push origin v1.2.3`
- **Manual:** **Actions → Release Electron (macOS) → Run workflow**, enter semver (e.g. `1.2.3`).

Confirm the new **Release** lists DMG and ZIP assets per architecture plus **`latest-mac.yml`** (used by auto-update).

After fixing secrets, **push a new `v*` tag** or run **Release Electron (macOS)** again via **workflow_dispatch** so a fresh build picks up the values.

### Packaged app: “Missing Supabase environment variables”

That message comes from [`apps/nota.app/app/lib/supabase/browser.ts`](../nota.app/app/lib/supabase/browser.ts): the **Vite build** inlined empty `VITE_SUPABASE_*` strings. GitHub Actions does not inject secrets at runtime on the user’s machine.

1. Add **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`** under **Production** environment secrets (or **repository** secrets), with those exact names — this workflow reads `${{ secrets.* }}` only.
2. If the URL lives under **Variables**, either duplicate it into **Secrets** or change the workflow to use `${{ vars.VITE_SUPABASE_URL }}` for that key.
3. Trigger a **new** release build (tag or manual workflow); re-download the app.

### Optional secrets (macOS signing / notarisation)

Store these as **repository** secrets or under the same **Production** environment, matching the names below.

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
- **Link preview**: **`GET /api/og-preview`** is handled locally via **`electron-og-api.mjs`** and **`nota-public-env.json`** from the nota.app build. The OG bundle inlines **`CLERK_SECRET_KEY`** from the build environment (set **`CLERK_SECRET_KEY`** alongside the `VITE_*` secrets when running **`electron:release`**). The main process also loads **`VITE_CLERK_PUBLISHABLE_KEY`** from `nota-public-env.json` for cookie-based session resolution.
- **Nota Pro entitlement**: Build **`nota.app`** with **`VITE_NOTA_SERVER_API_URL`** pointing at **[`nota-server`](../nota-server)** so entitlement and invalidate use Bearer auth against that service. Other **`/api/*`** paths still return **502** in the desktop static server.
