import type { Note } from '~/types/database.types';

/** Local calendar date as `YYYY-MM-DD` (not UTC `toISOString().slice(0, 10)`). */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const mm = m < 10 ? `0${m}` : `${m}`;
  const dd = day < 10 ? `0${day}` : `${day}`;
  return `${y}-${mm}-${dd}`;
}

/**
 * Returns the note id mapped to `dateKey` if that id still exists in `notes`.
 * Otherwise returns `null` (caller should drop the stale map entry).
 */
export function resolveTodaysNoteId(
  notes: Pick<Note, 'id'>[],
  map: Record<string, string>,
  dateKey: string,
): string | null {
  const id = map[dateKey];
  if (!id) {
    return null;
  }
  return notes.some((n) => n.id === id) ? id : null;
}
