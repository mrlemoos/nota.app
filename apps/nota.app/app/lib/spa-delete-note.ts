import { getBrowserClient } from './supabase/browser';
import {
  drainNotesOutbox,
  getStoredNote,
  isLikelyOnline,
  markPendingDelete,
} from './notes-offline';
import { deleteNote } from '../models/notes';
import { setAppHash } from './app-navigation';

export async function spaDeleteNoteById(
  noteId: string,
  options: {
    removeNoteFromList: (id: string) => void;
    refreshNotesList: () => Promise<void>;
  },
): Promise<void> {
  const client = getBrowserClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session?.user) {
    return;
  }
  const uid = session.user.id;

  const runLocalDelete = async (): Promise<void> => {
    const stored = await getStoredNote(uid, noteId);
    await markPendingDelete(uid, noteId, !stored?.pending_create);
    void drainNotesOutbox(uid);
    options.removeNoteFromList(noteId);
    setAppHash({ kind: 'notes', panel: 'list', noteId: null });
  };

  if (!isLikelyOnline()) {
    await runLocalDelete();
    return;
  }

  try {
    await deleteNote(client, noteId);
    options.removeNoteFromList(noteId);
    setAppHash({ kind: 'notes', panel: 'list', noteId: null });
    await options.refreshNotesList();
  } catch {
    await runLocalDelete();
  }
}
