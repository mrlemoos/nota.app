import type { Editor } from '@tiptap/core';

/**
 * Paragraph whose trimmed content is a single hyperlink (no other text),
 * with optional leading/trailing whitespace outside the link.
 */
export function convertLinkOnlyParagraphs(editor: Editor): void {
  const { state } = editor;
  const linkType = state.schema.marks.link;
  const previewType = state.schema.nodes.linkPreview;
  if (!linkType || !previewType) return;

  const toReplace: { from: number; to: number; href: string }[] = [];

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

    for (let i = 0; i < lead; i++) {
      const $ = state.doc.resolve(paragraphStart + 1 + i);
      if (linkType.isInSet($.marks())) return true;
    }

    for (let i = text.length - trail; i < text.length; i++) {
      const $ = state.doc.resolve(paragraphStart + 1 + i);
      if (linkType.isInSet($.marks())) return true;
    }

    let href: string | null = null;
    for (let i = lead; i < text.length - trail; i++) {
      const $ = state.doc.resolve(paragraphStart + 1 + i);
      const m = linkType.isInSet($.marks());
      if (!m) return true;
      const h = (m.attrs['href'] as string) || '';
      if (!h) return true;
      if (href === null) href = h;
      else if (href !== h) return true;
    }

    if (!href) return true;

    toReplace.push({
      from: pos,
      to: pos + node.nodeSize,
      href,
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
        attrs: {
          href: r.href,
          title: '',
          description: '',
          image: '',
        },
      }),
    );
  }
  editor.view.dispatch(tr);
}
