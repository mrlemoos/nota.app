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
    ...overrides,
  };
}

describe('mergeUpdatedNoteLocalContent', () => {
  it('uses pending content when newer than the server row', () => {
    const serverRow = makeNote();
    const pending = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'local' }] },
      ],
    };

    const merged = mergeUpdatedNoteLocalContent(serverRow, pending, serverRow.content);

    expect(merged).toEqual({
      ...serverRow,
      content: pending,
    });
  });

  it('uses fallback when pending is null or undefined', () => {
    const serverRow = makeNote();
    const fallback = { type: 'doc', content: [] } as Json;

    expect(
      mergeUpdatedNoteLocalContent(serverRow, null, fallback).content,
    ).toBe(fallback);
    expect(
      mergeUpdatedNoteLocalContent(serverRow, undefined, fallback).content,
    ).toBe(fallback);
  });

  it('preserves other fields from the updated note', () => {
    const serverRow = makeNote({ title: 'From server', updated_at: '2026-03-24T12:00:00Z' });
    const pending = { type: 'doc', content: [] };

    const merged = mergeUpdatedNoteLocalContent(
      serverRow,
      pending,
      serverRow.content,
    );

    expect(merged.title).toBe('From server');
    expect(merged.updated_at).toBe('2026-03-24T12:00:00Z');
    expect(merged.content).toBe(pending);
  });
});
