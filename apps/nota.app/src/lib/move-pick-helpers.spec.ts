import { describe, expect, it } from 'vitest';
import {
  MOVE_PICK_VALUE_PREFIX,
  parseMovePickNoteId,
  toggleIdInSet,
} from './move-pick-helpers';

describe('parseMovePickNoteId', () => {
  it('returns the note id for a valid move-pick value', () => {
    // Arrange
    const id = '550e8400-e29b-41d4-a716-446655440000';

    // Act
    const out = parseMovePickNoteId(`${MOVE_PICK_VALUE_PREFIX}${id}`);

    // Assert
    expect(out).toBe(id);
  });

  it('returns null for other command values', () => {
    // Act
    expect(parseMovePickNoteId('create-note')).toBeNull();
    expect(parseMovePickNoteId('move-pick:')).toBeNull();
    expect(parseMovePickNoteId('')).toBeNull();
  });
});

describe('toggleIdInSet', () => {
  it('adds an id when absent', () => {
    // Arrange
    const prev = new Set<string>();

    // Act
    const next = toggleIdInSet(prev, 'a');

    // Assert
    expect(next.has('a')).toBe(true);
    expect(prev.has('a')).toBe(false);
  });

  it('removes an id when present', () => {
    // Arrange
    const prev = new Set(['a', 'b']);

    // Act
    const next = toggleIdInSet(prev, 'a');

    // Assert
    expect(next.has('a')).toBe(false);
    expect(next.has('b')).toBe(true);
  });
});
