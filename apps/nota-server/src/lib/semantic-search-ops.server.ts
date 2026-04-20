import { createHash } from 'node:crypto';

import type { SupabaseClient } from '@supabase/supabase-js';

import { extractPlainTextFromDocJson } from './note-plain-text.server.ts';
import { parseSemanticSearchQuery } from './semantic-search-query.server.ts';
import { embedTextForSemanticSearch } from './semantic-embeddings.server.ts';

const MAX_EMBED_INPUT_CHARS = 12_000;

export function hashSearchDocument(doc: string): string {
  return createHash('sha256').update(doc, 'utf8').digest('hex');
}

export function buildSearchDocument(options: {
  title: string;
  contentJson: unknown;
}): string {
  const plain = extractPlainTextFromDocJson(contentJson);
  const parts = [`${options.title.trim()}`.trim()];
  if (plain.length > 0) {
    parts.push(plain);
  }
  const raw = parts.join('\n\n').trim();
  if (raw.length <= MAX_EMBED_INPUT_CHARS) {
    return raw;
  }
  return `${raw.slice(0, MAX_EMBED_INPUT_CHARS)}\n…`;
}

function matchesLiterals(text: string, literals: string[]): boolean {
  const lower = text.toLowerCase();
  return literals.every((lit) => lower.includes(lit.toLowerCase()));
}

function vectorToPgLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`;
}

/** Literal substring search across live note rows (no embeddings). */
async function literalOnlyNoteIds(params: {
  supabase: SupabaseClient;
  userId: string;
  literals: string[];
}): Promise<string[]> {
  const { supabase, userId, literals } = params;

  const { data: rows, error } = await supabase
    .from('notes')
    .select('id,title,content')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`semantic search literal query failed: ${error.message}`);
  }

  const matches: string[] = [];
  for (const row of rows ?? []) {
    const plain = `${row.title ?? ''}\n${extractPlainTextFromDocJson(row.content)}`;
    if (matchesLiterals(plain, literals)) {
      matches.push(row.id as string);
    }
  }

  return matches;
}

export async function semanticSearchNotes(params: {
  supabase: SupabaseClient;
  userId: string;
  query: string;
}): Promise<{ results: Array<{ noteId: string; distance?: number }> }> {
  const { supabase, userId, query } = params;

  const parsed = parseSemanticSearchQuery(query);
  const literals = parsed.literals.filter((l) => l.trim().length > 0);
  const semantic = parsed.semantic.trim();

  if (semantic.length === 0 && literals.length === 0) {
    return { results: [] };
  }

  if (semantic.length === 0 && literals.length > 0) {
    const ids = await literalOnlyNoteIds({
      supabase,
      userId,
      literals,
    });
    return {
      results: ids.map((noteId) => ({ noteId })),
    };
  }

  const embeddingInput = semantic.slice(0, MAX_EMBED_INPUT_CHARS);

  const vectorStr = vectorToPgLiteral(
    await embedTextForSemanticSearch(embeddingInput),
  );

  type MatchRow = { note_id: string; distance: number };

  const { data: matches, error: rpcError } = await supabase.rpc(
    'match_note_semantic_index',
    {
      p_user_id: userId,
      p_query_embedding: vectorStr,
      p_match_count: 120,
    },
  );

  if (rpcError) {
    throw new Error(`semantic rpc failed: ${rpcError.message}`);
  }

  let orderedRows: MatchRow[] = Array.isArray(matches)
    ? (matches as MatchRow[])
    : [];

  if (literals.length > 0) {
    const ids = orderedRows.map((r) => r.note_id);
    if (ids.length === 0) {
      return { results: [] };
    }

    const { data: docs, error: docErr } = await supabase
      .from('note_semantic_index')
      .select('note_id, search_document')
      .eq('user_id', userId)
      .in('note_id', ids);

    if (docErr) {
      throw new Error(docErr.message);
    }

    const ok = new Set<string>();
    for (const row of docs ?? []) {
      const sd = row.search_document as string;
      if (matchesLiterals(sd, literals)) {
        ok.add(row.note_id as string);
      }
    }

    orderedRows = orderedRows.filter((r) => ok.has(r.note_id));
  }

  return {
    results: orderedRows.map((r) => ({
      noteId: r.note_id,
      distance: r.distance,
    })),
  };
}

export async function upsertSemanticIndexForNote(params: {
  supabase: SupabaseClient;
  userId: string;
  noteId: string;
}): Promise<{ skipped: boolean }> {
  const { supabase, userId, noteId } = params;

  const { data: note, error: noteErr } = await supabase
    .from('notes')
    .select('id,user_id,title,content')
    .eq('id', noteId)
    .maybeSingle();

  if (noteErr) {
    throw new Error(noteErr.message);
  }

  if (!note || note.user_id !== userId) {
    throw new Error('Note not found');
  }

  const searchDocument = buildSearchDocument({
    title: (note.title as string) ?? '',
    contentJson: note.content,
  });

  const hash = hashSearchDocument(searchDocument);

  const { data: existing } = await supabase
    .from('note_semantic_index')
    .select('content_hash')
    .eq('note_id', noteId)
    .maybeSingle();

  if (existing?.content_hash === hash) {
    return { skipped: true };
  }

  const embedInput = searchDocument.slice(0, MAX_EMBED_INPUT_CHARS);
  const vector = await embedTextForSemanticSearch(embedInput);

  const { error: upErr } = await supabase.from('note_semantic_index').upsert(
    {
      note_id: noteId,
      user_id: userId,
      embedding: vectorToPgLiteral(vector),
      search_document: searchDocument,
      content_hash: hash,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'note_id' },
  );

  if (upErr) {
    throw new Error(upErr.message);
  }

  return { skipped: false };
}

export async function reindexAllSemanticNotes(params: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<{ indexed: number }> {
  const { supabase, userId } = params;

  const { data: rows, error } = await supabase
    .from('notes')
    .select('id')
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }

  let indexed = 0;
  for (const row of rows ?? []) {
    await upsertSemanticIndexForNote({
      supabase,
      userId,
      noteId: row.id as string,
    });
    indexed += 1;
  }

  return { indexed };
}
