import type { Note } from '~/types/database.types';

export const NOTES_IDB_PUT_CHUNK_SIZE = 16;

function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

/**
 * Persists each server note snapshot into IndexedDB without blocking the main
 * thread for the entire vault (yields between chunks).
 */
export async function syncServerNotesToIdbInChunks(
  userId: string,
  serverNotes: readonly Note[],
  putServerNoteIfNotDirty: (
    userId: string,
    note: Note,
  ) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < serverNotes.length; i += NOTES_IDB_PUT_CHUNK_SIZE) {
    const end = Math.min(i + NOTES_IDB_PUT_CHUNK_SIZE, serverNotes.length);
    for (let j = i; j < end; j += 1) {
      await putServerNoteIfNotDirty(userId, serverNotes[j]!);
    }
    if (end < serverNotes.length) {
      await yieldToMainThread();
    }
  }
}
