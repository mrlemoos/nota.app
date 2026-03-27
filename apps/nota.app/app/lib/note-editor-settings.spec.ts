import { describe, expect, it } from 'vitest';
import {
  noteEditorSettingsToJson,
  noteSurfaceClassNames,
  parseNoteEditorSettings,
} from './note-editor-settings';
import type { Json } from '~/types/database.types';

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

  it('treats sans-only settings as app default', () => {
    // Arrange
    const raw = { font: 'sans' } as Json;

    // Act
    const result = parseNoteEditorSettings(raw);

    // Assert
    expect(result).toEqual({});
  });

  it('strips sans font but keeps measure', () => {
    // Arrange
    const raw = { font: 'sans', measure: 'wide' } as Json;

    // Act
    const result = parseNoteEditorSettings(raw);

    // Assert
    expect(result).toEqual({ measure: 'wide' });
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

  it('serialises non-default keys', () => {
    // Arrange
    const settings = { font: 'serif' as const, measure: 'wide' as const };

    // Act
    const result = noteEditorSettingsToJson(settings);

    // Assert
    expect(result).toEqual({
      font: 'serif',
      measure: 'wide',
    });
  });
});

describe('noteSurfaceClassNames', () => {
  it('uses sans and standard width for empty settings', () => {
    // Arrange
    const settings = {};

    // Act
    const result = noteSurfaceClassNames(settings);

    // Assert
    expect(result).toEqual({
      maxWidthClass: 'max-w-3xl',
      titleFontClass: 'font-sans',
      bodyFontClass: 'font-sans',
    });
  });

  it('maps serif title and reading body with narrow measure', () => {
    // Arrange
    const settings = { font: 'serif' as const, measure: 'narrow' as const };

    // Act
    const result = noteSurfaceClassNames(settings);

    // Assert
    expect(result).toEqual({
      maxWidthClass: 'max-w-prose',
      titleFontClass: 'font-serif',
      bodyFontClass: 'font-note-body',
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
});
