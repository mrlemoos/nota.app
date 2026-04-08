import {
  getServerNotaProEntitled,
  invalidateServerNotaProCache,
} from './clerk-billing.server.js';

export async function jsonResponseNotaProEntitledForUser(
  userId: string,
): Promise<Response> {
  const entitled = await getServerNotaProEntitled(userId);
  return Response.json({ entitled });
}

export function jsonResponseNotaProInvalidateOk(): Response {
  return Response.json({ ok: true as const });
}

export function invalidateNotaProCacheForUser(userId: string): void {
  invalidateServerNotaProCache(userId);
}
