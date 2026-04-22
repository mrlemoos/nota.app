import type { Note } from '~/types/database.types';

/**
 * Whether the vault list row for the open note is newer than the detail panel’s
 * merged row, so the panel should re-merge from the list and refetch attachments.
 *
 * Uses lexicographic compare on ISO `updated_at` strings (same ordering as note list sort).
 */
export function shouldRefetchOpenNoteFromVaultList(
  panelNote: Note | null,
  listRow: Note | null,
): boolean {
  if (!listRow) {
    return false;
  }
  if (!panelNote || panelNote.id !== listRow.id) {
    return false;
  }
  return listRow.updated_at.localeCompare(panelNote.updated_at) > 0;
}
