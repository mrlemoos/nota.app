# nota-server (Express)

Small API for **server-only** operations: Nota Pro entitlement (Clerk Billing), link previews, **assistive audio-to-note** (xAI speech-to-text + Grok study notes, streamed via SSE), **semantic note search** (OpenAI-compatible embeddings + Supabase pgvector), and related routes. The web and desktop SPAs call this service via **`VITE_NOTA_SERVER_API_URL`** with `Authorization: Bearer <Clerk session JWT>` (there is no same-origin fallback on Vercel).

Production builds bundle TypeScript with **esbuild** and run on **Node.js 22+** (shared Clerk billing logic is imported from `apps/nota.app` at build time). Local development can still use **Bun** for fast runs.

## Run locally

From the monorepo root (recommended so workspaces resolve):

```bash
npm ci
cd apps/nota-server
cp .env.example .env
# set CLERK_SECRET_KEY (same instance as the SPA)
# set XAI_API_KEY for POST /api/audio-to-note (Nota Pro only)
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

When **`NODE_ENV=production`**, the process **refuses to start** if `NOTA_SERVER_CORS_ORIGINS=*` (reflect-any Origin) is in effect, unless **`NOTA_SERVER_ALLOW_INSECURE_CORS=1`** is set. Prefer an explicit comma-separated allowlist. Outside production, a **warning** is still logged when `*` is used so local setups remember to tighten CORS before shipping.

## Clerk Billing vs marketing

With **`CLERK_SECRET_KEY`** set in **`apps/nota-server/.env`**, run from the **monorepo root** (recommended — Nx loads that file into the task environment):

```bash
npx nx run @nota.app/nota-server:validate-billing
```

Equivalent without Nx (loads **`.env`** inside the script):

```bash
cd apps/nota-server
npm run validate:billing
```

This calls Clerk’s Billing API (`getPlanList` for `user` payers) and checks public plans against guide USD amounts in **`apps/nota-marketing`** and the no-trial / no-unpaid-vault policy described in **`AGENTS.md`**. If **`.env`** is missing, the script copies **`.env.example`** to **`.env`** once and exits until you add the secret.

## Auth

Clients send `Authorization: Bearer <Clerk session JWT>`. The server validates it with **`@clerk/backend`** `verifyToken` using **`CLERK_SECRET_KEY`**, **`clockSkewInMs`** (default **5000**, override with **`NOTA_SERVER_CLERK_CLOCK_SKEW_MS`**), and optional **`authorizedParties`** from **`NOTA_SERVER_CLERK_AUTHORIZED_PARTIES`** (comma-separated origins, e.g. `https://app.nota.example,http://localhost:4200`) to match the session token’s **`azp`**.

## Operations and dependency hygiene

- Run **`npm audit`** at the monorepo root after dependency bumps; triage **high** / **critical** advisories before release.
- [`.github/dependabot.yml`](../../.github/dependabot.yml) already schedules weekly npm updates — review those PRs for security fixes.

## Error responses (semantic search)

By default, **5xx** JSON from semantic search routes omits internal **`detail`** strings in **production** so clients do not see raw Supabase or embedding errors. Set **`NOTA_SERVER_DEBUG_ERRORS=1`** locally (or in a staging environment) to include `detail` for debugging.

## Audio-to-note (xAI)

- **Endpoint:** `POST /api/audio-to-note` — `multipart/form-data` with field **`audio`** (recorded audio; typical browser types include `audio/webm` or `video/webm`). Optional text fields: **`locale`** (language hint for STT; capped and sanitised), **`courseName`** (context for study-note generation; capped and sanitised).
- **Upload limits:** **`audio`** is capped at **40 MiB** (multer); disallowed MIME types are rejected before STT. **`413`** is returned when the file exceeds the cap.
- **Response:** `text/event-stream` (SSE). Events include `transcript` (after xAI **`POST /v1/stt`**), `notes_delta` (streaming Grok tokens), and `notes_done` (parsed JSON blocks for the client to turn into TipTap). Requires **`XAI_API_KEY`** on the server and a **Nota Pro** subscription (same entitlement check as link previews).
- **Model:** Grok chat model defaults to **`grok-3`**; override with **`XAI_CHAT_MODEL`** if needed.
- **Trust boundary:** Transcripts and optional fields are **user-provided**. The server wraps the transcript in delimiters and validates model output with Zod; treat generated study notes as **assistive** output that may still reflect prompt-injection attempts—do not treat the model as a security boundary.

## Deploy (Railway)

Use the **repository root** as the Railway service root (not `apps/nota-server` alone): the bundle step compiles **`apps/nota-server/src`** only; Clerk Billing helpers and OG preview logic live under **`apps/nota-server/src/lib/`**.

[`railway.json`](../../railway.json) at the repo root uses **[`infra/Dockerfile.nota-server`](../../infra/Dockerfile.nota-server)** (Docker builder, not Railpack). The image runs **`npm ci`** on a clean tree: [`.dockerignore`](../../.dockerignore) excludes all `node_modules`, so Railpack-style **EBUSY** mounts on `node_modules/.cache` or `apps/nota-marketing/node_modules/.astro` are avoided.

- **Build:** `docker build -f infra/Dockerfile.nota-server .` (Railway runs this via config-as-code).
- **Start:** `node apps/nota-server/dist/index.js` (also the image **CMD**).

Set **`CLERK_SECRET_KEY`**, **`XAI_API_KEY`** (for audio-to-note), **`SUPABASE_URL`**, **`SUPABASE_SERVICE_ROLE_KEY`**, and **`NOTA_SEMANTIC_EMBEDDINGS_API_KEY`** (for semantic search; OpenAI-compatible embeddings—xAI does not expose raw `/v1/embeddings` for external vector databases) in the host environment. Optionally set **`NOTA_SERVER_CORS_ORIGINS`** as above.

## Semantic search (Nota Pro)

- **Endpoints:** `POST /api/semantic-search`, `POST /api/search/index-note`, `POST /api/search/reindex-all` — same Bearer JWT and Nota Pro gate as other Pro routes.
- **Rate limits (in-memory, per user id):** semantic search **60/minute**; index-note **40/minute**; reindex-all **1/two minutes**. **`429`** when exceeded (horizontally scaled deployments should add an edge limiter or shared store if needed).
- **Embeddings:** Implemented as **`POST {NOTA_SEMANTIC_EMBEDDINGS_API_BASE}/embeddings`** with an OpenAI-style JSON body (`model`, `input`). Defaults target **OpenAI** (`text-embedding-3-small`, 1536 dimensions); override base URL and model for any compatible provider.
- **Storage:** Rows in Supabase **`note_semantic_index`** — apply migration **`0012_note_semantic_index.sql`** and keep **`vector(N)`** aligned with **`NOTA_SEMANTIC_EMBEDDINGS_DIMENSIONS`**.
