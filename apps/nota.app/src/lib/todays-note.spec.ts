import { describe, expect, it } from 'vitest';
import {
  dailyNoteDisplayTitle,
  localDateKey,
  resolveTodaysNoteId,
} from './todays-note';

describe('dailyNoteDisplayTitle', () => {
  it('formats as day, full month, year (en-GB)', () => {
    // Arrange
    const date = new Date(2026, 2, 4);

    // Act
    const title = dailyNoteDisplayTitle(date);

    // Assert
    expect(title).toBe('4 March 2026');
  });

  it('uses no leading zero on the day', () => {
    // Arrange
    const date = new Date(2026, 0, 1);

    // Act
    const title = dailyNoteDisplayTitle(date);

    // Assert
    expect(title).toBe('1 January 2026');
  });
});

describe('localDateKey', () => {
  it('pads month and day and uses local calendar fields', () => {
    // Arrange
    const d = new Date(2025, 2, 5);

    // Act
    const key = localDateKey(d);

    // Assert
    expect(key).toBe('2025-03-05');
  });
});

describe('resolveTodaysNoteId', () => {
  const notes = [
    { id: 'a', folder_id: null as string | null },
    { id: 'b', folder_id: null as string | null },
  ];

  it('returns null when there is no mapping', () => {
    // Arrange
    const mapping: Record<string, string> = {};
    const dateKey = '2025-03-26';

    // Act
    const id = resolveTodaysNoteId(notes, mapping, dateKey);

    // Assert
    expect(id).toBeNull();
  });

  it('returns the id when the note exists at root', () => {
    // Arrange
    const mapping = { '2025-03-26': 'b' };
    const dateKey = '2025-03-26';

    // Act
    const id = resolveTodaysNoteId(notes, mapping, dateKey);

    // Assert
    expect(id).toBe('b');
  });

  it('returns null when the mapped id is not in the list', () => {
    // Arrange
    const mapping = { '2025-03-26': 'gone' };
    const dateKey = '2025-03-26';

    // Act
    const id = resolveTodaysNoteId(notes, mapping, dateKey);

    // Assert
    expect(id).toBeNull();
  });

  it('returns null when the mapped note is inside a folder', () => {
    // Arrange
    const inFolder = [
      { id: 'a', folder_id: null as string | null },
      { id: 'b', folder_id: 'f1' as string | null },
    ];
    const mapping = { '2025-03-26': 'b' };
    const dateKey = '2025-03-26';

    // Act
    const id = resolveTodaysNoteId(inFolder, mapping, dateKey);

    // Assert
    expect(id).toBeNull();
  });
});
