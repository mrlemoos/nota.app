import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Folder, Note, UserPreferences } from '~/types/database.types';
import { getBrowserClient , isSupabaseClerkGetTokenRegistered } from '../lib/supabase/browser';
import {
  isLikelyOnline,
  listStoredNotes,
  mergeNoteLists,
  putServerNoteIfNotDirty,
  storedNoteToListRow,
} from '@/lib/notes-offline';
import { syncServerNotesToIdbInChunks } from '../lib/sync-server-notes-to-idb';
import { listFolders } from '../models/folders';
import { listNotes } from '../models/notes';
import { getUserPreferences } from '../models/user-preferences';
import { isClerkAccessTokenGetterRegistered } from '../lib/clerk-token-ref';
import { fetchNotaProEntitled } from '../lib/nota-server-client';
import {
  readNotaServerEntitledSession,
  syncNotaServerEntitledSession,
} from '../lib/nota-pro-entitled-session';
import { setAppHash } from '../lib/app-navigation';
import { runWelcomeNoteSeedIfNeeded } from '../lib/welcome-note-seed';
import { clearNoteAttachmentSignedUrlCache } from '../lib/note-attachment-signed-url-cache';
import { useAppSession } from './session-context';

export type RefreshNotesListOptions = {
  /**
   * When true, refresh list data without toggling global `loading` (avoids shell flash and
   * effect churn from `useNotesOfflineSync` / follow-up fetches).
   */
  silent?: boolean;
};

export type NotesDataContextValue = {
  /** Server-confirmed active subscription (Nota Pro entitlement): vault, cloud, sync. */
  notaProEntitled: boolean;
  notes: Note[];
  folders: Folder[];
  userPreferences: UserPreferences | null;
  loadError?: string;
  loading: boolean;
  refreshNotesList: (options?: RefreshNotesListOptions) => Promise<void>;
  patchNoteInList: (id: string, patch: Partial<Note>) => void;
  removeNoteFromList: (id: string) => void;
  insertNoteAtFront: (note: Note) => void;
  insertFolderSorted: (folder: Folder) => void;
  removeFolderFromList: (id: string) => void;
  patchFolderInList: (id: string, patch: Partial<Folder>) => void;
  setUserPreferencesInState: (row: UserPreferences | null) => void;
};

export type NotesDataActionsSlice = Pick<
  NotesDataContextValue,
  | 'refreshNotesList'
  | 'patchNoteInList'
  | 'removeNoteFromList'
  | 'insertNoteAtFront'
  | 'insertFolderSorted'
  | 'removeFolderFromList'
  | 'patchFolderInList'
  | 'setUserPreferencesInState'
>;

export type NotesDataVaultSlice = Pick<NotesDataContextValue, 'notes' | 'folders'>;

export type NotesDataMetaSlice = Pick<
  NotesDataContextValue,
  'notaProEntitled' | 'loading' | 'userPreferences' | 'loadError'
>;

export const NotesDataActionsContext = createContext<NotesDataActionsSlice | null>(
  null,
);
export const NotesDataVaultContext = createContext<NotesDataVaultSlice | null>(
  null,
);
export const NotesDataMetaContext = createContext<NotesDataMetaSlice | null>(
  null,
);

function requireNotesDataProviderValue<T>(value: T | null | undefined): T {
  if (value == null) {
    throw new Error('NotesDataProvider is required');
  }
  return value;
}

type FullNotesDataSlices = {
  actions: NotesDataActionsSlice;
  vault: NotesDataVaultSlice;
  meta: NotesDataMetaSlice;
};

function parseFullNotesDataSlices(
  actions: NotesDataActionsSlice | null,
  vault: NotesDataVaultSlice | null,
  meta: NotesDataMetaSlice | null,
): FullNotesDataSlices | null {
  if (!actions || !vault || !meta) {
    return null;
  }
  return { actions, vault, meta };
}

function requireFullNotesDataSlices(
  actions: NotesDataActionsSlice | null,
  vault: NotesDataVaultSlice | null,
  meta: NotesDataMetaSlice | null,
): FullNotesDataSlices {
  return requireNotesDataProviderValue(parseFullNotesDataSlices(actions, vault, meta));
}

async function waitForClerkBridge(maxMs = 600): Promise<void> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (
      isClerkAccessTokenGetterRegistered() &&
      isSupabaseClerkGetTokenRegistered()
    ) {
      return;
    }
    await new Promise((r) => setTimeout(r, 16));
  }
}

export function NotesDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAppSession();
  const userId = user?.id;

  const [notaProEntitled, setNotaProEntitled] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [userPreferences, setUserPreferences] =
    useState<UserPreferences | null>(null);
  const welcomeSeeded = userPreferences?.welcome_seeded === true;
  const [loadError, setLoadError] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const didRetryEmptyVaultAfterWelcomeSeededRef = useRef(false);
  const refreshChainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    didRetryEmptyVaultAfterWelcomeSeededRef.current = false;
    refreshChainRef.current = Promise.resolve();
    clearNoteAttachmentSignedUrlCache();
  }, [userId]);

  const refreshNotesList = useCallback(
    async (options?: RefreshNotesListOptions) => {
      const silent = options?.silent === true;

      const perform = async (): Promise<void> => {
        if (!userId) {
          if (!silent) {
            setLoading(false);
          }
          setNotaProEntitled(false);
          setNotes([]);
          setFolders([]);
          setUserPreferences(null);
          return;
        }

        await waitForClerkBridge();

        if (!silent) {
          setLoading(true);
        }
        setLoadError(undefined);

        const defaultPrefs = (): UserPreferences => ({
          user_id: userId,
          locale: null,
          open_todays_note_shortcut: false,
          show_note_backlinks: true,
          semantic_search_enabled: true,
          emoji_replacer_enabled: true,
          welcome_seeded: false,
          delete_empty_folders: true,
          updated_at: new Date(0).toISOString(),
        });

    const bootstrapVaultFromIdb = async (): Promise<void> => {
      const stored = await listStoredNotes(userId);
      const active = stored.filter((r) => !r.pending_delete);
      const merged = active
        .map(storedNoteToListRow)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      setNotes(merged);
      setFolders([]);
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
          setFolders([]);
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
        setFolders([]);
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
        if (!silent) {
          setLoading(false);
        }
        return;
      }

      if (!entRes.ok) {
        await recoverAfterEntitlementFetchFailure();
        if (!silent) {
          setLoading(false);
        }
        return;
      }

      const entJson = (await entRes.json()) as { entitled?: boolean };
      const entitled = entJson.entitled === true;
      syncNotaServerEntitledSession(entitled);

      if (!entitled) {
        setNotaProEntitled(false);
        setNotes([]);
        setFolders([]);
        setUserPreferences(null);
        if (!silent) {
          setLoading(false);
        }
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

      let serverFolders: Folder[] = [];
      try {
        serverFolders = await listFolders(client);
      } catch (e) {
        console.error('Failed to load folders:', e);
      }
      setFolders(serverFolders);

      let prefs: UserPreferences;
      try {
        prefs = await getUserPreferences(client, userId);
      } catch (e) {
        console.error('Failed to load user preferences:', e);
        prefs = defaultPrefs();
      }
      setUserPreferences(prefs);

      await syncServerNotesToIdbInChunks(userId, serverNotes, putServerNoteIfNotDirty);
      const stored = await listStoredNotes(userId);
      setNotes(mergeNoteLists(serverNotes, stored));
    } catch (e) {
      console.error(e);
      await recoverAfterEntitlementFetchFailure();
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
      };

      const queued = refreshChainRef.current.then(perform);
      refreshChainRef.current = queued.catch(() => undefined);
      await queued;
    },
    [userId],
  );

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
        void refreshNotesList({ silent: true });
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [userId, refreshNotesList]);

  useEffect(() => {
    if (!userId || loading || !notaProEntitled) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const id = await runWelcomeNoteSeedIfNeeded({
        userId,
        welcomeSeeded,
        notesCount: notes.length,
      });
      if (cancelled) {
        return;
      }
      if (id) {
        didRetryEmptyVaultAfterWelcomeSeededRef.current = false;
        await refreshNotesList({ silent: true });
        if (cancelled) {
          return;
        }
        setAppHash({ kind: 'notes', panel: 'note', noteId: id });
        return;
      }
      if (
        welcomeSeeded &&
        notes.length === 0 &&
        !didRetryEmptyVaultAfterWelcomeSeededRef.current
      ) {
        didRetryEmptyVaultAfterWelcomeSeededRef.current = true;
        await refreshNotesList({ silent: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    userId,
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

  const insertFolderSorted = useCallback((folder: Folder) => {
    setFolders((prev) => {
      const next = [...prev.filter((f) => f.id !== folder.id), folder];
      next.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      );
      return next;
    });
  }, []);

  const removeFolderFromList = useCallback((id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const patchFolderInList = useCallback((id: string, patch: Partial<Folder>) => {
    setFolders((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx === -1) {
        return prev;
      }
      const merged = { ...prev[idx], ...patch };
      const next = [...prev];
      next[idx] = merged;
      next.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      );
      return next;
    });
  }, []);

  const actionsValue = useMemo(
    () =>
      ({
        refreshNotesList,
        patchNoteInList,
        removeNoteFromList,
        insertNoteAtFront,
        insertFolderSorted,
        removeFolderFromList,
        patchFolderInList,
        setUserPreferencesInState: setUserPreferences,
      }) satisfies NotesDataActionsSlice,
    [
      refreshNotesList,
      patchNoteInList,
      removeNoteFromList,
      insertNoteAtFront,
      insertFolderSorted,
      removeFolderFromList,
      patchFolderInList,
    ],
  );

  const vaultValue = useMemo(
    (): NotesDataVaultSlice => ({
      notes,
      folders,
    }),
    [notes, folders],
  );

  const metaValue = useMemo(
    () =>
      ({
        notaProEntitled,
        loading,
        userPreferences,
        loadError,
      }) satisfies NotesDataMetaSlice,
    [notaProEntitled, loading, userPreferences, loadError],
  );

  return (
    <NotesDataActionsContext.Provider value={actionsValue}>
      <NotesDataMetaContext.Provider value={metaValue}>
        <NotesDataVaultContext.Provider value={vaultValue}>
          {children}
        </NotesDataVaultContext.Provider>
      </NotesDataMetaContext.Provider>
    </NotesDataActionsContext.Provider>
  );
}

export function useNotesDataActions(): NotesDataActionsSlice {
  return requireNotesDataProviderValue(use(NotesDataActionsContext));
}

export function useNotesDataVault(): NotesDataVaultSlice {
  return requireNotesDataProviderValue(use(NotesDataVaultContext));
}

export function useNotesDataMeta(): NotesDataMetaSlice {
  return requireNotesDataProviderValue(use(NotesDataMetaContext));
}

function useMergedNotesData(
  actions: NotesDataActionsSlice,
  vault: NotesDataVaultSlice,
  meta: NotesDataMetaSlice,
): NotesDataContextValue {
  return useMemo(
    () => ({
      ...actions,
      ...vault,
      ...meta,
    }),
    [actions, vault, meta],
  );
}

export function useNotesData(): NotesDataContextValue {
  const slices = requireFullNotesDataSlices(
    use(NotesDataActionsContext),
    use(NotesDataVaultContext),
    use(NotesDataMetaContext),
  );
  return useMergedNotesData(slices.actions, slices.vault, slices.meta);
}

export function useOptionalNotesData(): NotesDataContextValue | null {
  const actions = use(NotesDataActionsContext);
  const vault = use(NotesDataVaultContext);
  const meta = use(NotesDataMetaContext);
  const slices = parseFullNotesDataSlices(actions, vault, meta);
  return useMemo((): NotesDataContextValue | null => {
    if (!slices) {
      return null;
    }
    return {
      ...slices.actions,
      ...slices.vault,
      ...slices.meta,
    };
  }, [slices]);
}

/**
 * Meta slice only when the full notes tree is mounted; for gates that must not
 * subscribe to `notes` churn (e.g. command palette shell).
 */
export function useOptionalNotesDataMeta(): NotesDataMetaSlice | null {
  const slices = parseFullNotesDataSlices(
    use(NotesDataActionsContext),
    use(NotesDataVaultContext),
    use(NotesDataMetaContext),
  );
  if (!slices) {
    return null;
  }
  return slices.meta;
}

export function useOptionalNotesDataActions(): NotesDataActionsSlice | null {
  const slices = parseFullNotesDataSlices(
    use(NotesDataActionsContext),
    use(NotesDataVaultContext),
    use(NotesDataMetaContext),
  );
  if (!slices) {
    return null;
  }
  return slices.actions;
}
