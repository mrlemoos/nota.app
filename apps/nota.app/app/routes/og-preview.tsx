import type { LoaderFunctionArgs } from 'react-router';
import { getAuthUser } from '../lib/supabase/auth';
import { fetchOgPreview } from '../lib/og-preview.server';
import { getServerNotaProEntitled } from '../lib/revenuecat/subscriber.server';

export async function loader({ request }: LoaderFunctionArgs) {
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

/** Resource route; clients use `fetch` to the loader URL. */
export default function OgPreviewRoute() {
  return null;
}
