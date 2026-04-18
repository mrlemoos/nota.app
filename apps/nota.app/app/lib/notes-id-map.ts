import type { Note } from '~/types/database.types';

/** O(1) lookups by id for vault-sized lists (graph, backlinks, link resolution). */
export function notesToIdMap(notes: readonly Note[]): Map<string, Note> {
  const m = new Map<string, Note>();
  for (const n of notes) {
    m.set(n.id, n);
  }
  return m;
}
