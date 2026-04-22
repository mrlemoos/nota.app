/**
 * When false, JSON error handlers must not echo raw exception messages to clients.
 * Set `NOTA_SERVER_DEBUG_ERRORS=1` to include `detail` in non-local environments.
 */
export function notaServerExposeErrorDetails(): boolean {
  if (process.env.NOTA_SERVER_DEBUG_ERRORS?.trim() === '1') {
    return true;
  }
  return process.env.NODE_ENV !== 'production';
}
