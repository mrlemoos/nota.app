import { getBrowserClient } from './supabase/browser';
import {
  drainNotesOutbox,
  getStoredNote,
  isLikelyOnline,
  markPendingDelete,
} from './notes-offline';
import { deleteNote } from '../models/notes';
import { setAppHash } from './app-navigation';
import { maybePruneEmptyFolder } from './maybe-prune-empty-folder';
import type { UserPreferences } from '~/types/database.types';

export async function clientDeleteNoteById(
  noteId: string,
  options: {
    userId: string;
    removeNoteFromList: (id: string) => void;
    removeFolderFromList: (id: string) => void;
    refreshNotesList: (options?: { silent?: boolean }) => Promise<void>;
    notaProEntitled: boolean;
    /** Folder the note belonged to, if any, so empty folders can be pruned. */
    noteFolderId: string | null;
    userPreferences: UserPreferences | null;
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
    await maybePruneEmptyFolder({
      folderId: options.noteFolderId,
      userPreferences: options.userPreferences,
      removeFolderFromList: options.removeFolderFromList,
    });
  };

  if (!isLikelyOnline()) {
    await runLocalDelete();
    return;
  }

  try {
    await deleteNote(client, noteId);
    options.removeNoteFromList(noteId);
    setAppHash({ kind: 'notes', panel: 'list', noteId: null });
    await maybePruneEmptyFolder({
      folderId: options.noteFolderId,
      userPreferences: options.userPreferences,
      removeFolderFromList: options.removeFolderFromList,
    });
    await options.refreshNotesList({ silent: true });
  } catch {
    await runLocalDelete();
  }
}
