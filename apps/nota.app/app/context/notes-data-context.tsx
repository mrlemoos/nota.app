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
import {
  readNotaServerEntitledSession,
  syncNotaServerEntitledSession,
} from '../lib/revenuecat/nota-notes-entitled-session';
import { useSpaSession } from './spa-session-context';

export type NotesDataContextValue = {
  notaProLocked: boolean;
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

  const [notaProLocked, setNotaProLocked] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [userPreferences, setUserPreferences] =
    useState<UserPreferences | null>(null);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const refreshNotesList = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setNotaProLocked(true);
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

    const offlineEntitledBootstrap = async (): Promise<void> => {
      if (!readNotaServerEntitledSession()) {
        setNotaProLocked(true);
        setNotes([]);
        setUserPreferences(null);
        return;
      }
      const stored = await listStoredNotes(userId);
      const active = stored.filter((r) => !r.pending_delete);
      const merged = active
        .map(storedNoteToListRow)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      setNotaProLocked(false);
      setNotes(merged);
      setUserPreferences(null);
    };

    try {
      let entRes: Response;
      try {
        entRes = await fetch('/api/nota-pro-entitled', {
          credentials: 'same-origin',
        });
      } catch {
        if (isLikelyOnline()) {
          setLoadError('Failed to load notes');
          setLoading(false);
          return;
        }
        await offlineEntitledBootstrap();
        setLoading(false);
        return;
      }

      if (!entRes.ok) {
        if (isLikelyOnline()) {
          setNotaProLocked(true);
          setNotes([]);
          setUserPreferences(defaultPrefs());
          setLoading(false);
          return;
        }
        await offlineEntitledBootstrap();
        setLoading(false);
        return;
      }

      const entJson = (await entRes.json()) as { entitled?: boolean };
      const entitled = entJson.entitled === true;
      syncNotaServerEntitledSession(entitled);

      if (!entitled) {
        setNotaProLocked(true);
        setNotes([]);
        setUserPreferences(defaultPrefs());
        setLoading(false);
        return;
      }

      setNotaProLocked(false);

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
      if (isLikelyOnline()) {
        setLoadError('Failed to load notes');
      } else {
        await offlineEntitledBootstrap();
      }
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

  const patchNoteInList = useCallback((id: string, patch: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    );
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
        notaProLocked,
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
      notaProLocked,
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
