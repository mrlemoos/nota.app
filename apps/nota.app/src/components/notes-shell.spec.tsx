import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NotesShell } from './notes-shell';

vi.mock('./electron-menubar-bridge', () => ({
  ElectronMenubarBridge: (): null => null,
}));

vi.mock('./audio-to-note-dock', () => ({
  AudioToNoteDock: (): null => null,
}));

vi.mock('./study-recording-upload-warning-banner', () => ({
  StudyRecordingUploadWarningBanner: (): null => null,
}));

vi.mock('../hooks/use-app-navigation-screen', () => ({
  useAppNavigationScreen: () => ({
    kind: 'notes',
    panel: 'list',
    noteId: null,
  }),
}));

const longTitle = 'Study note: 15 April 2026 — '.padEnd(120, 'x');

vi.mock('../context/notes-data-context', () => ({
  useNotesData: () => ({
    notes: [
      {
        id: 'note-1',
        user_id: 'user-1',
        title: longTitle,
        content: {},
        created_at: '2026-04-15T12:00:00.000Z',
        updated_at: '2026-04-15T12:00:00.000Z',
        due_at: null,
        is_deadline: false,
        editor_settings: {},
        banner_attachment_id: null,
        folder_id: null,
      },
    ],
    folders: [],
    loadError: undefined,
    userPreferences: null,
    notaProEntitled: true,
    loading: false,
    refreshNotesList: vi.fn(),
    insertNoteAtFront: vi.fn(),
    insertFolderSorted: vi.fn(),
    patchNoteInList: vi.fn(),
    removeNoteFromList: vi.fn(),
    removeFolderFromList: vi.fn(),
    setUserPreferencesInState: vi.fn(),
    patchFolderInList: vi.fn(),
  }),
}));

vi.mock('../stores/notes-sidebar', () => ({
  useNotesSidebarStore: () => ({
    open: true,
    setOpen: vi.fn(),
    toggle: vi.fn(),
  }),
}));

vi.mock('../context/sticky-doc-title', () => ({
  useStickyDocTitle: () => ({
    registerScrollRoot: vi.fn(),
    resetSticky: vi.fn(),
    sticky: { visible: false, label: null },
  }),
}));

vi.mock('../lib/use-is-electron', () => ({
  useIsElectron: () => false,
}));

vi.mock('../context/session-context', () => ({
  useRootLoaderData: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
  }),
}));

vi.mock('../stores/nota-preferences', () => ({
  useNotaPreferencesStore: <T,>(
    selector: (s: { openTodaysNoteShortcut: boolean }) => T,
  ): T => selector({ openTodaysNoteShortcut: false }),
}));

vi.mock('../lib/use-sync-user-preferences', () => ({
  useSyncUserPreferences: (): void => {},
}));

vi.mock('../lib/use-notes-history-shortcut', () => ({
  useNotesHistoryShortcut: (): void => {},
}));

vi.mock('../lib/use-notes-sidebar-shortcut', () => ({
  useNotesSidebarShortcut: (): void => {},
}));

vi.mock('../lib/use-settings-shortcut', () => ({
  useSettingsShortcut: (): void => {},
}));

vi.mock('../lib/use-todays-note-shortcut', () => ({
  useTodaysNoteShortcut: (): void => {},
}));

vi.mock('../lib/use-notes-offline-sync', () => ({
  useNotesOfflineSync: (): void => {},
}));

vi.mock('../hooks/use-audio-note-pending-drain', () => ({
  useAudioNotePendingDrain: (): void => {},
}));

describe('NotesShell', () => {
  it('caps the notes sidebar width on first paint so long titles do not expand the column', () => {
    // Arrange
    const navigationHash = '#/notes';
    window.history.replaceState(null, '', navigationHash);

    // Act
    const { container } = render(<NotesShell />);

    // Assert
    const aside = container.querySelector('aside');
    expect(aside).not.toBeNull();
    expect(aside?.className.includes('max-w-[288px]')).toBe(true);
    expect(screen.getByText(longTitle)).toBeTruthy();
  });
});
