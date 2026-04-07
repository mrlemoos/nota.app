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
    userId: string;
    removeNoteFromList: (id: string) => void;
    refreshNotesList: (options?: { silent?: boolean }) => Promise<void>;
    notaProEntitled: boolean;
  },
): Promise<void> {
  const { userId } = options;
  if (!userId) {
    return;
  }
  if (!options.notaProEntitled) {
    return;
  }
  const client = getBrowserClient();
  const uid = userId;

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
    await options.refreshNotesList({ silent: true });
  } catch {
    await runLocalDelete();
  }
}
