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

/** Same contract as `GET /api/nota-pro-entitled` on Vercel; uses Bearer auth when `VITE_NOTA_SERVER_API_URL` is set. */
export async function fetchNotaProEntitled(): Promise<Response> {
  const base = notaServerBase();
  if (base) {
    const token = await getClerkAccessToken();
    if (!token) {
      return unauthorizedEntitledResponse();
    }
    return fetch(`${base}/api/nota-pro-entitled`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  return fetch('/api/nota-pro-entitled', { credentials: 'include' });
}

/** Same contract as `POST /api/nota-pro-invalidate` on Vercel. */
export async function postNotaProInvalidate(): Promise<Response> {
  const base = notaServerBase();
  if (base) {
    const token = await getClerkAccessToken();
    if (!token) {
      return unauthorizedInvalidateResponse();
    }
    return fetch(`${base}/api/nota-pro-invalidate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  return fetch('/api/nota-pro-invalidate', {
    method: 'POST',
    credentials: 'include',
  });
}
