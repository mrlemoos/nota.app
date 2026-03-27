import { z } from 'zod';
import type { Json, Note } from '~/types/database.types';

const noteEditorSettingsSchema = z.object({
  font: z.enum(['sans', 'serif', 'mono']).optional(),
  measure: z.enum(['narrow', 'wide']).optional(),
});

export type NoteEditorSettings = z.infer<typeof noteEditorSettingsSchema>;

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
  const { font, ...rest } = parsed.data;
  if (font === 'sans') {
    return { ...rest };
  }
  return parsed.data;
}

/** Minimal JSON for Supabase; omit keys that match app defaults. */
export function noteEditorSettingsToJson(settings: NoteEditorSettings): Json {
  const o: Record<string, unknown> = {};
  if (settings.font) {
    o.font = settings.font;
  }
  if (settings.measure) {
    o.measure = settings.measure;
  }
  return o as Json;
}

export function noteSurfaceClassNames(settings: NoteEditorSettings): {
  maxWidthClass: string;
  titleFontClass: string;
  bodyFontClass: string;
} {
  const titleFontClass =
    settings.font === 'serif'
      ? 'font-serif'
      : settings.font === 'mono'
        ? 'font-mono'
        : 'font-sans';
  const bodyFontClass =
    settings.font === 'serif'
      ? 'font-note-body'
      : settings.font === 'mono'
        ? 'font-mono'
        : 'font-sans';
  const maxWidthClass =
    settings.measure === 'narrow'
      ? 'max-w-prose'
      : settings.measure === 'wide'
        ? 'max-w-5xl'
        : 'max-w-3xl';
  return { maxWidthClass, titleFontClass, bodyFontClass };
}
