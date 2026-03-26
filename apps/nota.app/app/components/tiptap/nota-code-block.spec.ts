import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { describe, expect, it } from 'vitest';
import { NotaCodeBlock } from './nota-code-block';

function createEditorWithNotaCodeBlock(
  content: NonNullable<ConstructorParameters<typeof Editor>[0]['content']>,
) {
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
    const editor = createEditorWithNotaCodeBlock({
      type: 'doc',
      content: [
        {
          type: 'codeBlock',
          attrs: { language: 'javascript' },
          content: [{ type: 'text', text: 'const x = 1;\n' }],
        },
      ],
    });

    const doc = editor.getJSON() as {
      content?: Array<{
        type: string;
        attrs?: { language?: string };
        content?: Array<{ type: string; text?: string }>;
      }>;
    };

    const block = doc.content?.[0];
    expect(block?.type).toBe('codeBlock');
    expect(block?.attrs?.language).toBe('javascript');
    expect(block?.content?.[0]?.text).toBe('const x = 1;\n');
    editor.destroy();
  });

  it('stores mermaid block with diagram source in JSON', () => {
    const source = 'graph TD\n  A --> B';
    const editor = createEditorWithNotaCodeBlock({
      type: 'doc',
      content: [
        {
          type: 'codeBlock',
          attrs: { language: 'mermaid' },
          content: [{ type: 'text', text: source }],
        },
      ],
    });

    const doc = editor.getJSON() as {
      content?: Array<{
        type: string;
        attrs?: { language?: string };
        content?: Array<{ type: string; text?: string }>;
      }>;
    };

    const block = doc.content?.[0];
    expect(block?.type).toBe('codeBlock');
    expect(block?.attrs?.language).toBe('mermaid');
    expect(block?.content?.[0]?.text).toBe(source);
    editor.destroy();
  });
});
