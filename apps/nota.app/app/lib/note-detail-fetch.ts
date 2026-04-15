import type { Note, NoteAttachment } from '~/types/database.types';
import type { TypedSupabaseClient } from '../models/notes';

export type NoteDetailFetchDeps = {
  getNote: (client: TypedSupabaseClient, id: string) => Promise<Note | null>;
  listNoteAttachments: (
    client: TypedSupabaseClient,
    noteId: string,
  ) => Promise<NoteAttachment[]>;
};

/**
 * Loads the note row and attachment list together so the attachment round-trip
 * does not wait on the note query (and vice versa).
 *
 * If `getNote` rejects, the attachment request is drained to avoid unhandled rejections.
 * If `getNote` resolves to null, the attachment request is drained and attachments are empty.
 */
export async function fetchNoteRowAndAttachmentsParallel(
  client: TypedSupabaseClient,
  noteId: string,
  deps: NoteDetailFetchDeps,
): Promise<{ row: Note | null; attachments: NoteAttachment[] }> {
  const attachmentsPromise = deps.listNoteAttachments(client, noteId);
  let row: Note | null = null;
  try {
    row = await deps.getNote(client, noteId);
  } catch (e) {
    void attachmentsPromise.catch(() => undefined);
    throw e;
  }
  if (!row) {
    void attachmentsPromise.catch(() => undefined);
    return { row: null, attachments: [] };
  }
  const attachments = await attachmentsPromise;
  return { row, attachments };
}
