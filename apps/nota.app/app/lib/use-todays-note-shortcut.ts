import { useEffect, useEffectEvent, useRef } from 'react';
import { openTodaysNoteClient } from './open-todays-note';
import type { Note } from '~/types/database.types';
import { navigateFromLegacyPath } from './app-navigation';
import { useOptionalNotesData } from '../context/notes-data-context';

export function useTodaysNoteShortcut(
  notes: Pick<Note, 'id'>[],
  userId: string | undefined,
  enabled: boolean,
  notaProEntitled: boolean,
): void {
  const notesData = useOptionalNotesData();
  const refreshRef = useRef(notesData?.refreshNotesList);
  refreshRef.current = notesData?.refreshNotesList;

  const onKeyDown = useEffectEvent((e: KeyboardEvent): void => {
    if (!enabled || !userId) {
      return;
    }

    const mod = e.metaKey || e.ctrlKey;
    if (
      !mod ||
      (e.key !== 'd' && e.key !== 'D') ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }

    const t = e.target;
    if (
      t instanceof Node &&
      (t as Element).closest?.('[data-nota-command-palette]')
    ) {
      return;
    }

    e.preventDefault();

    void openTodaysNoteClient({
      notes,
      userId,
      navigate: navigateFromLegacyPath,
      revalidate: () => {
        void refreshRef.current?.({ silent: true });
      },
      notaProEntitled,
    });
  });

  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enabled, userId, onKeyDown]);
}
