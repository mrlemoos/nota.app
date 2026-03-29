import { useEffect } from 'react';
import { drainNotesOutbox } from './notes-offline/sync-notes';
import { useOptionalNotesData } from '../context/notes-data-context';

/**
 * Periodically drains the notes outbox when the tab is visible or the network is back.
 */
export function useNotesOfflineSync(
  userId: string | undefined,
  enabled = true,
): void {
  const notesData = useOptionalNotesData();

  useEffect(() => {
    if (!userId || !enabled) {
      return;
    }

    const run = (): void => {
      void (async () => {
        const progressed = await drainNotesOutbox(userId);
        if (progressed) {
          void notesData?.refreshNotesList();
        }
      })();
    };

    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') {
        run();
      }
    };

    window.addEventListener('online', run);
    document.addEventListener('visibilitychange', onVisibility);
    const intervalId = window.setInterval(run, 60_000);
    run();

    return () => {
      window.removeEventListener('online', run);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(intervalId);
    };
  }, [userId, enabled, notesData]);
}
