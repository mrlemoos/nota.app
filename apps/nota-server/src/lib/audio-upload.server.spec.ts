import { describe, expect, it } from 'bun:test';
import {
  AUDIO_UPLOAD_MAX_BYTES,
  isAllowedAudioUploadMime,
} from './audio-upload.server.ts';

describe('isAllowedAudioUploadMime', () => {
  it('allows known browser / STT types', () => {
    expect(isAllowedAudioUploadMime('audio/webm')).toBe(true);
    expect(isAllowedAudioUploadMime('video/webm')).toBe(true);
    expect(isAllowedAudioUploadMime('audio/wav')).toBe(true);
    expect(isAllowedAudioUploadMime('audio/mpeg')).toBe(true);
    expect(isAllowedAudioUploadMime('Audio/MP4')).toBe(true);
  });

  it('rejects arbitrary audio/* subtypes', () => {
    expect(isAllowedAudioUploadMime('audio/ogg')).toBe(false);
    expect(isAllowedAudioUploadMime('audio/aac')).toBe(false);
    expect(isAllowedAudioUploadMime('audio/vnd.fake')).toBe(false);
  });

  it('rejects non-audio types', () => {
    expect(isAllowedAudioUploadMime('application/octet-stream')).toBe(false);
    expect(isAllowedAudioUploadMime('text/plain')).toBe(false);
    expect(isAllowedAudioUploadMime(undefined)).toBe(false);
  });
});

describe('AUDIO_UPLOAD_MAX_BYTES', () => {
  it('is in the tens-of-megabytes range (DoS / cost guard)', () => {
    expect(AUDIO_UPLOAD_MAX_BYTES).toBeLessThanOrEqual(64 * 1024 * 1024);
    expect(AUDIO_UPLOAD_MAX_BYTES).toBeGreaterThanOrEqual(16 * 1024 * 1024);
  });
});
