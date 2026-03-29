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
        userPreferencesFromServer.open_todays_note_shortcut
    ) {
      return;
    }
    hydratedLoaderRef.current = userPreferencesFromServer;
    hydratePreferencesFromServer(userPreferencesFromServer);
  }, [userPreferencesFromServer, hydratePreferencesFromServer]);

  useEffect(() => {
    const tryFlush = (): void => {
      if (!userId || !isLikelyOnline()) {
        return;
      }
      const { preferencesPendingSync, openTodaysNoteShortcut } =
        useNotaPreferencesStore.getState();
      if (!preferencesPendingSync) {
        return;
      }
      void (async () => {
        try {
          const client = getBrowserClient();
          const row = await upsertUserPreferences(client, userId, {
            open_todays_note_shortcut: openTodaysNoteShortcut,
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
  }, [userId, markPreferencesSynced, onServerRowCommitted]);
}

export function submitUserPreferencesToggle(
  open: boolean,
  userId: string | undefined,
  onServerRowCommitted?: (row: UserPreferences) => void,
): void {
  if (!userId || !isLikelyOnline()) {
    return;
  }
  void (async () => {
    try {
      const client = getBrowserClient();
      const row = await upsertUserPreferences(client, userId, {
        open_todays_note_shortcut: open,
      });
      useNotaPreferencesStore.getState().markPreferencesSynced(row);
      onServerRowCommitted?.(row);
    } catch {
      /* ignore */
    }
  })();
}
