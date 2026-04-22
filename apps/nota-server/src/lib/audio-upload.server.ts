/**
 * Assistive audio-to-note: strict MIME allowlist and upload size cap (multer + handler).
 * Browsers often send `video/webm` for MediaRecorder captures.
 */
export const AUDIO_UPLOAD_MAX_BYTES = 40 * 1024 * 1024;

const ALLOWED_AUDIO_UPLOAD_MIMES = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-m4a',
  'audio/mp3',
  'video/webm',
]);

export function isAllowedAudioUploadMime(mimetype: string | undefined): boolean {
  if (!mimetype) {
    return false;
  }
  return ALLOWED_AUDIO_UPLOAD_MIMES.has(mimetype.toLowerCase());
}
