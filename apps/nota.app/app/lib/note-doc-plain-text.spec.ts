import { describe, expect, it } from 'vitest';
import { extractPlainTextFromDocJson } from './note-doc-plain-text';

describe('extractPlainTextFromDocJson', () => {
  it('returns empty string for non-object input', () => {
    expect(extractPlainTextFromDocJson(null)).toBe('');
    expect(extractPlainTextFromDocJson(undefined)).toBe('');
    expect(extractPlainTextFromDocJson('x')).toBe('');
  });

  it('extracts text from a simple doc', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello ' }, { type: 'text', text: 'world' }],
        },
      ],
    };
    expect(extractPlainTextFromDocJson(doc)).toBe('Hello world');
  });

  it('normalises whitespace', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '  a  \n  b  ' }],
        },
      ],
    };
    expect(extractPlainTextFromDocJson(doc)).toBe('a b');
  });
});
