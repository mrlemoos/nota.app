import { useEffect } from 'react';
import { useRootLoaderData } from '../context/spa-session-context';
import { useNotesData } from '../context/notes-data-context';
import { isLikelyOnline } from '../lib/notes-offline';
import {
  listPendingAudioNoteJobs,
  removePendingAudioNoteJob,
} from '../lib/audio-note-pending-idb';
import { postAudioToNoteStream } from '../lib/audio-to-note-client';
import { applyAudioNoteStudyResult } from '../lib/audio-to-note-apply';
import { uploadStudyRecordingAttachment } from '../lib/pdf-attachment-client';
import { formatStudyRecordingUploadWarning } from '../lib/study-recording-upload-warning';
import { useAudioToNoteSession } from '../stores/audio-to-note-session';

/**
 * When the device is back online, processes queued audio-to-note jobs from IndexedDB.
 */
export function useAudioNotePendingDrain(enabled: boolean): void {
  const { user } = useRootLoaderData() ?? {};
  const userId = user?.id;
  const { notaProEntitled, loading, patchNoteInList, refreshNotesList } =
    useNotesData();

  useEffect(() => {
    if (!enabled || !notaProEntitled || !userId || loading) {
      return;
    }

    const drain = async (): Promise<void> => {
      if (!isLikelyOnline()) {
        return;
      }
      const jobs = await listPendingAudioNoteJobs(userId);
      for (const j of jobs) {
        try {
          const blob = new Blob([j.audio], { type: j.mime });
          const result = await postAudioToNoteStream(blob);
          let recording:
            | { attachmentId: string; filename: string }
            | undefined;
          let recordingUploadFailure: unknown;
          try {
            const att = await uploadStudyRecordingAttachment(
              j.noteId,
              userId,
              blob,
              j.mime,
            );
            recording = { attachmentId: att.id, filename: att.filename };
          } catch (e) {
            recordingUploadFailure = e;
          }
          await applyAudioNoteStudyResult({
            noteId: j.noteId,
            userId,
            result,
            recording,
            patchNoteInList,
            refreshNotesList,
          });
          if (recordingUploadFailure !== undefined) {
            const warning = formatStudyRecordingUploadWarning(
              recordingUploadFailure,
            );
            console.warn('[nota] Study recording upload failed', warning);
            useAudioToNoteSession
              .getState()
              .setRecordingAttachmentWarning(warning);
          }
          await removePendingAudioNoteJob(j.id);
        } catch {
          return;
        }
      }
    };

    void drain();
    window.addEventListener('online', drain);
    return () => window.removeEventListener('online', drain);
  }, [
    enabled,
    notaProEntitled,
    userId,
    loading,
    patchNoteInList,
    refreshNotesList,
  ]);
}
