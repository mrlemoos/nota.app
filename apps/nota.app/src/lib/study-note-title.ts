import { dailyNoteDisplayTitle } from './todays-note';

const GENERIC_MODEL_TITLES = new Set(
  ['study notes', 'lecture notes', 'notes', 'untitled note'].map((s) =>
    s.toLowerCase(),
  ),
);

function isUsableTopicTitle(raw: string): boolean {
  const t = raw.trim();
  if (!t) {
    return false;
  }
  return !GENERIC_MODEL_TITLES.has(t.toLowerCase());
}

/**
 * Sidebar title for assistive audio study notes: daily-style date from note creation,
 * optional Grok topic after an em dash when it is specific enough.
 */
export function formatStudyNoteTitle(
  noteCreatedAtIso: string,
  modelTitle: string,
): string {
  const d = new Date(noteCreatedAtIso);
  const base = `Study note: ${dailyNoteDisplayTitle(d)}`;
  const topic = modelTitle.trim();
  if (isUsableTopicTitle(topic)) {
    return `${base} — ${topic}`;
  }
  return base;
}

/** Title shown while recording before generation completes (uses today’s local date). */
export function studyNotePlaceholderRecordingTitle(): string {
  return `Study note: ${dailyNoteDisplayTitle(new Date())} — recording`;
}

/** Title when the job is queued offline for sync. */
export function studyNotePlaceholderQueuedTitle(): string {
  return `Study note: ${dailyNoteDisplayTitle(new Date())} — queued for sync`;
}
