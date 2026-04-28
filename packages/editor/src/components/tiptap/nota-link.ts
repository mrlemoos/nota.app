import Link from '@tiptap/extension-link';

/**
 * Link mark with `skipLinkPreview`: when true, link-only paragraphs are not
 * promoted to `linkPreview` (used after OG preview fails and we revert).
 */
export const NotaLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      skipLinkPreview: {
        default: false,
        parseHTML: (element) =>
          element.getAttribute('data-skip-link-preview') === 'true',
        renderHTML: (attributes) => {
          if (!attributes.skipLinkPreview) {
            return {};
          }
          return { 'data-skip-link-preview': 'true' };
        },
      },
    };
  },
});
