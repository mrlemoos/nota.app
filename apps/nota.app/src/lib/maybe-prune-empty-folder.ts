import { countNotesInFolder, deleteFolderById } from '../models/folders';
import { getBrowserClient } from './supabase/browser';
import { isLikelyOnline } from './notes-offline';
import type { UserPreferences } from '~/types/database.types';

/**
 * When the user preference is enabled, deletes a folder that has zero notes left.
 */
export async function maybePruneEmptyFolder(options: {
  folderId: string | null | undefined;
  userPreferences: UserPreferences | null;
  removeFolderFromList: (id: string) => void;
}): Promise<void> {
  const { folderId, userPreferences, removeFolderFromList } = options;
  if (!folderId) {
    return;
  }
  if (userPreferences?.delete_empty_folders !== true) {
    return;
  }
  if (!isLikelyOnline()) {
    return;
  }

  const client = getBrowserClient();
  try {
    const count = await countNotesInFolder(client, folderId);
    if (count !== 0) {
      return;
    }
    await deleteFolderById(client, folderId);
    removeFolderFromList(folderId);
  } catch {
    /* list refresh can reconcile */
  }
}
