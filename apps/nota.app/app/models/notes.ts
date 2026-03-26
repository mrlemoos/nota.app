import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Database,
  Json,
  NoteInsert,
  NoteUpdate,
} from '~/types/database.types';
import { listNoteAttachments, NOTE_PDFS_BUCKET } from './note-attachments';

/**
 * `@supabase/ssr` types `createServerClient` as `SupabaseClient<Database, SchemaName, Schema>` (3 args),
 * while `SupabaseClient` in `supabase-js` also has extra generics. Using `any` for schema slots accepts
 * both server and browser clients without assignability errors.
 */
export type TypedSupabaseClient = SupabaseClient<Database, any, any>;

export async function listNotes(client: TypedSupabaseClient) {
  const { data, error } = await client
    .from('notes')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list notes: ${error.message}`);
  }

  return data ?? [];
}

export async function getNote(client: TypedSupabaseClient, id: string) {
  const { data, error } = await client
    .from('notes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get note: ${error.message}`);
  }

  return data;
}

export async function createNote(
  client: TypedSupabaseClient,
  userId: string,
  title: string = 'Untitled Note',
  content: unknown = { type: 'doc', content: [{ type: 'paragraph' }] },
  options?: { id?: string },
) {
  const note: NoteInsert = {
    user_id: userId,
    title,
    content: content as Json,
    ...(options?.id ? { id: options.id } : {}),
  };

  const { data, error } = await client
    .from('notes')
    .insert(note)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create note: ${error.message}`);
  }

  return data;
}

export async function updateNote(
  client: TypedSupabaseClient,
  id: string,
  updates: Omit<NoteUpdate, 'id' | 'user_id' | 'created_at'>,
) {
  const { data, error } = await client
    .from('notes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update note: ${error.message}`);
  }

  return data;
}

export async function deleteNote(client: TypedSupabaseClient, id: string) {
  const attachments = await listNoteAttachments(client, id);
  if (attachments.length > 0) {
    const { error: storageError } = await client.storage
      .from(NOTE_PDFS_BUCKET)
      .remove(attachments.map((a) => a.storage_path));

    if (storageError) {
      throw new Error(
        `Failed to delete note attachments from storage: ${storageError.message}`,
      );
    }
  }

  const { error } = await client.from('notes').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete note: ${error.message}`);
  }
}

export function extractTitleFromContent(content: unknown): string {
  if (!content || typeof content !== 'object') {
    return 'Untitled Note';
  }

  const doc = content as {
    content?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };
  if (!doc.content) {
    return 'Untitled Note';
  }

  for (const node of doc.content) {
    if (node.type === 'paragraph' && node.content) {
      const text = node.content
        .filter((child) => child.type === 'text')
        .map((child) => child.text)
        .join('')
        .trim();

      if (text) {
        return text.length > 50 ? `${text.slice(0, 50).trim()}...` : text;
      }
    }
  }

  return 'Untitled Note';
}
