export { TipTapEditor } from './components/tiptap-editor';
export type {
  TipTapEditorProps,
  AttachmentStorageOps,
  NotePdfDocContextValue,
} from './components/tiptap-editor';

export { NoteEditorCommandsProvider, useNoteEditorCommands } from './context/note-editor-commands';

export {
  NOTE_THEME_LABEL,
  NOTE_THEME_OPTIONS,
  noteThemeSelectValue,
  noteEditorFontFromThemeSelectValue,
  parseNoteEditorSettings,
  noteEditorSettingsToJson,
  filterNotesForNoteGraph,
  noteSurfaceClassNames,
} from './lib/note-editor-settings';
export type { NoteEditorSettings } from './lib/note-editor-settings';

export { parseNoteLinkPath, hrefForNote } from './lib/internal-note-link';
export { persistedDisplayTitle } from './lib/note-title';
export { findNoteMentionTrigger } from './lib/tiptap-note-mention';

export { NotaCodeBlock } from './components/tiptap/nota-code-block';
export { NotaLink } from './components/tiptap/nota-link';

export {
  insertNoteLinkAtMentionRange,
  insertNoteLinkAtMentionRangeView,
  tryConfirmNoteMention,
} from './tiptap-note-mention-flow';
export type { NoteMentionConfirmRefs } from './tiptap-note-mention-flow';

export {
  NoteDueDatePickerPanel,
  dueInstantIsLocalStartOfDay,
  initialIncludeTimeFromPersisted,
  isInteractiveBubbleTarget,
  keepBubbleSelectionUnlessTextField,
} from './components/note-due-date-picker-panel';
