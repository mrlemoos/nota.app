import { getClerkUserIdFromRequest } from './clerk-request-auth';
import {
  invalidateNotaProCacheForUser,
  jsonResponseNotaProEntitledForUser,
  jsonResponseNotaProInvalidateOk,
} from './nota-pro-api-logic';

export async function spaApiNotaProEntitled(
  request: Request,
): Promise<Response> {
  const userId = await getClerkUserIdFromRequest(request);
  if (!userId) {
    return Response.json(
      { error: 'Unauthorized', entitled: false },
      { status: 401 },
    );
  }
  return jsonResponseNotaProEntitledForUser(userId);
}

export async function spaApiNotaProInvalidate(
  request: Request,
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  const userId = await getClerkUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ ok: false }, { status: 401 });
  }
  invalidateNotaProCacheForUser(userId);
  return jsonResponseNotaProInvalidateOk();
}
