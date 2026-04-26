import { create } from 'zustand';

export type AudioToNotePhase = 'idle' | 'recording' | 'processing' | 'error';

type State = {
  recordingSessionId: number;
  phase: AudioToNotePhase;
  noteId: string | null;
  /** When true, merge into the note body and keep the existing title. */
  appendToExisting: boolean;
  streamPreview: string;
  error: string | null;
  statusLine: string;
  /** Shown in shell when recording storage upload fails but study notes still save. */
  recordingAttachmentWarning: string | null;
  reset: () => void;
  beginSession: (noteId: string, options?: { append?: boolean }) => void;
  setProcessing: (line: string) => void;
  appendPreview: (chunk: string) => void;
  setError: (message: string) => void;
  setRecordingAttachmentWarning: (message: string | null) => void;
};

export const useAudioToNoteSession = create<State>((set) => ({
  recordingSessionId: 0,
  phase: 'idle',
  noteId: null,
  appendToExisting: false,
  streamPreview: '',
  error: null,
  statusLine: '',
  recordingAttachmentWarning: null,
  reset: () =>
    { set({
      phase: 'idle',
      noteId: null,
      appendToExisting: false,
      streamPreview: '',
      error: null,
      statusLine: '',
      recordingAttachmentWarning: null,
    }); },
  beginSession: (noteId, options) =>
    { set((s) => ({
      phase: 'recording',
      noteId,
      appendToExisting: Boolean(options?.append),
      recordingSessionId: s.recordingSessionId + 1,
      streamPreview: '',
      error: null,
      statusLine: 'Requesting microphone…',
      recordingAttachmentWarning: null,
    })); },
  setProcessing: (line) =>
    { set({ phase: 'processing', statusLine: line, streamPreview: '' }); },
  appendPreview: (chunk) =>
    { set((s) => ({
      streamPreview: s.streamPreview + chunk,
    })); },
  setError: (message) =>
    { set({ phase: 'error', error: message, statusLine: '' }); },
  setRecordingAttachmentWarning: (message) =>
    { set({ recordingAttachmentWarning: message }); },
}));
