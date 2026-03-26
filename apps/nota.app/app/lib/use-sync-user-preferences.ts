import { useEffect, useRef } from 'react';
import { useFetcher, useRevalidator } from 'react-router';
import type { UserPreferences } from '~/types/database.types';
import { isLikelyOnline } from './notes-offline';
import { useNotaPreferencesStore } from '../stores/nota-preferences';

export type PreferencesFetcherData =
  | { ok: true; userPreferences: UserPreferences }
  | { ok: false; error?: string }
  | { offline: true };

function buildPreferencesFormData(open: boolean): FormData {
  const fd = new FormData();
  fd.append('intent', 'updateUserPreferences');
  fd.append('openTodaysNoteShortcut', open ? 'true' : 'false');
  return fd;
}

/**
 * Hydrates shortcut preference from the notes layout loader, applies fetcher responses,
 * and retries when `pendingSync` after reconnect or on a timer (same idea as notes outbox sync).
 */
export function useSyncUserPreferences(
  userPreferencesFromLoader: UserPreferences | null,
): void {
  const fetcher = useFetcher<PreferencesFetcherData>();
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const { revalidate } = useRevalidator();
  const hydratePreferencesFromServer = useNotaPreferencesStore(
    (s) => s.hydratePreferencesFromServer,
  );
  const markPreferencesSynced = useNotaPreferencesStore(
    (s) => s.markPreferencesSynced,
  );

  const hydratedLoaderRef = useRef<UserPreferences | null>(null);

  useEffect(() => {
    if (!userPreferencesFromLoader) {
      return;
    }
    if (
      hydratedLoaderRef.current &&
      hydratedLoaderRef.current.updated_at ===
        userPreferencesFromLoader.updated_at &&
      hydratedLoaderRef.current.open_todays_note_shortcut ===
        userPreferencesFromLoader.open_todays_note_shortcut
    ) {
      return;
    }
    hydratedLoaderRef.current = userPreferencesFromLoader;
    hydratePreferencesFromServer(userPreferencesFromLoader);
  }, [userPreferencesFromLoader, hydratePreferencesFromServer]);

  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) {
      return;
    }
    if ('offline' in fetcher.data) {
      return;
    }
    if (fetcher.data.ok && 'userPreferences' in fetcher.data) {
      markPreferencesSynced(fetcher.data.userPreferences);
      void revalidate();
    }
  }, [fetcher.state, fetcher.data, markPreferencesSynced, revalidate]);

  useEffect(() => {
    const tryFlush = (): void => {
      const f = fetcherRef.current;
      if (f.state !== 'idle') {
        return;
      }
      const { preferencesPendingSync, openTodaysNoteShortcut } =
        useNotaPreferencesStore.getState();
      if (!preferencesPendingSync || !isLikelyOnline()) {
        return;
      }
      f.submit(buildPreferencesFormData(openTodaysNoteShortcut), {
        method: 'post',
        action: '/notes',
      });
    };

    window.addEventListener('online', tryFlush);
    const intervalId = window.setInterval(tryFlush, 60_000);
    tryFlush();

    return () => {
      window.removeEventListener('online', tryFlush);
      window.clearInterval(intervalId);
    };
  }, []);
}

export function submitUserPreferencesToggle(
  fetcher: ReturnType<typeof useFetcher<PreferencesFetcherData>>,
  open: boolean,
): void {
  if (!isLikelyOnline()) {
    return;
  }
  fetcher.submit(buildPreferencesFormData(open), {
    method: 'post',
    action: '/notes',
  });
}
