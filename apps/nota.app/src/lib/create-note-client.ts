import { getBrowserClient } from './supabase/browser';
import { createLocalOnlyNote, isLikelyOnline } from './notes-offline';
import { createNote } from '../models/notes';
import { setAppHash } from './app-navigation';
import type { Note } from '~/types/database.types';

export async function clientCreateNote(options: {
  userId: string;
  insertNoteAtFront: (n: Note) => void;
  refreshNotesList: (options?: { silent?: boolean }) => Promise<void>;
  notaProEntitled: boolean;
}): Promise<void> {
  const { userId } = options;
  if (!userId) {
    return;
  }

  if (!options.notaProEntitled) {
    return;
  }

  const c = getBrowserClient();

  function goToNote(id: string): void {
    setAppHash({ kind: 'notes', panel: 'note', noteId: id });
  }

  if (!isLikelyOnline()) {
    const id = await createLocalOnlyNote(userId);
    goToNote(id);
    await options.refreshNotesList({ silent: true });
    return;
  }

  try {
    const row = await createNote(c, userId);
    options.insertNoteAtFront(row);
    goToNote(row.id);
    await options.refreshNotesList({ silent: true });
  } catch {
    const id = await createLocalOnlyNote(userId);
    goToNote(id);
    await options.refreshNotesList({ silent: true });
  }
}
