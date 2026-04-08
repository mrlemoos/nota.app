import { getClerkAccessToken } from './clerk-token-ref';

function notaServerBase(): string | undefined {
  const b = import.meta.env.VITE_NOTA_SERVER_API_URL;
  if (typeof b !== 'string' || !b.trim()) {
    return undefined;
  }
  return b.replace(/\/$/, '');
}

function unauthorizedEntitledResponse(): Response {
  return new Response(
    JSON.stringify({ error: 'Unauthorized', entitled: false }),
    {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

function unauthorizedInvalidateResponse(): Response {
  return new Response(JSON.stringify({ ok: false }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** `GET` on nota-server; Bearer Clerk session JWT. Missing `VITE_NOTA_SERVER_API_URL` → 401 without calling the network. */
export async function fetchNotaProEntitled(): Promise<Response> {
  const base = notaServerBase();
  if (!base) {
    return unauthorizedEntitledResponse();
  }
  const token = await getClerkAccessToken();
  if (!token) {
    return unauthorizedEntitledResponse();
  }
  return fetch(`${base}/api/nota-pro-entitled`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** `POST` on nota-server; same Bearer auth as `fetchNotaProEntitled`. */
export async function postNotaProInvalidate(): Promise<Response> {
  const base = notaServerBase();
  if (!base) {
    return unauthorizedInvalidateResponse();
  }
  const token = await getClerkAccessToken();
  if (!token) {
    return unauthorizedInvalidateResponse();
  }
  return fetch(`${base}/api/nota-pro-invalidate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}
