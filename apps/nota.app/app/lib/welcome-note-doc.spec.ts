import { describe, expect, it } from 'vitest';
import { WELCOME_NOTE_CONTENT } from './welcome-note-doc';

function welcomeNoteText(): string {
  return JSON.stringify(WELCOME_NOTE_CONTENT);
}

describe('WELCOME_NOTE_CONTENT', () => {
  it('does not duplicate the note title as a top-level heading', () => {
    const doc = WELCOME_NOTE_CONTENT as {
      type: string;
      content?: Array<{ type: string; attrs?: { level?: number }; content?: unknown }>;
    };
    expect(doc.type).toBe('doc');
    const first = doc.content?.[0];
    expect(first?.type).not.toBe('heading');
    expect(
      first?.type === 'paragraph' &&
        JSON.stringify(first).includes('This is your vault'),
    ).toBe(true);
  });

  it('uses Mac-only shortcut copy and documents ⌘K, ⌘D, and ⌘S', () => {
    const s = welcomeNoteText();
    expect(s).not.toMatch(/Ctrl\+K/);
    expect(s).not.toMatch(/\(Windows\)/);
    expect(s).not.toMatch(/Mod\+D/);
    expect(s).toContain('⌘K');
    expect(s).toContain('⌘D');
    expect(s).toContain('⌘S');
    expect(s.toLowerCase()).toContain('sidebar');
  });
});
