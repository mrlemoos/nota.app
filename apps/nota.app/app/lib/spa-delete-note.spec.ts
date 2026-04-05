import { beforeEach, describe, expect, it, vi } from 'vitest';
import { spaDeleteNoteById } from './spa-delete-note';

import {
  drainNotesOutbox,
  isLikelyOnline,
  markPendingDelete,
} from './notes-offline';
import { deleteNote } from '../models/notes';

const getSession = vi.fn();
const removeNoteFromList = vi.fn();
const refreshNotesList = vi.fn();

vi.mock('./supabase/browser', () => ({
  getBrowserClient: () => ({
    auth: { getSession },
  }),
}));

vi.mock('./notes-offline', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./notes-offline')>();
  return {
    ...actual,
    drainNotesOutbox: vi.fn(),
    getStoredNote: vi.fn(() => Promise.resolve(null)),
    markPendingDelete: vi.fn(() => Promise.resolve()),
    isLikelyOnline: vi.fn(),
  };
});

vi.mock('../models/notes', () => ({
  deleteNote: vi.fn(() => Promise.resolve()),
}));

vi.mock('./app-navigation', () => ({
  setAppHash: vi.fn(),
}));

describe('spaDeleteNoteById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
    });
  });

  it('does nothing when not entitled', async () => {
    vi.mocked(isLikelyOnline).mockReturnValue(true);

    await spaDeleteNoteById('n1', {
      removeNoteFromList,
      refreshNotesList,
      notaProEntitled: false,
    });

    expect(deleteNote).not.toHaveBeenCalled();
    expect(markPendingDelete).not.toHaveBeenCalled();
    expect(removeNoteFromList).not.toHaveBeenCalled();
  });

  it('deletes locally when offline and entitled', async () => {
    vi.mocked(isLikelyOnline).mockReturnValue(false);

    await spaDeleteNoteById('n1', {
      removeNoteFromList,
      refreshNotesList,
      notaProEntitled: true,
    });

    expect(deleteNote).not.toHaveBeenCalled();
    expect(markPendingDelete).toHaveBeenCalled();
    expect(removeNoteFromList).toHaveBeenCalledWith('n1');
  });

  it('calls Supabase delete when online and Nota Pro', async () => {
    vi.mocked(isLikelyOnline).mockReturnValue(true);

    await spaDeleteNoteById('n1', {
      removeNoteFromList,
      refreshNotesList,
      notaProEntitled: true,
    });

    expect(deleteNote).toHaveBeenCalled();
    expect(markPendingDelete).not.toHaveBeenCalled();
    expect(refreshNotesList).toHaveBeenCalled();
  });
});
