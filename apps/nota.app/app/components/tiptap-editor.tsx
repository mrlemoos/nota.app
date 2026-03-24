import type { Editor } from '@tiptap/core';
import { Node } from '@tiptap/pm/model';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
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
import { convertLinkOnlyParagraphs } from './tiptap/link-preview-scan';
import {
  NotePdf,
  NotePdfDocProvider,
} from './tiptap/note-pdf-extension';
import {
  PDF_MAX_BYTES,
  isPdfFile,
  uploadPdfAndCreateRecord,
} from '../lib/pdf-attachment-client';
import type { NoteAttachment } from '~/types/database.types';

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
  const [isMounted, setIsMounted] = useState(false);
  const { revalidate } = useRevalidator();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<
    NoteAttachment[]
  >([]);

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
      StarterKit,
      Link.configure({
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
    ],
    content: content || { type: 'doc', content: [{ type: 'paragraph' }] },
    onUpdate: ({ editor: ed }) => {
      onUpdate(ed.getJSON());
    },
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (editor && content && !isDocContentEqual(editor, content)) {
      editor.commands.setContent(content, false);
    }
  }, [editor, content]);

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

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !editor) return;

      setUploadError(null);

      if (!isPdfFile(file)) {
        setUploadError('Please choose a PDF file.');
        return;
      }

      if (file.size > PDF_MAX_BYTES) {
        setUploadError('This file is too large (max 25 MB).');
        return;
      }

      setUploading(true);
      try {
        const record = await uploadPdfAndCreateRecord(noteId, userId, file);
        setPendingAttachments((prev) => [...prev, record]);
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'notePdf',
            attrs: {
              attachmentId: record.id,
              filename: record.filename,
            },
          })
          .run();
        revalidate();
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : 'Upload failed',
        );
      } finally {
        setUploading(false);
      }
    },
    [editor, noteId, userId, revalidate],
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

  const canInsertPdf = Boolean(userId && noteId);

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
        {canInsertPdf ? (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              aria-hidden
              tabIndex={-1}
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={handlePickFile}
            >
              {uploading ? 'Uploading…' : 'Insert PDF'}
            </Button>
            <span className="text-xs text-muted-foreground">
              Inserts at the cursor
            </span>
            {uploadError ? (
              <p className="w-full text-sm text-destructive" role="alert">
                {uploadError}
              </p>
            ) : null}
          </div>
        ) : null}
        <EditorContent editor={editor} />
      </div>
    </NotePdfDocProvider>
  );
}
