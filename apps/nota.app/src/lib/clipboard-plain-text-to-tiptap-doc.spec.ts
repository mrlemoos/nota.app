import { describe, expect, it } from 'vitest';
import {
  clipboardPlainTextToTiptapDoc,
  titleFromClipboardPlainText,
} from './clipboard-plain-text-to-tiptap-doc';

describe('titleFromClipboardPlainText', () => {
  it('uses the first non-empty line and caps length', () => {
    // Arrange
    const text = `${'x'.repeat(130)}\nsecond`;

    // Act
    const title = titleFromClipboardPlainText(text);

    // Assert
    expect(title.endsWith('…')).toBe(true);
    expect(title.length).toBe(121);
  });

  it('returns Clipboard when there is no printable text', () => {
    // Arrange
    const text = '   \n\t  \n';

    // Act
    const title = titleFromClipboardPlainText(text);

    // Assert
    expect(title).toBe('Clipboard');
  });
});

describe('clipboardPlainTextToTiptapDoc', () => {
  it('maps each line to a paragraph', () => {
    // Arrange
    const text = 'a\n\nb';

    // Act
    const doc = clipboardPlainTextToTiptapDoc(text);

    // Assert
    expect(doc).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'a' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'b' }] },
      ],
    });
  });

  it('uses a single empty paragraph when the string is empty', () => {
    // Arrange
    const text = '';

    // Act
    const doc = clipboardPlainTextToTiptapDoc(text);

    // Assert
    expect(doc).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }],
    });
  });
});
