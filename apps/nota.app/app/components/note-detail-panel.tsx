import { useCallback, useEffect, useRef, useState } from 'react';
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
  putServerNoteIfNotDirty,
} from '../lib/notes-offline/local-note-store';
import {
  mergeNoteWithLocal,
  storedNoteToListRow,
} from '../lib/notes-offline/merge-note-with-local';
import { isLikelyOnline } from '../lib/notes-offline/sync-notes';
import { fetchNoteRowAndAttachmentsParallel } from '../lib/note-detail-fetch';
import { getNote } from '../models/notes';
import { listNoteAttachments } from '../models/note-attachments';
import { hashForScreen, replaceAppHash } from '../lib/app-navigation';
import { shouldRefetchOpenNoteFromVaultList } from '../lib/open-note-vault-list-sync';
import {
  useNotesDataActions,
  useNotesDataMeta,
  useNotesDataVault,
} from '../context/notes-data-context';
import { useSpaSession } from '../context/spa-session-context';

export function NoteDetailPanel({ noteId }: { noteId: string }): React.ReactNode {
  const { notes } = useNotesDataVault();
  const { notaProEntitled, loading: vaultLoading } = useNotesDataMeta();
  const { patchNoteInList } = useNotesDataActions();
  const { user } = useSpaSession();
  const [note, setNote] = useState<Note | null>(null);
  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);
  const [fetchSettled, setFetchSettled] = useState(false);
  const [hadAuthenticatedUser, setHadAuthenticatedUser] = useState(false);
  const notesRef = useRef(notes);
  notesRef.current = notes;

  /** List row for the open id — avoids an empty state flash while the full fetch runs after a note switch. */
  const noteFromList = notes.find((n) => n.id === noteId) ?? null;
  const displayNote =
    note?.id === noteId ? note : noteFromList;

  const notFoundGateRef = useRef({
    userId: user?.id,
    vaultLoading,
    displayNote,
  });
  notFoundGateRef.current = { userId: user?.id, vaultLoading, displayNote };

  useEffect(() => {
    let cancelled = false;
    setAttachments([]);
    setFetchSettled(false);
    setHadAuthenticatedUser(false);

    async function load(): Promise<void> {
      let authedThisFetch = false;
      try {
        const client = getBrowserClient();
        const uid = user?.id;
        if (!uid) {
          if (!cancelled) {
            setNote(null);
            setAttachments([]);
          }
          return;
        }
        authedThisFetch = true;

        const finishFromLocal = async (): Promise<void> => {
          const local = await getStoredNote(uid, noteId);
          const rowFromList =
            notesRef.current.find((n) => n.id === noteId) ?? null;
          if (local && !local.pending_delete) {
            const merged = rowFromList
              ? mergeNoteWithLocal(rowFromList, local)
              : storedNoteToListRow(local);
            if (!cancelled) {
              setNote(merged);
              setAttachments([]);
            }
            return;
          }
          if (rowFromList) {
            if (!cancelled) {
              setNote(rowFromList);
              setAttachments([]);
            }
            return;
          }
          if (!cancelled) {
            setNote(null);
            setAttachments([]);
          }
        };

        if (!notaProEntitled) {
          await finishFromLocal();
          return;
        }

        try {
          const { row, attachments: atts } =
            await fetchNoteRowAndAttachmentsParallel(client, noteId, {
              getNote,
              listNoteAttachments,
            });
          if (row) {
            const local = await getStoredNote(uid, noteId);
            const merged = mergeNoteWithLocal(row, local);
            if (!cancelled) {
              setNote(merged);
              setAttachments(atts);
            }
            queueMicrotask(() => {
              if (!cancelled) {
                void putServerNoteIfNotDirty(uid, row);
              }
            });
            return;
          }
        } catch (e) {
          if (isLikelyOnline()) {
            console.error(e);
          }
        }

        await finishFromLocal();
      } finally {
        if (!cancelled) {
          setHadAuthenticatedUser(authedThisFetch);
          setFetchSettled(true);
        }
      }
    }

    void load().catch(() => {
      if (!cancelled) {
        setNote(null);
        setAttachments([]);
        setHadAuthenticatedUser(false);
        setFetchSettled(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [noteId, notaProEntitled, user?.id]);

  /** When the vault list row updates ahead of this panel (e.g. study notes + `patchNoteInList`), re-merge and refetch attachments. */
  useEffect(() => {
    if (
      !notaProEntitled ||
      !user?.id ||
      vaultLoading ||
      !fetchSettled ||
      !noteFromList ||
      noteFromList.id !== noteId
    ) {
      return;
    }
    if (!shouldRefetchOpenNoteFromVaultList(note, noteFromList)) {
      return;
    }

    let cancelled = false;
    const uid = user.id;

    void (async () => {
      try {
        const local = await getStoredNote(uid, noteId);
        const merged = mergeNoteWithLocal(noteFromList, local);
        const client = getBrowserClient();
        const atts = await listNoteAttachments(client, noteId);
        if (!cancelled) {
          setNote(merged);
          setAttachments(atts);
        }
      } catch (e) {
        if (isLikelyOnline()) {
          console.error(e);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    fetchSettled,
    note,
    noteFromList,
    noteId,
    notaProEntitled,
    user?.id,
    vaultLoading,
  ]);

  useEffect(() => {
    if (
      !user?.id ||
      vaultLoading ||
      !fetchSettled ||
      !hadAuthenticatedUser ||
      displayNote
    ) {
      return;
    }
    // Defer so we do not read stale fetch flags in the same commit as the load effect
    // resetting `fetchSettled` / `hadAuthenticatedUser` (avoids notes → 404 → blank loops).
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      const g = notFoundGateRef.current;
      if (!g.userId || g.vaultLoading || g.displayNote) {
        return;
      }
      replaceAppHash({ kind: 'notFound' });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [
    user?.id,
    vaultLoading,
    fetchSettled,
    hadAuthenticatedUser,
    displayNote,
  ]);

  const handleNoteUpdated = useCallback(
    (updatedNote: Note) => {
      setNote(updatedNote);
      patchNoteInList(updatedNote.id, updatedNote);
    },
    [patchNoteInList],
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
          noteMentionCandidates={notes}
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
