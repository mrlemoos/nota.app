import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { describe, expect, it } from 'vitest';
import { NotaCodeBlock } from './tiptap/nota-code-block';

function collectTypes(node: unknown): string[] {
  if (!node || typeof node !== 'object') {
    return [];
  }
  const n = node as { type?: string; content?: unknown[] };
  const self = n.type ? [n.type] : [];
  const children = (n.content ?? []).flatMap(collectTypes);
  return [...self, ...children];
}

function createEditorWithTaskList() {
  return new Editor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      NotaCodeBlock,
      TaskList.configure({
        HTMLAttributes: { class: 'nota-task-list' },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: { class: 'nota-task-item' },
      }),
    ],
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
  });
}

describe('TipTap task list', () => {
  it('toggleTaskList produces taskList and taskItem nodes in JSON', () => {
    // Arrange
    const editor = createEditorWithTaskList();

    // Act
    editor.chain().focus().toggleTaskList().run();
    const types = collectTypes(editor.getJSON());

    // Assert
    expect(types).toContain('taskList');
    expect(types.filter((t) => t === 'taskItem').length).toBeGreaterThan(0);

    editor.destroy();
  });

  it('round-trips task list document JSON through setContent', () => {
    // Arrange
    const editor = createEditorWithTaskList();
    editor.chain().focus().toggleTaskList().run();
    const snapshot = editor.getJSON();

    // Act
    editor.commands.setContent(snapshot, false);
    const after = collectTypes(editor.getJSON());

    // Assert
    expect(after).toContain('taskList');
    expect(after.filter((t) => t === 'taskItem').length).toBeGreaterThan(0);

    editor.destroy();
  });
});
