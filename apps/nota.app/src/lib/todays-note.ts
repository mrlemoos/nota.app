import type { Note } from '~/types/database.types';

/** Title for a daily note: local calendar date, e.g. "4 March 2026". */
export function dailyNoteDisplayTitle(at: Date): string {
  return at.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

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
 * Returns the note id mapped to `dateKey` if that id still exists in `notes`
 * as a **root** note (`folder_id` null). Otherwise returns `null` (caller should
 * drop the stale map entry when the note moved into a folder or was deleted).
 */
export function resolveTodaysNoteId(
  notes: Pick<Note, 'id' | 'folder_id'>[],
  map: Record<string, string>,
  dateKey: string,
): string | null {
  const id = map[dateKey];
  if (!id) {
    return null;
  }
  return notes.some((n) => n.id === id && n.folder_id == null) ? id : null;
}
