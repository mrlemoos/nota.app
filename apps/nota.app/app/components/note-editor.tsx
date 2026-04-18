import {
  useCallback,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  memo,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { TipTapEditor } from './tiptap-editor';
import { useStickyDocTitle } from '../context/sticky-doc-title';
import { persistedDisplayTitle } from '../lib/note-title';
import { getBrowserClient } from '../lib/supabase/browser';
import { useRootLoaderData } from '../context/spa-session-context';
import { useNotesDataMeta } from '../context/notes-data-context';
import { mergeUpdatedNoteLocalContent } from '../lib/note-updated-content-merge';
import {
  markNoteSyncedFromServer,
  saveLocalNoteDraft,
} from '../lib/notes-offline/local-note-store';
import { drainNotesOutbox, isLikelyOnline } from '../lib/notes-offline/sync-notes';
import { updateNote } from '../models/notes';
import type { Json, Note, NoteAttachment } from '~/types/database.types';
import {
  noteEditorSettingsToJson,
  parseNoteEditorSettings,
  type NoteEditorSettings,
} from '../lib/note-editor-settings';
import { NoteLayoutMenu } from './note-layout-menu';
import { cn } from '@/lib/utils';
import type { Editor } from '@tiptap/core';

interface NoteEditorProps {
  note: Note;
  /** Full vault list for `@` mention candidates (parent avoids TipTap subscribing to vault context). */
  noteMentionCandidates: Note[];
  attachments: NoteAttachment[];
  titleFontClassName: string;
  bodyFontClassName: string;
  onNoteUpdated?: (note: Note) => void;
}

const SAVE_DEBOUNCE_MS = 800;

function NoteEditorImpl({
  note,
  noteMentionCandidates,
  attachments,
  titleFontClassName,
  bodyFontClassName,
  onNoteUpdated,
}: NoteEditorProps) {
  const { user } = useRootLoaderData() ?? { user: null };
  const { notaProEntitled } = useNotesDataMeta();
  const { scrollRootRef, scrollRootEpoch, setSticky, resetSticky } =
    useStickyDocTitle();
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>(
    'saved',
  );
  const [title, setTitle] = useState(() => note.title || '');

  const titleRowRef = useRef<HTMLDivElement>(null);
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const bodyEditorRef = useRef<Editor | null>(null);
  const contentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContent = useRef(note.content);
  const lastSavedTitle = useRef(persistedDisplayTitle(note.title || ''));
  const titleRef = useRef(note.title || '');
  const pendingContentRef = useRef<unknown | null>(null);
  const noteRef = useRef(note);
  const onNoteUpdatedRef = useRef(onNoteUpdated);
  const userIdRef = useRef(user?.id);
  const notaProEntitledRef = useRef(notaProEntitled);
  noteRef.current = note;
  onNoteUpdatedRef.current = onNoteUpdated;
  userIdRef.current = user?.id;
  notaProEntitledRef.current = notaProEntitled;

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
        if (user?.id) {
          await saveLocalNoteDraft(user.id, {
            id: note.id,
            title: next,
            content: lastSavedContent.current as Json,
            user_id: note.user_id,
            created_at: note.created_at,
            due_at: note.due_at,
            is_deadline: note.is_deadline,
            editor_settings: noteRef.current.editor_settings,
          });
        }
        setSaveStatus('saved');

        if (isLikelyOnline() && notaProEntitledRef.current) {
          const client = getBrowserClient();
          const updatedNote = await updateNote(client, note.id, { title: next });
          if (user?.id) {
            await markNoteSyncedFromServer(user.id, updatedNote);
          }
          lastSavedTitle.current = next;
          onNoteUpdated?.(
            mergeUpdatedNoteLocalContent(
              updatedNote,
              pendingContentRef.current,
              lastSavedContent.current as Json,
            ),
          );
        } else if (user?.id) {
          lastSavedTitle.current = next;
          onNoteUpdated?.(
            mergeUpdatedNoteLocalContent(
              {
                ...note,
                title: next,
                updated_at: new Date().toISOString(),
              },
              pendingContentRef.current,
              lastSavedContent.current as Json,
            ),
          );
        }
      } catch (error) {
        console.error('Failed to save title:', error);
        setSaveStatus('error');
        if (user?.id && notaProEntitledRef.current) {
          void drainNotesOutbox(user.id);
        }
      }
    }, SAVE_DEBOUNCE_MS);
  }, [note, onNoteUpdated, user?.id]);

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

  const handleTitleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      (e.key === 'Enter' || e.key === 'NumpadEnter') &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing
    ) {
      e.preventDefault();
      const ed = bodyEditorRef.current;
      if (ed && !ed.isDestroyed) {
        ed.chain().focus('start').run();
      }
    }
  }, []);

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
      setSaveStatus('saving');
      try {
        const titleForRow = persistedDisplayTitle(titleRef.current);
        if (user?.id) {
          await saveLocalNoteDraft(user.id, {
            id: note.id,
            title: titleForRow,
            content: toSave as Json,
            user_id: note.user_id,
            created_at: note.created_at,
            due_at: note.due_at,
            is_deadline: note.is_deadline,
            editor_settings: noteRef.current.editor_settings,
          });
        }
        const mergedBody = (pendingContentRef.current ?? toSave) as Json;
        lastSavedContent.current = mergedBody;
        setSaveStatus('saved');

        if (isLikelyOnline() && notaProEntitledRef.current) {
          const client = getBrowserClient();
          const updatedNote = await updateNote(client, note.id, {
            content: toSave as Json,
          });
          if (user?.id) {
            await markNoteSyncedFromServer(user.id, updatedNote);
          }
          onNoteUpdated?.(
            mergeUpdatedNoteLocalContent(
              updatedNote,
              pendingContentRef.current,
              toSave as Json,
            ),
          );
        } else if (user?.id) {
          onNoteUpdated?.(
            mergeUpdatedNoteLocalContent(
              {
                ...note,
                title: titleForRow,
                content: mergedBody,
                updated_at: new Date().toISOString(),
              },
              pendingContentRef.current,
              toSave as Json,
            ),
          );
        }
      } catch (error) {
        console.error('Failed to save note:', error);
        setSaveStatus('error');
        if (user?.id && notaProEntitledRef.current) {
          void drainNotesOutbox(user.id);
        }
      }
    }, SAVE_DEBOUNCE_MS);
  }, [note, onNoteUpdated, user?.id]);

  const handleUpdate = useCallback(
    (content: unknown) => {
      pendingContentRef.current = content;
      scheduleContentSave();
    },
    [scheduleContentSave],
  );

  const persistDueDate = useCallback(async (dueAt: string | null, isDeadline: boolean) => {
    const userId = userIdRef.current;
    if (!userId) {
      return;
    }
    const n = noteRef.current;
    const titleForRow = persistedDisplayTitle(titleRef.current);
    const contentForRow = (pendingContentRef.current ??
      lastSavedContent.current) as Json;
    setSaveStatus('saving');
    try {
      await saveLocalNoteDraft(userId, {
        id: n.id,
        title: titleForRow,
        content: contentForRow,
        user_id: n.user_id,
        created_at: n.created_at,
        due_at: dueAt,
        is_deadline: isDeadline,
        editor_settings: n.editor_settings,
      });
      if (isLikelyOnline() && notaProEntitledRef.current) {
        const client = getBrowserClient();
        const updatedNote = await updateNote(client, n.id, {
          due_at: dueAt,
          is_deadline: isDeadline,
        });
        await markNoteSyncedFromServer(userId, updatedNote);
        onNoteUpdatedRef.current?.(
          mergeUpdatedNoteLocalContent(
            updatedNote,
            pendingContentRef.current,
            lastSavedContent.current as Json,
          ),
        );
      } else {
        onNoteUpdatedRef.current?.(
          mergeUpdatedNoteLocalContent(
            {
              ...n,
              due_at: dueAt,
              is_deadline: isDeadline,
              updated_at: new Date().toISOString(),
            },
            pendingContentRef.current,
            lastSavedContent.current as Json,
          ),
        );
      }
      setSaveStatus('saved');
    } catch (error) {
      console.error('Failed to save due date:', error);
      setSaveStatus('error');
      if (notaProEntitledRef.current) {
        void drainNotesOutbox(userId);
      }
    }
  }, []);

  const persistEditorSettings = useCallback(async (next: NoteEditorSettings) => {
    const userId = userIdRef.current;
    if (!userId) {
      return;
    }
    const n = noteRef.current;
    const json = noteEditorSettingsToJson(next);
    const titleForRow = persistedDisplayTitle(titleRef.current);
    const contentForRow = (pendingContentRef.current ??
      lastSavedContent.current) as Json;
    setSaveStatus('saving');
    try {
      await saveLocalNoteDraft(userId, {
        id: n.id,
        title: titleForRow,
        content: contentForRow,
        user_id: n.user_id,
        created_at: n.created_at,
        due_at: n.due_at,
        is_deadline: n.is_deadline,
        editor_settings: json,
      });
      if (isLikelyOnline() && notaProEntitledRef.current) {
        const client = getBrowserClient();
        const updatedNote = await updateNote(client, n.id, {
          editor_settings: json,
        });
        await markNoteSyncedFromServer(userId, updatedNote);
        onNoteUpdatedRef.current?.(
          mergeUpdatedNoteLocalContent(
            updatedNote,
            pendingContentRef.current,
            lastSavedContent.current as Json,
          ),
        );
      } else {
        onNoteUpdatedRef.current?.(
          mergeUpdatedNoteLocalContent(
            {
              ...n,
              editor_settings: json,
              updated_at: new Date().toISOString(),
            },
            pendingContentRef.current,
            lastSavedContent.current as Json,
          ),
        );
      }
      setSaveStatus('saved');
    } catch (error) {
      console.error('Failed to save note layout:', error);
      setSaveStatus('error');
      if (notaProEntitledRef.current) {
        void drainNotesOutbox(userId);
      }
    }
  }, []);

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
          onKeyDown={handleTitleKeyDown}
          placeholder="Untitled"
          autoComplete="off"
          aria-label="Note title"
          rows={1}
          className={cn(
            'min-h-0 min-w-0 flex-1 resize-none overflow-hidden break-words border-0 bg-transparent p-0 text-4xl font-extrabold leading-tight tracking-tight text-pretty text-foreground placeholder:text-muted-foreground/70 focus:outline-none md:text-5xl',
            titleFontClassName,
          )}
        />
        <div
          className="flex shrink-0 items-start justify-end gap-2 pt-3 md:pt-4"
          aria-live="polite"
        >
          <NoteLayoutMenu
            settings={parseNoteEditorSettings(note.editor_settings)}
            onSettingsChange={persistEditorSettings}
            disabled={!user?.id}
          />
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

      <div className={cn('min-h-[50vh] pb-24', bodyFontClassName)}>
        <TipTapEditor
          content={note.content}
          onUpdate={handleUpdate}
          placeholder="Start writing your note..."
          noteId={note.id}
          contentRevision={note.updated_at}
          userId={user?.id ?? ''}
          noteMentionCandidates={noteMentionCandidates}
          attachments={attachments}
          dueAt={note.due_at}
          isDeadline={note.is_deadline}
          onSaveDueDate={persistDueDate}
          bodyEditorRef={bodyEditorRef}
        />
      </div>
    </div>
  );
}

export const NoteEditor = memo(NoteEditorImpl);
