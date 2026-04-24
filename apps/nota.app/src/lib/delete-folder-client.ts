import { getBrowserClient } from './supabase/browser';
import { isLikelyOnline } from './notes-offline';
import {
  deleteNote,
  listNoteIdsInFolder,
  moveAllNotesBetweenFolders,
} from '../models/notes';
import { deleteFolderById } from '../models/folders';

export async function clientMoveAllNotesThenDeleteFolder(options: {
  folderId: string;
  targetFolderId: string | null;
  removeFolderFromList: (id: string) => void;
  refreshNotesList: (options?: { silent?: boolean }) => Promise<void>;
}): Promise<void> {
  if (!isLikelyOnline()) {
    throw new Error('Moving folders requires an internet connection.');
  }
  const client = getBrowserClient();
  await moveAllNotesBetweenFolders(client, options.folderId, options.targetFolderId);
  await deleteFolderById(client, options.folderId);
  options.removeFolderFromList(options.folderId);
  await options.refreshNotesList({ silent: true });
}

export async function clientDeleteAllNotesInFolderThenDeleteFolder(options: {
  folderId: string;
  removeNoteFromList: (id: string) => void;
  removeFolderFromList: (id: string) => void;
  refreshNotesList: (options?: { silent?: boolean }) => Promise<void>;
}): Promise<void> {
  if (!isLikelyOnline()) {
    throw new Error('Deleting a folder requires an internet connection.');
  }
  const client = getBrowserClient();
  const ids = await listNoteIdsInFolder(client, options.folderId);
  for (const id of ids) {
    await deleteNote(client, id);
    options.removeNoteFromList(id);
  }
  await deleteFolderById(client, options.folderId);
  options.removeFolderFromList(options.folderId);
  await options.refreshNotesList({ silent: true });
}
