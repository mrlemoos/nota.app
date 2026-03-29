import { Node, mergeAttributes } from '@tiptap/core';
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from '@tiptap/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SimpleTooltip, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getBrowserClient } from '../../lib/supabase/browser';
import {
  ATTACHMENT_SIGNED_URL_TTL_SEC,
  downloadBlobFromSignedUrl,
} from '../../lib/pdf-attachment-client';
import {
  NOTE_PDFS_BUCKET,
  deleteNoteAttachment,
} from '../../models/note-attachments';
import { useNotePdfDocContext } from './note-pdf-extension';

function NoteImageNodeView(props: NodeViewProps) {
  const ctx = useNotePdfDocContext();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const attachmentId = props.node.attrs.attachmentId as string | null;
  const filenameAttr = (props.node.attrs.filename as string) || 'Image';

  const attachment = attachmentId
    ? ctx?.attachmentsById.get(attachmentId)
    : undefined;

  /** Stable for effect deps: loader revalidation replaces row objects with the same path. */
  const storagePath = attachment?.storage_path ?? null;

  const displayName = attachment?.filename ?? filenameAttr;

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearRefreshTimer();
    setSignedUrl(null);
    setLoadError(null);

    if (!storagePath) {
      return;
    }

    const signedStoragePath = storagePath;
    let cancelled = false;

    const scheduleNextRefresh = () => {
      clearRefreshTimer();
      const ms = Math.max(
        5_000,
        Math.floor(ATTACHMENT_SIGNED_URL_TTL_SEC * 0.85 * 1000),
      );
      refreshTimerRef.current = setTimeout(() => {
        void fetchUrl();
      }, ms);
    };

    async function fetchUrl() {
      const client = getBrowserClient();
      const { data, error } = await client.storage
        .from(NOTE_PDFS_BUCKET)
        .createSignedUrl(
          signedStoragePath,
          ATTACHMENT_SIGNED_URL_TTL_SEC,
        );

      if (cancelled) return;

      if (error || !data?.signedUrl) {
        setLoadError(error?.message ?? 'Could not load image');
        setSignedUrl(null);
        return;
      }

      setLoadError(null);
      setSignedUrl(data.signedUrl);
      scheduleNextRefresh();
    }

    void fetchUrl();

    return () => {
      cancelled = true;
      clearRefreshTimer();
    };
  }, [storagePath, clearRefreshTimer]);

  const handleOpenTab = useCallback(() => {
    if (!signedUrl) return;
    window.open(signedUrl, '_blank', 'noopener,noreferrer');
  }, [signedUrl]);

  const handleDownload = useCallback(async () => {
    if (!attachment || !signedUrl) return;
    setActionError(null);
    try {
      await downloadBlobFromSignedUrl(signedUrl, attachment.filename);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Download failed');
    }
  }, [attachment, signedUrl]);

  const handleRemove = useCallback(async () => {
    if (!attachment || !ctx) return;
    if (!confirm(`Remove “${attachment.filename}” from this note?`)) {
      return;
    }

    setActionError(null);
    const client = getBrowserClient();

    try {
      const { error: rmErr } = await client.storage
        .from(NOTE_PDFS_BUCKET)
        .remove([attachment.storage_path]);

      if (rmErr) {
        throw new Error(rmErr.message);
      }

      await deleteNoteAttachment(client, attachment.id);
      props.deleteNode();
      ctx.revalidate();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : 'Could not remove file',
      );
    }
  }, [attachment, ctx, props]);

  const missing = !attachment;

  return (
    <NodeViewWrapper
      as="div"
      className={cn(
        'note-image-block my-4 overflow-hidden rounded-md border border-border/60 bg-muted/20',
        props.selected &&
          'ring-2 ring-ring/40 ring-offset-2 ring-offset-background',
      )}
      data-drag-handle
    >
      <TooltipProvider>
        <div className="flex flex-col gap-2 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {displayName}
            </span>
            {missing ? (
              <div className="flex shrink-0 items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  File no longer available
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => props.deleteNode()}
                >
                  Remove from note
                </Button>
              </div>
            ) : (
              <div className="flex shrink-0 flex-wrap items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  disabled={!signedUrl}
                  onClick={() => handleOpenTab()}
                >
                  Open
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  disabled={!signedUrl}
                  onClick={() => void handleDownload()}
                >
                  Download
                </Button>
                <SimpleTooltip label="Remove image" side="top">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${displayName}`}
                    onClick={() => void handleRemove()}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-4 w-4"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                  </Button>
                </SimpleTooltip>
              </div>
            )}
          </div>

          {!missing ? (
            <div className="overflow-hidden rounded-md border border-border/40 bg-background/50">
              {loadError ? (
                <p className="p-4 text-sm text-destructive" role="alert">
                  {loadError}
                </p>
              ) : signedUrl ? (
                <img
                  src={signedUrl}
                  alt={displayName}
                  className="max-h-[min(70vh,32rem)] w-full object-contain"
                  loading="lazy"
                  onError={() => {
                    setLoadError('Could not display image');
                  }}
                />
              ) : (
                <div className="flex min-h-[8rem] items-center justify-center text-sm text-muted-foreground">
                  Loading image…
                </div>
              )}
            </div>
          ) : null}

          {actionError ? (
            <p className="text-xs text-destructive" role="alert">
              {actionError}
            </p>
          ) : null}
        </div>
      </TooltipProvider>
    </NodeViewWrapper>
  );
}

export const NoteImage = Node.create({
  name: 'noteImage',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      attachmentId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-attachment-id'),
        renderHTML: (attrs) => {
          if (!attrs.attachmentId) {
            return {};
          }
          return { 'data-attachment-id': attrs.attachmentId };
        },
      },
      filename: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-filename') ?? '',
        renderHTML: (attrs) => {
          if (!attrs.filename) {
            return {};
          }
          return { 'data-filename': attrs.filename };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-note-image]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes({ 'data-note-image': '' }, HTMLAttributes),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(NoteImageNodeView);
  },
});
