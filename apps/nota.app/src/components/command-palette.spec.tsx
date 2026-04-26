import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { CommandPalette } from './command-palette';
import { ThemeProvider } from './theme-provider';

vi.mock('../context/notes-data-context', () => ({
  useNotesData: () => ({
    notes: [
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
    ],
    folders: [],
    notaProEntitled: true,
    userPreferences: null,
    refreshNotesList: vi.fn(),
    insertNoteAtFront: vi.fn(),
    insertFolderSorted: vi.fn(),
    patchNoteInList: vi.fn(),
    removeNoteFromList: vi.fn(),
    removeFolderFromList: vi.fn(),
  }),
}));

vi.mock('../hooks/use-app-navigation-screen', () => ({
  useAppNavigationScreen: () => ({
    kind: 'notes',
    panel: 'list',
    noteId: null,
  }),
}));

vi.mock('../context/session-context', () => ({
  useRootLoaderData: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
  }),
}));

vi.mock('@clerk/react', () => ({
  useClerk: () => ({ signOut: vi.fn() }),
}));

vi.mock('../stores/nota-preferences', () => ({
  useNotaPreferencesStore: <T,>(
    selector: (s: {
      openTodaysNoteShortcut: boolean;
      semanticSearchEnabled: boolean;
    }) => T,
  ): T =>
    selector({
      openTodaysNoteShortcut: false,
      semanticSearchEnabled: false,
    }),
}));

beforeAll(() => {
  global.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
});

function renderPalette(): ReturnType<typeof render> {
  return render(
    <ThemeProvider defaultTheme="light" storageKey="nota-test-theme-cmdk">
      <CommandPalette />
    </ThemeProvider>,
  );
}

describe('CommandPalette', () => {
  it('clears the search input when the user starts the move flow (Move note…)', async () => {
    // Arrange — open palette and type a filter before choosing Move note…
    renderPalette();
    fireEvent.keyDown(document, { key: 'k', metaKey: true, bubbles: true });
    const input = await screen.findByPlaceholderText('Type a command…');
    // Deliberate filter that must stay in the list so the item is clickable
    fireEvent.input(input, { target: { value: 'move' } });
    const dialog = await screen.findByRole('dialog');
    const moveItem = within(dialog).getByText('Move note…');

    // Act — enter move flow (pick note)
    fireEvent.click(moveItem);

    // Assert — search field must not keep the previous filter
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect((input as HTMLInputElement).value).toBe('');
  });
});
