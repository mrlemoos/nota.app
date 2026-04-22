const GENERIC_DETAIL = 'Something went wrong while saving the recording.';
const DETAIL_MAX_LEN = 200;

function sanitiseDetail(message: string): string {
  const t = message.trim();
  if (!t) {
    return GENERIC_DETAIL;
  }
  if (t.length <= DETAIL_MAX_LEN) {
    return t;
  }
  return `${t.slice(0, DETAIL_MAX_LEN)}…`;
}

/**
 * User-facing copy when the study recording blob fails to upload but generated notes still save.
 */
export function formatStudyRecordingUploadWarning(err: unknown): string {
  const detail =
    err instanceof Error && err.message.trim()
      ? sanitiseDetail(err.message)
      : GENERIC_DETAIL;
  return `Could not save the original recording (${detail}). Your study notes were still saved.`;
}
