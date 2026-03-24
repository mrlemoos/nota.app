import { Node, mergeAttributes } from '@tiptap/core';
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from '@tiptap/react';
import { useEffect, useRef, useState, type JSX } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type OgPreviewJson = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
};

type OgErrorJson = {
  error: string;
};

async function fetchOgPreviewClient(href: string): Promise<OgPreviewJson> {
  const res = await fetch(
    `/og-preview?url=${encodeURIComponent(href)}`,
    { credentials: 'same-origin' },
  );
  const data = (await res.json()) as OgPreviewJson | OgErrorJson;
  if (!res.ok) {
    const err = 'error' in data ? data.error : 'Request failed';
    throw new Error(err);
  }
  if ('error' in data) {
    throw new Error(data.error);
  }
  return data;
}

function LinkPreviewNodeView(props: NodeViewProps): JSX.Element {
  const href = (props.node.attrs['href'] as string) || '';
  const titleAttr = (props.node.attrs['title'] as string) || '';
  const descriptionAttr = (props.node.attrs['description'] as string) || '';
  const imageAttr = (props.node.attrs['image'] as string) || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const updateAttributesRef = useRef(props.updateAttributes);
  updateAttributesRef.current = props.updateAttributes;

  useEffect(() => {
    if (!href) return;
    let cancelled = false;
    setError(null);
    setLoading(true);
    void (async () => {
      try {
        const data = await fetchOgPreviewClient(href);
        if (cancelled) return;
        updateAttributesRef.current({
          title: data.title ?? '',
          description: data.description ?? '',
          image: data.image ?? '',
        });
      } catch (e) {
        if (!cancelled) {
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
  const hasMeta = Boolean(titleAttr || descriptionAttr || imageAttr);

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
        {imageAttr ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="relative shrink-0 border-b border-border/40 sm:w-36 sm:border-b-0 sm:border-r"
          >
            <img
              src={imageAttr}
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
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="text-muted-foreground"
                disabled={loading}
                onClick={() => setRefreshNonce((n) => n + 1)}
              >
                Refresh
              </Button>
            </div>
          </div>
          {descriptionAttr ? (
            <p className="line-clamp-3 text-xs text-muted-foreground">
              {descriptionAttr}
            </p>
          ) : null}
          {loading && !hasMeta ? (
            <p className="text-xs text-muted-foreground">Loading preview…</p>
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
