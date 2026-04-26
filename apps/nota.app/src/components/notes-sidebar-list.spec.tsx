import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotesSidebarList } from './notes-sidebar-list';
import { useNotesSidebarStore } from '../stores/notes-sidebar';
import { clientRenameFolder } from '../lib/rename-folder-client';
import { clientMoveNoteToFolder } from '../lib/move-note-folder-client';

vi.mock('../lib/rename-folder-client', () => ({
  clientRenameFolder: vi.fn(() => Promise.resolve()),
}));

vi.mock('../lib/move-note-folder-client', () => ({
  clientMoveNoteToFolder: vi.fn(() => Promise.resolve()),
}));

describe('NotesSidebarList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotesSidebarStore.setState({ open: true, collapsedFolderIds: [] });
  });

  it('allows inline folder rename on double click and commits on blur', () => {
    // Arrange
    const patchFolderInList = vi.fn();

    render(
      <NotesSidebarList
        notes={[]}
        folders={[
          {
            id: 'folder-1',
            user_id: 'user-1',
            name: 'Computer Science Study',
            created_at: '2026-04-25T00:00:00.000Z',
            updated_at: '2026-04-25T00:00:00.000Z',
          },
        ]}
        panel="list"
        routeNoteId={null}
        userId="user-1"
        notaProEntitled
        userPreferences={null}
        insertNoteAtFront={vi.fn()}
        insertFolderSorted={vi.fn()}
        patchNoteInList={vi.fn()}
        patchFolderInList={patchFolderInList}
        removeNoteFromList={vi.fn()}
        removeFolderFromList={vi.fn()}
        refreshNotesList={vi.fn(() => Promise.resolve())}
      />,
    );

    // Act
    fireEvent.doubleClick(screen.getByText('Computer Science Study'));
    const renameInput = screen.getByLabelText(
      'Rename folder Computer Science Study',
    ) as HTMLInputElement;
    const hasFocusAfterRename = document.activeElement === renameInput;
    const caretStartAfterRename = renameInput.selectionStart;
    const caretEndAfterRename = renameInput.selectionEnd;
    const valueLengthAfterRename = renameInput.value.length;

    fireEvent.change(renameInput, { target: { value: 'Computer Science I' } });
    fireEvent.blur(renameInput);

    // Assert
    expect(hasFocusAfterRename).toBe(true);
    expect(caretStartAfterRename).toBe(valueLengthAfterRename);
    expect(caretEndAfterRename).toBe(valueLengthAfterRename);
    expect(clientRenameFolder).toHaveBeenCalledWith(
      expect.objectContaining({
        folderId: 'folder-1',
        previousName: 'Computer Science Study',
        nextName: 'Computer Science I',
        userId: 'user-1',
        notaProEntitled: true,
        patchFolderInList,
      }),
    );
  });

  it('starts inline rename when F2 is pressed on a folder row', () => {
    // Arrange
    render(
      <NotesSidebarList
        notes={[]}
        folders={[
          {
            id: 'folder-1',
            user_id: 'user-1',
            name: 'Computer Science Study',
            created_at: '2026-04-25T00:00:00.000Z',
            updated_at: '2026-04-25T00:00:00.000Z',
          },
        ]}
        panel="list"
        routeNoteId={null}
        userId="user-1"
        notaProEntitled
        userPreferences={null}
        insertNoteAtFront={vi.fn()}
        insertFolderSorted={vi.fn()}
        patchNoteInList={vi.fn()}
        patchFolderInList={vi.fn()}
        removeNoteFromList={vi.fn()}
        removeFolderFromList={vi.fn()}
        refreshNotesList={vi.fn(() => Promise.resolve())}
      />,
    );
    const folderLabel = screen.getByText('Computer Science Study');
    const folderRowButton = folderLabel.closest('button') as HTMLButtonElement;

    // Act
    folderRowButton.focus();
    fireEvent.keyDown(folderRowButton, { key: 'F2' });

    // Assert
    expect(
      screen.getByLabelText('Rename folder Computer Science Study'),
    ).toBeTruthy();
  });

  it('moves a note into a folder when dropped on the folder row', () => {
    // Arrange
    const patchNoteInList = vi.fn();
    render(
      <NotesSidebarList
        notes={[
          {
            id: 'note-1',
            user_id: 'user-1',
            title: 'Alpha note',
            content: {},
            created_at: '2026-04-15T12:00:00.000Z',
            updated_at: '2026-04-15T12:00:00.000Z',
            due_at: null,
            is_deadline: false,
            editor_settings: {},
            banner_attachment_id: null,
            folder_id: null,
          },
        ]}
        folders={[
          {
            id: 'folder-1',
            user_id: 'user-1',
            name: 'Computer Science Study',
            created_at: '2026-04-25T00:00:00.000Z',
            updated_at: '2026-04-25T00:00:00.000Z',
          },
        ]}
        panel="list"
        routeNoteId={null}
        userId="user-1"
        notaProEntitled
        userPreferences={null}
        insertNoteAtFront={vi.fn()}
        insertFolderSorted={vi.fn()}
        patchNoteInList={patchNoteInList}
        patchFolderInList={vi.fn()}
        removeNoteFromList={vi.fn()}
        removeFolderFromList={vi.fn()}
        refreshNotesList={vi.fn(() => Promise.resolve())}
      />,
    );

    const noteRow = screen.getByText('Alpha note').closest('li')
      ?.firstElementChild as HTMLDivElement;
    const folderLabel = screen.getByText('Computer Science Study');
    const folderRow = folderLabel.closest('button')?.parentElement as HTMLDivElement;

    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: vi.fn(),
      getData: vi.fn(() => 'note-1'),
    } as unknown as DataTransfer;

    // Act
    fireEvent.dragStart(noteRow, { dataTransfer });
    fireEvent.dragEnter(folderRow, { dataTransfer });
    fireEvent.dragOver(folderRow, { dataTransfer });
    fireEvent.drop(folderRow, { dataTransfer });

    // Assert
    expect(patchNoteInList).toHaveBeenCalledWith('note-1', {
      folder_id: 'folder-1',
    });
    expect(clientMoveNoteToFolder).toHaveBeenCalledWith(
      expect.objectContaining({
        noteId: 'note-1',
        targetFolderId: 'folder-1',
        previousFolderId: null,
        userId: 'user-1',
        notaProEntitled: true,
      }),
    );
  });

  it('moves a note back to root when dropped on the root notes area', () => {
    // Arrange
    const patchNoteInList = vi.fn();
    render(
      <NotesSidebarList
        notes={[
          {
            id: 'note-1',
            user_id: 'user-1',
            title: 'Alpha note',
            content: {},
            created_at: '2026-04-15T12:00:00.000Z',
            updated_at: '2026-04-15T12:00:00.000Z',
            due_at: null,
            is_deadline: false,
            editor_settings: {},
            banner_attachment_id: null,
            folder_id: 'folder-1',
          },
          {
            id: 'note-2',
            user_id: 'user-1',
            title: 'Root note',
            content: {},
            created_at: '2026-04-16T12:00:00.000Z',
            updated_at: '2026-04-16T12:00:00.000Z',
            due_at: null,
            is_deadline: false,
            editor_settings: {},
            banner_attachment_id: null,
            folder_id: null,
          },
        ]}
        folders={[
          {
            id: 'folder-1',
            user_id: 'user-1',
            name: 'Computer Science Study',
            created_at: '2026-04-25T00:00:00.000Z',
            updated_at: '2026-04-25T00:00:00.000Z',
          },
        ]}
        panel="list"
        routeNoteId={null}
        userId="user-1"
        notaProEntitled
        userPreferences={null}
        insertNoteAtFront={vi.fn()}
        insertFolderSorted={vi.fn()}
        patchNoteInList={patchNoteInList}
        patchFolderInList={vi.fn()}
        removeNoteFromList={vi.fn()}
        removeFolderFromList={vi.fn()}
        refreshNotesList={vi.fn(() => Promise.resolve())}
      />,
    );

    const draggedRow = screen.getByText('Alpha note').closest('li')
      ?.firstElementChild as HTMLDivElement;
    const rootDropRow = screen.getByText('Root note').closest('li') as HTMLLIElement;

    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: vi.fn(),
      getData: vi.fn(() => 'note-1'),
    } as unknown as DataTransfer;

    // Act
    fireEvent.dragStart(draggedRow, { dataTransfer });
    fireEvent.dragOver(rootDropRow, { dataTransfer });
    fireEvent.drop(rootDropRow, { dataTransfer });

    // Assert
    expect(patchNoteInList).toHaveBeenCalledWith('note-1', {
      folder_id: null,
    });
    expect(clientMoveNoteToFolder).toHaveBeenCalledWith(
      expect.objectContaining({
        noteId: 'note-1',
        targetFolderId: null,
        previousFolderId: 'folder-1',
        userId: 'user-1',
        notaProEntitled: true,
      }),
    );
  });

  it('opens a context menu with move and delete actions', async () => {
    // Arrange
    render(
      <NotesSidebarList
        notes={[
          {
            id: 'note-1',
            user_id: 'user-1',
            title: 'Alpha note',
            content: {},
            created_at: '2026-04-15T12:00:00.000Z',
            updated_at: '2026-04-15T12:00:00.000Z',
            due_at: null,
            is_deadline: false,
            editor_settings: {},
            banner_attachment_id: null,
            folder_id: null,
          },
        ]}
        folders={[
          {
            id: 'folder-1',
            user_id: 'user-1',
            name: 'Computer Science Study',
            created_at: '2026-04-25T00:00:00.000Z',
            updated_at: '2026-04-25T00:00:00.000Z',
          },
        ]}
        panel="list"
        routeNoteId={null}
        userId="user-1"
        notaProEntitled
        userPreferences={null}
        insertNoteAtFront={vi.fn()}
        insertFolderSorted={vi.fn()}
        patchNoteInList={vi.fn()}
        patchFolderInList={vi.fn()}
        removeNoteFromList={vi.fn()}
        removeFolderFromList={vi.fn()}
        refreshNotesList={vi.fn(() => Promise.resolve())}
      />,
    );

    const noteRow = screen.getByText('Alpha note').closest('li')
      ?.firstElementChild as HTMLDivElement;

    // Act
    fireEvent.contextMenu(noteRow);

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Move to')).toBeTruthy();
      expect(screen.getByText('Delete note')).toBeTruthy();
    });
  });

  it('opens a folder context menu with rename and delete actions', async () => {
    // Arrange
    render(
      <NotesSidebarList
        notes={[]}
        folders={[
          {
            id: 'folder-1',
            user_id: 'user-1',
            name: 'Computer Science Study',
            created_at: '2026-04-25T00:00:00.000Z',
            updated_at: '2026-04-25T00:00:00.000Z',
          },
        ]}
        panel="list"
        routeNoteId={null}
        userId="user-1"
        notaProEntitled
        userPreferences={null}
        insertNoteAtFront={vi.fn()}
        insertFolderSorted={vi.fn()}
        patchNoteInList={vi.fn()}
        patchFolderInList={vi.fn()}
        removeNoteFromList={vi.fn()}
        removeFolderFromList={vi.fn()}
        refreshNotesList={vi.fn(() => Promise.resolve())}
      />,
    );

    const folderLabel = screen.getByText('Computer Science Study');
    const folderRow = folderLabel.closest('li')?.firstElementChild as HTMLDivElement;

    expect(
      screen.queryByLabelText('Delete folder Computer Science Study'),
    ).toBeNull();

    // Act
    fireEvent.contextMenu(folderRow);

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Rename')).toBeTruthy();
      expect(screen.getByText('Delete folder')).toBeTruthy();
    });
  });
});
