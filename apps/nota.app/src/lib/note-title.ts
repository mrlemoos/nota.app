/** Matches persisted title used when saving empty titles to the database. */
export function persistedDisplayTitle(raw: string): string {
  const t = raw.trim();
  return t ? t : 'Untitled Note';
}
