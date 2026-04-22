import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
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

function createEditorWithTable() {
  return new Editor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      NotaCodeBlock,
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: 'nota-table' },
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
  });
}

describe('TipTap table', () => {
  it('insertTable produces table and tableCell nodes in JSON', () => {
    // Arrange
    const editor = createEditorWithTable();
    const tableConfig = { rows: 2, cols: 2, withHeaderRow: true };

    // Act
    editor
      .chain()
      .focus()
      .insertTable(tableConfig)
      .run();
    const types = collectTypes(editor.getJSON());

    // Assert
    expect(types).toContain('table');
    expect(types.filter((t) => t === 'tableCell').length).toBeGreaterThan(0);

    editor.destroy();
  });

  it('round-trips table document JSON through setContent', () => {
    // Arrange
    const editor = createEditorWithTable();
    const tableConfig = { rows: 2, cols: 2, withHeaderRow: false };
    const parseAsHtml = false;
    editor
      .chain()
      .focus()
      .insertTable(tableConfig)
      .run();
    const snapshot = editor.getJSON();

    // Act
    editor.commands.setContent(snapshot, parseAsHtml);
    const after = collectTypes(editor.getJSON());

    // Assert
    expect(after).toContain('table');
    expect(after.filter((t) => t === 'tableCell').length).toBeGreaterThan(0);

    editor.destroy();
  });
});
