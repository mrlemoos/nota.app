import { z } from 'zod';
import type { Json, Note } from '~/types/database.types';

const noteEditorSettingsSchema = z.object({
  font: z.enum(['sans', 'serif', 'mono']).optional(),
  measure: z.enum(['narrow', 'wide']).optional(),
  showInNoteGraph: z.boolean().optional(),
});

export type NoteEditorSettings = z.infer<typeof noteEditorSettingsSchema>;

export const NOTE_THEME_LABEL = 'Note theme' as const;

export const NOTE_THEME_OPTIONS = [
  { value: '' as const, label: 'London' },
  { value: 'sans' as const, label: 'Ottawa' },
  { value: 'mono' as const, label: 'San Francisco' },
] as const;

/** Value for the note theme `<select>`: London is default or legacy `serif`. */
export function noteThemeSelectValue(
  settings: NoteEditorSettings,
): (typeof NOTE_THEME_OPTIONS)[number]['value'] {
  if (settings.font === 'sans') {
    return 'sans';
  }
  if (settings.font === 'mono') {
    return 'mono';
  }
  return '';
}

/** Parse `notes.editor_settings` JSON; invalid or non-objects yield `{}`. */
export function parseNoteEditorSettings(
  raw: Note['editor_settings'] | null | undefined,
): NoteEditorSettings {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const parsed = noteEditorSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return {};
  }
  return parsed.data;
}

/** Minimal JSON for Supabase; omit keys that match app defaults. */
export function noteEditorSettingsToJson(settings: NoteEditorSettings): Json {
  const o: Record<string, unknown> = {};
  if (settings.font === 'sans' || settings.font === 'mono') {
    o.font = settings.font;
  }
  if (settings.measure) {
    o.measure = settings.measure;
  }
  if (settings.showInNoteGraph === false) {
    o.showInNoteGraph = false;
  }
  return o as Json;
}

/** Default: notes appear in the graph unless `editor_settings.showInNoteGraph === false`. */
export function isNoteVisibleInNoteGraph(
  note: Pick<Note, 'editor_settings'>,
): boolean {
  return parseNoteEditorSettings(note.editor_settings).showInNoteGraph !== false;
}

export function filterNotesForNoteGraph(notes: Note[]): Note[] {
  return notes.filter(isNoteVisibleInNoteGraph);
}

export function noteSurfaceClassNames(settings: NoteEditorSettings): {
  maxWidthClass: string;
  titleFontClass: string;
  bodyFontClass: string;
} {
  const titleFontClass =
    settings.font === 'mono'
      ? 'font-mono'
      : settings.font === 'sans'
        ? 'font-sans'
        : 'font-serif';
  const bodyFontClass =
    settings.font === 'mono'
      ? 'font-mono'
      : settings.font === 'sans'
        ? 'font-sans'
        : 'font-london-body';
  const maxWidthClass =
    settings.measure === 'narrow'
      ? 'max-w-prose'
      : settings.measure === 'wide'
        ? 'max-w-5xl'
        : 'max-w-3xl';
  return { maxWidthClass, titleFontClass, bodyFontClass };
}
