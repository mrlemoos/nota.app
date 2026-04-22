import { describe, expect, it } from 'vitest';
import { WELCOME_NOTE_CONTENT } from './welcome-note-doc';

function welcomeNoteText(): string {
  return JSON.stringify(WELCOME_NOTE_CONTENT);
}

describe('WELCOME_NOTE_CONTENT', () => {
  it('does not duplicate the note title as a top-level heading', () => {
    // Arrange
    const doc = WELCOME_NOTE_CONTENT as {
      type: string;
      content?: Array<{ type: string; attrs?: { level?: number }; content?: unknown }>;
    };

    // Act
    const first = doc.content?.[0];
    const opensWithParagraphNotHeading =
      first?.type === 'paragraph' &&
      JSON.stringify(first).includes('This is your vault');

    // Assert
    expect(doc.type).toBe('doc');
    expect(first?.type).not.toBe('heading');
    expect(opensWithParagraphNotHeading).toBe(true);
  });

  it('uses Mac-only shortcut copy and documents ⌘K, ⌘D, and ⌘S', () => {
    // Arrange
    const s = welcomeNoteText();

    // Act
    const lower = s.toLowerCase();

    // Assert
    expect(s).not.toMatch(/Ctrl\+K/);
    expect(s).not.toMatch(/\(Windows\)/);
    expect(s).not.toMatch(/Mod\+D/);
    expect(s).toContain('⌘K');
    expect(s).toContain('⌘D');
    expect(s).toContain('⌘S');
    expect(lower).toContain('sidebar');
  });
});
