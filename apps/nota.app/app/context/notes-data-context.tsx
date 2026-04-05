import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Note, UserPreferences } from '~/types/database.types';
import { getBrowserClient } from '../lib/supabase/browser';
import {
  isLikelyOnline,
  listStoredNotes,
  mergeNoteLists,
  putServerNoteIfNotDirty,
  storedNoteToListRow,
} from '../lib/notes-offline';
import { listNotes } from '../models/notes';
import { getUserPreferences } from '../models/user-preferences';
import { fetchNotaProEntitled } from '../lib/nota-server-client';
import {
  readNotaServerEntitledSession,
  syncNotaServerEntitledSession,
} from '../lib/revenuecat/nota-notes-entitled-session';
import { setAppHash } from '../lib/app-navigation';
import { runWelcomeNoteSeedIfNeeded } from '../lib/welcome-note-seed';
import { useSpaSession } from './spa-session-context';

export type NotesDataContextValue = {
  /** Server-confirmed active subscription (Nota Pro entitlement): vault, cloud, sync. */
  notaProEntitled: boolean;
  notes: Note[];
  userPreferences: UserPreferences | null;
  loadError?: string;
  loading: boolean;
  refreshNotesList: () => Promise<void>;
  patchNoteInList: (id: string, patch: Partial<Note>) => void;
  removeNoteFromList: (id: string) => void;
  insertNoteAtFront: (note: Note) => void;
  setUserPreferencesInState: (row: UserPreferences | null) => void;
};

const NotesDataContext = createContext<NotesDataContextValue | null>(null);

export function NotesDataProvider({ children }: { children: ReactNode }) {
  const { user } = useSpaSession();
  const userId = user?.id;
  const welcomeSeeded = user?.user_metadata?.welcome_seeded === true;

  const [notaProEntitled, setNotaProEntitled] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [userPreferences, setUserPreferences] =
    useState<UserPreferences | null>(null);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const refreshNotesList = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setNotaProEntitled(false);
      setNotes([]);
      setUserPreferences(null);
      return;
    }

    setLoading(true);
    setLoadError(undefined);

    const defaultPrefs = (): UserPreferences => ({
      user_id: userId,
      open_todays_note_shortcut: false,
      updated_at: new Date(0).toISOString(),
    });

    const bootstrapVaultFromIdb = async (): Promise<void> => {
      const stored = await listStoredNotes(userId);
      const active = stored.filter((r) => !r.pending_delete);
      const merged = active
        .map(storedNoteToListRow)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      setNotes(merged);
      setUserPreferences(null);
    };

    const recoverAfterEntitlementFetchFailure = async (): Promise<void> => {
      const online = isLikelyOnline();
      const sessionSaysEntitled = readNotaServerEntitledSession();
      if (!online) {
        setLoadError(undefined);
        setNotaProEntitled(sessionSaysEntitled);
        if (sessionSaysEntitled) {
          await bootstrapVaultFromIdb();
        } else {
          setNotes([]);
          setUserPreferences(null);
        }
        return;
      }
      if (sessionSaysEntitled) {
        setNotaProEntitled(true);
        await bootstrapVaultFromIdb();
        setLoadError('Failed to load notes');
      } else {
        setNotaProEntitled(false);
        setNotes([]);
        setUserPreferences(null);
        setLoadError('Failed to load notes');
      }
    };

    try {
      let entRes: Response;
      try {
        entRes = await fetchNotaProEntitled();
      } catch {
        await recoverAfterEntitlementFetchFailure();
        setLoading(false);
        return;
      }

      if (!entRes.ok) {
        await recoverAfterEntitlementFetchFailure();
        setLoading(false);
        return;
      }

      const entJson = (await entRes.json()) as { entitled?: boolean };
      const entitled = entJson.entitled === true;
      syncNotaServerEntitledSession(entitled);

      if (!entitled) {
        setNotaProEntitled(false);
        setNotes([]);
        setUserPreferences(null);
        setLoading(false);
        return;
      }

      setNotaProEntitled(true);

      const client = getBrowserClient();
      let serverNotes: Note[] = [];
      try {
        serverNotes = await listNotes(client);
      } catch (e) {
        console.error('Failed to load notes:', e);
        setLoadError('Failed to load notes');
      }

      let prefs: UserPreferences;
      try {
        prefs = await getUserPreferences(client, userId);
      } catch (e) {
        console.error('Failed to load user preferences:', e);
        prefs = defaultPrefs();
      }
      setUserPreferences(prefs);

      for (const n of serverNotes) {
        await putServerNoteIfNotDirty(userId, n);
      }
      const stored = await listStoredNotes(userId);
      setNotes(mergeNoteLists(serverNotes, stored));
    } catch (e) {
      console.error(e);
      await recoverAfterEntitlementFetchFailure();
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refreshNotesList();
  }, [refreshNotesList]);

  useEffect(() => {
    if (!userId || !isLikelyOnline()) {
      return;
    }
    let cancelled = false;
    const id = window.setTimeout(() => {
      if (!cancelled) {
        void refreshNotesList();
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [userId, refreshNotesList]);

  useEffect(() => {
    if (!userId || !user || loading || !notaProEntitled) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const id = await runWelcomeNoteSeedIfNeeded({
        user,
        notesCount: notes.length,
      });
      if (cancelled) {
        return;
      }
      if (id) {
        await refreshNotesList();
        if (cancelled) {
          return;
        }
        setAppHash({ kind: 'notes', panel: 'note', noteId: id });
        return;
      }
      if (welcomeSeeded && notes.length === 0) {
        await refreshNotesList();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    userId,
    user,
    loading,
    notaProEntitled,
    notes.length,
    refreshNotesList,
    welcomeSeeded,
  ]);

  const patchNoteInList = useCallback((id: string, patch: Partial<Note>) => {
    setNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === id);
      if (idx === -1) {
        return prev;
      }
      const merged = { ...prev[idx], ...patch };
      const next = [...prev];
      next[idx] = merged;
      next.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      return next;
    });
  }, []);

  const removeNoteFromList = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const insertNoteAtFront = useCallback((note: Note) => {
    setNotes((prev) => {
      const rest = prev.filter((n) => n.id !== note.id);
      return [note, ...rest];
    });
  }, []);

  const value = useMemo(
    () =>
      ({
        notaProEntitled,
        notes,
        userPreferences,
        loadError,
        loading,
        refreshNotesList,
        patchNoteInList,
        removeNoteFromList,
        insertNoteAtFront,
        setUserPreferencesInState: setUserPreferences,
      }) satisfies NotesDataContextValue,
    [
      notaProEntitled,
      notes,
      userPreferences,
      loadError,
      loading,
      refreshNotesList,
      patchNoteInList,
      removeNoteFromList,
      insertNoteAtFront,
    ],
  );

  return (
    <NotesDataContext.Provider value={value}>
      {children}
    </NotesDataContext.Provider>
  );
}

export function useNotesData(): NotesDataContextValue {
  const v = useContext(NotesDataContext);
  if (!v) {
    throw new Error('NotesDataProvider is required');
  }
  return v;
}

export function useOptionalNotesData(): NotesDataContextValue | null {
  return useContext(NotesDataContext);
}
