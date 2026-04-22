import { Editor, type JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { describe, expect, it } from 'vitest';
import { LinkPreview } from './link-preview-extension';
import {
  convertLinkOnlyParagraphs,
  revertLinkPreviewToParagraph,
} from './link-preview-scan';
import { NotaLink } from './nota-link';

function createTestEditor(content: JSONContent | string) {
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
      LinkPreview,
    ],
    content,
  });
}

describe('convertLinkOnlyParagraphs', () => {
  it('creates linkPreview nodes with href via schema', () => {
    // Arrange
    const editor = createTestEditor('<p></p>');
    const previewType = editor.schema.nodes.linkPreview;
    expect(previewType).toBeTruthy();
    const attrs = {
      href: 'https://example.com/p',
      linkText: 'Hello',
      title: '',
      description: '',
      image: '',
    };

    // Act
    const node = previewType?.create(attrs);

    // Assert
    expect(node?.attrs['href']).toBe('https://example.com/p');
    editor.destroy();
  });

  it('does not promote a link-only paragraph when skipLinkPreview is set', () => {
    // Arrange
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'https://example.com',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: 'https://example.com',
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    class: 'tiptap-link',
                    skipLinkPreview: true,
                  },
                },
              ],
            },
          ],
        },
      ],
    };
    const editor = createTestEditor(doc);
    const before = editor.getJSON();

    // Act
    convertLinkOnlyParagraphs(editor);

    // Assert
    expect(editor.getJSON()).toEqual(before);

    editor.destroy();
  });

  it('does not promote a link-only paragraph when href is an internal note path', () => {
    // Arrange
    const noteId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const href = `/notes/${noteId}`;
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Other note',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    class: 'tiptap-link',
                    skipLinkPreview: false,
                  },
                },
              ],
            },
          ],
        },
      ],
    };
    const editor = createTestEditor(doc);
    const before = editor.getJSON();

    // Act
    convertLinkOnlyParagraphs(editor);

    // Assert
    expect(editor.getJSON()).toEqual(before);
    editor.destroy();
  });

  it('promotes a normal link-only paragraph to linkPreview with linkText', () => {
    // Arrange
    const editor = createTestEditor('<p></p>');
    editor.commands.setContent(
      '<p><a href="https://example.com/p">Hello</a></p>',
    );
    const para = editor.state.doc.firstChild;
    expect(para?.childCount).toBe(1);
    const textNode = para?.firstChild;
    expect(textNode?.isText).toBe(true);
    if (textNode && 'marks' in textNode) {
      const linkMark = textNode.marks.find((m) => m.type.name === 'link');
      expect(linkMark?.attrs['skipLinkPreview']).not.toBe(true);
    }

    // Act
    convertLinkOnlyParagraphs(editor);

    // Assert
    const doc = editor.getJSON() as {
      content?: Array<{ type: string; attrs?: Record<string, unknown> }>;
    };
    expect(doc.content?.[0]?.type).toBe('linkPreview');
    expect(doc.content?.[0]?.attrs?.href).toBe('https://example.com/p');
    expect(doc.content?.[0]?.attrs?.linkText).toBe('Hello');

    editor.destroy();
  });
});

describe('revertLinkPreviewToParagraph', () => {
  it('replaces linkPreview with a paragraph link using linkText and skipLinkPreview', () => {
    // Arrange
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'linkPreview',
          attrs: {
            href: 'https://example.com/x',
            linkText: 'My label',
            title: '',
            description: '',
            image: '',
          },
        },
      ],
    };
    const editor = createTestEditor(doc);
    let previewPos = -1;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'linkPreview') {
        previewPos = pos;
        return false;
      }
      return true;
    });
    expect(previewPos).toBeGreaterThan(-1);

    // Act
    const ok = revertLinkPreviewToParagraph(editor, () => previewPos);

    // Assert
    expect(ok).toBe(true);
    const resultDoc = editor.getJSON() as {
      content?: Array<{
        type: string;
        content?: Array<{
          type: string;
          text?: string;
          marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
        }>;
      }>;
    };
    const p = resultDoc.content?.[0];
    expect(p?.type).toBe('paragraph');
    expect(p?.content?.[0]?.text).toBe('My label');
    expect(p?.content?.[0]?.marks?.[0]?.type).toBe('link');
    expect(p?.content?.[0]?.marks?.[0]?.attrs?.href).toBe('https://example.com/x');
    expect(p?.content?.[0]?.marks?.[0]?.attrs?.skipLinkPreview).toBe(true);

    editor.destroy();
  });

  it('uses href as visible text when linkText is empty', () => {
    // Arrange
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'linkPreview',
          attrs: {
            href: 'https://example.com/y',
            linkText: '',
            title: '',
            description: '',
            image: '',
          },
        },
      ],
    };
    const editor = createTestEditor(doc);
    let previewPos = -1;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'linkPreview') {
        previewPos = pos;
        return false;
      }
      return true;
    });

    // Act
    revertLinkPreviewToParagraph(editor, () => previewPos);

    // Assert
    const resultDoc = editor.getJSON() as {
      content?: Array<{
        content?: Array<{ text?: string }>;
      }>;
    };
    expect(resultDoc.content?.[0]?.content?.[0]?.text).toBe('https://example.com/y');

    editor.destroy();
  });
});
