import { getClerkUserIdFromRequest } from './clerk-request-auth';
import { fetchOgPreview } from './og-preview.server';

/** Electron / local static server: no Clerk Billing secret required; still requires a signed-in Clerk user (cookies or Bearer). */
export async function spaApiOgPreviewDesktop(
  request: Request,
): Promise<Response> {
  const userId = await getClerkUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
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
