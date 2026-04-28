import type { Editor } from '@tiptap/core';
import { parseNoteLinkPath } from '../../lib/internal-note-link';

/**
 * Paragraph whose trimmed content is a single hyperlink (no other text),
 * with optional leading/trailing whitespace outside the link.
 */
export function convertLinkOnlyParagraphs(editor: Editor): void {
  const { state } = editor;
  const linkType = state.schema.marks.link;
  const previewType = state.schema.nodes.linkPreview;
  if (!linkType || !previewType) return;

  const toReplace: { from: number; to: number; href: string; linkText: string }[] =
    [];

  state.doc.descendants((node, pos) => {
    if (node.type.name !== 'paragraph') return true;
    if (node.childCount !== 1) return true;
    const child = node.firstChild;
    if (!child || !child.isText) return true;

    const text = child.text ?? '';
    const lead = text.length - text.trimStart().length;
    const trail = text.length - text.trimEnd().length;
    const coreLen = text.length - lead - trail;
    if (coreLen <= 0) return true;

    const paragraphStart = pos;
    const charPos = (textIndex: number) => paragraphStart + 2 + textIndex;

    for (let i = 0; i < lead; i++) {
      const $ = state.doc.resolve(charPos(i));
      if (linkType.isInSet($.marks())) return true;
    }

    for (let i = text.length - trail; i < text.length; i++) {
      const $ = state.doc.resolve(charPos(i));
      if (linkType.isInSet($.marks())) return true;
    }

    const markOnText = linkType.isInSet(child.marks);
    if (!markOnText || markOnText.attrs['skipLinkPreview'] === true) return true;
    const href = (markOnText.attrs['href'] as string) || '';
    if (!href) return true;
    if (parseNoteLinkPath(href)) return true;

    const linkText = text.slice(lead, text.length - trail);

    toReplace.push({
      from: pos,
      to: pos + node.nodeSize,
      href,
      linkText,
    });
    return true;
  });

  if (toReplace.length === 0) return;

  toReplace.sort((a, b) => b.from - a.from);
  const tr = state.tr;
  for (const r of toReplace) {
    tr.replaceWith(
      r.from,
      r.to,
      previewType.create({
        href: r.href,
        linkText: r.linkText,
        title: '',
        description: '',
        image: '',
      }),
    );
  }
  editor.view.dispatch(tr);
}

/**
 * Replace a `linkPreview` node at `getPos()` with a link-only paragraph
 * (`skipLinkPreview` so the scanner does not re-promote it).
 */
export function revertLinkPreviewToParagraph(
  editor: Editor,
  getPos: () => number | undefined,
): boolean {
  const pos = getPos();
  if (typeof pos !== 'number') return false;
  const { state } = editor;
  const node = state.doc.nodeAt(pos);
  if (!node || node.type.name !== 'linkPreview') return false;

  const href = (node.attrs['href'] as string) || '';
  const linkTextRaw = (node.attrs['linkText'] as string) || '';
  const displayText = linkTextRaw.trim() || href;
  if (!href) return false;

  const linkType = state.schema.marks.link;
  const paragraphType = state.schema.nodes.paragraph;
  if (!linkType || !paragraphType) return false;

  const mark = linkType.create({
    href,
    skipLinkPreview: true,
  });
  const textNode = state.schema.text(displayText || href, [mark]);
  const paragraph = paragraphType.create({}, [textNode]);

  const tr = state.tr.replaceWith(pos, pos + node.nodeSize, paragraph);
  editor.view.dispatch(tr);
  return true;
}
