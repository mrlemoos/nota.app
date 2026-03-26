import type { Editor } from '@tiptap/core';
import { Node } from '@tiptap/pm/model';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { NotaCodeBlock } from './tiptap/nota-code-block';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type JSX,
} from 'react';
import { useRevalidator } from 'react-router';
import { Button } from '@/components/ui/button';
import { LinkPreview } from './tiptap/link-preview-extension';
import { NotaLink } from './tiptap/nota-link';
import { convertLinkOnlyParagraphs } from './tiptap/link-preview-scan';
import {
  NotePdf,
  NotePdfDocProvider,
} from './tiptap/note-pdf-extension';
import { NoteImage } from './tiptap/note-image-extension';
import {
  classifyNoteAttachmentFile,
  uploadNoteAttachmentFile,
} from '../lib/pdf-attachment-client';
import type { NoteAttachment } from '~/types/database.types';
import { useRegisterNoteEditorMermaidInserter } from '../context/note-editor-commands';

function isDocContentEqual(editor: Editor, content: unknown): boolean {
  if (content === null || content === undefined) {
    return false;
  }
  if (typeof content !== 'object') {
    return false;
  }
  try {
    const parsed = Node.fromJSON(editor.schema, content as Record<string, unknown>);
    return editor.state.doc.eq(parsed);
  } catch {
    return false;
  }
}

interface TipTapEditorProps {
  content: unknown;
  onUpdate: (content: unknown) => void;
  placeholder?: string;
  noteId: string;
  userId: string;
  attachments: NoteAttachment[];
}

export function TipTapEditor({
  content,
  onUpdate,
  placeholder = 'Start writing...',
  noteId,
  userId,
  attachments,
}: TipTapEditorProps): JSX.Element {
  const canInsertAttachments = Boolean(userId && noteId);
  const canInsertAttachmentsRef = useRef(false);
  const uploadingRef = useRef(false);
  const processFilesRef = useRef<
    (files: FileList | File[] | null) => Promise<void>
  >(async () => {});

  const [isMounted, setIsMounted] = useState(false);
  const { revalidate } = useRevalidator();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<
    NoteAttachment[]
  >([]);
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const prevNoteIdRef = useRef<string | undefined>(undefined);

  canInsertAttachmentsRef.current = canInsertAttachments;
  uploadingRef.current = uploading;

  useEffect(() => {
    setPendingAttachments((prev) =>
      prev.filter((p) => !attachments.some((a) => a.id === p.id)),
    );
  }, [attachments]);

  const attachmentsById = useMemo(() => {
    const m = new Map<string, NoteAttachment>();
    for (const a of attachments) {
      m.set(a.id, a);
    }
    for (const a of pendingAttachments) {
      m.set(a.id, a);
    }
    return m;
  }, [attachments, pendingAttachments]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      NotaCodeBlock,
      NotaLink.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          class: 'tiptap-link',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      LinkPreview,
      NotePdf,
      NoteImage,
    ],
    content: content || { type: 'doc', content: [{ type: 'paragraph' }] },
    onUpdate: ({ editor: ed }) => {
      onUpdate(ed.getJSON());
    },
    editorProps: {
      handleDOMEvents: {
        dragover: (_view, event) => {
          if (
            !canInsertAttachmentsRef.current ||
            uploadingRef.current ||
            !event.dataTransfer.types.includes('Files')
          ) {
            return false;
          }
          event.preventDefault();
          setIsFileDragOver(true);
          return false;
        },
        dragleave: (_view, event) => {
          const related = event.relatedTarget as Node | null;
          if (related && _view.dom.contains(related)) {
            return false;
          }
          setIsFileDragOver(false);
          return false;
        },
        drop: (_view, event) => {
          setIsFileDragOver(false);
          if (
            !canInsertAttachmentsRef.current ||
            uploadingRef.current ||
            !event.dataTransfer.types.includes('Files')
          ) {
            return false;
          }
          const { files } = event.dataTransfer;
          if (!files?.length) {
            return false;
          }
          event.preventDefault();
          void processFilesRef.current(files);
          return true;
        },
      },
    },
  });

  useRegisterNoteEditorMermaidInserter(editor);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!editor || !content) return;
    if (noteId !== prevNoteIdRef.current) {
      prevNoteIdRef.current = noteId;
      if (!isDocContentEqual(editor, content)) {
        editor.commands.setContent(content, false);
      }
    }
  }, [editor, content, noteId]);

  useEffect(() => {
    if (!editor) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => {
        convertLinkOnlyParagraphs(editor);
      }, 500);
    };
    editor.on('update', schedule);
    return () => {
      editor.off('update', schedule);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [editor]);

  const handlePickFile = useCallback(() => {
    setUploadError(null);
    fileInputRef.current?.click();
  }, []);

  const insertAttachmentNode = useCallback(
    (record: NoteAttachment) => {
      if (!editor) return;
      const isPdf = record.content_type === 'application/pdf';
      editor
        .chain()
        .focus()
        .insertContent({
          type: isPdf ? 'notePdf' : 'noteImage',
          attrs: {
            attachmentId: record.id,
            filename: record.filename,
          },
        })
        .run();
    },
    [editor],
  );

  const processFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files || !editor) return;
      const list = Array.from(files);
      if (list.length === 0) return;

      setUploadError(null);
      setUploading(true);
      try {
        for (const file of list) {
          if (!classifyNoteAttachmentFile(file)) {
            setUploadError(
              'Unsupported file type. Use a PDF or JPEG, PNG, GIF, or WebP image.',
            );
            continue;
          }
          try {
            const record = await uploadNoteAttachmentFile(
              noteId,
              userId,
              file,
            );
            setPendingAttachments((prev) => [...prev, record]);
            insertAttachmentNode(record);
            revalidate();
          } catch (err) {
            setUploadError(
              err instanceof Error ? err.message : 'Upload failed',
            );
          }
        }
      } finally {
        setUploading(false);
      }
    },
    [editor, insertAttachmentNode, noteId, revalidate, userId],
  );

  processFilesRef.current = processFiles;

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const fl = e.target.files;
      e.target.value = '';
      await processFiles(fl);
    },
    [processFiles],
  );

  if (!isMounted || !editor) {
    return (
      <div className="min-h-[200px]">
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted"></div>
          <div className="h-4 w-1/2 rounded bg-muted"></div>
        </div>
      </div>
    );
  }

  return (
    <NotePdfDocProvider
      value={{
        noteId,
        userId,
        attachmentsById,
        revalidate,
      }}
    >
      <div className="tiptap-editor">
        {canInsertAttachments ? (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf,image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
              className="sr-only"
              aria-hidden
              tabIndex={-1}
              multiple
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={handlePickFile}
            >
              {uploading ? 'Uploading…' : 'Insert PDF or image'}
            </Button>
            <span className="text-xs text-muted-foreground">
              Inserts at the cursor, or drag files into the editor
            </span>
            {uploadError ? (
              <p className="w-full text-sm text-destructive" role="alert">
                {uploadError}
              </p>
            ) : null}
          </div>
        ) : null}
        <div
          className={
            isFileDragOver && canInsertAttachments && !uploading
              ? 'rounded-md ring-2 ring-ring/50 ring-offset-2 ring-offset-background'
              : undefined
          }
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </NotePdfDocProvider>
  );
}
