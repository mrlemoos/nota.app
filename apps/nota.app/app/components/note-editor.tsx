import {
  useCallback,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  type ChangeEvent,
} from 'react';
import { TipTapEditor } from './tiptap-editor';
import { ClientOnly } from './client-only';
import { useStickyDocTitle } from '../context/sticky-doc-title';
import { persistedDisplayTitle } from '../lib/note-title';
import { getBrowserClient } from '../lib/supabase/browser';
import { useRootLoaderData } from '../root';
import { mergeUpdatedNoteLocalContent } from '../lib/note-updated-content-merge';
import { updateNote } from '../models/notes';
import type { Json, Note, NoteAttachment } from '~/types/database.types';

interface NoteEditorProps {
  note: Note;
  attachments: NoteAttachment[];
  onNoteUpdated?: (note: Note) => void;
}

const SAVE_DEBOUNCE_MS = 800;

export function NoteEditor({
  note,
  attachments,
  onNoteUpdated,
}: NoteEditorProps) {
  const { user } = useRootLoaderData() ?? { user: null };
  const { scrollRootRef, scrollRootEpoch, setSticky, resetSticky } =
    useStickyDocTitle();
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>(
    'saved',
  );
  const [title, setTitle] = useState(() => note.title || '');

  const titleRowRef = useRef<HTMLDivElement>(null);
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const contentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContent = useRef(note.content);
  const lastSavedTitle = useRef(persistedDisplayTitle(note.title || ''));
  const titleRef = useRef(note.title || '');
  const pendingContentRef = useRef<unknown | null>(null);

  useEffect(() => {
    resetSticky();
    const initialTitle = note.title || '';
    setTitle(initialTitle);
    titleRef.current = initialTitle;
    lastSavedTitle.current = persistedDisplayTitle(initialTitle);
    lastSavedContent.current = note.content;
    pendingContentRef.current = null;
    if (contentDebounceRef.current) {
      clearTimeout(contentDebounceRef.current);
      contentDebounceRef.current = null;
    }
    if (titleDebounceRef.current) {
      clearTimeout(titleDebounceRef.current);
      titleDebounceRef.current = null;
    }
  }, [note.id, resetSticky]);

  const syncTitleTextareaHeight = useCallback(() => {
    const el = titleTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useLayoutEffect(() => {
    syncTitleTextareaHeight();
  }, [title, note.id, syncTitleTextareaHeight]);

  useEffect(() => {
    setSticky({ label: persistedDisplayTitle(title) });
  }, [title, setSticky]);

  useLayoutEffect(() => {
    const root = scrollRootRef.current;
    const target = titleRowRef.current;
    if (!root || !target) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setSticky({ visible: !entry.isIntersecting });
      },
      { root, threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [note.id, scrollRootEpoch, scrollRootRef, setSticky]);

  useEffect(() => {
    return () => {
      resetSticky();
    };
  }, [resetSticky]);

  const scheduleTitleSave = useCallback(() => {
    if (titleDebounceRef.current) {
      clearTimeout(titleDebounceRef.current);
    }
    titleDebounceRef.current = setTimeout(async () => {
      titleDebounceRef.current = null;
      const next = persistedDisplayTitle(titleRef.current);
      if (next === lastSavedTitle.current) {
        return;
      }
      setSaveStatus('saving');
      try {
        const client = getBrowserClient();
        const updatedNote = await updateNote(client, note.id, { title: next });
        lastSavedTitle.current = next;
        setSaveStatus('saved');
        onNoteUpdated?.(
          mergeUpdatedNoteLocalContent(
            updatedNote,
            pendingContentRef.current,
            lastSavedContent.current as Json,
          ),
        );
      } catch (error) {
        console.error('Failed to save title:', error);
        setSaveStatus('error');
      }
    }, SAVE_DEBOUNCE_MS);
  }, [note.id, onNoteUpdated]);

  const handleTitleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const v = e.target.value;
      setTitle(v);
      titleRef.current = v;
      setSaveStatus('saving');
      scheduleTitleSave();
    },
    [scheduleTitleSave],
  );

  const scheduleContentSave = useCallback(() => {
    if (contentDebounceRef.current) {
      clearTimeout(contentDebounceRef.current);
    }
    contentDebounceRef.current = setTimeout(async () => {
      contentDebounceRef.current = null;
      const toSave = pendingContentRef.current;
      if (toSave === null || toSave === undefined) {
        return;
      }
      if (JSON.stringify(toSave) === JSON.stringify(lastSavedContent.current)) {
        setSaveStatus('saved');
        return;
      }
      try {
        const client = getBrowserClient();
        const updatedNote = await updateNote(client, note.id, {
          content: toSave as Json,
        });
        const mergedBody = (pendingContentRef.current ?? toSave) as Json;
        lastSavedContent.current = mergedBody;
        setSaveStatus('saved');
        onNoteUpdated?.(
          mergeUpdatedNoteLocalContent(
            updatedNote,
            pendingContentRef.current,
            toSave as Json,
          ),
        );
      } catch (error) {
        console.error('Failed to save note:', error);
        setSaveStatus('error');
      }
    }, SAVE_DEBOUNCE_MS);
  }, [note.id, onNoteUpdated]);

  const handleUpdate = useCallback(
    (content: unknown) => {
      if (
        JSON.stringify(content) === JSON.stringify(lastSavedContent.current)
      ) {
        return;
      }
      pendingContentRef.current = content;
      setSaveStatus('saving');
      scheduleContentSave();
    },
    [scheduleContentSave],
  );

  useEffect(() => {
    return () => {
      if (contentDebounceRef.current) {
        clearTimeout(contentDebounceRef.current);
      }
      if (titleDebounceRef.current) {
        clearTimeout(titleDebounceRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <div ref={titleRowRef} className="flex items-start justify-between gap-4">
        <textarea
          ref={titleTextareaRef}
          name="note-title"
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          autoComplete="off"
          aria-label="Note title"
          rows={1}
          className="min-h-0 min-w-0 flex-1 resize-none overflow-hidden break-words border-0 bg-transparent p-0 font-sans text-4xl font-extrabold leading-tight tracking-tight text-pretty text-foreground placeholder:text-muted-foreground/70 focus:outline-none md:text-5xl"
        />
        <div
          className="flex shrink-0 items-start justify-end gap-2 pt-3 md:pt-4"
          aria-live="polite"
        >
          {saveStatus === 'saving' && (
            <span
              className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-foreground/50"
              role="status"
              aria-label="Saving"
            />
          )}
          {saveStatus === 'error' && (
            <span className="text-sm text-destructive">Error saving</span>
          )}
        </div>
      </div>

      <ClientOnly
        fallback={
          <div className="min-h-[50vh] pb-24">
            <div className="animate-pulse space-y-3">
              <div className="h-4 w-full rounded bg-muted"></div>
              <div className="h-4 w-5/6 rounded bg-muted"></div>
              <div className="h-4 w-4/5 rounded bg-muted"></div>
              <div className="h-4 w-full rounded bg-muted"></div>
            </div>
          </div>
        }
      >
        <div className="min-h-[50vh] pb-24">
          <TipTapEditor
            content={note.content}
            onUpdate={handleUpdate}
            placeholder="Start writing your note..."
            noteId={note.id}
            userId={user?.id ?? ''}
            attachments={attachments}
          />
        </div>
      </ClientOnly>
    </div>
  );
}
