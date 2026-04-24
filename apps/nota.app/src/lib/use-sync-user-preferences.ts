import { useEffect, useRef } from 'react';
import type { UserPreferences } from '~/types/database.types';
import { isLikelyOnline } from './notes-offline';
import { useNotaPreferencesStore } from '../stores/nota-preferences';
import { getBrowserClient } from './supabase/browser';
import { upsertUserPreferences } from '../models/user-preferences';

/**
 * Hydrates shortcut preference from server data, flushes pending toggles when online,
 * and notifies the notes data layer when a server row is committed.
 */
export function useSyncUserPreferences(
  userPreferencesFromServer: UserPreferences | null,
  userId: string | undefined,
  onServerRowCommitted?: (row: UserPreferences) => void,
  cloudSyncEnabled = true,
): void {
  const hydratePreferencesFromServer = useNotaPreferencesStore(
    (s) => s.hydratePreferencesFromServer,
  );
  const markPreferencesSynced = useNotaPreferencesStore(
    (s) => s.markPreferencesSynced,
  );

  const hydratedLoaderRef = useRef<UserPreferences | null>(null);

  useEffect(() => {
    if (!userPreferencesFromServer) {
      return;
    }
    if (
      hydratedLoaderRef.current &&
      hydratedLoaderRef.current.updated_at ===
        userPreferencesFromServer.updated_at &&
      hydratedLoaderRef.current.open_todays_note_shortcut ===
        userPreferencesFromServer.open_todays_note_shortcut &&
      hydratedLoaderRef.current.show_note_backlinks ===
        userPreferencesFromServer.show_note_backlinks &&
      hydratedLoaderRef.current.semantic_search_enabled ===
        userPreferencesFromServer.semantic_search_enabled &&
      hydratedLoaderRef.current.emoji_replacer_enabled ===
        userPreferencesFromServer.emoji_replacer_enabled &&
      hydratedLoaderRef.current.delete_empty_folders ===
        userPreferencesFromServer.delete_empty_folders
    ) {
      return;
    }
    hydratedLoaderRef.current = userPreferencesFromServer;
    hydratePreferencesFromServer(userPreferencesFromServer);
  }, [userPreferencesFromServer, hydratePreferencesFromServer]);

  useEffect(() => {
    const tryFlush = (): void => {
      if (!userId || !isLikelyOnline() || !cloudSyncEnabled) {
        return;
      }
      const {
        preferencesPendingSync,
        openTodaysNoteShortcut,
        showNoteBacklinks,
        semanticSearchEnabled,
        emojiReplacerEnabled,
      } = useNotaPreferencesStore.getState();
      if (!preferencesPendingSync) {
        return;
      }
      void (async () => {
        try {
          const client = getBrowserClient();
          const row = await upsertUserPreferences(client, userId, {
            open_todays_note_shortcut: openTodaysNoteShortcut,
            show_note_backlinks: showNoteBacklinks,
            semantic_search_enabled: semanticSearchEnabled,
            emoji_replacer_enabled: emojiReplacerEnabled,
          });
          markPreferencesSynced(row);
          onServerRowCommitted?.(row);
        } catch {
          /* keep pending */
        }
      })();
    };

    window.addEventListener('online', tryFlush);
    const intervalId = window.setInterval(tryFlush, 60_000);
    tryFlush();

    return () => {
      window.removeEventListener('online', tryFlush);
      window.clearInterval(intervalId);
    };
  }, [userId, markPreferencesSynced, onServerRowCommitted, cloudSyncEnabled]);
}

export type UserPreferencesSyncPatch = Pick<
  UserPreferences,
  | 'open_todays_note_shortcut'
  | 'show_note_backlinks'
  | 'semantic_search_enabled'
  | 'emoji_replacer_enabled'
  | 'delete_empty_folders'
>;

/**
 * Persists the given preference fields when online and cloud sync is enabled.
 */
export function submitUserPreferencesPatch(
  patch: Partial<UserPreferencesSyncPatch>,
  userId: string | undefined,
  onServerRowCommitted?: (row: UserPreferences) => void,
  cloudSyncEnabled = true,
): void {
  if (!userId || !isLikelyOnline() || !cloudSyncEnabled) {
    return;
  }
  if (Object.keys(patch).length === 0) {
    return;
  }
  void (async () => {
    try {
      const client = getBrowserClient();
      const row = await upsertUserPreferences(client, userId, patch);
      useNotaPreferencesStore.getState().markPreferencesSynced(row);
      onServerRowCommitted?.(row);
    } catch {
      /* ignore */
    }
  })();
}
