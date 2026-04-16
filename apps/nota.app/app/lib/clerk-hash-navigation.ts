import { replaceAppHash } from './app-navigation';

/**
 * Clerk path/hash mode uses `/sign-in` and `/sign-up`. The SPA hash must stay on those
 * segments so `<SignIn routing="hash" />` / `<SignUp routing="hash" />` (Core 3) mount.
 * We still accept legacy `#/login` / `#/signup` in `parseAppNavFromLocation`.
 * Map same-origin Clerk navigations into the hash so we avoid the hosted Account Portal reload loop.
 */

const AUTH_HASH_PATH = /^\/(?:sign-in|sign-up|login|signup)(?:\/|$)/;

/** Clerk redirect params can recurse into megabyte-scale hashes; strip runaway query wholesale. */
const MAX_AUTH_HASH_QUERY_LEN = 2048;

function tryMapAuthPath(pathnameOnly: string, search: string): string | null {
  if (pathnameOnly === '/sign-in' || pathnameOnly.startsWith('/sign-in/')) {
    const rest =
      pathnameOnly === '/sign-in' ? '' : pathnameOnly.slice('/sign-in'.length);
    return `/sign-in${rest}${search}`;
  }

  if (pathnameOnly === '/sign-up' || pathnameOnly.startsWith('/sign-up/')) {
    const rest =
      pathnameOnly === '/sign-up' ? '' : pathnameOnly.slice('/sign-up'.length);
    return `/sign-up${rest}${search}`;
  }

  if (pathnameOnly === '/login' || pathnameOnly.startsWith('/login/')) {
    return `${pathnameOnly}${search}`;
  }

  if (pathnameOnly === '/signup' || pathnameOnly.startsWith('/signup/')) {
    return `${pathnameOnly}${search}`;
  }

  return null;
}

/**
 * Clerk hash routing often passes targets like `http://host/#/sign-up?…` where the real
 * path and query live in `location.hash`, not `pathname` + `search`. If we fail to map those,
 * `routerReplace` becomes a no-op and Clerk falls back to re-encoding the current URL into
 * redirect params, which explodes (`sign_*_force_redirect_url` nesting).
 */
export function mapClerkToHashFragment(
  to: string,
  currentHref: string,
): { fragment: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(to, currentHref);
  } catch {
    return null;
  }

  let current: URL;
  try {
    current = new URL(currentHref);
  } catch {
    return null;
  }

  if (parsed.origin !== current.origin) {
    return null;
  }

  const docPath = (parsed.pathname.replace(/\/$/, '') || '/') + parsed.search;
  const docQ = docPath.indexOf('?');
  const docPathnameOnly = docQ === -1 ? docPath : docPath.slice(0, docQ);
  const docSearch = docQ === -1 ? '' : docPath.slice(docQ);

  let fragment = tryMapAuthPath(docPathnameOnly, docSearch);

  if (
    !fragment &&
    (parsed.pathname === '/' || parsed.pathname === '') &&
    parsed.hash.length > 1
  ) {
    const rawHash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
    if (rawHash.startsWith('/')) {
      const hq = rawHash.indexOf('?');
      const hashPath = hq === -1 ? rawHash : rawHash.slice(0, hq);
      const hashSearch = hq === -1 ? '' : rawHash.slice(hq);
      fragment = tryMapAuthPath(hashPath, hashSearch);
    }
  }

  if (!fragment) {
    return null;
  }
  return { fragment };
}

function redirectParamLooksNested(encodedValue: string): boolean {
  if (encodedValue.length > 280) {
    return true;
  }
  let s = encodedValue;
  for (let i = 0; i < 8; i++) {
    try {
      const next = decodeURIComponent(s);
      if (next === s) {
        break;
      }
      s = next;
    } catch {
      break;
    }
  }
  return /sign_(?:in|up)_(?:force|fallback)_redirect_url(?:=|%3D)/i.test(s);
}

const SIGN_REDIRECT_PARAM =
  /^sign_(?:in|up)_(?:force|fallback)_redirect_url$/i;

/**
 * Collapse runaway Clerk redirect query values (nested `sign_*_force_redirect_url` chains)
 * back to a single canonical post-auth URL.
 */
export function sanitizeClerkAuthHashFragment(fragment: string): string {
  const qIndex = fragment.indexOf('?');
  if (qIndex === -1) {
    return fragment;
  }
  const pathPart = fragment.slice(0, qIndex);
  if (
    !pathPart.startsWith('/sign-in') &&
    !pathPart.startsWith('/sign-up') &&
    !pathPart.startsWith('/login') &&
    !pathPart.startsWith('/signup')
  ) {
    return fragment;
  }

  const params = new URLSearchParams(fragment.slice(qIndex + 1));
  const notes = clerkFullNotesUrl();
  for (const key of [...params.keys()]) {
    if (!SIGN_REDIRECT_PARAM.test(key)) {
      continue;
    }
    const val = params.get(key);
    if (!val) {
      continue;
    }
    if (redirectParamLooksNested(val)) {
      params.set(key, notes);
    }
  }
  const out = params.toString();
  return out ? `${pathPart}?${out}` : pathPart;
}

export function clerkSpaOriginWithPath(): string {
  const { origin, pathname } = window.location;
  const normalised =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname;
  return `${origin}${normalised}`;
}

export function clerkFullSignInUrl(): string {
  return `${clerkSpaOriginWithPath()}#/sign-in`;
}

export function clerkFullSignUpUrl(): string {
  return `${clerkSpaOriginWithPath()}#/sign-up`;
}

export function clerkFullNotesUrl(): string {
  return `${clerkSpaOriginWithPath()}#/notes`;
}

export function clerkRouterPush(
  to: string,
  metadata?: { windowNavigate: (u: URL | string) => void },
): void {
  const mapped = mapClerkToHashFragment(to, window.location.href);
  if (!mapped) {
    metadata?.windowNavigate(to);
    return;
  }
  const url = new URL(window.location.href);
  url.hash = sanitizeClerkAuthHashFragment(mapped.fragment);
  window.history.pushState(window.history.state, '', url.toString());
  // Navigation sync is scheduled by the app-navigation `history.pushState` patch (deferred, React-safe).
}

export function clerkRouterReplace(
  to: string,
  metadata?: { windowNavigate: (u: URL | string) => void },
): void {
  const mapped = mapClerkToHashFragment(to, window.location.href);
  if (!mapped) {
    metadata?.windowNavigate(to);
    return;
  }
  const url = new URL(window.location.href);
  url.hash = sanitizeClerkAuthHashFragment(mapped.fragment);
  window.history.replaceState(window.history.state, '', url.toString());
  // Navigation sync is scheduled by the app-navigation `history.replaceState` patch (deferred, React-safe).
}

/**
 * Normalise a corrupted auth hash before Clerk mounts (bookmark / bad redirect loop).
 * Call once at boot and when switching to sign-in / sign-up.
 */
export function repairClerkAuthLocationHash(): void {
  const h = window.location.hash;
  const raw = h.startsWith('#') ? h.slice(1) : h;
  if (!raw.startsWith('/')) {
    return;
  }
  const q = raw.indexOf('?');
  const path = q === -1 ? raw : raw.slice(0, q);
  if (!AUTH_HASH_PATH.test(path)) {
    return;
  }
  const queryLen = q === -1 ? 0 : raw.length - q - 1;
  if (queryLen > MAX_AUTH_HASH_QUERY_LEN) {
    replaceAppHash(
      path.startsWith('/sign-up') || path.startsWith('/signup')
        ? { kind: 'signup' }
        : { kind: 'login' },
    );
    return;
  }
  if (q === -1) {
    return;
  }
  const sanitized = sanitizeClerkAuthHashFragment(raw);
  if (sanitized === raw) {
    return;
  }
  const url = new URL(window.location.href);
  url.hash = sanitized;
  window.history.replaceState(window.history.state, '', url.toString());
}
