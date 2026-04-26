import type { Note } from '~/types/database.types';
import { setAppHash } from './app-navigation';
import { getBrowserClient } from './supabase/browser';
import { createLocalOnlyNote, isLikelyOnline } from './notes-offline';
import { createNote } from '../models/notes';
import { useAudioToNoteSession } from '../stores/audio-to-note-session';
import { studyNotePlaceholderRecordingTitle } from './study-note-title';

/**
 * Creates a note and opens the assistive audio-to-note capture session (microphone + upload).
 */
export async function startStudyNotesFromRecording(options: {
  userId: string;
  notaProEntitled: boolean;
  insertNoteAtFront: (n: Note) => void;
  refreshNotesList: (o?: { silent?: boolean }) => Promise<void>;
}): Promise<void> {
  if (!options.notaProEntitled || !options.userId) {
    return;
  }

  const goToNote = (id: string): void => {
    setAppHash({ kind: 'notes', panel: 'note', noteId: id });
  };

  if (!isLikelyOnline()) {
    const id = await createLocalOnlyNote(
      options.userId,
      studyNotePlaceholderRecordingTitle(),
    );
    goToNote(id);
    await options.refreshNotesList({ silent: true });
    useAudioToNoteSession.getState().beginSession(id);
    return;
  }

  const c = getBrowserClient();
  try {
    const row = await createNote(c, options.userId, studyNotePlaceholderRecordingTitle());
    options.insertNoteAtFront(row);
    goToNote(row.id);
    await options.refreshNotesList({ silent: true });
    useAudioToNoteSession.getState().beginSession(row.id);
  } catch {
    const id = await createLocalOnlyNote(
      options.userId,
      studyNotePlaceholderRecordingTitle(),
    );
    goToNote(id);
    await options.refreshNotesList({ silent: true });
    useAudioToNoteSession.getState().beginSession(id);
  }
}

/**
 * Starts assistive capture for the note already open in the shell: merges generated
 * content after the existing body and keeps the current title.
 */
export function startStudyNotesAppendToOpenNote(options: {
  userId: string;
  notaProEntitled: boolean;
  openNoteId: string;
}): void {
  if (!options.notaProEntitled || !options.userId || !options.openNoteId) {
    return;
  }
  useAudioToNoteSession
    .getState()
    .beginSession(options.openNoteId, { append: true });
}
