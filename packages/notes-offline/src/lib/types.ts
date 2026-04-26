import type { Json, Note } from '@nota.app/database-types';

/** Extra fields persisted with a note row in IndexedDB. */
export type LocalNoteMeta = {
  dirty: boolean;
  pending_create: boolean;
  pending_delete: boolean;
  /** Last `updated_at` we confirmed on the server after a successful sync. */
  server_updated_at: string | null;
};

/** Full note row as stored locally (mirrors `Note` plus sync metadata). */
export type StoredNote = Note & LocalNoteMeta;

export type OutboxKind = 'upsert' | 'delete';

export type OutboxEntry = {
  noteId: string;
  kind: OutboxKind;
};

export const DEFAULT_NOTE_CONTENT: Json = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};
