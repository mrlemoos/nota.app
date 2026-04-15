import { describe, it, expect, vi } from 'vitest';
import { fetchNoteRowAndAttachmentsParallel } from './note-detail-fetch';
import type { TypedSupabaseClient } from '../models/notes';
import type { Note } from '~/types/database.types';

describe('fetchNoteRowAndAttachmentsParallel', () => {
  it('starts listing attachments before getNote resolves', async () => {
    const client = {} as TypedSupabaseClient;
    const noteId = '00000000-0000-4000-8000-000000000001';

    let resolveGet!: (value: Note | null) => void;
    const getNoteDeferred = new Promise<Note | null>((r) => {
      resolveGet = r;
    });

    const listNoteAttachments = vi.fn(() => Promise.resolve([]));

    const getNote = vi.fn(() => getNoteDeferred);

    const resultPromise = fetchNoteRowAndAttachmentsParallel(client, noteId, {
      getNote,
      listNoteAttachments,
    });

    expect(listNoteAttachments).toHaveBeenCalledWith(client, noteId);
    expect(getNote).toHaveBeenCalledWith(client, noteId);

    resolveGet({
      id: noteId,
      user_id: 'u1',
      title: 'T',
      content: { type: 'doc', content: [] },
      created_at: '2020-01-01T00:00:00.000Z',
      updated_at: '2020-01-01T00:00:00.000Z',
      due_at: null,
      is_deadline: false,
      editor_settings: {},
    } as Note);

    await expect(resultPromise).resolves.toMatchObject({
      row: expect.objectContaining({ id: noteId }),
      attachments: [],
    });
  });
});
