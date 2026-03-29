import { getBrowserClient } from './supabase/browser';
import { createLocalOnlyNote, isLikelyOnline } from './notes-offline';
import { createNote } from '../models/notes';
import { setAppHash } from './app-navigation';
import type { Note } from '~/types/database.types';

export async function spaCreateNote(options: {
  insertNoteAtFront: (n: Note) => void;
  refreshNotesList: () => Promise<void>;
}): Promise<void> {
  const c = getBrowserClient();
  const {
    data: { session },
  } = await c.auth.getSession();
  if (!session?.user) {
    return;
  }

  function goToNote(id: string): void {
    setAppHash({ kind: 'notes', panel: 'note', noteId: id });
  }

  if (!isLikelyOnline()) {
    const id = await createLocalOnlyNote(session.user.id);
    goToNote(id);
    await options.refreshNotesList();
    return;
  }

  try {
    const row = await createNote(c, session.user.id);
    options.insertNoteAtFront(row);
    goToNote(row.id);
    await options.refreshNotesList();
  } catch {
    const id = await createLocalOnlyNote(session.user.id);
    goToNote(id);
    await options.refreshNotesList();
  }
}
