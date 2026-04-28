import { Editor } from '@tiptap/core';
import Emoji from '@tiptap/extension-emoji';
import StarterKit from '@tiptap/starter-kit';
import { describe, expect, it } from 'vitest';
import { NotaCodeBlock } from '@nota.app/editor';

function collectTypes(node: unknown): string[] {
  if (!node || typeof node !== 'object') {
    return [];
  }
  const n = node as { type?: string; content?: unknown[] };
  const self = n.type ? [n.type] : [];
  const children = (n.content ?? []).flatMap(collectTypes);
  return [...self, ...children];
}

function createEditorWithEmoji() {
  return new Editor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      NotaCodeBlock,
      Emoji.configure({
        enableEmoticons: false,
        suggestion: {
          allow: () => false,
        },
      }),
    ],
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
  });
}

describe('TipTap emoji', () => {
  it('setEmoji inserts an emoji node in JSON', () => {
    // Arrange
    const editor = createEditorWithEmoji();
    const emojiName = 'smile';

    // Act
    editor.chain().focus().setEmoji(emojiName).run();
    const types = collectTypes(editor.getJSON());

    // Assert
    expect(types).toContain('emoji');

    editor.destroy();
  });

  it('round-trips a document containing an emoji node through setContent', () => {
    // Arrange
    const editor = createEditorWithEmoji();
    const emojiName = 'smile';
    const parseAsHtml = false;
    editor.chain().focus().setEmoji(emojiName).run();
    const snapshot = editor.getJSON();

    // Act
    editor.commands.setContent(snapshot, parseAsHtml);
    const after = collectTypes(editor.getJSON());

    // Assert
    expect(after).toContain('emoji');

    editor.destroy();
  });
});
