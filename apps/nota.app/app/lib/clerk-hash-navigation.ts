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

/** Triple-encoded segments (e.g. `%253A`) or a hash query that re-embeds Clerk redirect keys. */
function redirectOrReturnUrlLooksPoisoned(encodedValue: string): boolean {
  if (redirectParamLooksNested(encodedValue)) {
    return true;
  }
  if (/%253[a-f0-9]{2}/i.test(encodedValue)) {
    return true;
  }
  let s = encodedValue;
  for (let i = 0; i < 10; i++) {
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
  const hashIdx = s.indexOf('#');
  if (hashIdx === -1) {
    return false;
  }
  const afterHash = s.slice(hashIdx + 1);
  const q = afterHash.indexOf('?');
  if (q === -1) {
    return false;
  }
  const hashQuery = afterHash.slice(q);
  if (/sign_(?:in|up)_(?:force|fallback)_redirect_url/i.test(hashQuery)) {
    return true;
  }
  if (hashQuery.length > 120) {
    return true;
  }
  return false;
}

const SIGN_REDIRECT_PARAM =
  /^sign_(?:in|up)_(?:force|fallback)_redirect_url$/i;

const REDIRECT_OR_RETURN_PARAM = /^(redirect_url|return_url)$/i;

function fullyDecodeRedirectValue(encodedValue: string): string {
  let s = encodedValue;
  for (let i = 0; i < 10; i++) {
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
  return s;
}

/**
 * Replace a poisoned `redirect_url` / `return_url` with a same-origin URL that has no nested hash query.
 */
function canonicalUrlForPoisonedRedirectOrReturn(
  authPathPart: string,
  encodedValue: string,
): string {
  const d = fullyDecodeRedirectValue(encodedValue);
  const onSignUp =
    authPathPart.startsWith('/sign-up') || authPathPart.startsWith('/signup');
  const onSignIn =
    authPathPart.startsWith('/sign-in') || authPathPart.startsWith('/login');

  if (onSignUp) {
    if (/#\/sign-in\b/i.test(d) || d.includes('/sign-in?')) {
      return clerkFullSignInUrl();
    }
    if (/#\/sign-up\b/i.test(d) || d.includes('/sign-up?')) {
      return clerkFullSignUpUrl();
    }
  }
  if (onSignIn) {
    if (/#\/sign-up\b/i.test(d) || d.includes('/sign-up?')) {
      return clerkFullSignUpUrl();
    }
    if (/#\/sign-in\b/i.test(d) || d.includes('/sign-in?')) {
      return clerkFullSignInUrl();
    }
  }
  return clerkFullNotesUrl();
}

function authHashFragmentStillPoisoned(fragment: string): boolean {
  if (/%253[a-f0-9]{2}/i.test(fragment)) {
    return true;
  }
  const qIndex = fragment.indexOf('?');
  if (qIndex === -1) {
    return false;
  }
  const pathPart = fragment.slice(0, qIndex);
  const params = new URLSearchParams(fragment.slice(qIndex + 1));
  for (const key of params.keys()) {
    const val = params.get(key);
    if (!val) {
      continue;
    }
    if (SIGN_REDIRECT_PARAM.test(key) && redirectParamLooksNested(val)) {
      return true;
    }
    if (REDIRECT_OR_RETURN_PARAM.test(key) && redirectOrReturnUrlLooksPoisoned(val)) {
      return true;
    }
  }
  return false;
}

function isRootAuthPath(path: string): boolean {
  return (
    path === '/sign-in' ||
    path === '/sign-up' ||
    path === '/login' ||
    path === '/signup'
  );
}

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
    const val = params.get(key);
    if (!val) {
      continue;
    }
    if (SIGN_REDIRECT_PARAM.test(key)) {
      if (redirectParamLooksNested(val)) {
        params.set(key, notes);
      }
      continue;
    }
    if (REDIRECT_OR_RETURN_PARAM.test(key) && redirectOrReturnUrlLooksPoisoned(val)) {
      params.set(
        key,
        canonicalUrlForPoisonedRedirectOrReturn(pathPart, val),
      );
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
  if (sanitized !== raw) {
    const url = new URL(window.location.href);
    url.hash = sanitized;
    window.history.replaceState(window.history.state, '', url.toString());
    return;
  }
  if (isRootAuthPath(path) && authHashFragmentStillPoisoned(raw)) {
    replaceAppHash(
      path.startsWith('/sign-up') || path.startsWith('/signup')
        ? { kind: 'signup' }
        : { kind: 'login' },
    );
  }
}
