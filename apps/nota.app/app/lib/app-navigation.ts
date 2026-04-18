/**
 * Hash-based SPA navigation: single source of truth for notes shell view + active note id.
 * Grammar: #/ | #/sign-in | #/sign-up | #/login | #/signup (legacy) | #/notes | … | #/404 — unknown paths resolve to `notFound`.
 */

/** Fired after `history.pushState` / `replaceState` (same tick as `scheduleNavigationSync`). */
export const NOTA_SPA_HISTORY_EVENT = 'nota:spa-history' as const;

export type NotesShellPanel =
  | 'list'
  | 'note'
  | 'graph'
  | 'settings'
  | 'shortcuts';

export type AppNavScreen =
  | { kind: 'landing' }
  | { kind: 'notFound' }
  | { kind: 'login' }
  | { kind: 'signup' }
  | {
      kind: 'notes';
      panel: NotesShellPanel;
      /** Set when panel is `note` */
      noteId: string | null;
    };

const NOTE_PATH =
  /^\/notes\/note\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;

function normaliseHashPath(): string {
  const h = window.location.hash;
  const raw = (h.startsWith('#') ? h.slice(1) : h) || '/';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

/** Path segment of the hash only (no `?…` query), trailing slash stripped except root. */
function hashRoutePath(): string {
  const full = normaliseHashPath();
  const withoutQuery = full.split('?')[0] ?? '/';
  const withSlash = withoutQuery.startsWith('/')
    ? withoutQuery
    : `/${withoutQuery}`;
  const trimmed = withSlash.replace(/\/$/, '') || '/';
  return trimmed;
}

export function parseAppNavFromLocation(): AppNavScreen {
  const path = hashRoutePath();

  if (path === '/' || path === '') {
    return { kind: 'landing' };
  }
  if (path === '/404' || path === '/404/') {
    return { kind: 'notFound' };
  }
  if (path === '/sign-in' || path.startsWith('/sign-in/')) {
    return { kind: 'login' };
  }
  if (path === '/sign-up' || path.startsWith('/sign-up/')) {
    return { kind: 'signup' };
  }
  if (path === '/login' || path.startsWith('/login/')) {
    return { kind: 'login' };
  }
  if (path === '/signup' || path.startsWith('/signup/')) {
    return { kind: 'signup' };
  }

  if (path === '/notes' || path === '/notes/') {
    return { kind: 'notes', panel: 'list', noteId: null };
  }
  if (path === '/notes/graph' || path === '/notes/graph/') {
    return { kind: 'notes', panel: 'graph', noteId: null };
  }
  if (path === '/notes/settings' || path === '/notes/settings/') {
    return { kind: 'notes', panel: 'settings', noteId: null };
  }
  if (path === '/notes/shortcuts' || path === '/notes/shortcuts/') {
    return { kind: 'notes', panel: 'shortcuts', noteId: null };
  }

  const m = path.match(NOTE_PATH);
  if (m) {
    return { kind: 'notes', panel: 'note', noteId: m[1] };
  }

  // Legacy-style /notes/:uuid in hash (tolerate)
  const legacy = path.match(
    /^\/notes\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i,
  );
  if (legacy) {
    return { kind: 'notes', panel: 'note', noteId: legacy[1] };
  }

  return { kind: 'notFound' };
}

export function hashForScreen(screen: AppNavScreen): string {
  switch (screen.kind) {
    case 'landing':
      return '#/';
    case 'notFound':
      return '#/404';
    case 'login':
      return '#/sign-in';
    case 'signup':
      return '#/sign-up';
    case 'notes': {
      switch (screen.panel) {
        case 'list':
          return '#/notes';
        case 'graph':
          return '#/notes/graph';
        case 'settings':
          return '#/notes/settings';
        case 'shortcuts':
          return '#/notes/shortcuts';
        case 'note':
          return screen.noteId ? `#/notes/note/${screen.noteId}` : '#/notes';
        default:
          return '#/notes';
      }
    }
    default:
      return '#/';
  }
}

/** Full URL for opening a note in a new tab (hash SPA). */
export function absoluteUrlForNote(noteId: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${hashForScreen({
    kind: 'notes',
    panel: 'note',
    noteId,
  })}`;
}

export function setAppHash(screen: AppNavScreen): void {
  const full = hashForScreen(screen);
  const desiredHash = full.startsWith('#') ? full : `#${full}`;
  const current = window.location.hash || '';
  if (current === desiredHash || (current === '' && desiredHash === '#/')) {
    return;
  }
  window.location.hash = full.startsWith('#') ? full.slice(1) : full;
}

export function replaceAppHash(screen: AppNavScreen): void {
  const full = hashForScreen(screen);
  const url = new URL(window.location.href);
  url.hash = full.startsWith('#') ? full.slice(1) : full;
  window.history.replaceState(window.history.state, '', url.toString());
  notify();
}

/** React-router–shaped helper for code that expected `navigate("/notes/uuid")`. */
export function navigateFromLegacyPath(to: string): void {
  const t = to.trim();
  const noteMatch = t.match(
    /^\/notes\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i,
  );
  if (noteMatch) {
    setAppHash({ kind: 'notes', panel: 'note', noteId: noteMatch[1] });
    return;
  }
  if (t === '/notes' || t === '/notes/') {
    setAppHash({ kind: 'notes', panel: 'list', noteId: null });
    return;
  }
  if (t.startsWith('/notes/graph')) {
    setAppHash({ kind: 'notes', panel: 'graph', noteId: null });
    return;
  }
  if (t.startsWith('/notes/settings')) {
    setAppHash({ kind: 'notes', panel: 'settings', noteId: null });
    return;
  }
  if (t.startsWith('/notes/shortcuts')) {
    setAppHash({ kind: 'notes', panel: 'shortcuts', noteId: null });
    return;
  }
  if (t === '/sign-in' || t.startsWith('/sign-in/')) {
    setAppHash({ kind: 'login' });
    return;
  }
  if (t === '/sign-up' || t.startsWith('/sign-up/')) {
    setAppHash({ kind: 'signup' });
    return;
  }
  if (t === '/login' || t.startsWith('/login/')) {
    setAppHash({ kind: 'login' });
    return;
  }
  if (t === '/signup' || t.startsWith('/signup/')) {
    setAppHash({ kind: 'signup' });
    return;
  }
  if (t === '/' || t === '') {
    setAppHash({ kind: 'landing' });
    return;
  }
}

export type AppNavigationListener = (screen: AppNavScreen) => void;

const listeners = new Set<AppNavigationListener>();

export function subscribeAppNavigation(fn: AppNavigationListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notify(): void {
  const screen = parseAppNavFromLocation();
  for (const fn of listeners) {
    fn(screen);
  }
}

let navigationSyncQueued = false;

/**
 * Run `notify` after the current stack — required when `history.pushState` / `replaceState` fire
 * from inside another library’s render path (e.g. Clerk). Synchronous `setState` there would
 * violate React’s rules and can blank the whole tree.
 */
function scheduleNavigationSync(): void {
  if (navigationSyncQueued) {
    return;
  }
  navigationSyncQueued = true;
  queueMicrotask(() => {
    navigationSyncQueued = false;
    notify();
  });
}

/**
 * Registers hash / history listeners and patches `pushState` / `replaceState` once.
 * Call from `main.tsx` so tests and scripts can import navigation helpers without side effects.
 */
export function bootstrapAppNavigation(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.addEventListener('hashchange', () => {
    notify();
  });
  window.addEventListener('popstate', () => {
    notify();
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      scheduleNavigationSync();
    }
  });

  /**
   * `history.pushState` / `replaceState` do not fire `hashchange` and do not fire `popstate`.
   * Clerk (and other code) updates the URL this way, which left React on a stale `kind` while
   * every `SpaAuthPanel` was `hidden` — `#root` collapsed to zero height and Electron showed a
   * blank grey window (transparent shell).
   */
  const patchKey = '__notaHistoryNavigationPatched';
  if (!(patchKey in window) || !(window as unknown as Record<string, boolean>)[patchKey]) {
    (window as unknown as Record<string, boolean>)[patchKey] = true;
    const patchHistoryNavigation = (key: 'pushState' | 'replaceState'): void => {
      const original = history[key].bind(history) as (
        data: unknown,
        unused: string,
        url?: string | URL | null,
      ) => void;
      history[key] = function (
        this: History,
        data: unknown,
        unused: string,
        url?: string | URL | null,
      ) {
        original(data, unused, url);
        scheduleNavigationSync();
        window.dispatchEvent(new Event(NOTA_SPA_HISTORY_EVENT));
      } as History[typeof key];
    };
    patchHistoryNavigation('pushState');
    patchHistoryNavigation('replaceState');
  }
}

export function syncAppNavigation(): void {
  notify();
}
