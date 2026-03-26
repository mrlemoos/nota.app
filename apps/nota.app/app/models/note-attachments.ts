import type { TypedSupabaseClient } from './notes';
import type { NoteAttachment, NoteAttachmentInsert } from '~/types/database.types';

export const NOTE_PDFS_BUCKET = 'note-pdfs';

const NOTE_ATTACHMENT_STORAGE_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
]);

/**
 * Object path inside the bucket: `{user_id}/{note_id}/{objectId}{safeExt}`.
 * `safeExt` must be a known extension (e.g. `.pdf`, `.jpg`); never pass raw user filenames.
 */
export function noteAttachmentStoragePath(
  userId: string,
  noteId: string,
  objectId: string,
  safeExt: string,
): string {
  const ext = safeExt.startsWith('.')
    ? safeExt.toLowerCase()
    : `.${safeExt.toLowerCase()}`;
  if (!NOTE_ATTACHMENT_STORAGE_EXTENSIONS.has(ext)) {
    throw new Error(`Invalid attachment storage extension: ${safeExt}`);
  }
  return `${userId}/${noteId}/${objectId}${ext}`;
}

export async function listNoteAttachments(
  client: TypedSupabaseClient,
  noteId: string,
) {
  const { data, error } = await client
    .from('note_attachments')
    .select('*')
    .eq('note_id', noteId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list note attachments: ${error.message}`);
  }

  return (data ?? []) as NoteAttachment[];
}

export async function createNoteAttachmentRecord(
  client: TypedSupabaseClient,
  row: Omit<NoteAttachmentInsert, 'id' | 'created_at' | 'content_type'> & {
    content_type?: string;
  },
) {
  const insert: NoteAttachmentInsert = {
    note_id: row.note_id,
    user_id: row.user_id,
    storage_path: row.storage_path,
    filename: row.filename,
    content_type: row.content_type ?? 'application/pdf',
    size_bytes: row.size_bytes ?? null,
  };

  const { data, error } = await client
    .from('note_attachments')
    .insert(insert)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create note attachment: ${error.message}`);
  }

  return data as NoteAttachment;
}

export async function deleteNoteAttachment(
  client: TypedSupabaseClient,
  id: string,
) {
  const { error } = await client.from('note_attachments').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete note attachment: ${error.message}`);
  }
}

export async function updateNoteAttachmentFilename(
  client: TypedSupabaseClient,
  id: string,
  filename: string,
) {
  const { data, error } = await client
    .from('note_attachments')
    .update({ filename })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to rename attachment: ${error.message}`);
  }

  return data as NoteAttachment;
}
