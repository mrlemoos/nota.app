import {
  useEffect,
  useRef,
  useCallback,
  useState,
  type JSX,
} from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRootLoaderData } from '../context/spa-session-context';
import { useNotesData } from '../context/notes-data-context';
import { postAudioToNoteStream } from '../lib/audio-to-note-client';
import { applyAudioNoteStudyResult } from '../lib/audio-to-note-apply';
import { uploadStudyRecordingAttachment } from '../lib/pdf-attachment-client';
import { isLikelyOnline, saveLocalNoteDraft } from '../lib/notes-offline';
import { enqueuePendingAudioNoteJob } from '../lib/audio-note-pending-idb';
import { useAudioToNoteSession } from '../stores/audio-to-note-session';
import { formatStudyRecordingUploadWarning } from '../lib/study-recording-upload-warning';
import { formatRecordingDuration } from '../lib/format-recording-duration';
import { studyNotePlaceholderQueuedTitle } from '../lib/study-note-title';

function pickRecorderMime(): string | undefined {
  /** WebM/Opus first: Chromium MP4/M4A recordings are often rejected by xAI STT; we WAV-transcode for STT anyway. */
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ];
  for (const t of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return undefined;
}

type RecorderSession = {
  rec: MediaRecorder;
  chunks: Blob[];
  stream: MediaStream;
};

const RECORDING_STATUS = 'Recording… press Stop when you are finished.';
const PAUSED_STATUS = 'Paused. Resume when you are ready to continue.';

export function AudioToNoteDock(): JSX.Element | null {
  const { user } = useRootLoaderData() ?? { user: null };
  const userId = user?.id ?? null;
  const { patchNoteInList, refreshNotesList } = useNotesData();

  const phase = useAudioToNoteSession((s) => s.phase);
  const recordingSessionId = useAudioToNoteSession((s) => s.recordingSessionId);
  const noteId = useAudioToNoteSession((s) => s.noteId);
  const statusLine = useAudioToNoteSession((s) => s.statusLine);
  const streamPreview = useAudioToNoteSession((s) => s.streamPreview);
  const error = useAudioToNoteSession((s) => s.error);

  const setProcessing = useAudioToNoteSession((s) => s.setProcessing);
  const appendPreview = useAudioToNoteSession((s) => s.appendPreview);
  const setError = useAudioToNoteSession((s) => s.setError);
  const reset = useAudioToNoteSession((s) => s.reset);

  const sessionRef = useRef<RecorderSession | null>(null);
  const elapsedActiveMsRef = useRef(0);
  const activeSegmentStartRef = useRef(0);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pauseSupported, setPauseSupported] = useState(false);
  const [recorderPaused, setRecorderPaused] = useState(false);

  const runPipeline = useCallback(
    async (blob: Blob, mime: string, targetNoteId: string, uid: string) => {
      const appendToExisting =
        useAudioToNoteSession.getState().appendToExisting;
      if (!isLikelyOnline()) {
        const buf = await blob.arrayBuffer();
        await enqueuePendingAudioNoteJob({
          noteId: targetNoteId,
          userId: uid,
          audio: buf,
          mime: mime || blob.type || 'audio/webm',
          ...(appendToExisting ? { append: true } : {}),
        });
        if (!appendToExisting) {
          const queuedTitle = studyNotePlaceholderQueuedTitle();
          await saveLocalNoteDraft(uid, {
            id: targetNoteId,
            title: queuedTitle,
          });
          patchNoteInList(targetNoteId, { title: queuedTitle });
        }
        await refreshNotesList({ silent: true });
        reset();
        return;
      }

      try {
        setProcessing('Uploading and transcribing…');
        const result = await postAudioToNoteStream(blob, {
          onEvent: (ev) => {
            if (ev.event === 'notes_delta') {
              appendPreview(ev.data.text);
            }
          },
        });
        setProcessing('Saving recording…');
        let recording:
          | { attachmentId: string; filename: string }
          | undefined;
        let recordingUploadFailure: unknown;
        try {
          const att = await uploadStudyRecordingAttachment(
            targetNoteId,
            uid,
            blob,
            mime || blob.type || 'audio/webm',
          );
          recording = { attachmentId: att.id, filename: att.filename };
        } catch (e) {
          recordingUploadFailure = e;
        }
        await applyAudioNoteStudyResult({
          noteId: targetNoteId,
          userId: uid,
          result,
          recording,
          patchNoteInList,
          refreshNotesList,
          mode: appendToExisting ? 'append' : 'replace',
        });
        reset();
        if (recordingUploadFailure !== undefined) {
          const warning = formatStudyRecordingUploadWarning(
            recordingUploadFailure,
          );
          console.warn('[nota] Study recording upload failed', warning);
          useAudioToNoteSession
            .getState()
            .setRecordingAttachmentWarning(warning);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not generate study notes';
        setError(msg);
      }
    },
    [
      appendPreview,
      patchNoteInList,
      refreshNotesList,
      reset,
      setError,
      setProcessing,
    ],
  );

  const stopRecording = useCallback(() => {
    const s = sessionRef.current;
    if (!s) {
      return;
    }
    const { rec, chunks, stream } = s;
    rec.onstop = () => {
      const mime = rec.mimeType || 'audio/webm';
      const blob = new Blob(chunks, { type: mime });
      stream.getTracks().forEach((t) => t.stop());
      sessionRef.current = null;
      const nid = useAudioToNoteSession.getState().noteId;
      const uid = userId;
      if (nid && uid) {
        void runPipeline(blob, mime, nid, uid);
      } else {
        reset();
      }
    };
    rec.stop();
  }, [reset, runPipeline, userId]);

  const cancelRecording = useCallback(() => {
    const s = sessionRef.current;
    if (!s) {
      reset();
      return;
    }
    const { rec, stream } = s;
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      sessionRef.current = null;
      reset();
    };
    if (rec.state !== 'inactive') {
      rec.stop();
    } else {
      stream.getTracks().forEach((t) => t.stop());
      sessionRef.current = null;
      reset();
    }
  }, [reset]);

  const togglePauseResume = useCallback(() => {
    const s = sessionRef.current;
    if (!s) {
      return;
    }
    const { rec } = s;
    if (typeof rec.pause !== 'function' || typeof rec.resume !== 'function') {
      return;
    }
    if (rec.state === 'recording') {
      elapsedActiveMsRef.current += performance.now() - activeSegmentStartRef.current;
      try {
        rec.pause();
      } catch {
        return;
      }
      setRecorderPaused(true);
      useAudioToNoteSession.setState({ statusLine: PAUSED_STATUS });
    } else if (rec.state === 'paused') {
      try {
        rec.resume();
      } catch {
        return;
      }
      activeSegmentStartRef.current = performance.now();
      setRecorderPaused(false);
      useAudioToNoteSession.setState({ statusLine: RECORDING_STATUS });
    }
  }, []);

  useEffect(() => {
    if (phase !== 'recording') {
      setPauseSupported(false);
      setRecorderPaused(false);
      setElapsedSeconds(0);
      return;
    }

    const id = window.setInterval(() => {
      const s = sessionRef.current;
      if (!s) {
        return;
      }
      const { rec } = s;
      const now = performance.now();
      const activeMs =
        elapsedActiveMsRef.current +
        (rec.state === 'recording' ? now - activeSegmentStartRef.current : 0);
      setElapsedSeconds(Math.floor(activeMs / 1000));
    }, 250);

    return () => window.clearInterval(id);
  }, [phase, recordingSessionId, recorderPaused]);

  useEffect(() => {
    if (phase !== 'recording' || !noteId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const mime = pickRecorderMime();
        const rec = mime
          ? new MediaRecorder(stream, { mimeType: mime })
          : new MediaRecorder(stream);
        const chunks: Blob[] = [];
        rec.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        rec.start(1000);
        sessionRef.current = { rec, chunks, stream };
        elapsedActiveMsRef.current = 0;
        activeSegmentStartRef.current = performance.now();
        setRecorderPaused(false);
        setPauseSupported(
          typeof rec.pause === 'function' && typeof rec.resume === 'function',
        );
        useAudioToNoteSession.setState({
          statusLine: RECORDING_STATUS,
        });
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : 'Microphone permission is required.';
        setError(msg);
      }
    })();

    return () => {
      cancelled = true;
      const s = sessionRef.current;
      if (s) {
        s.stream.getTracks().forEach((t) => t.stop());
        if (s.rec.state !== 'inactive') {
          s.rec.stop();
        }
        sessionRef.current = null;
      }
    };
  }, [noteId, phase, recordingSessionId, setError]);

  if (phase === 'idle') {
    return null;
  }

  return (
    <div
      className={cn(
        'pointer-events-auto fixed bottom-4 left-1/2 z-50 w-[min(100%-2rem,28rem)] -translate-x-1/2',
        'rounded-lg border border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur',
        'text-sm text-foreground',
      )}
      role="region"
      aria-label="Assistive study notes from recording"
    >
      {phase === 'error' && error ? (
        <div className="flex flex-col gap-2">
          <p className="text-destructive">{error}</p>
          <Button type="button" size="sm" variant="secondary" onClick={() => reset()}>
            Dismiss
          </Button>
        </div>
      ) : null}

      {phase === 'recording' ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className="font-medium tabular-nums tracking-tight text-foreground"
              aria-live="polite"
              aria-atomic="true"
            >
              {formatRecordingDuration(elapsedSeconds)}
            </span>
            {pauseSupported ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={togglePauseResume}
                aria-label={recorderPaused ? 'Resume recording' : 'Pause recording'}
              >
                {recorderPaused ? 'Resume' : 'Pause'}
              </Button>
            ) : null}
          </div>
          <p className="text-muted-foreground">{statusLine}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="default"
              onClick={stopRecording}
              aria-label="Stop recording and generate study notes"
            >
              Stop and generate
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={cancelRecording}
              aria-label="Cancel recording without saving"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {phase === 'processing' ? (
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground">{statusLine}</p>
          {streamPreview ? (
            <pre
              className={cn(
                'max-h-32 overflow-y-auto rounded-md bg-muted/40 p-2',
                'text-xs text-muted-foreground whitespace-pre-wrap',
              )}
            >
              {streamPreview}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
