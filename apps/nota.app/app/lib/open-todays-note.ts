import type { Note } from '~/types/database.types';
import { createNote } from '../models/notes';
import { getBrowserClient } from './supabase/browser';
import { createLocalOnlyNote, isLikelyOnline } from './notes-offline';
import { localDateKey, resolveTodaysNoteId } from './todays-note';
import { useNotaPreferencesStore } from '../stores/nota-preferences';

export async function openTodaysNoteClient(options: {
  notes: Pick<Note, 'id'>[];
  userId: string;
  navigate: (to: string) => void;
  revalidate: () => void;
  notaProEntitled: boolean;
}): Promise<void> {
  const { notes, userId, navigate, revalidate, notaProEntitled } = options;
  const dateKey = localDateKey(new Date());
  const {
    dailyNoteIdByLocalDate,
    clearDailyNoteForLocalDate,
    setDailyNoteForLocalDate,
  } = useNotaPreferencesStore.getState();

  const existingId = resolveTodaysNoteId(
    notes,
    dailyNoteIdByLocalDate,
    dateKey,
  );
  if (existingId) {
    navigate(`/notes/${existingId}`);
    return;
  }

  clearDailyNoteForLocalDate(dateKey);

  let createdId: string;
  if (isLikelyOnline() && notaProEntitled) {
    try {
      const client = getBrowserClient();
      const {
        data: { session },
      } = await client.auth.getSession();
      if (!session?.user) {
        return;
      }
      const row = await createNote(client, session.user.id);
      createdId = row.id;
    } catch {
      createdId = await createLocalOnlyNote(userId);
    }
  } else {
    createdId = await createLocalOnlyNote(userId);
  }

  setDailyNoteForLocalDate(dateKey, createdId);
  navigate(`/notes/${createdId}`);
  revalidate();
}
