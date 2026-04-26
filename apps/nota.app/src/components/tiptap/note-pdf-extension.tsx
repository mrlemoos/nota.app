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
import { NotaLoadingStatus } from '@/components/ui/spinner';
import {
  NotaTooltip,
  NotaTooltipPopup,
  NotaTooltipPortal,
  NotaTooltipPositioner,
  NotaTooltipProvider,
  NotaTooltipTrigger,
} from '@nota.app/web-design/tooltip';
import { pdfPreviewSrc } from '@/lib/pdf-preview-url';
import { cn } from '@/lib/utils';
import { getBrowserClient } from '../../lib/supabase/browser';
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
  import('@/components/pdf-js-modal-preview').then((m) => ({
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

function NotePdfNodeView(props: NodeViewProps) {
  const ctx = useNotePdfDocContext();
  const previewDialogRef = useRef<HTMLDialogElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renameMutexRef = useRef(false);
  const renameCancelRef = useRef(false);
  const skipRenameBlurRef = useRef(false);
  const updateAttributesRef = useRef(props.updateAttributes);
  updateAttributesRef.current = props.updateAttributes;

  const [preview, setPreview] = useState<{ filename: string; url: string } | null>(
    null,
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
  }, [attachment]);

  const closePreview = useCallback(() => {
    previewDialogRef.current?.close();
    setPreview(null);
  }, []);

  useEffect(() => {
    const dlg = previewDialogRef.current;
    if (!dlg) return;
    const onClose = () => setPreview(null);
    dlg.addEventListener('close', onClose);
    return () => dlg.removeEventListener('close', onClose);
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
        'note-pdf-block my-4 rounded-md border border-border/60 bg-muted/20 p-3',
        props.selected &&
          'ring-2 ring-ring/40 ring-offset-2 ring-offset-background',
      )}
      data-drag-handle
    >
      <NotaTooltipProvider>
        <div className="flex flex-wrap items-center gap-2">
          {renaming && attachment ? (
            <input
              ref={renameInputRef}
              type="text"
              value={draftFilename}
              onChange={(e) => setDraftFilename(e.target.value)}
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
          {missing ? (
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
          ) : (
            <div className="flex shrink-0 flex-wrap items-center gap-1">
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
          )}
        </div>

        {actionError ? (
          <p className="mt-2 text-xs text-destructive" role="alert">
            {actionError}
          </p>
        ) : null}

        {typeof document !== 'undefined'
          ? createPortal(
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
              </dialog>,
              document.body,
            )
          : null}
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
