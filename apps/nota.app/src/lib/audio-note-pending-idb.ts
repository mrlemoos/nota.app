import { idbRequest, transactionComplete } from '@nota.app/notes-offline';

const DB_NAME = 'nota-audio-note-pending';
const DB_VERSION = 2;
const STORE = 'jobs';

export type PendingAudioNoteJob = {
  id: string;
  noteId: string;
  userId: string;
  audio: ArrayBuffer;
  mime: string;
  createdAt: string;
  /** When true, merge into the note and preserve title (same as live append capture). */
  append?: boolean;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = (): void => { reject(req.error ?? new Error('IndexedDB open failed')); };
    req.onsuccess = (): void => { resolve(req.result); };
    req.onupgradeneeded = (ev): void => {
      const db = (ev.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
      // v2: optional `append` on jobs — existing rows omit it (replace behaviour).
    };
  });
}

export async function enqueuePendingAudioNoteJob(
  job: Omit<PendingAudioNoteJob, 'id' | 'createdAt'>,
): Promise<string> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available');
  }
  const id = crypto.randomUUID();
  const row: PendingAudioNoteJob = {
    ...job,
    id,
    createdAt: new Date().toISOString(),
  };
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put(row);
  await transactionComplete(tx);
  return id;
}

export async function listPendingAudioNoteJobs(
  userId: string,
): Promise<PendingAudioNoteJob[]> {
  if (typeof indexedDB === 'undefined') {
    return [];
  }
  const db = await openDb();
  const tx = db.transaction(STORE, 'readonly');
  const store = tx.objectStore(STORE);
  const all = (await idbRequest(store.getAll())) as PendingAudioNoteJob[];
  await transactionComplete(tx);
  return all.filter((j) => j.userId === userId);
}

export async function removePendingAudioNoteJob(id: string): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    return;
  }
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(id);
  await transactionComplete(tx);
}
