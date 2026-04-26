/** Hosted SPA the packaged shell loads (must match deployed nota.app). */
export const PACKAGED_REMOTE_APP_ORIGIN = 'https://app.nota.mrlemoos.dev';

export const DEV_PORT = 4200;

/** Origin string without trailing slash, for path joins such as `/sso-callback`. */
export function normalisedPackagedAppOrigin(): string {
  return PACKAGED_REMOTE_APP_ORIGIN.replace(/\/+$/, '');
}

/** Base URL for mapping `nota://oauth-callback` → `/sso-callback` on the same host as the shell. */
export function ssoCallbackBaseUrl(isDev: boolean): string {
  if (isDev) {
    return `http://localhost:${String(DEV_PORT)}`;
  }
  return normalisedPackagedAppOrigin();
}

/** Argument to `BrowserWindow.loadURL` for the main shell (initial navigation). */
export function resolveMainWindowLoadUrl(isDev: boolean): string {
  if (isDev) {
    return `http://localhost:${String(DEV_PORT)}`;
  }
  return `${normalisedPackagedAppOrigin()}/`;
}
