import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clientCreateNote } from './create-note-client';

import { createLocalOnlyNote, isLikelyOnline } from './notes-offline';
import { createNote } from '../models/notes';

const insertNoteAtFront = vi.fn();
const refreshNotesList = vi.fn();

vi.mock('./supabase/browser', () => ({
  getBrowserClient: () => ({}),
}));

vi.mock('./notes-offline', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./notes-offline')>();
  return {
    ...actual,
    createLocalOnlyNote: vi.fn(() => Promise.resolve('local-note-id')),
    isLikelyOnline: vi.fn(),
  };
});

vi.mock('../models/notes', () => ({
  createNote: vi.fn(() =>
    Promise.resolve({
      id: 'server-note-id',
      user_id: 'u1',
      title: 'Untitled Note',
      content: { type: 'doc', content: [] },
      created_at: '',
      updated_at: '',
    }),
  ),
}));

vi.mock('./app-navigation', () => ({
  setAppHash: vi.fn(),
}));

describe('clientCreateNote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing when not entitled', async () => {
    // Arrange
    vi.mocked(isLikelyOnline).mockReturnValue(true);
    const args = {
      userId: 'u1',
      insertNoteAtFront,
      refreshNotesList,
      notaProEntitled: false,
    };

    // Act
    await clientCreateNote(args);

    // Assert
    expect(createNote).not.toHaveBeenCalled();
    expect(createLocalOnlyNote).not.toHaveBeenCalled();
    expect(refreshNotesList).not.toHaveBeenCalled();
  });

  it('creates on the server when online and Nota Pro', async () => {
    // Arrange
    vi.mocked(isLikelyOnline).mockReturnValue(true);
    const args = {
      userId: 'u1',
      insertNoteAtFront,
      refreshNotesList,
      notaProEntitled: true,
    };

    // Act
    await clientCreateNote(args);

    // Assert
    expect(createNote).toHaveBeenCalled();
    expect(createLocalOnlyNote).not.toHaveBeenCalled();
    expect(insertNoteAtFront).toHaveBeenCalled();
  });

  it('creates a local-only note when offline and entitled', async () => {
    // Arrange
    vi.mocked(isLikelyOnline).mockReturnValue(false);
    const args = {
      userId: 'u1',
      insertNoteAtFront,
      refreshNotesList,
      notaProEntitled: true,
    };

    // Act
    await clientCreateNote(args);

    // Assert
    expect(createNote).not.toHaveBeenCalled();
    expect(createLocalOnlyNote).toHaveBeenCalledWith('u1');
  });

  it('does nothing when offline and not entitled', async () => {
    // Arrange
    vi.mocked(isLikelyOnline).mockReturnValue(false);
    const args = {
      userId: 'u1',
      insertNoteAtFront,
      refreshNotesList,
      notaProEntitled: false,
    };

    // Act
    await clientCreateNote(args);

    // Assert
    expect(createNote).not.toHaveBeenCalled();
    expect(createLocalOnlyNote).not.toHaveBeenCalled();
  });
});
