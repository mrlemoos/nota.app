import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clientDeleteNoteById } from './delete-note-client';

import { isLikelyOnline, markPendingDelete } from './notes-offline';
import { deleteNote } from '../models/notes';

const removeNoteFromList = vi.fn();
const removeFolderFromList = vi.fn();
const refreshNotesList = vi.fn();

vi.mock('./supabase/browser', () => ({
  getBrowserClient: () => ({}),
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

vi.mock('./maybe-prune-empty-folder', () => ({
  maybePruneEmptyFolder: vi.fn(() => Promise.resolve()),
}));

describe('clientDeleteNoteById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing when not entitled', async () => {
    // Arrange
    vi.mocked(isLikelyOnline).mockReturnValue(true);
    const noteId = 'n1';
    const args = {
      userId: 'u1',
      removeNoteFromList,
      removeFolderFromList,
      refreshNotesList,
      notaProEntitled: false,
      noteFolderId: null,
      userPreferences: null,
    };

    // Act
    await clientDeleteNoteById(noteId, args);

    // Assert
    expect(deleteNote).not.toHaveBeenCalled();
    expect(markPendingDelete).not.toHaveBeenCalled();
    expect(removeNoteFromList).not.toHaveBeenCalled();
  });

  it('deletes locally when offline and entitled', async () => {
    // Arrange
    vi.mocked(isLikelyOnline).mockReturnValue(false);
    const noteId = 'n1';
    const args = {
      userId: 'u1',
      removeNoteFromList,
      removeFolderFromList,
      refreshNotesList,
      notaProEntitled: true,
      noteFolderId: null,
      userPreferences: null,
    };

    // Act
    await clientDeleteNoteById(noteId, args);

    // Assert
    expect(deleteNote).not.toHaveBeenCalled();
    expect(markPendingDelete).toHaveBeenCalled();
    expect(removeNoteFromList).toHaveBeenCalledWith('n1');
  });

  it('calls Supabase delete when online and Nota Pro', async () => {
    // Arrange
    vi.mocked(isLikelyOnline).mockReturnValue(true);
    const noteId = 'n1';
    const args = {
      userId: 'u1',
      removeNoteFromList,
      removeFolderFromList,
      refreshNotesList,
      notaProEntitled: true,
      noteFolderId: null,
      userPreferences: null,
    };

    // Act
    await clientDeleteNoteById(noteId, args);

    // Assert
    expect(deleteNote).toHaveBeenCalled();
    expect(markPendingDelete).not.toHaveBeenCalled();
    expect(refreshNotesList).toHaveBeenCalled();
  });
});
