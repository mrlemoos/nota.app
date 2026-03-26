import { describe, expect, it } from 'vitest';
import { sortOutboxForProcessing } from '../app/lib/notes-offline/outbox';
import type { OutboxEntry } from '../app/lib/notes-offline/types';

describe('sortOutboxForProcessing', () => {
  it('orders upsert before delete for the same note id', () => {
    const entries: OutboxEntry[] = [
      { noteId: 'a', kind: 'delete' },
      { noteId: 'a', kind: 'upsert' },
    ];
    const sorted = sortOutboxForProcessing(entries);
    expect(sorted.map((e) => e.kind)).toEqual(['upsert', 'delete']);
  });

  it('sorts by note id for stable processing', () => {
    const entries: OutboxEntry[] = [
      { noteId: 'z', kind: 'upsert' },
      { noteId: 'm', kind: 'delete' },
    ];
    const sorted = sortOutboxForProcessing(entries);
    expect(sorted.map((e) => e.noteId)).toEqual(['m', 'z']);
  });
});
