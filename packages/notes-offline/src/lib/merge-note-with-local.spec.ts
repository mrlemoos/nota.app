import { describe, expect, it } from 'vitest';
import { mergeNoteLists, mergeNoteWithLocal } from './merge-note-with-local.js';
import type { StoredNote } from './types.js';
import type { Json, Note } from '@nota.app/database-types';

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
    editor_settings: {} as Json,
    banner_attachment_id: null,
    folder_id: null,
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
    // Arrange
    const server = makeNote();
    const local = null;

    // Act
    const result = mergeNoteWithLocal(server, local);

    // Assert
    expect(result).toBe(server);
  });

  it('returns server row when local is not dirty', () => {
    // Arrange
    const server = makeNote({ title: 'Fresh' });
    const local = makeStored({ dirty: false, title: 'Stale local title' });

    // Act
    const result = mergeNoteWithLocal(server, local);

    // Assert
    expect(result).toBe(server);
  });

  it('prefers local title and content when local is dirty', () => {
    // Arrange
    const server = makeNote({ title: 'Server' });
    const local = makeStored({
      dirty: true,
      title: 'Local',
      content: { type: 'doc', content: [{ type: 'paragraph' }] } as Json,
      updated_at: '2020-01-03T00:00:00Z',
    });

    // Act
    const merged = mergeNoteWithLocal(server, local);

    // Assert
    expect(merged.title).toBe('Local');
    expect(merged.content).toEqual(local.content);
    expect(merged.updated_at).toBe('2020-01-03T00:00:00Z');
  });

  it('prefers local editor_settings when local is dirty', () => {
    // Arrange
    const server = makeNote({
      editor_settings: { font: 'sans' } as Json,
    });
    const local = makeStored({
      dirty: true,
      editor_settings: { font: 'mono', measure: 'narrow' } as Json,
      updated_at: '2020-01-03T00:00:00Z',
    });

    // Act
    const merged = mergeNoteWithLocal(server, local);

    // Assert
    expect(merged.editor_settings).toEqual({ font: 'mono', measure: 'narrow' });
  });

  it('prefers local folder_id when local is dirty', () => {
    // Arrange
    const folderA = '00000000-0000-4000-8000-000000000001';
    const folderB = '00000000-0000-4000-8000-000000000002';
    const server = makeNote({ folder_id: folderA });
    const local = makeStored({
      dirty: true,
      folder_id: folderB,
      updated_at: '2020-01-03T00:00:00Z',
    });

    // Act
    const merged = mergeNoteWithLocal(server, local);

    // Assert
    expect(merged.folder_id).toBe(folderB);
  });

  it('prefers local due_at and is_deadline when local is dirty', () => {
    // Arrange
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

    // Act
    const merged = mergeNoteWithLocal(server, local);

    // Assert
    expect(merged.due_at).toBe('2025-06-15T09:00:00Z');
    expect(merged.is_deadline).toBe(true);
  });
});

describe('mergeNoteLists', () => {
  it('drops cached rows that are no longer on the server unless dirty or pending_create', () => {
    // Arrange
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

    // Act
    const merged = mergeNoteLists(server, stored);

    // Assert
    expect(merged.map((n: Note) => n.id)).toEqual(['a']);
  });

  it('keeps pending_create notes that are absent from the server list', () => {
    // Arrange
    const server: Note[] = [];
    const stored: StoredNote[] = [
      makeStored({
        id: 'local-only',
        pending_create: true,
        dirty: true,
        title: 'New',
      }),
    ];

    // Act
    const merged = mergeNoteLists(server, stored);

    // Assert
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('local-only');
    expect(merged[0].title).toBe('New');
  });

  it('removes ids that are pending_delete', () => {
    // Arrange
    const server = [makeNote({ id: 'x' }), makeNote({ id: 'y', title: 'Y' })];
    const stored: StoredNote[] = [
      makeStored({
        id: 'y',
        pending_delete: true,
        dirty: true,
      }),
    ];

    // Act
    const merged = mergeNoteLists(server, stored);

    // Assert
    expect(merged.map((n: Note) => n.id)).toEqual(['x']);
  });
});
