import { getServerNotaProEntitled } from '../lib/clerk-billing.server.ts';
import { fetchOgPreview } from '../lib/og-preview.server.ts';
import { getUserIdFromBearer } from '../auth.ts';

export async function ogPreviewHandler(request: Request): Promise<Response> {
  const userId = await getUserIdFromBearer(request);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await getServerNotaProEntitled(userId))) {
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
