import {
  invalidateNotaProCacheForUser,
  jsonResponseNotaProEntitledForUser,
  jsonResponseNotaProInvalidateOk,
} from '../lib/nota-pro-api-logic.ts';
import { getUserIdFromBearer } from '../auth.ts';

export async function notaProEntitledHandler(
  request: Request,
): Promise<Response> {
  const userId = await getUserIdFromBearer(request);
  if (!userId) {
    return Response.json(
      { error: 'Unauthorized', entitled: false },
      { status: 401 },
    );
  }
  return jsonResponseNotaProEntitledForUser(userId);
}

export async function notaProInvalidateHandler(
  request: Request,
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  const userId = await getUserIdFromBearer(request);
  if (!userId) {
    return Response.json({ ok: false }, { status: 401 });
  }
  invalidateNotaProCacheForUser(userId);
  return jsonResponseNotaProInvalidateOk();
}
