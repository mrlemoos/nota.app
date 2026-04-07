<div align="center">
  <h1>Nota</h1>
</div>

## Philosophy

You know the feeling: you open something to think, and the software starts performing (offering, suggesting, nudging) until the room for your own pace shrinks. Useful automation has its place elsewhere; in a notes app, that itch to always *do something next* can mistake motion for thinking.

[Nota](https://nota.mrlemoos.dev) treats your attention as something to **protect**, not to harvest. It gives you a steady place to write and arrange ideas, and it steps back when you pause so your mind can do the unglamorous part: wandering, revising, waiting for the right phrase without the product trying to entertain the lull.

We leave silence alone on purpose. Boredom at the cursor is the sound of a thought catching up.

## What it is

![A macOS screenshot of the welcome screen of Nota with a button to start.](assets/welcome-screen.png "Welcome screen")

Nota is a personal notes app built as an [Nx](https://nx.dev) monorepo. 

The main client ([apps/nota.app](apps/nota.app)) is a **Vite** single-page app with **React 19**; in-app navigation uses the location **hash** (see `app/lib/app-navigation.ts`). 

Notes use **Supabase** (Postgres, Storage, and row-level security) with **Clerk** for sign-in (third-party JWTs). The editor is **TipTap** (ProseMirror). 

Subscriptions use **Clerk Billing** (checkout in the SPA; server-side entitlement checks on Vercel `api/*` or optional **[nota-server](apps/nota-server)**). 

An **Electron** desktop shell wraps the same build—see [apps/nota-electron/README.md](apps/nota-electron/README.md). The public marketing site lives in [apps/nota-marketing](apps/nota-marketing) (Astro).

## Requirements

- **Node.js** 22 or newer (see root `package.json` `engines`)
- **npm** (workspaces are defined at the repository root)

## Install

From the repository root:

```sh
npm install
```

## Environment

Copy [apps/nota.app/.env.example](apps/nota.app/.env.example) to `apps/nota.app/.env` and set at least:

- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — your Supabase anon (public) key

For Clerk sign-in and subscription flows, follow the same file for `VITE_CLERK_PUBLISHABLE_KEY`, optional `VITE_NOTA_SERVER_API_URL`, and **server-only** secrets (`CLERK_SECRET_KEY`, etc.—never commit real values). Schema, RLS policies, and migrations are applied in Supabase from the SQL in this repo—environment variables alone do not create the database.

## Database

SQL migrations live under [supabase/migrations/](supabase/migrations/) at the repository root. If you use the [Supabase CLI](https://supabase.com/docs/guides/cli), link your project and apply migrations with your usual workflow (for example `supabase db push` against a linked project, or local `supabase start` for development).

## Run the web app

```sh
npx nx dev @nota.app/nota.app
```

(`npx nx dev nota.app` resolves to the same project.)

The Vite dev server listens on **[http://localhost:4200](http://localhost:4200)**.

## Marketing site (local)

```sh
npm run dev:marketing
```

## Optional API server

For Nota Pro entitlement and related routes outside Vercel serverless, run [nota-server](apps/nota-server) and point the SPA at it with `VITE_NOTA_SERVER_API_URL`. See [apps/nota-server/README.md](apps/nota-server/README.md).

## Build and test

```sh
npx nx build @nota.app/nota.app
npx nx test @nota.app/nota.app
```

Tests use **Vitest** via the Nx Vitest plugin.

## Electron

The desktop app expects the web dev server at `http://localhost:4200`. From the repository root you can run:

- `npm run electron:dev` — Electron only (start the web app in another terminal with `npx nx dev @nota.app/nota.app`, or run `npx nx run-many -t dev` to start Vite and Electron together)
- `npm run dev:all` — web app and Electron together (uses `concurrently`)

More detail: [apps/nota-electron/README.md](apps/nota-electron/README.md).

## Repository layout


| Path                   | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `apps/nota.app/`       | Main Vite SPA (notes, auth, TipTap)                  |
| `apps/nota-electron/`  | Electron shell                                       |
| `apps/nota-server/`    | Optional Node API (entitlement, shared server logic) |
| `apps/nota-marketing/` | Astro marketing site                                 |
| `supabase/`            | Supabase config and SQL migrations                   |
| `assets/`              | Shared assets (e.g. screenshots for docs)            |


## Licence

Apache License 2.0 — see [LICENSE](LICENSE) and [package.json](package.json).