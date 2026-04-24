import { getBrowserClient } from './supabase/browser';
import {
  drainNotesOutbox,
  isLikelyOnline,
  saveLocalNoteDraft,
} from './notes-offline';
import { updateNote } from '../models/notes';
import { maybePruneEmptyFolder } from './maybe-prune-empty-folder';
import type { Note, UserPreferences } from '~/types/database.types';

export async function clientMoveNoteToFolder(options: {
  noteId: string;
  targetFolderId: string | null;
  previousFolderId: string | null;
  userId: string;
  notaProEntitled: boolean;
  userPreferences: UserPreferences | null;
  patchNoteInList: (id: string, patch: Partial<Note>) => void;
  removeFolderFromList: (id: string) => void;
  refreshNotesList: (options?: { silent?: boolean }) => Promise<void>;
}): Promise<void> {
  const {
    noteId,
    targetFolderId,
    previousFolderId,
    userId,
    notaProEntitled,
    userPreferences,
    patchNoteInList,
    removeFolderFromList,
    refreshNotesList,
  } = options;

  if (!userId || !notaProEntitled) {
    return;
  }

  const client = getBrowserClient();

  const afterMove = async (): Promise<void> => {
    await maybePruneEmptyFolder({
      folderId: previousFolderId,
      userPreferences,
      removeFolderFromList,
    });
    await refreshNotesList({ silent: true });
  };

  if (!isLikelyOnline()) {
    await saveLocalNoteDraft(userId, { id: noteId, folder_id: targetFolderId });
    void drainNotesOutbox(userId);
    patchNoteInList(noteId, { folder_id: targetFolderId });
    await afterMove();
    return;
  }

  try {
    const row = await updateNote(client, noteId, {
      folder_id: targetFolderId,
    });
    patchNoteInList(noteId, { folder_id: row.folder_id });
  } catch {
    await saveLocalNoteDraft(userId, { id: noteId, folder_id: targetFolderId });
    void drainNotesOutbox(userId);
    patchNoteInList(noteId, { folder_id: targetFolderId });
  }

  await afterMove();
}
