const NOTE_PATH =
  /^\/notes\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;

function matchNotePath(pathname: string): string | null {
  const m = pathname.match(NOTE_PATH);
  return m ? m[1] : null;
}

/** Returns the note id when `href` is `/notes/:uuid` (optional trailing slash) or same path on an absolute URL. */
export function parseNoteLinkPath(href: string): string | null {
  const t = href.trim();
  if (!t) return null;
  if (t.startsWith('http://') || t.startsWith('https://')) {
    try {
      return matchNotePath(new URL(t).pathname);
    } catch {
      return null;
    }
  }
  return matchNotePath(t);
}

export function hrefForNote(noteId: string): string {
  return `/notes/${noteId}`;
}
