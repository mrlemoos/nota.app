import { Menu } from '@base-ui/react/menu';
import { Node, mergeAttributes } from '@tiptap/core';
import {
  AlignHorizontalCenterIcon,
  AlignHorizontalJustifyEndIcon,
  AlignHorizontalJustifyStartIcon,
  Tick01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from '@tiptap/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  NotaButton,
  notaButtonVariants,
} from '@nota.app/web-design/button';
import { NotaLoadingStatus } from '@/components/ui/spinner';
import {
  NotaTooltip,
  NotaTooltipPopup,
  NotaTooltipPortal,
  NotaTooltipPositioner,
  NotaTooltipProvider,
  NotaTooltipTrigger,
} from '@nota.app/web-design/tooltip';
import { cn } from '@/lib/utils';
import { getBrowserClient } from '../../lib/supabase/browser';
import { getValidNoteAttachmentSignedUrlCacheEntry } from '../../lib/note-attachment-signed-url-cache';
import {
  ATTACHMENT_SIGNED_URL_TTL_SEC,
  downloadBlobFromSignedUrl,
  getOrFetchNoteAttachmentSignedUrl,
} from '../../lib/pdf-attachment-client';
import {
  NOTE_PDFS_BUCKET,
  deleteNoteAttachment,
} from '../../models/note-attachments';
import { useNotePdfDocContext } from './note-pdf-extension';

export type NoteImageAlign = 'left' | 'center' | 'right';

function isNoteImageAlign(v: unknown): v is NoteImageAlign {
  return (
    v === 'left' ||
    v === 'center' ||
    v === 'right'
  );
}

function noteImageAlignFromAttrs(raw: unknown): NoteImageAlign {
  return isNoteImageAlign(raw) ? raw : 'left';
}

const ALIGN_MENU_ITEM_CLASS = cn(
  'flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground outline-none',
  'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
);

const ALIGN_TRIGGER_ICON: Record<
  NoteImageAlign,
  typeof AlignHorizontalJustifyStartIcon
> = {
  left: AlignHorizontalJustifyStartIcon,
  center: AlignHorizontalCenterIcon,
  right: AlignHorizontalJustifyEndIcon,
};

export function NoteImageNodeView(props: NodeViewProps) {
  const ctx = useNotePdfDocContext();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const attachmentId = props.node.attrs.attachmentId as string | null;
  const filenameAttr = (props.node.attrs.filename as string) || 'Image';
  const align = noteImageAlignFromAttrs(props.node.attrs.align);

  const alignRowClass = useMemo(
    () =>
      cn(
        'flex w-full',
        align === 'left' && 'justify-start',
        align === 'center' && 'justify-center',
        align === 'right' && 'justify-end',
      ),
    [align],
  );

  const imageObjectClass =
    align === 'center'
      ? 'object-center'
      : align === 'right'
        ? 'object-right'
        : 'object-left';

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
    setLoadError(null);

    let cancelled = false;

    if (!attachmentId || !storagePath) {
      setSignedUrl(null);
      return () => {
        cancelled = true;
        clearRefreshTimer();
      };
    }

    const imageAttachmentId = attachmentId;
    const imageStoragePath = storagePath;

    const entry = getValidNoteAttachmentSignedUrlCacheEntry(
      imageAttachmentId,
      imageStoragePath,
    );

    if (entry) {
      setSignedUrl(entry.signedUrl);
      setLoadError(null);
    } else {
      setSignedUrl(null);
    }

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
      const result = await getOrFetchNoteAttachmentSignedUrl(
        imageAttachmentId,
        imageStoragePath,
      );

      if (cancelled) return;

      if (!result.ok) {
        setLoadError(result.error ?? 'Could not load image');
        setSignedUrl(null);
        return;
      }

      setLoadError(null);
      setSignedUrl(result.signedUrl);
      scheduleNextRefresh();
    }

    if (entry) {
      scheduleNextRefresh();
    } else {
      void fetchUrl();
    }

    return () => {
      cancelled = true;
      clearRefreshTimer();
    };
  }, [attachmentId, storagePath, clearRefreshTimer]);

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
      className="note-image-block my-4"
      data-drag-handle
    >
      <NotaTooltipProvider>
        <div className="flex flex-col gap-2">
          {missing ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {displayName}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  File no longer available
                </span>
                <NotaButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => props.deleteNode()}
                >
                  Remove from note
                </NotaButton>
              </div>
            </div>
          ) : (
            <div
              className="group relative w-full"
              data-testid="note-image-hover-group"
            >
              <div
                className={cn(
                  'absolute left-0 right-0 top-0 z-10 flex min-w-0 flex-wrap items-center gap-2 px-1 py-0.5',
                  'bg-gradient-to-b from-background/90 to-transparent',
                  'opacity-0 transition-opacity',
                  'pointer-events-none',
                  'group-hover:pointer-events-auto group-hover:opacity-100',
                  'group-focus-within:pointer-events-auto group-focus-within:opacity-100',
                )}
                data-testid="note-image-toolbar"
              >
                <span className="min-w-0 max-w-full flex-1 truncate text-sm font-medium text-foreground">
                  {displayName}
                </span>
                <div className="flex shrink-0 flex-wrap items-center gap-1">
                  <Menu.Root modal={false}>
                    <Menu.Trigger
                      type="button"
                      aria-label="Image alignment"
                      className={cn(
                        notaButtonVariants({
                          variant: 'ghost',
                          size: 'icon',
                        }),
                        'h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <HugeiconsIcon
                        icon={ALIGN_TRIGGER_ICON[align]}
                        size={16}
                        className="shrink-0"
                      />
                    </Menu.Trigger>
                    <Menu.Portal>
                      <Menu.Positioner
                        side="bottom"
                        align="start"
                        sideOffset={4}
                      >
                        <Menu.Popup
                          className={cn(
                            'z-50 min-w-[10.5rem] overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-md',
                            'origin-[var(--transform-origin)] transition-[transform,scale,opacity]',
                            'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
                            'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
                          )}
                        >
                          <Menu.Viewport>
                            <Menu.RadioGroup
                              value={align}
                              onValueChange={(value) => {
                                if (!isNoteImageAlign(value)) return;
                                props.updateAttributes({ align: value });
                              }}
                            >
                              <Menu.RadioItem
                                value="left"
                                closeOnClick
                                className={ALIGN_MENU_ITEM_CLASS}
                              >
                                <HugeiconsIcon
                                  icon={AlignHorizontalJustifyStartIcon}
                                  size={16}
                                  className="shrink-0 text-muted-foreground"
                                />
                                <span className="min-w-0 flex-1">Left</span>
                                <Menu.RadioItemIndicator className="flex size-4 shrink-0 items-center justify-center">
                                  <HugeiconsIcon icon={Tick01Icon} size={14} />
                                </Menu.RadioItemIndicator>
                              </Menu.RadioItem>
                              <Menu.RadioItem
                                value="center"
                                closeOnClick
                                className={ALIGN_MENU_ITEM_CLASS}
                              >
                                <HugeiconsIcon
                                  icon={AlignHorizontalCenterIcon}
                                  size={16}
                                  className="shrink-0 text-muted-foreground"
                                />
                                <span className="min-w-0 flex-1">Centre</span>
                                <Menu.RadioItemIndicator className="flex size-4 shrink-0 items-center justify-center">
                                  <HugeiconsIcon icon={Tick01Icon} size={14} />
                                </Menu.RadioItemIndicator>
                              </Menu.RadioItem>
                              <Menu.RadioItem
                                value="right"
                                closeOnClick
                                className={ALIGN_MENU_ITEM_CLASS}
                              >
                                <HugeiconsIcon
                                  icon={AlignHorizontalJustifyEndIcon}
                                  size={16}
                                  className="shrink-0 text-muted-foreground"
                                />
                                <span className="min-w-0 flex-1">Right</span>
                                <Menu.RadioItemIndicator className="flex size-4 shrink-0 items-center justify-center">
                                  <HugeiconsIcon icon={Tick01Icon} size={14} />
                                </Menu.RadioItemIndicator>
                              </Menu.RadioItem>
                            </Menu.RadioGroup>
                          </Menu.Viewport>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </Menu.Root>
                  <NotaButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    disabled={!signedUrl}
                    onClick={() => handleOpenTab()}
                  >
                    Open
                  </NotaButton>
                  <NotaButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    disabled={!signedUrl}
                    onClick={() => void handleDownload()}
                  >
                    Download
                  </NotaButton>
                  <NotaTooltip>
                    <NotaTooltipTrigger
                      render={
                        <NotaButton
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
                        </NotaButton>
                      }
                    />
                    <NotaTooltipPortal>
                      <NotaTooltipPositioner side="top" sideOffset={6}>
                        <NotaTooltipPopup>Remove image</NotaTooltipPopup>
                      </NotaTooltipPositioner>
                    </NotaTooltipPortal>
                  </NotaTooltip>
                </div>
              </div>

              <div
                className={alignRowClass}
                data-testid="note-image-align-row"
              >
                {loadError ? (
                  <p className="p-1 text-sm text-destructive" role="alert">
                    {loadError}
                  </p>
                ) : signedUrl ? (
                  <img
                    src={signedUrl}
                    alt={displayName}
                    className={cn(
                      'max-h-[min(70vh,32rem)] w-auto max-w-full border-0 object-contain ring-0 outline-none',
                      imageObjectClass,
                    )}
                    data-testid="note-image-asset"
                    loading="lazy"
                    onError={() => {
                      setLoadError('Could not display image');
                    }}
                  />
                ) : (
                  <div className="flex min-h-[8rem] w-full items-center justify-center text-sm text-muted-foreground">
                    <NotaLoadingStatus label="Loading image…" spinnerSize="sm" />
                  </div>
                )}
              </div>
            </div>
          )}

          {actionError ? (
            <p className="text-xs text-destructive" role="alert">
              {actionError}
            </p>
          ) : null}
        </div>
      </NotaTooltipProvider>
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
      align: {
        default: 'left',
        parseHTML: (el) => {
          const v = el.getAttribute('data-align');
          return isNoteImageAlign(v) ? v : 'left';
        },
        renderHTML: (attrs) => {
          const a = noteImageAlignFromAttrs(attrs.align);
          return { 'data-align': a };
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
