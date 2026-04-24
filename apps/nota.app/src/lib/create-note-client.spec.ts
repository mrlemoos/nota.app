import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clientCreateNote } from './create-note-client';

import { createLocalOnlyNote, isLikelyOnline } from './notes-offline';
import { createNote } from '../models/notes';
import { ensureTodaysRootNoteId } from './open-todays-note';

const mockedEnsure = vi.mocked(ensureTodaysRootNoteId);

const insertNoteAtFront = vi.fn();
const refreshNotesList = vi.fn();

const notes: { id: string; folder_id: string | null }[] = [];

vi.mock('./supabase/browser', () => ({
  getBrowserClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({
              data: {
                id: 'daily-root',
                user_id: 'u1',
                title: '1 Jan 2026',
                content: { type: 'doc', content: [] },
                created_at: '',
                updated_at: '',
                due_at: null,
                is_deadline: false,
                editor_settings: {},
                banner_attachment_id: null,
                folder_id: null,
              },
            }),
        }),
      }),
    }),
  }),
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
      due_at: null,
      is_deadline: false,
      editor_settings: {},
      banner_attachment_id: null,
      folder_id: 'folder-1',
    }),
  ),
}));

vi.mock('./open-todays-note', () => ({
  ensureTodaysRootNoteId: vi.fn(() => Promise.resolve('daily-root')),
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
      notes,
    };

    // Act
    await clientCreateNote(args);

    // Assert
    expect(createNote).not.toHaveBeenCalled();
    expect(createLocalOnlyNote).not.toHaveBeenCalled();
    expect(mockedEnsure).not.toHaveBeenCalled();
    expect(refreshNotesList).not.toHaveBeenCalled();
  });

  it('creates in a folder on the server when online and Nota Pro', async () => {
    // Arrange
    vi.mocked(isLikelyOnline).mockReturnValue(true);
    const args = {
      userId: 'u1',
      insertNoteAtFront,
      refreshNotesList,
      notaProEntitled: true,
      notes,
      folderId: 'folder-1' as const,
    };

    // Act
    await clientCreateNote(args);

    // Assert
    expect(createNote).toHaveBeenCalled();
    expect(mockedEnsure).not.toHaveBeenCalled();
    expect(insertNoteAtFront).toHaveBeenCalled();
  });

  it('uses daily root flow when online at root', async () => {
    // Arrange
    vi.mocked(isLikelyOnline).mockReturnValue(true);
    const args = {
      userId: 'u1',
      insertNoteAtFront,
      refreshNotesList,
      notaProEntitled: true,
      notes,
    };

    // Act
    await clientCreateNote(args);

    // Assert
    expect(mockedEnsure).toHaveBeenCalled();
    expect(createNote).not.toHaveBeenCalled();
    expect(refreshNotesList).toHaveBeenCalled();
  });

  it('uses daily root flow when offline and entitled', async () => {
    // Arrange
    vi.mocked(isLikelyOnline).mockReturnValue(false);
    const args = {
      userId: 'u1',
      insertNoteAtFront,
      refreshNotesList,
      notaProEntitled: true,
      notes,
    };

    // Act
    await clientCreateNote(args);

    // Assert
    expect(mockedEnsure).toHaveBeenCalled();
    expect(createNote).not.toHaveBeenCalled();
    expect(refreshNotesList).toHaveBeenCalled();
  });

  it('does nothing when offline and not entitled', async () => {
    // Arrange
    vi.mocked(isLikelyOnline).mockReturnValue(false);
    const args = {
      userId: 'u1',
      insertNoteAtFront,
      refreshNotesList,
      notaProEntitled: false,
      notes,
    };

    // Act
    await clientCreateNote(args);

    // Assert
    expect(createNote).not.toHaveBeenCalled();
    expect(mockedEnsure).not.toHaveBeenCalled();
  });
});
