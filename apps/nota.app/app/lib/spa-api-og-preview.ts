import { getClerkUserIdFromRequest } from './clerk-request-auth.js';
import { getServerNotaProEntitled } from './clerk-billing.server.js';
import { fetchOgPreview } from './og-preview.server.js';

export { spaApiOgPreviewDesktop } from './spa-api-og-preview-desktop.js';

export async function spaApiOgPreview(request: Request): Promise<Response> {
  const userId = await getClerkUserIdFromRequest(request);
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
