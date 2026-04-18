import { describe, expect, it } from 'vitest';
import type { Note } from '~/types/database.types';
import { shouldRefetchOpenNoteFromVaultList } from './open-note-vault-list-sync';

function makeNote(partial: Partial<Note> & Pick<Note, 'id' | 'updated_at'>): Note {
  return {
    user_id: 'u',
    title: 't',
    content: { type: 'doc', content: [] },
    created_at: '2025-01-01T00:00:00.000Z',
    due_at: null,
    is_deadline: false,
    editor_settings: {},
    ...partial,
  } as Note;
}

describe('shouldRefetchOpenNoteFromVaultList', () => {
  it('returns false when list row is missing', () => {
    // Arrange
    const panel = makeNote({
      id: 'n1',
      updated_at: '2025-01-02T00:00:00.000Z',
    });

    // Act
    const result = shouldRefetchOpenNoteFromVaultList(panel, null);

    // Assert
    expect(result).toBe(false);
  });

  it('returns false when panel note is missing', () => {
    // Arrange
    const list = makeNote({
      id: 'n1',
      updated_at: '2025-01-03T00:00:00.000Z',
    });

    // Act
    const result = shouldRefetchOpenNoteFromVaultList(null, list);

    // Assert
    expect(result).toBe(false);
  });

  it('returns false when ids differ', () => {
    // Arrange
    const panel = makeNote({
      id: 'n1',
      updated_at: '2025-01-01T00:00:00.000Z',
    });
    const list = makeNote({
      id: 'n2',
      updated_at: '2025-01-03T00:00:00.000Z',
    });

    // Act
    const result = shouldRefetchOpenNoteFromVaultList(panel, list);

    // Assert
    expect(result).toBe(false);
  });

  it('returns false when timestamps are equal', () => {
    // Arrange
    const ts = '2025-01-02T12:00:00.000Z';
    const panel = makeNote({ id: 'n1', updated_at: ts });
    const list = makeNote({ id: 'n1', updated_at: ts });

    // Act
    const result = shouldRefetchOpenNoteFromVaultList(panel, list);

    // Assert
    expect(result).toBe(false);
  });

  it('returns false when list row is older than panel', () => {
    // Arrange
    const panel = makeNote({
      id: 'n1',
      updated_at: '2025-01-03T00:00:00.000Z',
    });
    const list = makeNote({
      id: 'n1',
      updated_at: '2025-01-02T00:00:00.000Z',
    });

    // Act
    const result = shouldRefetchOpenNoteFromVaultList(panel, list);

    // Assert
    expect(result).toBe(false);
  });

  it('returns true when list row is newer than panel (study notes / patch path)', () => {
    // Arrange
    const panel = makeNote({
      id: 'n1',
      updated_at: '2025-01-02T00:00:00.000Z',
    });
    const list = makeNote({
      id: 'n1',
      updated_at: '2025-01-02T12:00:00.000Z',
    });

    // Act
    const result = shouldRefetchOpenNoteFromVaultList(panel, list);

    // Assert
    expect(result).toBe(true);
  });
});
