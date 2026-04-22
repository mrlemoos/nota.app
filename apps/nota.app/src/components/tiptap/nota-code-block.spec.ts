import { Editor, type JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { describe, expect, it } from 'vitest';
import { NotaCodeBlock } from './nota-code-block';

function createEditorWithNotaCodeBlock(content: JSONContent) {
  return new Editor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      NotaCodeBlock,
    ],
    content,
  });
}

describe('NotaCodeBlock', () => {
  it('stores javascript block with text in JSON', () => {
    // Arrange
    const language = 'javascript';
    const editorContent: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'codeBlock',
          attrs: { language },
          content: [{ type: 'text', text: 'const x = 1;\n' }],
        },
      ],
    };
    const editor = createEditorWithNotaCodeBlock(editorContent);

    // Act
    const doc = editor.getJSON() as {
      content?: Array<{
        type: string;
        attrs?: { language?: string };
        content?: Array<{ type: string; text?: string }>;
      }>;
    };
    const block = doc.content?.[0];

    // Assert
    expect(block?.type).toBe('codeBlock');
    expect(block?.attrs?.language).toBe('javascript');
    expect(block?.content?.[0]?.text).toBe('const x = 1;\n');
    editor.destroy();
  });

  it('stores mermaid block with diagram source in JSON', () => {
    // Arrange
    const language = 'mermaid';
    const source = 'graph TD\n  A --> B';
    const editorContent: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'codeBlock',
          attrs: { language },
          content: [{ type: 'text', text: source }],
        },
      ],
    };
    const editor = createEditorWithNotaCodeBlock(editorContent);

    // Act
    const doc = editor.getJSON() as {
      content?: Array<{
        type: string;
        attrs?: { language?: string };
        content?: Array<{ type: string; text?: string }>;
      }>;
    };
    const block = doc.content?.[0];

    // Assert
    expect(block?.type).toBe('codeBlock');
    expect(block?.attrs?.language).toBe('mermaid');
    expect(block?.content?.[0]?.text).toBe(source);
    editor.destroy();
  });
});
