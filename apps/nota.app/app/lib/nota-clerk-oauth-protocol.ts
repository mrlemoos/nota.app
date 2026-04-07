/**
 * Desktop (Electron): Clerk OAuth + Apple/Google passkeys must run in the **system browser**.
 * The OAuth redirect uses this custom URL scheme so macOS/Windows hand control back to Nota.
 *
 * Add **`nota://oauth-callback`** to your Clerk instance → **Allowed redirect URLs** (or OAuth
 * redirect allowlist), alongside your usual `http://localhost:4200` / production origins.
 */
export const NOTA_CLERK_OAUTH_CALLBACK_URL = 'nota://oauth-callback' as const;

/** Path served by the Vite/Electron shell for `AuthenticateWithRedirectCallback`. */
export const NOTA_CLERK_SSO_CALLBACK_PATH = '/sso-callback' as const;

export function isNotaClerkSsoCallbackPathname(pathname: string): boolean {
  const p =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname;
  return p === NOTA_CLERK_SSO_CALLBACK_PATH;
}
