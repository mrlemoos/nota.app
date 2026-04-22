import { describe, expect, it } from 'vitest';
import { mergeUpdatedNoteLocalContent } from './note-updated-content-merge';
import type { Json, Note } from '~/types/database.types';

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'n1',
    user_id: 'u1',
    title: 'T',
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'server' }] }] } as Json,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-02T00:00:00Z',
    due_at: null,
    is_deadline: false,
    editor_settings: {} as Json,
    ...overrides,
  };
}

describe('mergeUpdatedNoteLocalContent', () => {
  it('uses pending content when newer than the server row', () => {
    // Arrange
    const serverRow = makeNote();
    const pending = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'local' }] },
      ],
    };
    const fallback = serverRow.content;

    // Act
    const merged = mergeUpdatedNoteLocalContent(serverRow, pending, fallback);

    // Assert
    expect(merged).toEqual({
      ...serverRow,
      content: pending,
    });
  });

  it('uses fallback when pending is null or undefined', () => {
    // Arrange
    const serverRow = makeNote();
    const fallback = { type: 'doc', content: [] } as Json;

    // Act
    const mergedNull = mergeUpdatedNoteLocalContent(serverRow, null, fallback);
    const mergedUndef = mergeUpdatedNoteLocalContent(serverRow, undefined, fallback);

    // Assert
    expect(mergedNull.content).toBe(fallback);
    expect(mergedUndef.content).toBe(fallback);
  });

  it('preserves other fields from the updated note', () => {
    // Arrange
    const serverRow = makeNote({ title: 'From server', updated_at: '2026-03-24T12:00:00Z' });
    const pending = { type: 'doc', content: [] };
    const fallback = serverRow.content;

    // Act
    const merged = mergeUpdatedNoteLocalContent(serverRow, pending, fallback);

    // Assert
    expect(merged.title).toBe('From server');
    expect(merged.updated_at).toBe('2026-03-24T12:00:00Z');
    expect(merged.content).toBe(pending);
  });
});
