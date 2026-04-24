export type ShortcutCatalogRow = {
  description: string;
  /** Extra context shown below the description in smaller type. */
  detail?: string;
  keysApple: string;
  keysOther: string;
  /** Omit from the list unless the user enabled today’s note in Settings. */
  requiresTodaysNotePreference?: boolean;
};

export type ShortcutCatalogSection = {
  id: string;
  title: string;
  rows: ShortcutCatalogRow[];
};

export const NOTA_SHORTCUT_SECTIONS: ShortcutCatalogSection[] = [
  {
    id: 'shell',
    title: 'Notes shell',
    rows: [
      {
        description: 'Open or close command palette',
        keysApple: '⌘K',
        keysOther: 'Ctrl+K',
      },
      {
        description: 'Open Settings',
        keysApple: '⌘,',
        keysOther: 'Ctrl+,',
      },
      {
        description: 'Show or hide note list sidebar',
        detail:
          'Does not run while the command palette is focused (same for other global shortcuts below).',
        keysApple: '⌘S',
        keysOther: 'Ctrl+S',
      },
      {
        description: 'Go back to the previous note',
        keysApple: '⌘[',
        keysOther: 'Ctrl+[',
      },
      {
        description: 'Go forward to the next note',
        keysApple: '⌘]',
        keysOther: 'Ctrl+]',
      },
      {
        description: 'Open today’s note',
        detail: 'Enable “Open today’s note” in Settings first.',
        keysApple: '⌘D',
        keysOther: 'Ctrl+D',
        requiresTodaysNotePreference: true,
      },
      {
        description: 'Create new folder',
        detail:
          'Opens the name dialog. Some browsers reserve Ctrl+Shift+N; use the palette or sidebar if the shortcut does not fire.',
        keysApple: '⇧⌘N',
        keysOther: 'Ctrl+Shift+N',
      },
    ],
  },
  {
    id: 'palette',
    title: 'Command palette',
    rows: [
      {
        description: 'Close palette with the same shortcut',
        keysApple: '⌘K',
        keysOther: 'Ctrl+K',
      },
      {
        description: 'Create new note',
        detail: 'When the palette is not busy.',
        keysApple: '⌘N',
        keysOther: 'Ctrl+N',
      },
      {
        description: 'Focus the search field',
        detail: 'When focus is not already in the search field.',
        keysApple: 'Space',
        keysOther: 'Space',
      },
      {
        description: 'Move note: multi-select on the pick-note step',
        detail:
          'When the search field is empty, highlight a note and press Space to show checkboxes; Space toggles each note. Then choose “Choose folder for N notes…” and pick a destination.',
        keysApple: 'Space, Enter',
        keysOther: 'Space, Enter',
      },
      {
        description: 'Open today’s note',
        detail: 'When the shortcut is enabled in Settings.',
        keysApple: '⌘D',
        keysOther: 'Ctrl+D',
        requiresTodaysNotePreference: true,
      },
      {
        description: 'Move selection up or down',
        keysApple: '↑ ↓',
        keysOther: '↑ ↓',
      },
      {
        description: 'Run the selected command',
        keysApple: 'Enter',
        keysOther: 'Enter',
      },
      {
        description: 'Close palette with Escape',
        keysApple: 'Esc',
        keysOther: 'Esc',
      },
      {
        description: 'Back and forward in note history',
        detail: 'Also shown in the palette footer.',
        keysApple: '⌘[ / ⌘]',
        keysOther: 'Ctrl+[ / Ctrl+]',
      },
    ],
  },
  {
    id: 'mention',
    title: 'Note editor — link to note (@)',
    rows: [
      {
        description: 'Open the note picker after typing @',
        detail: 'Type @ and optional filter text.',
        keysApple: '@',
        keysOther: '@',
      },
      {
        description: 'Move selection up or down',
        keysApple: '↑ ↓',
        keysOther: '↑ ↓',
      },
      {
        description: 'Insert link to highlighted note',
        keysApple: 'Enter or Tab',
        keysOther: 'Enter or Tab',
      },
      {
        description: 'Cancel and remove the @ trigger',
        keysApple: 'Esc',
        keysOther: 'Esc',
      },
    ],
  },
  {
    id: 'links',
    title: 'Note editor — links in the body',
    rows: [
      {
        description: 'Follow an internal note link',
        keysApple: 'Click',
        keysOther: 'Click',
      },
      {
        description: 'Open an internal note link in a new tab',
        keysApple: '⌘-click',
        keysOther: 'Ctrl+click',
      },
      {
        description: 'Open an external link',
        keysApple: 'Click (new tab)',
        keysOther: 'Click (new tab)',
      },
    ],
  },
  {
    id: 'richtext',
    title: 'Note editor — rich text',
    rows: [
      {
        description: 'Undo',
        keysApple: '⌘Z',
        keysOther: 'Ctrl+Z',
      },
      {
        description: 'Redo',
        keysApple: '⇧⌘Z or ⌘Y',
        keysOther: 'Ctrl+Shift+Z or Ctrl+Y',
      },
      {
        description: 'Bold',
        keysApple: '⌘B',
        keysOther: 'Ctrl+B',
      },
      {
        description: 'Italic',
        keysApple: '⌘I',
        keysOther: 'Ctrl+I',
      },
      {
        description: 'Highlight',
        keysApple: '⇧⌘H',
        keysOther: 'Ctrl+Shift+H',
      },
      {
        description: 'Strikethrough',
        keysApple: '⇧⌘S',
        keysOther: 'Ctrl+Shift+S',
      },
      {
        description: 'Inline code',
        keysApple: '⌘E',
        keysOther: 'Ctrl+E',
      },
      {
        description: 'Paragraph',
        keysApple: '⌥⌘0',
        keysOther: 'Ctrl+Alt+0',
      },
      {
        description: 'Heading 1–6',
        keysApple: '⌥⌘1 … ⌥⌘6',
        keysOther: 'Ctrl+Alt+1 … Ctrl+Alt+6',
      },
      {
        description: 'Bullet list',
        keysApple: '⇧⌘8',
        keysOther: 'Ctrl+Shift+8',
      },
      {
        description: 'Numbered list',
        keysApple: '⇧⌘7',
        keysOther: 'Ctrl+Shift+7',
      },
      {
        description: 'Toggle task list',
        detail:
          'Also available as Insert task list in the command palette (⌘K / Ctrl+K).',
        keysApple: '⇧⌘9',
        keysOther: 'Ctrl+Shift+9',
      },
      {
        description: 'Task item from markdown',
        detail:
          'At the start of a line, type [ ] or [x] and then Space so the editor promotes a task item (unchecked or checked).',
        keysApple: '[ ]',
        keysOther: '[ ]',
      },
      {
        description: 'Blockquote',
        keysApple: '⇧⌘B',
        keysOther: 'Ctrl+Shift+B',
      },
      {
        description: 'Line break within a paragraph',
        keysApple: '⌘↵ or ⇧↵',
        keysOther: 'Ctrl+Enter or Shift+Enter',
      },
      {
        description: 'Toggle fenced code block',
        keysApple: '⌥⌘C',
        keysOther: 'Ctrl+Alt+C',
      },
      {
        description: 'Exit or clear an empty code block',
        detail:
          'Backspace at the start or in an empty block returns to a normal paragraph; three Enter presses at the end of a code block can also exit.',
        keysApple: 'Backspace / Enter',
        keysOther: 'Backspace / Enter',
      },
      {
        description: 'Horizontal rule',
        detail: 'At the start of a line, type ---, ***, or ___ then Enter.',
        keysApple: '—',
        keysOther: '—',
      },
    ],
  },
  {
    id: 'tables',
    title: 'Note editor — tables',
    rows: [
      {
        description: 'Next cell',
        keysApple: 'Tab',
        keysOther: 'Tab',
      },
      {
        description: 'Previous cell',
        keysApple: '⇧Tab',
        keysOther: 'Shift+Tab',
      },
      {
        description: 'Add a row when Tab leaves the last cell',
        detail: 'If the table can grow.',
        keysApple: 'Tab',
        keysOther: 'Tab',
      },
      {
        description: 'Delete the whole table',
        detail:
          'When the entire table is selected: Backspace, Delete, or modifier variants.',
        keysApple: '⌫ or ⌦ (±⌘)',
        keysOther: 'Backspace or Delete (±Ctrl)',
      },
      {
        description: 'Add or remove rows and columns',
        detail: 'Use the floating toolbar above the table (pointer).',
        keysApple: '—',
        keysOther: '—',
      },
    ],
  },
];

export function filterShortcutCatalogSections(
  sections: ShortcutCatalogSection[],
  includeTodaysNoteRows: boolean,
): ShortcutCatalogSection[] {
  return sections.map((section) => ({
    ...section,
    rows: section.rows.filter(
      (row) =>
        !row.requiresTodaysNotePreference || includeTodaysNoteRows,
    ),
  }));
}
