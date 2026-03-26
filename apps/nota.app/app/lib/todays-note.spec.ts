import { describe, expect, it } from 'vitest';
import { localDateKey, resolveTodaysNoteId } from './todays-note';

describe('localDateKey', () => {
  it('pads month and day and uses local calendar fields', () => {
    const d = new Date(2025, 2, 5);
    expect(localDateKey(d)).toBe('2025-03-05');
  });
});

describe('resolveTodaysNoteId', () => {
  const notes = [{ id: 'a' }, { id: 'b' }];

  it('returns null when there is no mapping', () => {
    expect(resolveTodaysNoteId(notes, {}, '2025-03-26')).toBeNull();
  });

  it('returns the id when the note exists', () => {
    expect(
      resolveTodaysNoteId(notes, { '2025-03-26': 'b' }, '2025-03-26'),
    ).toBe('b');
  });

  it('returns null when the mapped id is not in the list', () => {
    expect(
      resolveTodaysNoteId(notes, { '2025-03-26': 'gone' }, '2025-03-26'),
    ).toBeNull();
  });
});
