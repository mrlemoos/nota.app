import type { Note } from '~/types/database.types';
import { createNote } from '../models/notes';
import { getBrowserClient } from './supabase/browser';
import { createLocalOnlyNote, isLikelyOnline } from './notes-offline';
import {
  dailyNoteDisplayTitle,
  localDateKey,
  resolveTodaysNoteId,
} from './todays-note';
import { useNotaPreferencesStore } from '../stores/nota-preferences';

export async function openTodaysNoteClient(options: {
  notes: Pick<Note, 'id'>[];
  userId: string;
  navigate: (to: string) => void;
  revalidate: () => void;
  notaProEntitled: boolean;
}): Promise<void> {
  const { notes, userId, navigate, revalidate, notaProEntitled } = options;
  if (!notaProEntitled) {
    return;
  }
  const at = new Date();
  const dateKey = localDateKey(at);
  const title = dailyNoteDisplayTitle(at);
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
  if (isLikelyOnline()) {
    try {
      const client = getBrowserClient();
      const {
        data: { session },
      } = await client.auth.getSession();
      if (!session?.user) {
        return;
      }
      const row = await createNote(client, session.user.id, title);
      createdId = row.id;
    } catch {
      createdId = await createLocalOnlyNote(userId, title);
    }
  } else {
    createdId = await createLocalOnlyNote(userId, title);
  }

  setDailyNoteForLocalDate(dateKey, createdId);
  navigate(`/notes/${createdId}`);
  revalidate();
}
