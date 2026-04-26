import { beforeEach, describe, expect, it } from 'vitest';
import {
  partializeNotesSidebarForStorage,
  useNotesSidebarStore,
  type NotesSidebarState,
} from './notes-sidebar';

describe('notes sidebar store (folder expand/collapse)', () => {
  // Arrange: reset in-memory `localStorage` slice and store (see `vitest.setup.ts` for Storage stub)
  beforeEach(() => {
    try {
      globalThis.localStorage.removeItem('nota-notes-sidebar');
    } catch {
      // ignore
    }
    useNotesSidebarStore.setState({ open: true, collapsedFolderIds: [] });
  });

  it('toggles a folder in and out of collapsedFolderIds', () => {
    // Arrange
    const s = useNotesSidebarStore.getState();
    // Act
    s.toggleFolderCollapsed('folder-a');
    s.toggleFolderCollapsed('folder-b');
    // Assert
    expect(
      useNotesSidebarStore.getState().collapsedFolderIds,
    ).toEqual(['folder-a', 'folder-b']);
    s.toggleFolderCollapsed('folder-a');
    expect(
      useNotesSidebarStore.getState().collapsedFolderIds,
    ).toEqual(['folder-b']);
  });

  it('expandFolder removes an id from collapsedFolderIds', () => {
    // Arrange
    const s = useNotesSidebarStore.getState();
    s.toggleFolderCollapsed('f1');
    s.toggleFolderCollapsed('f2');
    // Act
    s.expandFolder('f1');
    // Assert
    expect(
      useNotesSidebarStore.getState().collapsedFolderIds,
    ).toEqual(['f2']);
  });

  it('pruneCollapsedFolderIds keeps only ids in the allowlist', () => {
    // Arrange
    const s = useNotesSidebarStore.getState();
    s.toggleFolderCollapsed('keep');
    s.toggleFolderCollapsed('gone');
    // Act
    s.pruneCollapsedFolderIds(['keep']);
    // Assert
    expect(
      useNotesSidebarStore.getState().collapsedFolderIds,
    ).toEqual(['keep']);
  });

  it('partializeNotesSidebarForStorage serialises only open and collapsedFolderIds (reload contract)', () => {
    // Arrange
    const s0 = useNotesSidebarStore.getState();
    // Act
    const a = partializeNotesSidebarForStorage(s0);
    useNotesSidebarStore.getState().toggleFolderCollapsed('folder-x');
    const a2 = partializeNotesSidebarForStorage(
      useNotesSidebarStore.getState(),
    );
    // Assert
    expect(a).toEqual({ open: true, collapsedFolderIds: [] });
    expect(a2).toEqual({ open: true, collapsedFolderIds: ['folder-x'] });
  });
});
