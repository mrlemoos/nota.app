import { describe, expect, it } from 'vitest';
import {
  filterNotesForNoteGraph,
  isNoteVisibleInNoteGraph,
  NOTE_THEME_LABEL,
  NOTE_THEME_OPTIONS,
  noteEditorFontFromThemeSelectValue,
  noteEditorSettingsToJson,
  noteSurfaceClassNames,
  noteThemeSelectValue,
  parseNoteEditorSettings,
} from './note-editor-settings';
import type { Json, Note } from '~/types/database.types';

describe('parseNoteEditorSettings', () => {
  it('returns empty object for null', () => {
    // Act
    const result = parseNoteEditorSettings(null);

    // Assert
    expect(result).toEqual({});
  });

  it('returns empty object for undefined', () => {
    // Act
    const result = parseNoteEditorSettings(undefined);

    // Assert
    expect(result).toEqual({});
  });

  it('returns empty object for array input', () => {
    // Arrange
    const raw = [] as unknown as Json;

    // Act
    const result = parseNoteEditorSettings(raw);

    // Assert
    expect(result).toEqual({});
  });

  it('returns empty object for string input', () => {
    // Arrange
    const raw = 'x' as unknown as Json;

    // Act
    const result = parseNoteEditorSettings(raw);

    // Assert
    expect(result).toEqual({});
  });

  it('accepts valid font and measure', () => {
    // Arrange
    const raw = { font: 'mono', measure: 'narrow' } as Json;

    // Act
    const result = parseNoteEditorSettings(raw);

    // Assert
    expect(result).toEqual({ font: 'mono', measure: 'narrow' });
  });

  it('preserves sans (Ottawa theme)', () => {
    // Arrange
    const raw = { font: 'sans' } as Json;

    // Act
    const result = parseNoteEditorSettings(raw);

    // Assert
    expect(result).toEqual({ font: 'sans' });
  });

  it('preserves sans font and measure', () => {
    // Arrange
    const raw = { font: 'sans', measure: 'wide' } as Json;

    // Act
    const result = parseNoteEditorSettings(raw);

    // Assert
    expect(result).toEqual({ font: 'sans', measure: 'wide' });
  });

  it('preserves York theme font', () => {
    // Arrange
    const raw = { font: 'york' } as Json;

    // Act
    const result = parseNoteEditorSettings(raw);

    // Assert
    expect(result).toEqual({ font: 'york' });
  });

  it('returns empty object when validation fails', () => {
    // Arrange
    const raw = {
      font: 'comic',
      measure: 'narrow',
    } as unknown as Json;

    // Act
    const result = parseNoteEditorSettings(raw);

    // Assert
    expect(result).toEqual({});
  });
});

describe('noteEditorSettingsToJson', () => {
  it('omits empty settings', () => {
    // Arrange
    const settings = {};

    // Act
    const result = noteEditorSettingsToJson(settings);

    // Assert
    expect(result).toEqual({});
  });

  it('serialises Ottawa, York, and mono fonts and omits London (serif)', () => {
    expect(
      noteEditorSettingsToJson({ font: 'sans', measure: 'wide' as const }),
    ).toEqual({ font: 'sans', measure: 'wide' });
    expect(noteEditorSettingsToJson({ font: 'mono' })).toEqual({
      font: 'mono',
    });
    expect(noteEditorSettingsToJson({ font: 'york' })).toEqual({
      font: 'york',
    });
    expect(noteEditorSettingsToJson({ font: 'serif' })).toEqual({});
  });

  it('serialises showInNoteGraph false only', () => {
    expect(
      noteEditorSettingsToJson({ showInNoteGraph: false }),
    ).toEqual({ showInNoteGraph: false });
    expect(noteEditorSettingsToJson({ showInNoteGraph: true })).toEqual({});
    expect(noteEditorSettingsToJson({})).toEqual({});
  });
});

describe('showInNoteGraph', () => {
  it('parses false and true', () => {
    expect(
      parseNoteEditorSettings({ showInNoteGraph: false }),
    ).toEqual({ showInNoteGraph: false });
    expect(parseNoteEditorSettings({ showInNoteGraph: true })).toEqual({
      showInNoteGraph: true,
    });
  });

  it('keeps showInNoteGraph with sans font', () => {
    const result = parseNoteEditorSettings({
      font: 'sans',
      showInNoteGraph: false,
    });
    expect(result).toEqual({ font: 'sans', showInNoteGraph: false });
  });
});

describe('isNoteVisibleInNoteGraph', () => {
  it('treats missing and true as visible', () => {
    expect(isNoteVisibleInNoteGraph({ editor_settings: {} })).toBe(
      true,
    );
    expect(
      isNoteVisibleInNoteGraph({
        editor_settings: { showInNoteGraph: true },
      }),
    ).toBe(true);
  });

  it('treats false as hidden', () => {
    expect(
      isNoteVisibleInNoteGraph({
        editor_settings: { showInNoteGraph: false },
      }),
    ).toBe(false);
  });
});

describe('filterNotesForNoteGraph', () => {
  it('drops notes hidden from graph', () => {
    const notes = [
      { id: 'a', editor_settings: {} },
      { id: 'b', editor_settings: { showInNoteGraph: false } },
    ] as Note[];

    expect(filterNotesForNoteGraph(notes).map((n) => n.id)).toEqual(['a']);
  });
});

describe('noteSurfaceClassNames', () => {
  it('uses London (Instrument + Geist) and standard width for empty settings', () => {
    // Arrange
    const settings = {};

    // Act
    const result = noteSurfaceClassNames(settings);

    // Assert
    expect(result).toEqual({
      maxWidthClass: 'max-w-3xl',
      titleFontClass: 'font-serif',
      bodyFontClass: 'font-london-body',
    });
  });

  it('maps legacy serif to London with narrow measure', () => {
    // Arrange
    const settings = { font: 'serif' as const, measure: 'narrow' as const };

    // Act
    const result = noteSurfaceClassNames(settings);

    // Assert
    expect(result).toEqual({
      maxWidthClass: 'max-w-prose',
      titleFontClass: 'font-serif',
      bodyFontClass: 'font-london-body',
    });
  });

  it('maps Ottawa (sans) with narrow measure', () => {
    const settings = { font: 'sans' as const, measure: 'narrow' as const };
    expect(noteSurfaceClassNames(settings)).toEqual({
      maxWidthClass: 'max-w-prose',
      titleFontClass: 'font-sans',
      bodyFontClass: 'font-sans',
    });
  });

  it('maps mono and wide measure', () => {
    // Arrange
    const settings = { font: 'mono' as const, measure: 'wide' as const };

    // Act
    const result = noteSurfaceClassNames(settings);

    // Assert
    expect(result).toEqual({
      maxWidthClass: 'max-w-5xl',
      titleFontClass: 'font-mono',
      bodyFontClass: 'font-mono',
    });
  });

  it('maps York to serif title and Source Serif body with standard width', () => {
    const settings = { font: 'york' as const };
    expect(noteSurfaceClassNames(settings)).toEqual({
      maxWidthClass: 'max-w-3xl',
      titleFontClass: 'font-serif',
      bodyFontClass: 'font-note-body',
    });
  });

  it('maps York with narrow measure', () => {
    const settings = { font: 'york' as const, measure: 'narrow' as const };
    expect(noteSurfaceClassNames(settings)).toEqual({
      maxWidthClass: 'max-w-prose',
      titleFontClass: 'font-serif',
      bodyFontClass: 'font-note-body',
    });
  });
});

describe('note theme copy', () => {
  it('exposes Note theme label and city option names', () => {
    expect(NOTE_THEME_LABEL).toBe('Note theme');
    expect(NOTE_THEME_OPTIONS.map((o) => o.label)).toEqual([
      'London',
      'York',
      'Ottawa',
      'San Francisco',
    ]);
  });

  it('noteThemeSelectValue maps stored font to select value', () => {
    expect(noteThemeSelectValue({})).toBe('');
    expect(noteThemeSelectValue({ font: 'serif' })).toBe('');
    expect(noteThemeSelectValue({ font: 'sans' })).toBe('sans');
    expect(noteThemeSelectValue({ font: 'mono' })).toBe('mono');
    expect(noteThemeSelectValue({ font: 'york' })).toBe('york');
  });
});

describe('noteEditorFontFromThemeSelectValue', () => {
  it('maps each option value to the persisted font field', () => {
    expect(noteEditorFontFromThemeSelectValue('')).toBeUndefined();
    expect(noteEditorFontFromThemeSelectValue('sans')).toBe('sans');
    expect(noteEditorFontFromThemeSelectValue('mono')).toBe('mono');
    expect(noteEditorFontFromThemeSelectValue('york')).toBe('york');
  });

  it('returns undefined for unexpected select values', () => {
    expect(noteEditorFontFromThemeSelectValue('comic')).toBeUndefined();
  });
});
