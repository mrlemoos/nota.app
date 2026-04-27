import { Node, mergeAttributes } from '@tiptap/core';
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from '@tiptap/react';
import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { NotaButton } from '@nota.app/web-design/button';
import { NotaLoadingStatus } from '@nota.app/web-design/spinner';
import {
  NotaTooltip,
  NotaTooltipPopup,
  NotaTooltipPortal,
  NotaTooltipPositioner,
  NotaTooltipProvider,
  NotaTooltipTrigger,
} from '@nota.app/web-design/tooltip';
import { pdfPreviewSrc } from '../../lib/pdf-preview-url';
import { cn } from '../../lib/utils';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { getBrowserClient } from '../../lib/supabase/browser';
import { getValidNoteAttachmentSignedUrlCacheEntry } from '../../lib/note-attachment-signed-url-cache';
import {
  downloadBlobFromSignedUrl,
  getOrFetchNoteAttachmentSignedUrl,
} from '../../lib/pdf-attachment-client';
import {
  NOTE_PDFS_BUCKET,
  deleteNoteAttachment,
  updateNoteAttachmentFilename,
} from '../../models/note-attachments';
import type { NoteAttachment } from '~/types/database.types';

const PdfJsModalPreviewLazy = lazy(() =>
  import('../pdf-js-modal-preview').then((m) => ({
    default: m.PdfJsModalPreview,
  })),
);

export type NotePdfDocContextValue = {
  noteId: string;
  userId: string;
  attachmentsById: Map<string, NoteAttachment>;
  revalidate: () => void;
};

const NotePdfDocContext = createContext<NotePdfDocContextValue | null>(null);

const MAX_ATTACHMENT_FILENAME_LEN = 200;
const NOTE_PDF_THUMBNAIL_SCALE = 0.7;

export function useNotePdfDocContext() {
  return useContext(NotePdfDocContext);
}

export function NotePdfDocProvider({
  value,
  children,
}: {
  value: NotePdfDocContextValue;
  children: ReactNode;
}) {
  return (
    <NotePdfDocContext.Provider value={value}>
      {children}
    </NotePdfDocContext.Provider>
  );
}

export function NotePdfNodeView(props: NodeViewProps) {
  const ctx = useNotePdfDocContext();
  const previewDialogRef = useRef<HTMLDialogElement>(null);
  const thumbnailCanvasRef = useRef<HTMLCanvasElement>(null);
  const thumbnailRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renameMutexRef = useRef(false);
  const renameCancelRef = useRef(false);
  const skipRenameBlurRef = useRef(false);
  const updateAttributesRef = useRef(props.updateAttributes);
  updateAttributesRef.current = props.updateAttributes;

  const [preview, setPreview] = useState<{ filename: string; url: string } | null>(
    null,
  );
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [thumbnailPhase, setThumbnailPhase] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [pdfPreviewUseIframe, setPdfPreviewUseIframe] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [draftFilename, setDraftFilename] = useState('');

  const attachmentId = props.node.attrs.attachmentId as string | null;
  const filenameAttr = (props.node.attrs.filename as string) || 'PDF';

  const attachment: NoteAttachment | undefined = attachmentId
    ? ctx?.attachmentsById.get(attachmentId)
    : undefined;

  const displayName = attachment?.filename ?? filenameAttr;

  useEffect(() => {
    if (preview?.url) {
      setPdfPreviewUseIframe(false);
    }
  }, [preview?.url]);

  const clearThumbnailRefreshTimer = useCallback(() => {
    if (thumbnailRefreshTimerRef.current !== null) {
      clearTimeout(thumbnailRefreshTimerRef.current);
      thumbnailRefreshTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearThumbnailRefreshTimer();
    setThumbnailPhase('loading');

    const attachmentStoragePath = attachment?.storage_path;
    if (!attachmentId || !attachmentStoragePath) {
      setSignedUrl(null);
      return () => {
        clearThumbnailRefreshTimer();
      };
    }

    let cancelled = false;
    const entry = getValidNoteAttachmentSignedUrlCacheEntry(
      attachmentId,
      attachmentStoragePath,
    );

    if (entry) {
      setSignedUrl(entry.signedUrl);
    } else {
      setSignedUrl(null);
      void (async () => {
        const result = await getOrFetchNoteAttachmentSignedUrl(
          attachmentId,
          attachmentStoragePath,
        );

        if (cancelled) return;

        if (!result.ok) {
          setSignedUrl(null);
          setThumbnailPhase('error');
          return;
        }

        setSignedUrl(result.signedUrl);
      })();
    }

    if (entry) {
      const ms = Math.max(
        5_000,
        Math.floor((entry.expiresAtMs - Date.now()) * 0.85),
      );
      thumbnailRefreshTimerRef.current = setTimeout(() => {
        void (async () => {
          const result = await getOrFetchNoteAttachmentSignedUrl(
            attachmentId,
            attachmentStoragePath,
          );

          if (cancelled) return;

          if (!result.ok) {
            setThumbnailPhase('error');
            return;
          }

          setSignedUrl(result.signedUrl);
        })();
      }, ms);
    }

    return () => {
      cancelled = true;
      clearThumbnailRefreshTimer();
    };
  }, [attachment?.storage_path, attachmentId, clearThumbnailRefreshTimer]);

  useEffect(() => {
    const canvas = thumbnailCanvasRef.current;
    if (!canvas) return;

    let cancelled = false;

    if (!signedUrl) {
      const ctx = canvas.getContext('2d', { alpha: false });
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      setThumbnailPhase('loading');
      return;
    }

    void (async () => {
      setThumbnailPhase('loading');

      try {
        const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
        GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

        const res = await fetch(signedUrl);
        if (!res.ok) {
          throw new Error('fetch failed');
        }

        const buf = await res.arrayBuffer();
        if (cancelled) return;

        const pdf = await getDocument({ data: buf }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: NOTE_PDF_THUMBNAIL_SCALE });
        const ctx = canvas.getContext('2d', { alpha: false });

        if (!ctx) {
          throw new Error('no canvas context');
        }

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.className = 'block h-full w-full';
        canvas.setAttribute('aria-label', `${displayName} front page`);

        await page.render({ canvasContext: ctx, canvas, viewport }).promise;

        if (cancelled) return;
        setThumbnailPhase('ready');
      } catch {
        if (!cancelled) {
          setThumbnailPhase('error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [displayName, signedUrl]);

  const onPdfJsRenderFailed = useCallback(() => {
    setPdfPreviewUseIframe(true);
  }, []);

  useEffect(() => {
    if (renaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renaming]);

  const startRename = useCallback(() => {
    if (!attachment) return;
    setActionError(null);
    renameCancelRef.current = false;
    setDraftFilename(displayName);
    setRenaming(true);
  }, [attachment, displayName]);

  const cancelRename = useCallback(() => {
    renameCancelRef.current = true;
    skipRenameBlurRef.current = true;
    setRenaming(false);
  }, []);

  const endRenameWithoutBlurCommit = useCallback(() => {
    skipRenameBlurRef.current = true;
    setRenaming(false);
  }, []);

  const applyRename = useCallback(async () => {
    if (skipRenameBlurRef.current) {
      skipRenameBlurRef.current = false;
      return;
    }
    if (renameCancelRef.current) {
      renameCancelRef.current = false;
      return;
    }
    if (!attachment || !ctx) return;
    if (renameMutexRef.current) return;

    const next = draftFilename.trim();
    if (!next) {
      endRenameWithoutBlurCommit();
      return;
    }
    if (next.length > MAX_ATTACHMENT_FILENAME_LEN) {
      setActionError(`Name must be at most ${MAX_ATTACHMENT_FILENAME_LEN} characters.`);
      return;
    }
    if (next === displayName) {
      endRenameWithoutBlurCommit();
      return;
    }

    renameMutexRef.current = true;
    setActionError(null);
    try {
      const client = getBrowserClient();
      await updateNoteAttachmentFilename(client, attachment.id, next);
      updateAttributesRef.current({ filename: next });
      ctx.revalidate();
      skipRenameBlurRef.current = true;
      setRenaming(false);
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : 'Could not rename file',
      );
    } finally {
      renameMutexRef.current = false;
    }
  }, [
    attachment,
    ctx,
    draftFilename,
    displayName,
    endRenameWithoutBlurCommit,
  ]);

  const openPreview = useCallback(async () => {
    if (!attachment) return;
    setActionError(null);
    setPreviewLoading(true);
    setPreview(null);
    previewDialogRef.current?.showModal();

    try {
      const currentUrl = signedUrl;
      if (currentUrl) {
        setPreview({ filename: attachment.filename, url: currentUrl });
        return;
      }

      const result = await getOrFetchNoteAttachmentSignedUrl(
        attachment.id,
        attachment.storage_path,
      );

      if (!result.ok) {
        throw new Error(result.error);
      }

      setPreview({ filename: attachment.filename, url: result.signedUrl });
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : 'Could not open preview',
      );
      previewDialogRef.current?.close();
    } finally {
      setPreviewLoading(false);
    }
  }, [attachment, signedUrl]);

  const closePreview = useCallback(() => {
    previewDialogRef.current?.close();
    setPreview(null);
  }, []);

  useEffect(() => {
    const dlg = previewDialogRef.current;
    if (!dlg) return;
    const onClose = () => { setPreview(null); };
    dlg.addEventListener('close', onClose);
    return () => { dlg.removeEventListener('close', onClose); };
  }, []);

  const handleDownload = useCallback(async () => {
    if (!attachment) return;
    setActionError(null);
    try {
      const result = await getOrFetchNoteAttachmentSignedUrl(
        attachment.id,
        attachment.storage_path,
      );

      if (!result.ok) {
        throw new Error(result.error);
      }

      await downloadBlobFromSignedUrl(result.signedUrl, attachment.filename);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Download failed');
    }
  }, [attachment]);

  const handleRemove = useCallback(async () => {
    if (!attachment || !ctx) return;
    if (!window.confirm(`Remove “${attachment.filename}” from this note?`)) {
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
        'group note-pdf-block my-4 overflow-visible rounded-md border border-transparent bg-transparent p-3 transition-colors',
        'hover:border-border/60 hover:bg-muted/20 hover:shadow-sm',
        'focus-within:border-border/60 focus-within:bg-muted/20 focus-within:shadow-sm',
        props.selected &&
          'ring-2 ring-ring/40 ring-offset-2 ring-offset-background',
      )}
      data-drag-handle
    >
      <NotaTooltipProvider>
        <div className="flex flex-col gap-3">
          {missing ? (
            <div className="flex flex-wrap items-center gap-2">
              {renaming && attachment ? (
                <input
                  ref={renameInputRef}
                  type="text"
                  value={draftFilename}
                  onChange={(e) => { setDraftFilename(e.target.value); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void applyRename();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      cancelRename();
                    }
                  }}
                  onBlur={() => {
                    void applyRename();
                  }}
                  maxLength={MAX_ATTACHMENT_FILENAME_LEN}
                  className="min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  aria-label="PDF display name"
                />
              ) : (
                <NotaTooltip>
                  <NotaTooltipTrigger
                    render={
                      <span
                        className="min-w-0 flex-1 cursor-text truncate text-sm font-medium text-foreground"
                        onDoubleClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          startRename();
                        }}
                      >
                        {displayName}
                      </span>
                    }
                  />
                  <NotaTooltipPortal>
                    <NotaTooltipPositioner side="top" sideOffset={6}>
                      <NotaTooltipPopup>Double-click to rename</NotaTooltipPopup>
                    </NotaTooltipPositioner>
                  </NotaTooltipPortal>
                </NotaTooltip>
              )}
              <div className="flex shrink-0 items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  File no longer available
                </span>
                <NotaButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => { props.deleteNode(); }}
                >
                  Remove from note
                </NotaButton>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <button
                  type="button"
                  aria-label={`Open preview for ${displayName}`}
                  data-testid="note-pdf-stack"
                  onClick={() => void openPreview()}
                  className={cn(
                    'relative isolate block w-full shrink-0 overflow-visible rounded-2xl text-left outline-none transition-transform duration-300 ease-out transform-gpu',
                    'sm:w-[11rem]',
                    'hover:-translate-y-0.5 focus-visible:-translate-y-0.5',
                    'focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  )}
                >
                  <div className="pointer-events-none absolute inset-0" data-testid="note-pdf-stack-sheets">
                    <div
                      aria-hidden
                      className={cn(
                        'absolute inset-0 rounded-2xl border border-transparent bg-transparent shadow-none transition-[transform,border-color,background-color,box-shadow,opacity] duration-300 ease-out transform-gpu',
                        'translate-x-2 translate-y-2 rotate-[4deg] opacity-30',
                        'group-hover:border-border/60 group-hover:bg-background group-hover:shadow-md',
                        'group-focus-within:border-border/60 group-focus-within:bg-background group-focus-within:shadow-md',
                        'group-hover:translate-x-6 group-hover:translate-y-5 group-hover:rotate-[9deg]',
                        'group-focus-within:translate-x-6 group-focus-within:translate-y-5 group-focus-within:rotate-[9deg]',
                      )}
                    />
                    <div
                      aria-hidden
                      className={cn(
                        'absolute inset-0 rounded-2xl border border-transparent bg-transparent shadow-none transition-[transform,border-color,background-color,box-shadow,opacity] duration-300 ease-out transform-gpu',
                        'translate-x-1 translate-y-1 rotate-[2deg] opacity-45',
                        'group-hover:border-border/60 group-hover:bg-background group-hover:shadow-md',
                        'group-focus-within:border-border/60 group-focus-within:bg-background group-focus-within:shadow-md',
                        'group-hover:translate-x-4 group-hover:translate-y-3 group-hover:rotate-[6deg]',
                        'group-focus-within:translate-x-4 group-focus-within:translate-y-3 group-focus-within:rotate-[6deg]',
                      )}
                    />
                    <div
                      aria-hidden
                      className={cn(
                        'absolute inset-0 rounded-2xl border border-transparent bg-transparent shadow-none transition-[transform,border-color,background-color,box-shadow,opacity] duration-300 ease-out transform-gpu',
                        'translate-x-0 translate-y-0 rotate-0 opacity-70',
                        'group-hover:border-border/70 group-hover:bg-background group-hover:shadow-md',
                        'group-focus-within:border-border/70 group-focus-within:bg-background group-focus-within:shadow-md',
                        'group-hover:translate-x-2 group-hover:translate-y-1 group-hover:rotate-[3deg]',
                        'group-focus-within:translate-x-2 group-focus-within:translate-y-1 group-focus-within:rotate-[3deg]',
                      )}
                    />
                  </div>

                  <div className="relative z-10 overflow-hidden rounded-2xl border border-transparent bg-transparent shadow-none transition-[border-color,background-color,box-shadow] duration-300 ease-out group-hover:border-border/80 group-hover:bg-background group-hover:shadow-lg group-focus-within:border-border/80 group-focus-within:bg-background group-focus-within:shadow-lg">
                    <div className="relative aspect-[8.5/11] bg-transparent p-2">
                      <div
                        data-testid="note-pdf-thumbnail"
                        className="absolute inset-0 flex items-stretch justify-stretch p-2"
                      >
                        <canvas
                          ref={thumbnailCanvasRef}
                          aria-hidden
                          className={cn(
                            'block h-full w-full rounded-xl bg-background transition-opacity duration-200',
                            thumbnailPhase === 'ready' ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        {thumbnailPhase === 'ready' ? null : (
                          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 text-xs text-muted-foreground">
                            {thumbnailPhase === 'error'
                              ? 'Preview unavailable'
                              : 'Loading preview…'}
                          </div>
                        )}
                      </div>
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-background/80 to-transparent" />
                    </div>
                  </div>
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {renaming && attachment ? (
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={draftFilename}
                        onChange={(e) => { setDraftFilename(e.target.value); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void applyRename();
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelRename();
                          }
                        }}
                        onBlur={() => {
                          void applyRename();
                        }}
                        maxLength={MAX_ATTACHMENT_FILENAME_LEN}
                        className="min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                        aria-label="PDF display name"
                      />
                    ) : (
                      <NotaTooltip>
                        <NotaTooltipTrigger
                          render={
                            <span
                              className="min-w-0 flex-1 cursor-text truncate text-sm font-medium text-foreground"
                              onDoubleClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                startRename();
                              }}
                            >
                              {displayName}
                            </span>
                          }
                        />
                        <NotaTooltipPortal>
                          <NotaTooltipPositioner side="top" sideOffset={6}>
                            <NotaTooltipPopup>Double-click to rename</NotaTooltipPopup>
                          </NotaTooltipPositioner>
                        </NotaTooltipPortal>
                      </NotaTooltip>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <NotaButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => void openPreview()}
                    >
                      Preview
                    </NotaButton>
                    <NotaButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
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
                          <NotaTooltipPopup>Remove PDF</NotaTooltipPopup>
                        </NotaTooltipPositioner>
                      </NotaTooltipPortal>
                    </NotaTooltip>
                  </div>
                </div>
              </div>
            </>
          )}

        {actionError ? (
          <p className="mt-2 text-xs text-destructive" role="alert">
            {actionError}
          </p>
        ) : null}

        {typeof document !== 'undefined'
          ? createPortal(
              <>
                {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- native dialog backdrop click */}
                <dialog
                  ref={previewDialogRef}
                  className="fixed left-1/2 top-1/2 z-50 w-[min(100vw-2rem,56rem)] max-h-[min(100vh-2rem,90vh)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-0 shadow-lg [&::backdrop]:bg-black/50"
                  onClick={(ev) => {
                    if (ev.target === previewDialogRef.current) {
                      closePreview();
                    }
                  }}
                >
                <div className="flex max-h-[min(100vh-2rem,90vh)] flex-col">
                  <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                    <h4 className="min-w-0 truncate text-sm font-medium text-foreground">
                      {preview?.filename ?? 'Preview'}
                    </h4>
                    <NotaButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={closePreview}
                    >
                      Close
                    </NotaButton>
                  </div>
                  <div className="min-h-[50vh] flex-1 bg-muted/30">
                    {previewLoading ? (
                      <div className="flex h-[50vh] items-center justify-center text-sm text-muted-foreground">
                        <NotaLoadingStatus label="Loading preview…" />
                      </div>
                    ) : preview ? (
                      pdfPreviewUseIframe ? (
                        <iframe
                          title={preview.filename}
                          src={pdfPreviewSrc(preview.url)}
                          className="h-[min(80vh,720px)] w-full border-0 bg-background"
                        />
                      ) : (
                        <Suspense
                          fallback={
                            <div className="flex h-[min(80vh,720px)] w-full items-center justify-center text-sm text-muted-foreground">
                              <NotaLoadingStatus label="Loading preview…" />
                            </div>
                          }
                        >
                          <PdfJsModalPreviewLazy
                            url={preview.url}
                            documentTitle={preview.filename}
                            onRenderFailed={onPdfJsRenderFailed}
                            className="bg-muted/30"
                          />
                        </Suspense>
                      )
                    ) : null}
                  </div>
                </div>
                </dialog>
              </>,
              document.body,
            )
          : null}
        </div>
      </NotaTooltipProvider>
    </NodeViewWrapper>
  );
}

export const NotePdf = Node.create({
  name: 'notePdf',
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
    return [
      {
        tag: 'div[data-note-pdf]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        { 'data-note-pdf': '' },
        HTMLAttributes,
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(NotePdfNodeView);
  },
});
