/**
 * Clerk path/hash mode uses `/sign-in` and `/sign-up`. The SPA hash must stay on those
 * segments so `<SignIn routing="hash" />` / `<SignUp routing="hash" />` (Core 3) mount.
 * We still accept legacy `#/login` / `#/signup` in `parseAppNavFromLocation`.
 * Map same-origin Clerk navigations into the hash so we avoid the hosted Account Portal reload loop.
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

  const path = (parsed.pathname.replace(/\/$/, '') || '/') + parsed.search;

  const qIndex = path.indexOf('?');
  const pathnameOnly = qIndex === -1 ? path : path.slice(0, qIndex);
  const search = qIndex === -1 ? '' : path.slice(qIndex);

  if (pathnameOnly === '/sign-in' || pathnameOnly.startsWith('/sign-in/')) {
    const rest =
      pathnameOnly === '/sign-in' ? '' : pathnameOnly.slice('/sign-in'.length);
    return { fragment: `/sign-in${rest}${search}` };
  }

  if (pathnameOnly === '/sign-up' || pathnameOnly.startsWith('/sign-up/')) {
    const rest =
      pathnameOnly === '/sign-up' ? '' : pathnameOnly.slice('/sign-up'.length);
    return { fragment: `/sign-up${rest}${search}` };
  }

  if (pathnameOnly === '/login' || pathnameOnly.startsWith('/login/')) {
    return { fragment: `${pathnameOnly}${search}` };
  }

  if (pathnameOnly === '/signup' || pathnameOnly.startsWith('/signup/')) {
    return { fragment: `${pathnameOnly}${search}` };
  }

  return null;
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
  url.hash = mapped.fragment;
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
  url.hash = mapped.fragment;
  window.history.replaceState(window.history.state, '', url.toString());
  // Navigation sync is scheduled by the app-navigation `history.replaceState` patch (deferred, React-safe).
}
