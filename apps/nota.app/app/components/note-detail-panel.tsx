import { useCallback, useEffect, useState } from 'react';
import type { Note, NoteAttachment } from '~/types/database.types';
import { NoteEditor } from './note-editor';
import { NoteBacklinksPanel } from './note-backlinks-panel';
import { cn } from '@/lib/utils';
import {
  noteSurfaceClassNames,
  parseNoteEditorSettings,
} from '@/lib/note-editor-settings';
import { getBrowserClient } from '../lib/supabase/browser';
import {
  getStoredNote,
  isLikelyOnline,
  mergeNoteWithLocal,
  putServerNoteIfNotDirty,
  storedNoteToListRow,
} from '../lib/notes-offline';
import { getNote } from '../models/notes';
import { listNoteAttachments } from '../models/note-attachments';
import { hashForScreen } from '../lib/app-navigation';
import { useNotesData } from '../context/notes-data-context';
export function NoteDetailPanel({ noteId }: { noteId: string }): React.ReactNode {
  const { notes, refreshNotesList } = useNotesData();
  const [note, setNote] = useState<Note | null>(null);
  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);

  /** List row for the open id — avoids an empty state flash while the full fetch runs after a note switch. */
  const noteFromList = notes.find((n) => n.id === noteId) ?? null;
  const displayNote =
    note?.id === noteId ? note : noteFromList;

  useEffect(() => {
    let cancelled = false;
    setAttachments([]);

    async function load(): Promise<void> {
      const client = getBrowserClient();
      const {
        data: { session },
      } = await client.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) {
        return;
      }

      try {
        const row = await getNote(client, noteId);
        if (row) {
          await putServerNoteIfNotDirty(uid, row);
          const local = await getStoredNote(uid, noteId);
          const merged = mergeNoteWithLocal(row, local);
          const atts = await listNoteAttachments(client, noteId);
          if (!cancelled) {
            setNote(merged);
            setAttachments(atts);
          }
          return;
        }
      } catch (e) {
        if (isLikelyOnline()) {
          if (!cancelled) {
            setNote(null);
            setAttachments([]);
          }
          throw e;
        }
      }

      const local = await getStoredNote(uid, noteId);
      if (local && !local.pending_delete && local.pending_create) {
        const synthetic = storedNoteToListRow(local);
        if (!cancelled) {
          setNote(synthetic);
          setAttachments([]);
        }
        return;
      }
      if (!isLikelyOnline() && local && !local.pending_delete) {
        const synthetic = storedNoteToListRow(local);
        if (!cancelled) {
          setNote(synthetic);
          setAttachments([]);
        }
        return;
      }
      if (!cancelled) {
        setNote(null);
        setAttachments([]);
      }
    }

    void load().catch(() => {
      if (!cancelled) {
        setNote(null);
        setAttachments([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [noteId]);

  const handleNoteUpdated = useCallback(
    (updatedNote: Note) => {
      setNote(updatedNote);
      void refreshNotesList();
    },
    [refreshNotesList],
  );

  if (!displayNote) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 py-16 text-sm text-muted-foreground">
        Note not found or still loading…
      </div>
    );
  }

  const layout = noteSurfaceClassNames(
    parseNoteEditorSettings(displayNote.editor_settings),
  );

  return (
    <div className="px-4 py-8">
      <div
        className={cn(
          'mx-auto w-full transition-[max-width] duration-300 ease-in-out',
          layout.maxWidthClass,
        )}
      >
        <NoteEditor
          note={displayNote}
          attachments={attachments}
          titleFontClassName={layout.titleFontClass}
          bodyFontClassName={layout.bodyFontClass}
          onNoteUpdated={handleNoteUpdated}
        />
        <div className={layout.bodyFontClass}>
          <NoteBacklinksPanel noteId={noteId} />
        </div>
      </div>
    </div>
  );
}

/** Hash href for sidebar / backlinks (native link behaviour). */
export function noteHashHref(noteId: string): string {
  return hashForScreen({
    kind: 'notes',
    panel: 'note',
    noteId,
  });
}
