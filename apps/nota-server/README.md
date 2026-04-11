# nota-server (Express)

Small API for **server-only** operations: Nota Pro entitlement (Clerk Billing) and related routes. The web and desktop SPAs call this service via **`VITE_NOTA_SERVER_API_URL`** with `Authorization: Bearer <Clerk session JWT>` (there is no same-origin fallback on Vercel).

Production builds bundle TypeScript with **esbuild** and run on **Node.js 22+** (shared Clerk billing logic is imported from `apps/nota.app` at build time). Local development can still use **Bun** for fast runs.

## Run locally

From the monorepo root (recommended so workspaces resolve):

```bash
npm ci
cd apps/nota-server
cp .env.example .env
# set CLERK_SECRET_KEY (same instance as the SPA)
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

If **`NOTA_SERVER_CORS_ORIGINS` is unset**, the server allows `http://127.0.0.1:4378` (legacy packaged static preview), `http://localhost:4200`, and `http://localhost:4300`. **Packaged Electron** loads the hosted SPA at **`https://app.nota.mrlemoos.dev`**, so browser calls send **`Origin: https://app.nota.mrlemoos.dev`** — include that origin when you set **`NOTA_SERVER_CORS_ORIGINS`** on Railway (or rely on `*` / reflected origins only if you accept that trade-off). **If you set `NOTA_SERVER_CORS_ORIGINS` at all**, that value **replaces** the defaults — list your production web origin(s), **`https://app.nota.mrlemoos.dev`**, any **`http://127.0.0.1:4378`** / dev origins you still need, comma-separated.

**Wildcard `*`:** Set **`NOTA_SERVER_CORS_ORIGINS=*`** to allow **any** browser `Origin` (implemented with `cors` **`origin: true`**, so the response echoes the request origin). A lone `*` is **not** treated as a string to match against the `Origin` header (that would never match real clients such as `http://127.0.0.1:4378`). For production, prefer an explicit comma-separated list so only your web app and desktop shell can call the API.

## Auth

Clients send `Authorization: Bearer <Clerk session JWT>`. The server validates it with **`@clerk/backend`** `verifyToken` using **`CLERK_SECRET_KEY`**.

## Deploy (Railway)

Use the **repository root** as the Railway service root (not `apps/nota-server` alone): the bundle step compiles **`apps/nota-server/src`** only; Clerk Billing helpers and OG preview logic live under **`apps/nota-server/src/lib/`**.

[`railway.json`](../../railway.json) at the repo root uses **[`infra/Dockerfile.nota-server`](../../infra/Dockerfile.nota-server)** (Docker builder, not Railpack). The image runs **`npm ci`** on a clean tree: [`.dockerignore`](../../.dockerignore) excludes all `node_modules`, so Railpack-style **EBUSY** mounts on `node_modules/.cache` or `apps/nota-marketing/node_modules/.astro` are avoided.

- **Build:** `docker build -f infra/Dockerfile.nota-server .` (Railway runs this via config-as-code).
- **Start:** `node apps/nota-server/dist/index.js` (also the image **CMD**).

Set **`CLERK_SECRET_KEY`** in the host environment. Optionally set **`NOTA_SERVER_CORS_ORIGINS`** as above.
