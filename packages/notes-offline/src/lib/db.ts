const DB_PREFIX = 'nota-notes';
const DB_VERSION = 1;

const NOTES_STORE = 'notes';
const OUTBOX_STORE = 'outbox';

export const NOTES_OBJECT_STORE = NOTES_STORE;
export const OUTBOX_OBJECT_STORE = OUTBOX_STORE;

function dbName(userId: string): string {
  return `${DB_PREFIX}-${userId}`;
}

export function openNotaNotesDb(userId: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName(userId), DB_VERSION);

    req.onerror = (): void => {
      reject(req.error ?? new Error('Failed to open IndexedDB'));
    };

    req.onsuccess = (): void => {
      resolve(req.result);
    };

    req.onupgradeneeded = (event: IDBVersionChangeEvent): void => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(NOTES_STORE)) {
        db.createObjectStore(NOTES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        db.createObjectStore(OUTBOX_STORE, { keyPath: 'noteId' });
      }
    };
  });
}

let dbCache: { userId: string; db: IDBDatabase } | null = null;

export async function getNotaNotesDb(userId: string): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available');
  }
  if (dbCache?.userId === userId) {
    return dbCache.db;
  }
  if (dbCache) {
    try {
      dbCache.db.close();
    } catch {
      /* ignore */
    }
    dbCache = null;
  }
  const db = await openNotaNotesDb(userId);
  dbCache = { userId, db };
  return db;
}

export function closeNotaNotesDb(): void {
  if (dbCache) {
    try {
      dbCache.db.close();
    } catch {
      /* ignore */
    }
    dbCache = null;
  }
}

export async function deleteNotaNotesDb(userId: string): Promise<void> {
  closeNotaNotesDb();
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(dbName(userId));
    req.onsuccess = (): void => { resolve(); };
    req.onerror = (): void => { reject(req.error ?? new Error('Failed to delete IndexedDB')); };
  });
}

export function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = (): void => { resolve(req.result); };
    req.onerror = (): void => { reject(req.error ?? new Error('IndexedDB request failed')); };
  });
}

export function transactionComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = (): void => { resolve(); };
    tx.onerror = (): void => { reject(tx.error ?? new Error('IndexedDB transaction failed')); };
    tx.onabort = (): void => { reject(new Error('IndexedDB transaction aborted')); };
  });
}
