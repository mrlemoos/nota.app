import { describe, expect, it } from 'vitest';
import { mergeNoteLists, mergeNoteWithLocal } from './merge-note-with-local';
import type { StoredNote } from './types';
import type { Json, Note } from '~/types/database.types';

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'n1',
    user_id: 'u1',
    title: 'Server title',
    content: { type: 'doc', content: [] } as Json,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-02T00:00:00Z',
    due_at: null,
    is_deadline: false,
    ...overrides,
  };
}

function makeStored(overrides: Partial<StoredNote> = {}): StoredNote {
  return {
    ...makeNote(),
    dirty: false,
    pending_create: false,
    pending_delete: false,
    server_updated_at: '2020-01-02T00:00:00Z',
    ...overrides,
  };
}

describe('mergeNoteWithLocal', () => {
  it('returns server row when there is no local copy', () => {
    const server = makeNote();
    expect(mergeNoteWithLocal(server, null)).toBe(server);
  });

  it('returns server row when local is not dirty', () => {
    const server = makeNote({ title: 'Fresh' });
    const local = makeStored({ dirty: false, title: 'Stale local title' });
    expect(mergeNoteWithLocal(server, local)).toBe(server);
  });

  it('prefers local title and content when local is dirty', () => {
    const server = makeNote({ title: 'Server' });
    const local = makeStored({
      dirty: true,
      title: 'Local',
      content: { type: 'doc', content: [{ type: 'paragraph' }] } as Json,
      updated_at: '2020-01-03T00:00:00Z',
    });
    const merged = mergeNoteWithLocal(server, local);
    expect(merged.title).toBe('Local');
    expect(merged.content).toEqual(local.content);
    expect(merged.updated_at).toBe('2020-01-03T00:00:00Z');
  });

  it('prefers local due_at and is_deadline when local is dirty', () => {
    const server = makeNote({
      due_at: '2025-01-01T12:00:00Z',
      is_deadline: false,
    });
    const local = makeStored({
      dirty: true,
      due_at: '2025-06-15T09:00:00Z',
      is_deadline: true,
      updated_at: '2020-01-03T00:00:00Z',
    });
    const merged = mergeNoteWithLocal(server, local);
    expect(merged.due_at).toBe('2025-06-15T09:00:00Z');
    expect(merged.is_deadline).toBe(true);
  });
});

describe('mergeNoteLists', () => {
  it('drops cached rows that are no longer on the server unless dirty or pending_create', () => {
    const server = [makeNote({ id: 'a', updated_at: '2020-01-02T00:00:00Z' })];
    const stored: StoredNote[] = [
      makeStored({
        id: 'gone',
        dirty: false,
        pending_create: false,
        pending_delete: false,
        server_updated_at: '2019-01-01T00:00:00Z',
      }),
    ];
    const merged = mergeNoteLists(server, stored);
    expect(merged.map((n) => n.id)).toEqual(['a']);
  });

  it('keeps pending_create notes that are absent from the server list', () => {
    const server: Note[] = [];
    const stored: StoredNote[] = [
      makeStored({
        id: 'local-only',
        pending_create: true,
        dirty: true,
        title: 'New',
      }),
    ];
    const merged = mergeNoteLists(server, stored);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('local-only');
    expect(merged[0].title).toBe('New');
  });

  it('removes ids that are pending_delete', () => {
    const server = [
      makeNote({ id: 'x' }),
      makeNote({ id: 'y', title: 'Y' }),
    ];
    const stored: StoredNote[] = [
      makeStored({
        id: 'y',
        pending_delete: true,
        dirty: true,
      }),
    ];
    const merged = mergeNoteLists(server, stored);
    expect(merged.map((n) => n.id)).toEqual(['x']);
  });
});
