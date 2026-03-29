import type { Editor } from '@tiptap/core';
import { Node as PMNode } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import Emoji from '@tiptap/extension-emoji';
import { NotaCodeBlock } from './tiptap/nota-code-block';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type JSX,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
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
import type { Note, NoteAttachment } from '~/types/database.types';
import {
  useRegisterNoteEditorMermaidInserter,
  useRegisterNoteEditorTableInserter,
} from '../context/note-editor-commands';
import { TableEditorMenu } from './tiptap/table-editor-menu';
import { NoteDueDateBubbleMenu } from './note-due-date-bubble-menu';
import { NotaDueDateInteraction } from './tiptap/nota-due-date-interaction';
import { hrefForNote, parseNoteLinkPath } from '../lib/internal-note-link';
import { useNotesData } from '../context/notes-data-context';
import {
  absoluteUrlForNote,
  navigateFromLegacyPath,
} from '../lib/app-navigation';
import { persistedDisplayTitle } from '../lib/note-title';
import { findNoteMentionTrigger } from '../lib/tiptap-note-mention';
import { NoteLinkMentionMenu } from './tiptap/note-link-mention-menu';

/**
 * Inserts the internal note link using the same `EditorView` that receives
 * `handleKeyDown`, so Enter confirmation does not depend on TipTap `Editor`
 * refs or `dom.editor` (which can disagree with the active view).
 */
function insertNoteLinkAtMentionRangeView(
  view: EditorView,
  from: number,
  to: number,
  target: Note,
): boolean {
  const { state } = view;
  const linkMark = state.schema.marks.link;
  if (!linkMark) return false;

  const href = hrefForNote(target.id);
  const label = persistedDisplayTitle(target.title || '');
  const mark = linkMark.create({
    href,
    target: null,
    rel: null,
    class: 'tiptap-link',
    skipLinkPreview: true,
  });

  const tr = state.tr;
  tr.delete(from, to);
  tr.insert(from, state.schema.text(label, [mark]));
  tr.setSelection(TextSelection.create(tr.doc, from + label.length));
  tr.setStoredMarks([]);
  view.dispatch(tr.scrollIntoView());

  const dom = view.dom as HTMLElement & { editor?: Editor };
  const ed = dom.editor;
  if (ed && !ed.isDestroyed) {
    ed
      .chain()
      .focus()
      .setParagraph()
      .command(({ tr: innerTr, dispatch }) => {
        if (dispatch) {
          innerTr.setStoredMarks([]);
        }
        return true;
      })
      .run();
  } else {
    view.focus();
  }
  return true;
}

function insertNoteLinkAtMentionRange(
  ed: Editor,
  from: number,
  to: number,
  target: Note,
): void {
  insertNoteLinkAtMentionRangeView(ed.view, from, to, target);
}

type NoteMentionConfirmRefs = {
  canInsertAttachmentsRef: MutableRefObject<boolean>;
  filterNoteCandidatesRef: MutableRefObject<(query: string) => Note[]>;
  mentionTriggerKeyRef: MutableRefObject<string | null>;
  mentionSelectedIndexRef: MutableRefObject<number>;
};

/**
 * Inserts the note link for the active `@` mention if the trigger and a
 * non-empty candidate list are present. Shared by `handleKeyDown` (desktop
 * Enter/Tab) and `beforeinput` (mobile Return where keydown is unreliable).
 */
function tryConfirmNoteMention(
  view: EditorView,
  setMention: Dispatch<
    SetStateAction<{ from: number; query: string; selectedIndex: number } | null>
  >,
  refs: NoteMentionConfirmRefs,
): boolean {
  const state = view.state;

  if (!refs.canInsertAttachmentsRef.current) {
    return false;
  }
  const trigger = findNoteMentionTrigger(state);
  if (!trigger) {
    return false;
  }
  const filtered = refs.filterNoteCandidatesRef.current(trigger.query);
  if (filtered.length === 0) {
    return false;
  }

  const triggerKey = `${trigger.from}:${trigger.query}`;
  if (refs.mentionTriggerKeyRef.current !== triggerKey) {
    refs.mentionSelectedIndexRef.current = 0;
    refs.mentionTriggerKeyRef.current = triggerKey;
  }

  const idx = Math.min(
    refs.mentionSelectedIndexRef.current,
    filtered.length - 1,
  );
  const target = filtered[idx]!;
  const to = state.selection.from;
  const inserted = insertNoteLinkAtMentionRangeView(
    view,
    trigger.from,
    to,
    target,
  );
  if (!inserted) {
    return false;
  }
  setMention(null);
  return true;
}

function isDocContentEqual(editor: Editor, content: unknown): boolean {
  if (content === null || content === undefined) {
    return false;
  }
  if (typeof content !== 'object') {
    return false;
  }
  try {
    const parsed = PMNode.fromJSON(
      editor.schema,
      content as Record<string, unknown>,
    );
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
  dueAt?: string | null;
  isDeadline?: boolean;
  onSaveDueDate?: (dueAt: string | null, isDeadline: boolean) => Promise<void>;
  /** Set by parent so title Enter can focus the document body. */
  bodyEditorRef?: MutableRefObject<Editor | null>;
}

export function TipTapEditor({
  content,
  onUpdate,
  placeholder = 'Start writing...',
  noteId,
  userId,
  attachments,
  dueAt = null,
  isDeadline = false,
  onSaveDueDate,
  bodyEditorRef,
}: TipTapEditorProps): JSX.Element {
  const canInsertAttachments = Boolean(userId && noteId);
  const canInsertAttachmentsRef = useRef(false);
  const uploadingRef = useRef(false);
  const processFilesRef = useRef<
    (files: FileList | File[] | null) => Promise<void>
  >(async () => {});

  const [isMounted, setIsMounted] = useState(false);
  const { refreshNotesList, notes: sidebarNotes, notaProEntitled } =
    useNotesData();
  const notaProEntitledRef = useRef(notaProEntitled);
  notaProEntitledRef.current = notaProEntitled;
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<
    NoteAttachment[]
  >([]);
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const prevNoteIdRef = useRef<string | undefined>(undefined);
  const navigateRef = useRef(navigateFromLegacyPath);
  navigateRef.current = navigateFromLegacyPath;

  const filterNoteCandidates = useCallback(
    (query: string) => {
      const q = query.trim().toLowerCase();
      const c = sidebarNotes.filter((n) => n.id !== noteId);
      if (!q) return c;
      return c.filter((n) =>
        persistedDisplayTitle(n.title || '').toLowerCase().includes(q),
      );
    },
    [sidebarNotes, noteId],
  );

  const filterNoteCandidatesRef = useRef(filterNoteCandidates);
  filterNoteCandidatesRef.current = filterNoteCandidates;

  const [mention, setMention] = useState<{
    from: number;
    query: string;
    selectedIndex: number;
  } | null>(null);

  const mentionSelectedIndexRef = useRef(0);
  const mentionTriggerKeyRef = useRef<string | null>(null);

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

  const editorRef = useRef<Editor | null>(null);

  const mentionConfirmRefs: NoteMentionConfirmRefs = {
    canInsertAttachmentsRef,
    filterNoteCandidatesRef,
    mentionTriggerKeyRef,
    mentionSelectedIndexRef,
  };

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        codeBlock: false,
      }),
      NotaCodeBlock,
      NotaLink.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
        defaultProtocol: 'https',
        HTMLAttributes: {
          class: 'tiptap-link',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Emoji.configure({
        enableEmoticons: false,
        suggestion: {
          allow: () => false,
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      LinkPreview,
      NotePdf,
      NoteImage,
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: 'nota-table' },
      }),
      TableRow,
      TableHeader,
      TableCell,
      ...(onSaveDueDate ? [NotaDueDateInteraction] : []),
    ],
    [onSaveDueDate, placeholder],
  );

  const editor = useEditor({
    extensions,
    content: content || { type: 'doc', content: [{ type: 'paragraph' }] },
    onUpdate: ({ editor: ed }) => {
      onUpdate(ed.getJSON());
    },
    editorProps: {
      handleKeyDown: (_view, event) => {
        if (!canInsertAttachmentsRef.current) return false;
        const trigger = findNoteMentionTrigger(_view.state);
        if (!trigger) return false;
        const filtered = filterNoteCandidatesRef.current(trigger.query);
        const triggerKey = `${trigger.from}:${trigger.query}`;

        const alignMentionNavToTrigger = (): void => {
          if (mentionTriggerKeyRef.current !== triggerKey) {
            mentionSelectedIndexRef.current = 0;
            mentionTriggerKeyRef.current = triggerKey;
          }
        };

        if (event.key === 'Escape') {
          event.preventDefault();
          const to = _view.state.selection.from;
          _view.dispatch(_view.state.tr.delete(trigger.from, to));
          setMention(null);
          return true;
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          if (filtered.length === 0) return true;
          alignMentionNavToTrigger();
          const next =
            (mentionSelectedIndexRef.current + 1) % filtered.length;
          mentionSelectedIndexRef.current = next;
          setMention({
            from: trigger.from,
            query: trigger.query,
            selectedIndex: next,
          });
          return true;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          if (filtered.length === 0) return true;
          alignMentionNavToTrigger();
          const next =
            (mentionSelectedIndexRef.current -
              1 +
              filtered.length) %
            filtered.length;
          mentionSelectedIndexRef.current = next;
          setMention({
            from: trigger.from,
            query: trigger.query,
            selectedIndex: next,
          });
          return true;
        }
        const confirmByKey =
          ((event.key === 'Enter' || event.key === 'NumpadEnter') &&
            !event.shiftKey) ||
          (event.key === 'Tab' && !event.shiftKey);
        if (confirmByKey) {
          const handled = tryConfirmNoteMention(
            _view,
            setMention,
            mentionConfirmRefs,
          );
          if (handled) {
            event.preventDefault();
            return true;
          }
          return false;
        }
        return false;
      },
      handleDOMEvents: {
        beforeinput: (_view, event) => {
          if (!(event instanceof InputEvent)) return false;
          if (event.isComposing) return false;
          if (
            event.inputType !== 'insertLineBreak' &&
            event.inputType !== 'insertParagraph'
          ) {
            return false;
          }
          const handled = tryConfirmNoteMention(
            _view,
            setMention,
            mentionConfirmRefs,
          );
          if (handled) {
            event.preventDefault();
            return true;
          }
          return false;
        },
        click: (_view, event) => {
          if (event.button !== 0) return false;
          const el = event.target as HTMLElement | null;
          const anchor = el?.closest?.('a.tiptap-link') as HTMLAnchorElement | null;
          if (!anchor) return false;
          const raw = anchor.getAttribute('href');
          if (!raw) return false;
          let path = raw;
          if (raw.startsWith('http://') || raw.startsWith('https://')) {
            try {
              path = new URL(raw).pathname;
            } catch {
              return false;
            }
          }
          const linkedNoteId = parseNoteLinkPath(path);
          if (linkedNoteId) {
            event.preventDefault();
            event.stopPropagation();
            if (event.metaKey || event.ctrlKey) {
              window.open(
                absoluteUrlForNote(linkedNoteId),
                '_blank',
                'noopener,noreferrer',
              );
            } else {
              navigateRef.current(hrefForNote(linkedNoteId));
            }
            return true;
          }
          event.preventDefault();
          event.stopPropagation();
          window.open(anchor.href, '_blank', 'noopener,noreferrer');
          return true;
        },
        dragover: (_view, event) => {
          const dt = event.dataTransfer;
          if (!dt || !dt.types.includes('Files')) {
            return false;
          }
          event.preventDefault();
          if (
            !canInsertAttachmentsRef.current ||
            uploadingRef.current ||
            !notaProEntitledRef.current
          ) {
            return false;
          }
          setIsFileDragOver(true);
          return false;
        },
        dragleave: (_view, event) => {
          const related = event.relatedTarget;
          if (
            related instanceof globalThis.Node &&
            _view.dom.contains(related)
          ) {
            return false;
          }
          setIsFileDragOver(false);
          return false;
        },
        drop: (_view, event) => {
          setIsFileDragOver(false);
          const dt = event.dataTransfer;
          if (!dt || !dt.types.includes('Files')) {
            return false;
          }
          const { files } = dt;
          if (!files?.length) {
            return false;
          }
          event.preventDefault();
          if (!canInsertAttachmentsRef.current || uploadingRef.current) {
            return true;
          }
          if (!notaProEntitledRef.current) {
            setUploadError('Cloud attachments require Nota Pro.');
            return true;
          }
          void processFilesRef.current(files);
          return true;
        },
      },
    },
  }, [extensions]);

  editorRef.current = editor ?? null;
  if (bodyEditorRef) {
    bodyEditorRef.current = editor ?? null;
  }

  useLayoutEffect(() => {
    if (mention) {
      mentionSelectedIndexRef.current = mention.selectedIndex;
      mentionTriggerKeyRef.current = `${mention.from}:${mention.query}`;
    } else {
      mentionTriggerKeyRef.current = null;
      mentionSelectedIndexRef.current = 0;
    }
  }, [mention]);

  useRegisterNoteEditorMermaidInserter(editor);
  useRegisterNoteEditorTableInserter(editor);

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
    const syncMention = () => {
      if (!canInsertAttachmentsRef.current) {
        setMention(null);
        return;
      }
      const trigger = findNoteMentionTrigger(editor.state);
      if (!trigger) {
        setMention(null);
        return;
      }
      setMention((prev) => {
        const list = filterNoteCandidatesRef.current(trigger.query);
        const same =
          prev !== null &&
          prev.from === trigger.from &&
          prev.query === trigger.query;
        const selectedIndex = same
          ? Math.min(prev.selectedIndex, Math.max(0, list.length - 1))
          : 0;
        return {
          from: trigger.from,
          query: trigger.query,
          selectedIndex,
        };
      });
    };
    editor.on('selectionUpdate', syncMention);
    editor.on('update', syncMention);
    syncMention();
    return () => {
      editor.off('selectionUpdate', syncMention);
      editor.off('update', syncMention);
    };
  }, [editor]);

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
      if (!notaProEntitledRef.current) {
        setUploadError('Cloud attachments require Nota Pro.');
        return;
      }

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
            void refreshNotesList();
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
    [editor, insertAttachmentNode, noteId, refreshNotesList, userId],
  );

  processFilesRef.current = processFiles;

  const mentionFiltered = mention
    ? filterNoteCandidates(mention.query)
    : [];

  const mentionAnchor =
    mention && editor
      ? (() => {
          try {
            const c = editor.view.coordsAtPos(mention.from);
            return { left: c.left, top: c.bottom };
          } catch {
            return null;
          }
        })()
      : null;

  const handleMentionSelectNote = useCallback((target: Note) => {
    const ed = editorRef.current;
    if (!ed) return;
    const trigger = findNoteMentionTrigger(ed.state);
    if (!trigger) return;
    const to = ed.state.selection.from;
    insertNoteLinkAtMentionRange(ed, trigger.from, to, target);
    setMention(null);
  }, []);

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
        revalidate: () => {
          void refreshNotesList();
        },
      }}
    >
      <div className="tiptap-editor">
        {canInsertAttachments && uploadError ? (
          <p className="mb-2 text-sm text-destructive" role="alert">
            {uploadError}
          </p>
        ) : null}
        <div
          className={
            isFileDragOver &&
            canInsertAttachments &&
            notaProEntitled &&
            !uploading
              ? 'rounded-md ring-2 ring-ring/50 ring-offset-2 ring-offset-background'
              : undefined
          }
        >
          <TableEditorMenu editor={editor} />
          {onSaveDueDate ? (
            <NoteDueDateBubbleMenu
              editor={editor}
              dueAt={dueAt}
              isDeadline={isDeadline}
              disabled={!userId}
              onSaveDueDate={onSaveDueDate}
            />
          ) : null}
          <EditorContent editor={editor} />
        </div>
        <NoteLinkMentionMenu
          open={Boolean(mention && canInsertAttachments)}
          anchor={mentionAnchor}
          notes={mentionFiltered}
          selectedIndex={mention?.selectedIndex ?? 0}
          onHighlightIndex={(i) => {
            mentionSelectedIndexRef.current = i;
            setMention((s) => (s ? { ...s, selectedIndex: i } : s));
          }}
          onSelect={handleMentionSelectNote}
          emptyMessage={
            sidebarNotes.filter((n) => n.id !== noteId).length === 0
              ? 'No other notes yet'
              : 'No matching notes'
          }
        />
      </div>
    </NotePdfDocProvider>
  );
}
