import {
  getNotaNotesDb,
  idbRequest,
  NOTES_OBJECT_STORE,
  transactionComplete,
} from './db.js';
import { enqueueOutbox, removeOutboxEntry } from './outbox.js';
import type { StoredNote } from './types.js';
import { DEFAULT_NOTE_CONTENT } from './types.js';
import type { Json, Note } from '@nota.app/database-types';

function toStoredFromServer(note: Note): StoredNote {
  return {
    ...note,
    dirty: false,
    pending_create: false,
    pending_delete: false,
    server_updated_at: note.updated_at,
  };
}

/** Replace local row with server snapshot when there are no unsynced edits. */
export async function putServerNoteIfNotDirty(
  userId: string,
  note: Note,
): Promise<void> {
  const db = await getNotaNotesDb(userId);

  const tx = db.transaction(NOTES_OBJECT_STORE, 'readwrite');
  const store = tx.objectStore(NOTES_OBJECT_STORE);
  const existing = await idbRequest<StoredNote | undefined>(
    store.get(note.id) as IDBRequest<StoredNote | undefined>,
  );

  if (existing?.dirty) {
    await transactionComplete(tx);
    return;
  }

  store.put(toStoredFromServer(note));
  await transactionComplete(tx);
}

/** Persist a local title and/or body edit and queue sync. */
export async function saveLocalNoteDraft(
  userId: string,
  patch: {
    id: string;
    title?: string;
    content?: Json;
    user_id?: string;
    created_at?: string;
    due_at?: string | null;
    is_deadline?: boolean;
    editor_settings?: Json;
    banner_attachment_id?: string | null;
    folder_id?: string | null;
  },
  options: { pendingCreate?: boolean } = {},
): Promise<void> {
  const db = await getNotaNotesDb(userId);

  const now = new Date().toISOString();
  const tx = db.transaction(NOTES_OBJECT_STORE, 'readwrite');
  const store = tx.objectStore(NOTES_OBJECT_STORE);
  const existing = (await idbRequest(store.get(patch.id))) as StoredNote | undefined;

  const title = patch.title ?? existing?.title ?? '';
  const content = patch.content ?? existing?.content ?? DEFAULT_NOTE_CONTENT;

  const row: StoredNote = {
    id: patch.id,
    user_id: patch.user_id ?? existing?.user_id ?? userId,
    title,
    content: content,
    created_at: patch.created_at ?? existing?.created_at ?? now,
    updated_at: now,
    due_at:
      patch.due_at !== undefined
        ? patch.due_at
        : (existing?.due_at ?? null),
    is_deadline:
      patch.is_deadline !== undefined
        ? patch.is_deadline
        : (existing?.is_deadline ?? false),
    editor_settings:
      patch.editor_settings !== undefined
        ? patch.editor_settings
        : (existing?.editor_settings ?? ({})),
    banner_attachment_id:
      patch.banner_attachment_id !== undefined
        ? patch.banner_attachment_id
        : (existing?.banner_attachment_id ?? null),
    folder_id:
      patch.folder_id !== undefined
        ? patch.folder_id
        : (existing?.folder_id ?? null),
    dirty: true,
    pending_create: options.pendingCreate ?? existing?.pending_create ?? false,
    pending_delete: false,
    server_updated_at: existing?.server_updated_at ?? null,
  };

  store.put(row);
  await transactionComplete(tx);

  await enqueueOutbox(userId, patch.id, 'upsert');
}

export async function getStoredNote(
  userId: string,
  noteId: string,
): Promise<StoredNote | null> {
  const db = await getNotaNotesDb(userId);
  const tx = db.transaction(NOTES_OBJECT_STORE, 'readonly');
  const row = await idbRequest<StoredNote | undefined>(
    tx.objectStore(NOTES_OBJECT_STORE).get(noteId) as IDBRequest<
      StoredNote | undefined
    >,
  );
  await transactionComplete(tx);
  return row ?? null;
}

export async function listStoredNotes(userId: string): Promise<StoredNote[]> {
  const db = await getNotaNotesDb(userId);
  const tx = db.transaction(NOTES_OBJECT_STORE, 'readonly');
  const rows = await idbRequest(tx.objectStore(NOTES_OBJECT_STORE).getAll());
  await transactionComplete(tx);
  return rows as StoredNote[];
}

export async function markNoteSyncedFromServer(
  userId: string,
  note: Note,
): Promise<void> {
  const db = await getNotaNotesDb(userId);
  const tx = db.transaction(NOTES_OBJECT_STORE, 'readwrite');
  const store = tx.objectStore(NOTES_OBJECT_STORE);
  const stored: StoredNote = {
    ...note,
    dirty: false,
    pending_create: false,
    pending_delete: false,
    server_updated_at: note.updated_at,
  };
  store.put(stored);
  await transactionComplete(tx);
  await removeOutboxEntry(userId, note.id);
}

export async function markPendingDelete(
  userId: string,
  noteId: string,
  wasSynced: boolean,
): Promise<void> {
  const db = await getNotaNotesDb(userId);
  const tx = db.transaction(NOTES_OBJECT_STORE, 'readwrite');
  const store = tx.objectStore(NOTES_OBJECT_STORE);
  const existing = (await idbRequest(store.get(noteId))) as StoredNote | undefined;

  if (!wasSynced && existing?.pending_create) {
    store.delete(noteId);
    await transactionComplete(tx);
    await removeOutboxEntry(userId, noteId);
    return;
  }

  if (existing) {
    store.put({
      ...existing,
      pending_delete: true,
      dirty: true,
      updated_at: new Date().toISOString(),
    });
  } else {
    store.put({
      id: noteId,
      user_id: userId,
      title: '',
      content: {} as Json,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      due_at: null,
      is_deadline: false,
      editor_settings: {} as Json,
      banner_attachment_id: null,
      folder_id: null,
      dirty: true,
      pending_create: false,
      pending_delete: true,
      server_updated_at: null,
    } satisfies StoredNote);
  }
  await transactionComplete(tx);
  await enqueueOutbox(userId, noteId, 'delete');
}

export async function createLocalOnlyNote(
  userId: string,
  title = 'Untitled Note',
  content: Json = DEFAULT_NOTE_CONTENT,
  folderId: string | null = null,
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const db = await getNotaNotesDb(userId);

  const row: StoredNote = {
    id,
    user_id: userId,
    title,
    content,
    created_at: now,
    updated_at: now,
    due_at: null,
    is_deadline: false,
    editor_settings: {},
    banner_attachment_id: null,
    folder_id: folderId,
    dirty: true,
    pending_create: true,
    pending_delete: false,
    server_updated_at: null,
  };

  const tx = db.transaction(NOTES_OBJECT_STORE, 'readwrite');
  tx.objectStore(NOTES_OBJECT_STORE).put(row);
  await transactionComplete(tx);

  await enqueueOutbox(userId, id, 'upsert');
  return id;
}

export async function removeStoredNote(userId: string, noteId: string): Promise<void> {
  const db = await getNotaNotesDb(userId);
  const tx = db.transaction(NOTES_OBJECT_STORE, 'readwrite');
  tx.objectStore(NOTES_OBJECT_STORE).delete(noteId);
  await transactionComplete(tx);
  await removeOutboxEntry(userId, noteId);
}
