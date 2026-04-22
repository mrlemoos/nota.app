const NOTA_SERVER_NOTES_ENTITLED_SESSION_KEY = 'nota-server-notes-entitled';

/** Mirrors last successful server entitlement check for offline notes (subscribed users only). */
export function syncNotaServerEntitledSession(entitled: boolean): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  try {
    sessionStorage.setItem(
      NOTA_SERVER_NOTES_ENTITLED_SESSION_KEY,
      entitled ? '1' : '0',
    );
  } catch {
    /* private mode */
  }
}

export function readNotaServerEntitledSession(): boolean {
  if (typeof sessionStorage === 'undefined') {
    return false;
  }
  try {
    return (
      sessionStorage.getItem(NOTA_SERVER_NOTES_ENTITLED_SESSION_KEY) === '1'
    );
  } catch {
    return false;
  }
}
