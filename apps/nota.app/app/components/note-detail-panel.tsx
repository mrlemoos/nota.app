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
  isLikelyOnline,
  mergeNoteWithLocal,
  putServerNoteIfNotDirty,
  storedNoteToListRow,
} from '@/lib/notes-offline';
import { fetchNoteRowAndAttachmentsParallel } from '../lib/note-detail-fetch';
import { getNote } from '../models/notes';
import { listNoteAttachments, NOTE_PDFS_BUCKET } from '../models/note-attachments';
import { hashForScreen, replaceAppHash } from '../lib/app-navigation';
import { shouldRefetchOpenNoteFromVaultList } from '../lib/open-note-vault-list-sync';
import {
  useNotesDataActions,
  useNotesDataMeta,
  useNotesDataVault,
} from '../context/notes-data-context';
import { useSpaSession } from '../context/spa-session-context';
import { ATTACHMENT_SIGNED_URL_TTL_SEC } from '../lib/pdf-attachment-client';
import { useStickyDocTitle } from '../context/sticky-doc-title';
import { useNotaPreferencesStore } from '../stores/nota-preferences';

export function NoteDetailPanel({ noteId }: { noteId: string }): React.ReactNode {
  const { notes } = useNotesDataVault();
  const { notaProEntitled, loading: vaultLoading } = useNotesDataMeta();
  const { patchNoteInList } = useNotesDataActions();
  const { user } = useSpaSession();
  const { scrollRootRef } = useStickyDocTitle();
  const showNoteBacklinks = useNotaPreferencesStore((s) => s.showNoteBacklinks);
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

  // --- Banner signed URL ---
  const bannerAttachmentId = displayNote?.banner_attachment_id ?? null;
  const bannerAttachment = bannerAttachmentId
    ? attachments.find((a) => a.id === bannerAttachmentId) ?? null
    : null;
  const [bannerSignedUrl, setBannerSignedUrl] = useState<string | null>(null);
  const bannerRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBannerSignedUrl(null);
    if (bannerRefreshTimerRef.current) {
      clearTimeout(bannerRefreshTimerRef.current);
      bannerRefreshTimerRef.current = null;
    }
    if (!bannerAttachment) return;

    const storagePath = bannerAttachment.storage_path;

    const scheduleRefresh = () => {
      if (bannerRefreshTimerRef.current) clearTimeout(bannerRefreshTimerRef.current);
      const ms = Math.max(5_000, Math.floor(ATTACHMENT_SIGNED_URL_TTL_SEC * 0.85 * 1000));
      bannerRefreshTimerRef.current = setTimeout(() => void fetchUrl(), ms);
    };

    async function fetchUrl() {
      const client = getBrowserClient();
      const { data, error } = await client.storage
        .from(NOTE_PDFS_BUCKET)
        .createSignedUrl(storagePath, ATTACHMENT_SIGNED_URL_TTL_SEC);
      if (cancelled) return;
      if (error || !data?.signedUrl) {
        setBannerSignedUrl(null);
        return;
      }
      setBannerSignedUrl(data.signedUrl);
      scheduleRefresh();
    }

    void fetchUrl();

    return () => {
      cancelled = true;
      if (bannerRefreshTimerRef.current) {
        clearTimeout(bannerRefreshTimerRef.current);
        bannerRefreshTimerRef.current = null;
      }
    };
  }, [bannerAttachment?.id, bannerAttachment?.storage_path]);

  // Paint the banner as a viewport-fixed background on <main>. Using
  // background-attachment:fixed sidesteps the containing-block issue caused
  // by main's backdrop-filter (which scopes `position:fixed` descendants).
  useEffect(() => {
    const main = scrollRootRef.current;
    if (!main) return;
    if (!bannerSignedUrl) return;
    main.style.backgroundImage = `url("${bannerSignedUrl}")`;
    main.style.backgroundSize = 'cover';
    main.style.backgroundPosition = 'center';
    main.style.backgroundAttachment = 'fixed';
    return () => {
      main.style.backgroundImage = '';
      main.style.backgroundSize = '';
      main.style.backgroundPosition = '';
      main.style.backgroundAttachment = '';
    };
  }, [bannerSignedUrl, scrollRootRef]);

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
    <div
      className={cn(
        'relative',
        bannerSignedUrl ? 'px-4 py-10 md:px-8 md:py-16' : 'px-4 py-8',
      )}
    >
      <div
        className={cn(
          'mx-auto w-full transition-[max-width] duration-300 ease-in-out',
          layout.maxWidthClass,
          bannerSignedUrl &&
            'rounded-2xl bg-background/80 px-6 py-10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35),0_10px_30px_-12px_rgba(0,0,0,0.18)] ring-1 ring-black/5 backdrop-blur-2xl backdrop-saturate-150 md:px-14 md:py-16 dark:bg-background/70 dark:ring-white/10',
        )}
      >
        <NoteEditor
          note={displayNote}
          noteMentionCandidates={notes}
          attachments={attachments}
          titleFontClassName={layout.titleFontClass}
          bodyFontClassName={layout.bodyFontClass}
          onNoteUpdated={handleNoteUpdated}
          bannerSignedUrl={bannerSignedUrl}
        />
        {showNoteBacklinks ? (
          <div className={layout.bodyFontClass}>
            <NoteBacklinksPanel noteId={noteId} />
          </div>
        ) : null}
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
