import type { Json, Note } from '~/types/database.types';

/**
 * After `updateNote`, the `.select()` row can carry stale `content` relative to the
 * TipTap document (e.g. user typed during the request, or title saved before body debounce).
 * Merge the latest local body snapshot so parent state does not trigger `setContent` in the editor.
 */
export function mergeUpdatedNoteLocalContent(
  updatedNote: Note,
  pendingContent: unknown | null | undefined,
  fallbackContent: Json,
): Note {
  return {
    ...updatedNote,
    content: (pendingContent ?? fallbackContent) as Json,
  };
}
