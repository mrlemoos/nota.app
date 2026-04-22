import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { describe, expect, it } from 'vitest';
import { NotaCodeBlock } from './tiptap/nota-code-block';

function createEditorWithHighlight() {
  return new Editor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      NotaCodeBlock,
      Highlight.configure({
        HTMLAttributes: { class: 'nota-text-highlight' },
      }),
    ],
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
  });
}

describe('TipTap highlight', () => {
  it('toggleHighlight adds highlight mark to selected text in JSON', () => {
    // Arrange
    const editor = createEditorWithHighlight();
    editor.commands.setContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello' }],
        },
      ],
    });

    // Act
    editor.chain().focus().selectAll().toggleHighlight().run();
    const docJson = editor.getJSON();

    // Assert
    expect(JSON.stringify(docJson)).toContain('Hello');
    expect(JSON.stringify(docJson)).toContain('"type":"highlight"');

    editor.destroy();
  });

  it('round-trips highlight document JSON through setContent', () => {
    // Arrange
    const editor = createEditorWithHighlight();
    editor.commands.setContent({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] },
      ],
    });
    editor.chain().focus().selectAll().toggleHighlight().run();
    const snapshot = editor.getJSON();

    // Act
    editor.commands.setContent(snapshot, false);

    // Assert
    expect(JSON.stringify(editor.getJSON())).toContain('"type":"highlight"');
    expect(JSON.stringify(editor.getJSON())).toContain('Hi');

    editor.destroy();
  });
});
