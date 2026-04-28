import { Editor, type JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { EditorView } from '@tiptap/pm/view';
import type { Note } from '~/types/database.types';
import {
  findNoteMentionTrigger,
  NotaLink,
  insertNoteLinkAtMentionRange,
  insertNoteLinkAtMentionRangeView,
  tryConfirmNoteMention,
  type NoteMentionConfirmRefs,
} from '@nota.app/editor';

vi.mock('@nota.app/editor', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nota.app/editor')>();
  return {
    ...actual,
    findNoteMentionTrigger: vi.fn((...args: Parameters<typeof actual.findNoteMentionTrigger>) =>
      actual.findNoteMentionTrigger(...args),
    ),
  };
});

const sampleNote = {
  id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
  user_id: 'u1',
  title: 'Hello',
  content: {},
  created_at: '2020-01-01T00:00:00Z',
  updated_at: '2020-01-01T00:00:00Z',
} as Note;

function createEditorWithNotaLink(content: JSONContent | string) {
  return new Editor({
    extensions: [
      StarterKit,
      NotaLink.configure({
        autolink: false,
        linkOnPaste: false,
        openOnClick: false,
        defaultProtocol: 'https',
        HTMLAttributes: {
          class: 'tiptap-link',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content,
  });
}

function createEditorStarterKitOnly(content: JSONContent | string) {
  return new Editor({
    extensions: [StarterKit],
    content,
  });
}

function buildRefs(
  overrides: Partial<{
    canInsert: boolean;
    filter: (q: string) => Note[];
    mentionTriggerKey: string | null;
    mentionSelectedIndex: number;
  }> = {},
): NoteMentionConfirmRefs {
  const {
    canInsert = true,
    filter = () => [sampleNote],
    mentionTriggerKey = null,
    mentionSelectedIndex = 0,
  } = overrides;
  return {
    canInsertAttachmentsRef: { current: canInsert },
    filterNoteCandidatesRef: { current: filter },
    mentionTriggerKeyRef: { current: mentionTriggerKey },
    mentionSelectedIndexRef: { current: mentionSelectedIndex },
  };
}

describe('tiptap-note-mention-flow', () => {
  beforeEach(() => {
    vi.mocked(findNoteMentionTrigger).mockClear();
  });

  describe('insertNoteLinkAtMentionRangeView', () => {
    it('returns false when the schema has no link mark', () => {
      // Arrange
      const view = {
        state: {
          schema: { marks: {} },
        },
      } as unknown as EditorView;
      const from = 0;
      const to = 1;

      // Act
      const ok = insertNoteLinkAtMentionRangeView(view, from, to, sampleNote);

      // Assert
      expect(ok).toBe(false);
    });
  });

  describe('insertNoteLinkAtMentionRange', () => {
    it('inserts an internal note link for the given range', () => {
      // Arrange
      const docContent: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hi @me' }],
          },
        ],
      };
      const editor = createEditorWithNotaLink(docContent);
      try {
        editor.commands.setTextSelection(editor.state.doc.content.size - 1);

        // Act
        const trigger = findNoteMentionTrigger(editor.state);
        if (!trigger) {
          throw new Error('expected @ mention trigger');
        }
        insertNoteLinkAtMentionRange(
          editor,
          trigger.from,
          editor.state.selection.from,
          sampleNote,
        );

        // Assert
        expect(editor.getHTML()).toContain(`/notes/${sampleNote.id}`);
        expect(editor.getHTML()).toContain('Hello');
      } finally {
        editor.destroy();
      }
    });
  });

  describe('tryConfirmNoteMention', () => {
    it('returns false when attachments are disabled', () => {
      // Arrange
      const initialContent = '<p>x</p>';
      const editor = createEditorWithNotaLink(initialContent);
      try {
        const setMention = vi.fn();
        const refs = buildRefs({ canInsert: false });

        // Act
        const ok = tryConfirmNoteMention(editor.view, setMention, refs);

        // Assert
        expect(ok).toBe(false);
        expect(findNoteMentionTrigger).not.toHaveBeenCalled();
        expect(setMention).not.toHaveBeenCalled();
      } finally {
        editor.destroy();
      }
    });

    it('returns false when there is no @ mention trigger', () => {
      // Arrange
      const initialContent = '<p>no mention here</p>';
      const editor = createEditorWithNotaLink(initialContent);
      try {
        editor.commands.setTextSelection(editor.state.doc.content.size - 1);
        const setMention = vi.fn();
        const refs = buildRefs();

        // Act
        const ok = tryConfirmNoteMention(editor.view, setMention, refs);

        // Assert
        expect(ok).toBe(false);
        expect(setMention).not.toHaveBeenCalled();
      } finally {
        editor.destroy();
      }
    });

    it('returns false when the filtered candidate list is empty', () => {
      // Arrange
      const initialContent = '<p>Hello @me</p>';
      const editor = createEditorWithNotaLink(initialContent);
      try {
        editor.commands.setTextSelection(editor.state.doc.content.size - 1);
        const setMention = vi.fn();
        const refs = buildRefs({ filter: () => [] });

        // Act
        const ok = tryConfirmNoteMention(editor.view, setMention, refs);

        // Assert
        expect(ok).toBe(false);
        expect(setMention).not.toHaveBeenCalled();
      } finally {
        editor.destroy();
      }
    });

    it('returns false and does not clear mention when insert fails (no link mark)', () => {
      // Arrange
      const initialContent = '<p>Hello @me</p>';
      const editor = createEditorStarterKitOnly(initialContent);
      try {
        editor.commands.setTextSelection(editor.state.doc.content.size - 1);
        const setMention = vi.fn();
        const refs = buildRefs();

        // Act
        const ok = tryConfirmNoteMention(editor.view, setMention, refs);

        // Assert
        expect(ok).toBe(false);
        expect(setMention).not.toHaveBeenCalled();
      } finally {
        editor.destroy();
      }
    });

    it('clears mention state when insert succeeds', () => {
      // Arrange
      const initialContent = '<p>Hello @me</p>';
      const editor = createEditorWithNotaLink(initialContent);
      try {
        editor.commands.setTextSelection(editor.state.doc.content.size - 1);
        const setMention = vi.fn();
        const refs = buildRefs();

        // Act
        const ok = tryConfirmNoteMention(editor.view, setMention, refs);

        // Assert
        expect(ok).toBe(true);
        expect(setMention).toHaveBeenCalledWith(null);
        expect(editor.getHTML()).toContain(`/notes/${sampleNote.id}`);
      } finally {
        editor.destroy();
      }
    });
  });
});
