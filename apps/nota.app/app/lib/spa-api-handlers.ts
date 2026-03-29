import { getAuthUser } from './supabase/auth';
import { fetchOgPreview } from './og-preview.server';
import {
  getServerNotaProEntitled,
  invalidateServerNotaProCache,
} from './revenuecat/subscriber.server';

export async function spaApiNotaProEntitled(
  request: Request,
): Promise<Response> {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json(
      { error: 'Unauthorized', entitled: false },
      { status: 401 },
    );
  }
  const entitled = await getServerNotaProEntitled(user.id);
  return Response.json({ entitled });
}

export async function spaApiNotaProInvalidate(
  request: Request,
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ ok: false }, { status: 401 });
  }
  invalidateServerNotaProCache(user.id);
  return Response.json({ ok: true as const });
}

export async function spaApiOgPreview(request: Request): Promise<Response> {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await getServerNotaProEntitled(user.id))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const urlParam = new URL(request.url).searchParams.get('url');
  if (!urlParam) {
    return Response.json({ error: 'Missing url' }, { status: 400 });
  }

  try {
    const data = await fetchOgPreview(urlParam);
    return Response.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch preview';
    return Response.json({ error: message }, { status: 400 });
  }
}
