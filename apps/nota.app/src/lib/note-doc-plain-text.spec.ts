import { describe, expect, it } from 'vitest';
import { extractPlainTextFromDocJson } from './note-doc-plain-text';

describe('extractPlainTextFromDocJson', () => {
  it('returns empty string for non-object input', () => {
    // Arrange
    const nullInput = null;
    const undefinedInput = undefined;
    const stringInput = 'x';

    // Act
    const nullResult = extractPlainTextFromDocJson(nullInput);
    const undefinedResult = extractPlainTextFromDocJson(undefinedInput);
    const stringResult = extractPlainTextFromDocJson(stringInput);

    // Assert
    expect(nullResult).toBe('');
    expect(undefinedResult).toBe('');
    expect(stringResult).toBe('');
  });

  it('extracts text from a simple doc', () => {
    // Arrange
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello ' }, { type: 'text', text: 'world' }],
        },
      ],
    };

    // Act
    const text = extractPlainTextFromDocJson(doc);

    // Assert
    expect(text).toBe('Hello world');
  });

  it('normalises whitespace', () => {
    // Arrange
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '  a  \n  b  ' }],
        },
      ],
    };

    // Act
    const text = extractPlainTextFromDocJson(doc);

    // Assert
    expect(text).toBe('a b');
  });
});
