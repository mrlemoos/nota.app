import { useEffect, useEffectEvent } from 'react';
import { useNavigate, useRevalidator } from 'react-router';
import { openTodaysNoteClient } from './open-todays-note';
import type { Note } from '~/types/database.types';

export function useTodaysNoteShortcut(
  notes: Pick<Note, 'id'>[],
  userId: string | undefined,
  enabled: boolean,
): void {
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();

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
      navigate,
      revalidate,
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
