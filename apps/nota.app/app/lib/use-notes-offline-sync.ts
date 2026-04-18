import { useEffect, useRef } from 'react';
import { drainNotesOutbox } from './notes-offline/sync-notes';
import { useOptionalNotesDataActions } from '../context/notes-data-context';
import { subscribeOnline } from './browser-connectivity';

/**
 * Periodically drains the notes outbox when the tab is visible or the network is back.
 */
export function useNotesOfflineSync(
  userId: string | undefined,
  enabled = true,
): void {
  const actions = useOptionalNotesDataActions();
  const refreshRef = useRef(actions?.refreshNotesList);
  refreshRef.current = actions?.refreshNotesList;

  useEffect(() => {
    if (!userId || !enabled) {
      return;
    }

    const run = (): void => {
      void (async () => {
        const progressed = await drainNotesOutbox(userId);
        if (progressed) {
          void refreshRef.current?.({ silent: true });
        }
      })();
    };

    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') {
        run();
      }
    };

    const offOnline = subscribeOnline(run);
    document.addEventListener('visibilitychange', onVisibility);
    const intervalId = window.setInterval(run, 60_000);
    run();

    return () => {
      offOnline();
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(intervalId);
    };
  }, [userId, enabled]);
}
