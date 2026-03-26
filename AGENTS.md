# Agent memory (nota.app)

## Workspace and stack

- Primary app is `apps/nota.app`: React Router 7 (SSR), Vite, React 19, Nx monorepo; UI primitives from `@/components/ui/*` (Base UI–backed shadcn-style) and semantic theme tokens (`bg-background`, `muted`, `foreground`, etc.)—avoid hard-coded light neutrals on `/notes` routes.
- Notes use Supabase Postgres with RLS; session auth via `@supabase/ssr` and HTTP cookies; data access through typed helpers in `app/models/notes.ts` rather than ad hoc queries in UI.
- TipTap edits run client-only; note body is stored as ProseMirror JSON in a `jsonb` column. The editor sync effect compares the `content` prop to the live document with ProseMirror `Node.fromJSON` + `doc.eq` (not `JSON.stringify`), since `jsonb` can reorder keys and a false diff would call `setContent` and move the caret. Also avoid pushing stale `content` into parent state after `updateNote`: the `.select()` row can lag local edits (typing during an in-flight body save, or a title save before the body debounce flushes), so merge the latest local body snapshot into the note passed to `onNoteUpdated` instead of trusting the returned row’s `content` alone.
- Public env for the app: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (anon key only); reference `apps/nota.app/.env.example`. SQL migrations live under `supabase/migrations/` at the repo root.

## TypeScript and generated types

- `apps/nota.app/tsconfig.app.json` uses `rootDir` `app` and includes patterns under `app/**`; files outside `app/` (e.g. `apps/nota.app/types/`) are not part of that project and break imports.
- Keep Supabase-generated `database.types.ts` at `apps/nota.app/app/types/database.types.ts` and aim `supabase gen types` output there.

## Supabase SSR server client

- `createServerClient` has a deprecated overload; implement the current cookie API: `getAll` / `setAll` typed as `CookieMethodsServer`, normalize `parseCookieHeader` entries so `value` is always a string (e.g. `value ?? ''`), and set cookies with `serializeCookieHeader` from `@supabase/ssr` instead of hand-rolled `Set-Cookie` strings.

## Notes UI and client state

- `/notes` uses a parent layout route with nested index and `:noteId` child routes.
- Sidebar open/closed is Zustand with `persist` to localStorage under the key `nota-notes-sidebar`.
- The `/notes` layout row fills the viewport (`h-dvh` with `min-h-0` on the shell, `aside`, and `main`); only `main` scrolls the document, and the sidebar note list scrolls inside its own `flex-1 min-h-0 overflow-y-auto` region so the window does not grow with note height. In Electron (`titleBarStyle: 'hiddenInset'` in `apps/nota-electron`), `useIsElectron()` (detects preload `window.nota` or UA; modern Electron often omits the Electron token from the UA) drives traffic-light clearance on `/notes`: sidebar header uses `pl-20` and safe-area top padding; when the sidebar is collapsed the expand control is `position: fixed` in a `min-h-[52px]` `items-center` strip (`pl-20`, safe-area `pt`) with `pointer-events-none` on the wrapper and `pointer-events-auto` on the button. `main` uses the same top padding whether the sidebar is open or closed so toggling does not shift scroll layout.
- There is no global top nav. My Notes, theme toggle, account email, and Sign Out live in the notes sidebar footer (`routes/notes.tsx`). When the inline document title scrolls out of the notes layout `main` (`overflow-auto`, not the window), a read-only centered title appears as a fixed overlay at the top of the viewport (`routes/notes.tsx`) driven by `app/context/sticky-doc-title.tsx` and an `IntersectionObserver` rooted on that `main`.
- `useStickyDocTitle` must not throw when `StickyDocTitleProvider` is missing (e.g. Vitest `createRoutesStub` without root `Layout`); use a no-op fallback so partial trees still render.
- Note list sidebar heading and the `/notes` empty-state title use serif (`font-serif` / Instrument Serif) with `tracking-normal`; the open note’s document title field stays sans.
- Note editor is a centered document column (no bordered card around TipTap); the inline title is a debounced, wrapping textarea with auto height (saved to DB `title`); empty display label matches `persistedDisplayTitle` in `app/lib/note-title.ts` (“Untitled Note”). Body autosave must update `content` only and must not overwrite `title` from the first paragraph of the editor.
- After successful client-side saves from `NoteEditor`, the note detail route should call React Router `revalidate()` (e.g. `useRevalidator`) so the parent `notes` layout loader refreshes sidebar titles and dates.
- Delete note: POST `/notes/:noteId` from the trash control on each sidebar row (with confirm) and from the Command Palette when that route is active—not from a control beside the document title.
- Command palette (`app/components/command-palette.tsx`) mounts from `app/signed-in-command-palette.tsx` in the root layout when a user session exists. Cmd/Ctrl+K toggles it from anywhere (including the TipTap body and title field); it lists notes from the `/notes` layout loader to open one (navigate to `/notes/:noteId`), POSTs to `/notes` to create a note, to `/notes/:noteId` to delete the open note, and to `/logout` for sign out.

## Auth forms

- Login and signup server actions validate with Zod; shared schemas live under `app/lib/validation/auth.ts`.

## Testing

- Vitest for `nota.app` can use `apps/nota.app/tests/setup.ts` to set mock Supabase-related env for tests.
- Unit tests in `**/*.{spec,test}.{ts,tsx}` should follow the AAA pattern described in `.cursor/rules/aaa-testing-pattern.mdc`.
- `tests/og-preview.server.spec.ts` covers Open Graph HTML parsing and URL allowlisting for the link-preview endpoint.

## Learned User Preferences

- PDF attachments should live inline in the TipTap document (insert at the cursor as a `notePdf` block) rather than only in a separate footer panel.
- The open note’s inline document title textarea should use a heavy sans weight and `text-pretty` so large, multi-line titles read clearly.
- Link to another note from the editor body by typing `@` (filterable mention menu), not a **Link to note** toolbar control.
- Prefer a minimal attachment entry in the editor chrome: no **Insert PDF or image** button or long instructional hint in the toolbar row; rely on drag-and-drop for PDFs and images while still surfacing upload errors when needed.
- After inserting an internal note link from the `@` flow, continue in normal paragraph typing without extending the link mark (e.g. `setParagraph` and clear stored marks after insert).

## Learned Workspace Facts

- Per-note attachments use Supabase Storage bucket `note-pdfs` (PDFs plus allowlisted raster images per migration), `note_attachments` rows, and TipTap `notePdf` / `noteImage` atom blocks in `notes.content` JSON (`attachmentId`, `filename`); generalised `noteAttachmentStoragePath` and shared upload helpers in `app/lib/pdf-attachment-client.ts`. RLS allows owners to update `note_attachments.filename` for display-name renames on PDF nodes (double-click the label). Image blocks resolve signed URLs and refresh before expiry. PDF modal preview uses PDF.js in a lazy-loaded chunk (`pdf-js-modal-preview.tsx`); keep PDF.js off the eager import path for `note-pdf-extension.tsx` (use `React.lazy` and `Suspense`) or `notePdf` nodes can vanish. Render the preview `<dialog>` with `createPortal` to `document.body`. `app/lib/pdf-preview-url.ts` adds `#toolbar=0&navpanes=0` for iframe fallback only when PDF.js fails. File insert uses drag-and-drop with ProseMirror `editorProps` drop handling on the real editor surface when no file picker row is shown.
- Link previews use an authenticated `GET /og-preview?url=` resource route and `app/lib/og-preview.server.ts` for server-side fetch and Open Graph parsing; the editor exposes a TipTap `linkPreview` block and debounced conversion of link-only paragraphs via `app/components/tiptap/link-preview-scan.ts`. If OG fetch fails or returns no usable title/description/image, revert to a normal paragraph with a link; the link mark uses `skipLinkPreview` so the scanner does not immediately re-promote the same URL and loop. Paragraphs whose only link href is an internal note path `/notes/<uuid>` are not promoted to `linkPreview`.
- Internal note links: `href` is path-only `/notes/<uuid>` (see `app/lib/internal-note-link.ts`); `NotaLink` uses `openOnClick: false` with a custom click handler—internal paths use React Router `navigate`, modifier-click opens a new tab, external URLs use `window.open`; notes for pickers come from `notesFromMatches` in `app/lib/notes-from-matches.ts`.
- Mermaid in notes uses `NotaCodeBlock` (`app/components/tiptap/nota-code-block.tsx`): `StarterKit.configure({ codeBlock: false })` plus `CodeBlockLowlight` from `@tiptap/extension-code-block-lowlight` with a shared `notaLowlight` instance (`app/lib/nota-lowlight.ts`: `createLowlight(common)` and register `mermaid` as plaintext so diagram fences are not auto-highlighted); React node view for the block. When `attrs.language` is `mermaid` (case-insensitive), lazy-load `mermaid`, debounce renders, use `securityLevel: 'strict'`, and derive light/dark theme from the `<html>` `dark` class. Non-mermaid fences get lowlight `hljs-*` decorations; style tokens in `styles.css` under `.tiptap-editor .tiptap-code-block` for light and `.dark`. Fence input rules allow broader language ids (e.g. `c++`) than stock TipTap. In `TipTapEditor`, declare hooks such as `useCallback` for toolbar actions before any early return that skips the mounted editor tree so hook order stays valid.
- TipTap body sync: apply `content` from props with `setContent` only when `noteId` changes (user opened a different note), not on every parent update after save or `revalidate` for the same note—otherwise the selection can jump. After a successful body save, align `lastSavedContent` with the merged local body snapshot passed to `onNoteUpdated`, not only the payload that triggered the request.
- Signed-in command palette: when open, Cmd/Ctrl+N submits create-note (if not busy) and Space focuses the filter unless the input is already focused; create-note and sign-out close the palette; muted right-side labels can show hotkeys (e.g. ⌘N vs Ctrl+N from platform sniff). Menu rows use `HugeiconsIcon` with icons from `@hugeicons/core-free-icons` for consistent item affordances.
- Electron translucency: `BrowserWindow` uses `transparent: true` and `backgroundColor: '#00000000'`; on macOS add `vibrancy: 'under-window'` and `visualEffectState: 'followWindow'` so the window is not a solid black composite. `root.tsx` runs an inline head script that adds `nota-electron` on `<html>` when `window.nota` exists. Use unlayered CSS (not only `@layer base`) for `html.nota-electron` / `body` transparency and for `html.nota-electron .nota-notes-root` so Tailwind utility backgrounds on the notes shell do not override transparency.
