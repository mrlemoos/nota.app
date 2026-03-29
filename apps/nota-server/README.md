# nota-server (Express)

Small API for **server-only** operations: Nota Pro entitlement (RevenueCat REST) and related routes. The web and desktop SPAs call this service when `VITE_NOTA_SERVER_API_URL` is set; otherwise they use same-origin `/api/*` on Vercel.

Production builds bundle TypeScript with **esbuild** and run on **Node.js 22+** (shared RevenueCat logic is imported from `apps/nota.app` at build time). Local development can still use **Bun** for fast `tsx`-style runs.

## Run locally

From the monorepo root (recommended so workspaces resolve):

```bash
npm ci
cd apps/nota-server
cp .env.example .env
# fill SUPABASE_URL, SUPABASE_SECRET_KEY, REVENUECAT_SECRET_API_KEY
```

**Node (matches production):**

```bash
npm run build
npm run start
```

**Bun (optional dev loop):**

```bash
bun install
bun run dev
```

`npm run start` expects `dist/index.js` from a prior `npm run build`.

Set `NOTA_SERVER_CORS_ORIGINS` to include your production web origin and `http://127.0.0.1:4378` (packaged Electron) / `http://localhost:4200` (Vite dev) if the defaults are not enough.

## Auth

Clients send `Authorization: Bearer <Supabase access_token>`. The server validates the JWT with a Supabase client initialised using **`SUPABASE_SECRET_KEY`** (Supabase’s replacement for the legacy service role key). For a short transition, **`SUPABASE_SERVICE_ROLE_KEY`** is still read if the new variable is unset.

## Deploy (Railway)

Use the **repository root** as the Railway service root (not `apps/nota-server` alone): the bundle step resolves `apps/nota.app/app/lib/nota-pro-api-logic.ts` from the monorepo.

[`railway.json`](../../railway.json) at the repo root sets:

- **Build:** [`tools/railway-nota-server-build.sh`](../../tools/railway-nota-server-build.sh) — runs `rm -rf node_modules apps/*/node_modules` before `npm ci` to avoid **EBUSY** when npm replaces nested `node_modules` (e.g. Astro’s `.astro` under `apps/nota-marketing`), then `npm run build` in `apps/nota-server`.
- **Start:** `node apps/nota-server/dist/index.js`

Railpack picks **Node 22** from the root `package.json` `engines.node` and `apps/nota-server` `engines.node`. Set the same environment variables as in `.env.example`. Point `VITE_NOTA_SERVER_API_URL` in the SPA build to this service’s public URL (no trailing slash). Railway injects **`PORT`**; the server reads it automatically.

For any other host, run **Node 22+**, install production dependencies from the monorepo lockfile, run the build command above from the repo root, then start with `node apps/nota-server/dist/index.js`.
