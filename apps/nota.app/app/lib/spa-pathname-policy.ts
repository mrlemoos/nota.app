/**
 * Which URL pathnames may receive the SPA shell (index.html) on first request.
 * Used by Vercel Edge Middleware and documented for parity with Electron static server.
 */
export function isSpaShellPathnameAllowed(pathname: string): boolean {
  const p =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname;
  if (p === '/' || p === '') {
    return true;
  }
  if (p === '/index.html') {
    return true;
  }
  if (p === '/favicon.svg') {
    return true;
  }
  if (p.startsWith('/assets/')) {
    return true;
  }
  if (p === '/notes' || p.startsWith('/notes/')) {
    return true;
  }
  if (p === '/sso-callback' || p.startsWith('/sso-callback/')) {
    return true;
  }
  return false;
}
