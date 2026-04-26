import { act, render, screen } from '@testing-library/react';
import { useMemo, useState, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import type { Note } from '~/types/database.types';
import {
  NotesDataActionsContext,
  NotesDataMetaContext,
  NotesDataVaultContext,
  useNotesDataActions,
  type NotesDataActionsSlice,
  type NotesDataMetaSlice,
  type NotesDataVaultSlice,
} from './notes-data-context';

const noopRefresh = async (): Promise<void> => {};

function TestNotesSlices({ children }: { children: ReactNode }) {
  const [noteRows, setNoteRows] = useState<Note[]>([
    {
      id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
      user_id: 'u1',
      title: 'A',
      content: {},
      created_at: '2020-01-01T00:00:00Z',
      updated_at: '2020-01-01T00:00:00Z',
      due_at: null,
      is_deadline: false,
      editor_settings: {},
      banner_attachment_id: null,
      folder_id: null,
    },
  ]);

  const actions: NotesDataActionsSlice = useMemo(
    () => ({
      refreshNotesList: noopRefresh,
      patchNoteInList: (id, patch) => {
        setNoteRows((prev) =>
          prev.map((n) => (n.id === id ? { ...n, ...patch } : n)),
        );
      },
      removeNoteFromList: () => {},
      insertNoteAtFront: () => {},
      insertFolderSorted: () => {},
      removeFolderFromList: () => {},
      patchFolderInList: () => {},
      setUserPreferencesInState: () => {},
    }),
    [],
  );

  const vault: NotesDataVaultSlice = useMemo(
    () => ({ notes: noteRows, folders: [] }),
    [noteRows],
  );

  const meta: NotesDataMetaSlice = useMemo(
    () => ({
      notaProEntitled: true,
      loading: false,
      userPreferences: null,
      loadError: undefined,
    }),
    [],
  );

  return (
    <NotesDataActionsContext.Provider value={actions}>
      <NotesDataMetaContext.Provider value={meta}>
        <NotesDataVaultContext.Provider value={vault}>
          {children}
        </NotesDataVaultContext.Provider>
      </NotesDataMetaContext.Provider>
    </NotesDataActionsContext.Provider>
  );
}

function PatchNoteTitle() {
  const { patchNoteInList } = useNotesDataActions();
  return (
    <button
      type="button"
      data-testid="patch"
      onClick={() =>
        { patchNoteInList('aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee', {
          title: 'Patched',
        }); }
      }
    >
      patch
    </button>
  );
}

describe('Notes data slice subscriptions', () => {
  it('keeps actions slice referentially stable when the vault list mutates', () => {
    // Arrange
    let refreshBefore: (typeof noopRefresh) | undefined;
    let refreshAfter: (typeof noopRefresh) | undefined;

    function CaptureRefresh() {
      const { refreshNotesList } = useNotesDataActions();
      refreshAfter = refreshNotesList;
      if (refreshBefore === undefined) {
        refreshBefore = refreshNotesList;
      }
      return null;
    }

    render(
      <TestNotesSlices>
        <CaptureRefresh />
        <PatchNoteTitle />
      </TestNotesSlices>,
    );

    // Act
    act(() => {
      screen.getByTestId('patch').click();
    });

    // Assert
    expect(refreshBefore).toBeDefined();
    expect(refreshAfter).toBe(refreshBefore);
  });
});
