import { getBrowserClient } from '../supabase/browser';
import { createNote, deleteNote, updateNote } from '../../models/notes';
import { listOutbox, removeOutboxEntry, sortOutboxForProcessing } from './outbox';
import {
  getStoredNote,
  markNoteSyncedFromServer,
  removeStoredNote,
} from './local-note-store';

let drainPromise: Promise<boolean> | null = null;

export function isLikelyOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine;
}

/**
 * Process the outbox against Supabase. Safe to call repeatedly; concurrent calls coalesce.
 * @returns whether any operation completed successfully (caller may revalidate loaders).
 */
export function drainNotesOutbox(userId: string): Promise<boolean> {
  if (drainPromise) {
    return drainPromise;
  }
  drainPromise = (async () => {
    try {
      return await drainNotesOutboxInner(userId);
    } finally {
      drainPromise = null;
    }
  })();
  return drainPromise;
}

async function drainNotesOutboxInner(userId: string): Promise<boolean> {
  if (!isLikelyOnline()) {
    return false;
  }

  const client = getBrowserClient();
  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.user || session.user.id !== userId) {
    return false;
  }

  const entries = sortOutboxForProcessing(await listOutbox(userId));
  let progressed = false;

  for (const entry of entries) {
    const stored = await getStoredNote(userId, entry.noteId);

    if (entry.kind === 'delete') {
      if (!stored?.pending_delete) {
        await removeOutboxEntry(userId, entry.noteId);
        continue;
      }
      try {
        if (!stored.pending_create) {
          await deleteNote(client, entry.noteId);
        }
        await removeStoredNote(userId, entry.noteId);
        progressed = true;
      } catch (e) {
        console.error('Offline sync: delete failed', e);
      }
      continue;
    }

    if (entry.kind === 'upsert') {
      if (!stored || stored.pending_delete) {
        await removeOutboxEntry(userId, entry.noteId);
        continue;
      }
      try {
        if (stored.pending_create) {
          const created = await createNote(
            client,
            userId,
            stored.title,
            stored.content,
            {
              id: stored.id,
              due_at: stored.due_at,
              is_deadline: stored.is_deadline,
            },
          );
          await markNoteSyncedFromServer(userId, created);
        } else {
          const updated = await updateNote(client, stored.id, {
            title: stored.title,
            content: stored.content,
            due_at: stored.due_at,
            is_deadline: stored.is_deadline,
          });
          await markNoteSyncedFromServer(userId, updated);
        }
        progressed = true;
      } catch (e) {
        console.error('Offline sync: upsert failed', e);
      }
    }
  }

  return progressed;
}
