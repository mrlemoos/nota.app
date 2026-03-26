import {
  getNotaNotesDb,
  idbRequest,
  OUTBOX_OBJECT_STORE,
  transactionComplete,
} from './db';
import type { OutboxEntry, OutboxKind } from './types';

export async function enqueueOutbox(
  userId: string,
  noteId: string,
  kind: OutboxKind,
): Promise<void> {
  const db = await getNotaNotesDb(userId);
  const tx = db.transaction(OUTBOX_OBJECT_STORE, 'readwrite');
  const entry: OutboxEntry = { noteId, kind };
  tx.objectStore(OUTBOX_OBJECT_STORE).put(entry);
  await transactionComplete(tx);
}

export async function removeOutboxEntry(userId: string, noteId: string): Promise<void> {
  const db = await getNotaNotesDb(userId);
  const tx = db.transaction(OUTBOX_OBJECT_STORE, 'readwrite');
  tx.objectStore(OUTBOX_OBJECT_STORE).delete(noteId);
  await transactionComplete(tx);
}

export async function listOutbox(userId: string): Promise<OutboxEntry[]> {
  const db = await getNotaNotesDb(userId);
  const tx = db.transaction(OUTBOX_OBJECT_STORE, 'readonly');
  const store = tx.objectStore(OUTBOX_OBJECT_STORE);
  const req = store.getAll();
  const rows = await idbRequest(req);
  await transactionComplete(tx);
  return rows as OutboxEntry[];
}

/** Process deletes after upserts for the same note id to avoid invalid API order. */
export function sortOutboxForProcessing(entries: OutboxEntry[]): OutboxEntry[] {
  return [...entries].sort((a, b) => {
    if (a.noteId !== b.noteId) {
      return a.noteId.localeCompare(b.noteId);
    }
    if (a.kind === b.kind) return 0;
    return a.kind === 'upsert' ? -1 : 1;
  });
}
