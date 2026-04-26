import { Node, mergeAttributes } from '@tiptap/core';
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from '@tiptap/react';
import { useEffect, useRef, useState, type JSX } from 'react';
import { NotaButton } from '@nota.app/web-design/button';
import { NotaSpinner } from '@nota.app/web-design/spinner';
import { cn } from '@/lib/utils';
import { fetchOgPreviewForEditor } from '@/lib/og-preview-client';
import { safeOgImageSrcForPreview } from '@/lib/og-image-url';
import { revertLinkPreviewToParagraph } from './link-preview-scan';

function linkPreviewHasPersistedMeta(node: {
  attrs: Record<string, unknown>;
}): boolean {
  return Boolean(
    String(node.attrs['title'] ?? '').trim() ||
      String(node.attrs['description'] ?? '').trim() ||
      String(node.attrs['image'] ?? '').trim(),
  );
}

function LinkPreviewNodeView(props: NodeViewProps): JSX.Element {
  const href = (props.node.attrs['href'] as string) || '';
  const linkTextAttr = (props.node.attrs['linkText'] as string) || '';
  const titleAttr = (props.node.attrs['title'] as string) || '';
  const descriptionAttr = (props.node.attrs['description'] as string) || '';
  const imageAttr = (props.node.attrs['image'] as string) || '';
  const safeImageSrc = safeOgImageSrcForPreview(imageAttr);

  const hasMeta = Boolean(titleAttr || descriptionAttr || imageAttr);
  const [loading, setLoading] = useState(() => Boolean(href) && !hasMeta);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const updateAttributesRef = useRef(props.updateAttributes);
  updateAttributesRef.current = props.updateAttributes;
  const editorRef = useRef(props.editor);
  editorRef.current = props.editor;
  const getPosRef = useRef(props.getPos);
  getPosRef.current = props.getPos;

  useEffect(() => {
    if (!href) return;
    let cancelled = false;
    setError(null);
    setLoading(true);
    void (async () => {
      try {
        const data = await fetchOgPreviewForEditor(href);
        if (cancelled) return;
        const title = (data.title ?? '').trim();
        const desc = (data.description ?? '').trim();
        const image = (data.image ?? '').trim();
        const pos = getPosRef.current();
        if (typeof pos !== 'number') return;
        const current = editorRef.current.state.doc.nodeAt(pos);
        if (!current || current.type.name !== 'linkPreview') return;

        if (!title && !desc && !image) {
          if (!linkPreviewHasPersistedMeta(current)) {
            revertLinkPreviewToParagraph(editorRef.current, getPosRef.current);
          }
          return;
        }
        updateAttributesRef.current({
          title: data.title ?? '',
          description: data.description ?? '',
          image: data.image ?? '',
        });
      } catch (e) {
        if (cancelled) return;
        const pos = getPosRef.current();
        if (typeof pos !== 'number') return;
        const current = editorRef.current.state.doc.nodeAt(pos);
        if (!current || current.type.name !== 'linkPreview') return;
        if (!linkPreviewHasPersistedMeta(current)) {
          revertLinkPreviewToParagraph(editorRef.current, getPosRef.current);
        } else {
          setError(e instanceof Error ? e.message : 'Preview failed');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [href, refreshNonce]);

  const displayTitle = titleAttr || href;
  const displayLinkLabel = linkTextAttr.trim() || href;

  if (loading && !hasMeta) {
    return (
      <NodeViewWrapper
        as="div"
        className={cn(
          'link-preview-loading my-3 flex min-w-0 items-center gap-2',
          props.selected &&
            'rounded-sm ring-2 ring-ring/40 ring-offset-2 ring-offset-background',
        )}
        data-drag-handle
        aria-busy="true"
        aria-label="Loading link preview"
      >
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="tiptap-link min-w-0 flex-1 break-words text-base"
        >
          {displayLinkLabel}
        </a>
        <span
          className="inline-flex size-4 shrink-0 items-center justify-center"
          aria-hidden
        >
          <NotaSpinner size="sm" />
        </span>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      as="div"
      className={cn(
        'link-preview-block my-4 overflow-hidden rounded-md border border-border/60 bg-muted/20',
        props.selected &&
          'ring-2 ring-ring/40 ring-offset-2 ring-offset-background',
      )}
      data-drag-handle
    >
      <div className="flex flex-col gap-0 sm:flex-row">
        {safeImageSrc ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="relative shrink-0 border-b border-border/40 sm:w-36 sm:border-b-0 sm:border-r"
          >
            <img
              src={safeImageSrc}
              alt=""
              className="h-32 w-full object-cover sm:h-full sm:min-h-[7rem]"
              loading="lazy"
            />
          </a>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-1 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="tiptap-link min-w-0 flex-1 break-words text-sm font-medium text-foreground"
            >
              {displayTitle}
            </a>
            <div className="flex shrink-0 gap-1">
              <NotaButton
                type="button"
                variant="ghost"
                size="xs"
                className="text-muted-foreground"
                disabled={loading}
                onClick={() => setRefreshNonce((n) => n + 1)}
              >
                Refresh
              </NotaButton>
            </div>
          </div>
          {descriptionAttr ? (
            <p className="line-clamp-3 text-xs text-muted-foreground">
              {descriptionAttr}
            </p>
          ) : null}
          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export const LinkPreview = Node.create({
  name: 'linkPreview',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      href: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-href') ?? '',
        renderHTML: (attrs) =>
          attrs.href ? { 'data-href': attrs.href } : {},
      },
      linkText: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-link-text') ?? '',
        renderHTML: (attrs) =>
          attrs.linkText ? { 'data-link-text': attrs.linkText } : {},
      },
      title: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-title') ?? '',
        renderHTML: (attrs) =>
          attrs.title ? { 'data-title': attrs.title } : {},
      },
      description: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-description') ?? '',
        renderHTML: (attrs) =>
          attrs.description ? { 'data-description': attrs.description } : {},
      },
      image: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-image') ?? '',
        renderHTML: (attrs) =>
          attrs.image ? { 'data-image': attrs.image } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-link-preview]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes({ 'data-link-preview': '' }, HTMLAttributes),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LinkPreviewNodeView);
  },
});
