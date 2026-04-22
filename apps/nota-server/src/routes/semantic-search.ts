import { z } from 'zod';

import { getUserIdFromBearer } from '../auth.ts';
import { getServerNotaProEntitled } from '../lib/clerk-billing.server.ts';
import { notaServerExposeErrorDetails } from '../lib/nota-server-error-detail.server.ts';
import {
  reindexAllSemanticNotes,
  semanticSearchNotes,
  upsertSemanticIndexForNote,
} from '../lib/semantic-search-ops.server.ts';
import { requireServiceSupabase } from '../lib/supabase-service.server.ts';
import {
  rateLimitIndexNotePost,
  rateLimitReindexAllPost,
  rateLimitSemanticSearchPost,
} from '../lib/user-rate-limit.server.ts';

const searchBodySchema = z.object({
  query: z.string().max(4000),
});

const indexNoteBodySchema = z.object({
  noteId: z.string().uuid(),
});

function isConfigurationError(message: string): boolean {
  return (
    message.includes('SUPABASE_URL') ||
    message.includes('SUPABASE_SERVICE_ROLE_KEY') ||
    message.includes('NOTA_SEMANTIC_EMBEDDINGS_API_KEY')
  );
}

function jsonError(
  base: Record<string, unknown>,
  detail: string | undefined,
  status: number,
): Response {
  if (detail && notaServerExposeErrorDetails()) {
    return Response.json({ ...base, detail }, { status });
  }
  return Response.json(base, { status });
}

export async function semanticSearchPostHandler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const userId = await getUserIdFromBearer(request);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await getServerNotaProEntitled(userId))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!rateLimitSemanticSearchPost(userId)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  let bodyJson: unknown;
  try {
    bodyJson = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = searchBodySchema.safeParse(bodyJson);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }

  try {
    const supabase = requireServiceSupabase();
    const payload = await semanticSearchNotes({
      supabase,
      userId,
      query: parsed.data.query,
    });
    return Response.json(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isConfigurationError(msg)) {
      return jsonError(
        { error: 'Semantic search is not configured on the server.' },
        msg,
        503,
      );
    }
    console.error('[semantic-search]', e);
    return jsonError({ error: 'Semantic search failed' }, msg, 500);
  }
}

export async function indexNotePostHandler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const userId = await getUserIdFromBearer(request);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await getServerNotaProEntitled(userId))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!rateLimitIndexNotePost(userId)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  let bodyJson: unknown;
  try {
    bodyJson = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = indexNoteBodySchema.safeParse(bodyJson);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }

  try {
    const supabase = requireServiceSupabase();
    const { skipped } = await upsertSemanticIndexForNote({
      supabase,
      userId,
      noteId: parsed.data.noteId,
    });
    return Response.json({ ok: true, skipped });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isConfigurationError(msg)) {
      return jsonError(
        { error: 'Semantic index is not configured on the server.' },
        msg,
        503,
      );
    }
    if (msg.includes('Note not found')) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    console.error('[index-note]', e);
    return jsonError({ error: 'Index update failed' }, msg, 500);
  }
}

export async function reindexAllPostHandler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const userId = await getUserIdFromBearer(request);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await getServerNotaProEntitled(userId))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!rateLimitReindexAllPost(userId)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const supabase = requireServiceSupabase();
    const { indexed } = await reindexAllSemanticNotes({ supabase, userId });
    return Response.json({ ok: true, indexed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isConfigurationError(msg)) {
      return jsonError(
        { error: 'Semantic index is not configured on the server.' },
        msg,
        503,
      );
    }
    console.error('[reindex-all]', e);
    return jsonError({ error: 'Reindex failed' }, msg, 500);
  }
}
