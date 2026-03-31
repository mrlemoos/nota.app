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

If **`NOTA_SERVER_CORS_ORIGINS` is unset**, the server allows `http://127.0.0.1:4378` (packaged Electron), `http://localhost:4200`, and `http://localhost:4300`. **If you set `NOTA_SERVER_CORS_ORIGINS` at all** (e.g. on Railway), that value **replaces** those defaults — include your production web origin **and** `http://127.0.0.1:4378` (and dev origins if needed), comma-separated.

**Wildcard `*`:** Set **`NOTA_SERVER_CORS_ORIGINS=*`** to allow **any** browser `Origin` (implemented with `cors` **`origin: true`**, so the response echoes the request origin). A lone `*` is **not** treated as a string to match against the `Origin` header (that would never match real clients such as `http://127.0.0.1:4378`). For production, prefer an explicit comma-separated list so only your web app and Electron can call the API.

## Auth

Clients send `Authorization: Bearer <Supabase access_token>`. The server validates the JWT with a Supabase client initialised using **`SUPABASE_SECRET_KEY`** (Supabase’s replacement for the legacy service role key). For a short transition, **`SUPABASE_SERVICE_ROLE_KEY`** is still read if the new variable is unset.

## Deploy (Railway)

Use the **repository root** as the Railway service root (not `apps/nota-server` alone): the bundle step resolves `apps/nota.app/app/lib/nota-pro-api-logic.ts` from the monorepo.

[`railway.json`](../../railway.json) at the repo root uses **`Dockerfile.nota-server`** (Docker builder, not Railpack). The image runs **`npm ci`** on a clean tree: [`.dockerignore`](../../.dockerignore) excludes all `node_modules`, so Railpack-style **EBUSY** mounts on `node_modules/.cache` or `apps/nota-marketing/node_modules/.astro` are avoided.

- **Build:** `docker build -f Dockerfile.nota-server .` (Railway runs this via config-as-code).
- **Start:** `node apps/nota-server/dist/index.js` (also the image **CMD**).

The base image is **Node 22** (`node:22-bookworm-slim`). Set the same environment variables as in `.env.example`. Point `VITE_NOTA_SERVER_API_URL` in the SPA build to this service’s public URL (no trailing slash). Railway injects **`PORT`**; the server reads it automatically.

For hosts without Docker, from the repo root run **`npm ci`**, then **`npm run build`** in `apps/nota-server`, then **`node apps/nota-server/dist/index.js`**. Optional helper: [`tools/railway-nota-server-build.sh`](../../tools/railway-nota-server-build.sh) (same steps, no `rm`).
