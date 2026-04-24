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

/**
 * Opens or creates the user's **root** daily note for the local calendar day
 * (same mapping rules as Mod+D). Returns the note id, or `null` if not entitled.
 */
export async function ensureTodaysRootNoteId(options: {
  notes: Pick<Note, 'id' | 'folder_id'>[];
  userId: string;
  notaProEntitled: boolean;
}): Promise<string | null> {
  const { notes, userId, notaProEntitled } = options;
  if (!notaProEntitled) {
    return null;
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
    return existingId;
  }

  clearDailyNoteForLocalDate(dateKey);

  let createdId: string;
  if (isLikelyOnline()) {
    try {
      const client = getBrowserClient();
      const row = await createNote(client, userId, title, undefined, {
        folder_id: null,
      });
      createdId = row.id;
    } catch {
      createdId = await createLocalOnlyNote(userId, title, undefined, null);
    }
  } else {
    createdId = await createLocalOnlyNote(userId, title, undefined, null);
  }

  setDailyNoteForLocalDate(dateKey, createdId);
  return createdId;
}

export async function openTodaysNoteClient(options: {
  notes: Pick<Note, 'id' | 'folder_id'>[];
  userId: string;
  navigate: (to: string) => void;
  revalidate: () => void;
  notaProEntitled: boolean;
}): Promise<void> {
  const { navigate, revalidate, ...rest } = options;
  const id = await ensureTodaysRootNoteId(rest);
  if (!id) {
    return;
  }
  navigate(`/notes/${id}`);
  revalidate();
}
