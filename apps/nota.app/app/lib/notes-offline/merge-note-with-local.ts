import type { StoredNote } from './types';
import type { Note } from '~/types/database.types';

function noteFromStored(stored: StoredNote): Note {
  const {
    dirty: _d,
    pending_create: _pc,
    pending_delete: _pd,
    server_updated_at: _s,
    ...note
  } = stored;
  return note;
}

/**
 * Merge server loader data with a locally stored row. Local edits win while `dirty`
 * or when the stored copy is newer than the last server revision we synced.
 */
export function mergeNoteWithLocal(
  server: Note,
  local: StoredNote | null | undefined,
): Note {
  if (!local || local.pending_delete) {
    return server;
  }

  if (!local.dirty) {
    return server;
  }

  const base = noteFromStored(local);
  return {
    ...server,
    title: base.title,
    content: base.content,
    updated_at: base.updated_at,
  };
}

/** Build a list row for the sidebar from storage when the server has no row yet. */
export function storedNoteToListRow(stored: StoredNote): Note {
  return noteFromStored(stored);
}

/**
 * Merge the server note list with locally created / tombstoned notes.
 * Rows that only existed as a non-dirty cache of a server note that is no
 * longer returned (e.g. deleted elsewhere) are dropped.
 */
export function mergeNoteLists(
  serverNotes: Note[],
  stored: StoredNote[],
): Note[] {
  const serverIds = new Set(serverNotes.map((n) => n.id));
  const relevantStored = stored.filter((row) => {
    if (row.pending_delete) return true;
    if (row.pending_create) return true;
    if (row.dirty) return true;
    return serverIds.has(row.id);
  });

  const byId = new Map<string, Note>();
  for (const n of serverNotes) {
    byId.set(n.id, n);
  }

  for (const row of relevantStored) {
    if (row.pending_delete) {
      byId.delete(row.id);
      continue;
    }
    const server = byId.get(row.id);
    const merged = server
      ? mergeNoteWithLocal(server, row)
      : mergeNoteWithLocal(storedNoteToListRow(row), row);
    byId.set(row.id, merged);
  }

  return [...byId.values()].sort((a, b) =>
    b.updated_at.localeCompare(a.updated_at),
  );
}
