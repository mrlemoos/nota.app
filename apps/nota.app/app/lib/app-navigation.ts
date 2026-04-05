/**
 * Hash-based SPA navigation: single source of truth for notes shell view + active note id.
 * Grammar: #/ | #/login | #/signup | #/notes | #/notes/note/:uuid | #/notes/graph | #/notes/settings | #/notes/shortcuts | legacy #/notes/:uuid | #/404 (canonical not-found) — anything else resolves to `notFound`.
 */

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

export function parseAppNavFromLocation(): AppNavScreen {
  const path = normaliseHashPath();

  if (path === '/' || path === '') {
    return { kind: 'landing' };
  }
  if (path === '/404' || path === '/404/') {
    return { kind: 'notFound' };
  }
  if (path === '/login') {
    return { kind: 'login' };
  }
  if (path === '/signup') {
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
      return '#/login';
    case 'signup':
      return '#/signup';
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
  if (t === '/login') {
    setAppHash({ kind: 'login' });
    return;
  }
  if (t === '/signup') {
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

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    notify();
  });
  window.addEventListener('popstate', () => {
    notify();
  });
}

export function syncAppNavigation(): void {
  notify();
}
