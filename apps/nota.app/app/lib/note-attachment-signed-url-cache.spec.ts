import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ATTACHMENT_SIGNED_URL_TTL_SEC } from './pdf-attachment-client';
import {
  clearNoteAttachmentSignedUrlCache,
  getCachedNoteAttachmentSignedUrl,
  getValidNoteAttachmentSignedUrlCacheEntry,
  setCachedNoteAttachmentSignedUrl,
} from './note-attachment-signed-url-cache';

describe('note-attachment-signed-url-cache', () => {
  beforeEach(() => {
    clearNoteAttachmentSignedUrlCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearNoteAttachmentSignedUrlCache();
  });

  it('returns cached URL when within TTL margin', () => {
    // Arrange
    const id = 'a1111111-1111-4111-8111-111111111111';
    const path = 'u/test/banner.webp';
    const url = 'https://example.com/signed?token=1';
    setCachedNoteAttachmentSignedUrl(id, path, url, ATTACHMENT_SIGNED_URL_TTL_SEC);

    // Act
    const got = getCachedNoteAttachmentSignedUrl(id, path);

    // Assert
    expect(got).toBe(url);
  });

  it('returns null after simulated expiry past safety margin', () => {
    // Arrange
    const id = 'b2222222-2222-4222-8222-222222222222';
    const path = 'u/test/banner2.webp';
    const t0 = 50_000_000;
    vi.setSystemTime(t0);
    setCachedNoteAttachmentSignedUrl(id, path, 'https://x.test/u', 3600);
    const safetyMarginMs = Math.max(
      60_000,
      Math.floor(3600 * 0.15 * 1000),
    );

    // Act — valid while now < expiresAt - safetyMargin
    vi.setSystemTime(t0 + 3600 * 1000 - safetyMarginMs + 1);
    const got = getCachedNoteAttachmentSignedUrl(id, path);

    // Assert
    expect(got).toBeNull();
  });

  it('drops entry when expected storage_path does not match', () => {
    // Arrange
    const id = 'c3333333-3333-4333-8333-333333333333';
    setCachedNoteAttachmentSignedUrl(
      id,
      'old/path.webp',
      'https://x.test/old',
      ATTACHMENT_SIGNED_URL_TTL_SEC,
    );

    // Act
    const got = getCachedNoteAttachmentSignedUrl(id, 'new/path.webp');

    // Assert
    expect(got).toBeNull();
    expect(getValidNoteAttachmentSignedUrlCacheEntry(id, undefined)).toBeNull();
  });

  it('allows lookup without path when attachments are still loading', () => {
    // Arrange
    const id = 'd4444444-4444-4444-8444-444444444444';
    const path = 'u/load/later.webp';
    setCachedNoteAttachmentSignedUrl(
      id,
      path,
      'https://x.test/lazy',
      ATTACHMENT_SIGNED_URL_TTL_SEC,
    );

    // Act
    const got = getCachedNoteAttachmentSignedUrl(id, undefined);

    // Assert
    expect(got).toBe('https://x.test/lazy');
  });

  it('clear removes all entries', () => {
    // Arrange
    setCachedNoteAttachmentSignedUrl(
      'e5555555-5555-4555-8555-555555555555',
      'p.webp',
      'https://x.test/e',
      ATTACHMENT_SIGNED_URL_TTL_SEC,
    );

    // Act
    clearNoteAttachmentSignedUrlCache();
    const got = getCachedNoteAttachmentSignedUrl(
      'e5555555-5555-4555-8555-555555555555',
      undefined,
    );

    // Assert
    expect(got).toBeNull();
  });
});
