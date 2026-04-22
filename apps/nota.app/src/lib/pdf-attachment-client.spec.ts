import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearNoteAttachmentSignedUrlCache,
  setCachedNoteAttachmentSignedUrl,
} from './note-attachment-signed-url-cache';
import {
  ATTACHMENT_SIGNED_URL_TTL_SEC,
  classifyNoteAttachmentFile,
  getOrFetchNoteAttachmentSignedUrl,
  isImageFile,
  isPdfFile,
} from './pdf-attachment-client';

const { createSignedUrlMock } = vi.hoisted(() => ({
  createSignedUrlMock: vi.fn(),
}));

vi.mock('./supabase/browser', () => ({
  getBrowserClient: () => ({
    storage: {
      from: () => ({
        createSignedUrl: (
          path: string,
          ttl: number,
        ) => createSignedUrlMock(path, ttl),
      }),
    },
  }),
}));

describe('note attachment file classification', () => {
  it('classifies PDF by MIME type', () => {
    const file = new File([], 'doc.pdf', { type: 'application/pdf' });
    expect(isPdfFile(file)).toBe(true);
    expect(isImageFile(file)).toBe(false);
    expect(classifyNoteAttachmentFile(file)).toBe('pdf');
  });

  it('classifies PDF by extension when MIME is empty', () => {
    const file = new File([], 'report.PDF', { type: '' });
    expect(isPdfFile(file)).toBe(true);
    expect(classifyNoteAttachmentFile(file)).toBe('pdf');
  });

  it('classifies raster images by MIME', () => {
    const png = new File([], 'x.png', { type: 'image/png' });
    expect(isImageFile(png)).toBe(true);
    expect(classifyNoteAttachmentFile(png)).toBe('image');

    const webp = new File([], 'x.webp', { type: 'image/webp' });
    expect(isImageFile(webp)).toBe(true);
    expect(classifyNoteAttachmentFile(webp)).toBe('image');
  });

  it('classifies images by extension when MIME is empty', () => {
    const jpeg = new File([], 'photo.jpeg', { type: '' });
    expect(isImageFile(jpeg)).toBe(true);
    expect(classifyNoteAttachmentFile(jpeg)).toBe('image');
  });

  it('does not treat PDF as image', () => {
    const file = new File([], 'trick.pdf', { type: '' });
    expect(isPdfFile(file)).toBe(true);
    expect(isImageFile(file)).toBe(false);
  });

  it('returns null for unsupported types', () => {
    const file = new File([], 'x.exe', { type: 'application/octet-stream' });
    expect(classifyNoteAttachmentFile(file)).toBeNull();
  });
});

describe('getOrFetchNoteAttachmentSignedUrl', () => {
  beforeEach(() => {
    clearNoteAttachmentSignedUrlCache();
    createSignedUrlMock.mockReset();
  });

  afterEach(() => {
    clearNoteAttachmentSignedUrlCache();
  });

  it('returns cached URL without calling storage when cache is valid', async () => {
    // Arrange
    const id = 'f1111111-1111-4111-8111-111111111111';
    const path = 'u/x/banner.webp';
    setCachedNoteAttachmentSignedUrl(
      id,
      path,
      'https://cdn.example/signed?v=1',
      ATTACHMENT_SIGNED_URL_TTL_SEC,
    );

    // Act
    const result = await getOrFetchNoteAttachmentSignedUrl(id, path);

    // Assert
    expect(result).toEqual({
      ok: true,
      signedUrl: 'https://cdn.example/signed?v=1',
    });
    expect(createSignedUrlMock).not.toHaveBeenCalled();
  });

  it('fetches and caches when cache misses', async () => {
    // Arrange
    const id = 'f2222222-2222-4222-8222-222222222222';
    const path = 'u/x/doc.pdf';
    createSignedUrlMock.mockResolvedValue({
      data: { signedUrl: 'https://cdn.example/new' },
      error: null,
    });

    // Act
    const first = await getOrFetchNoteAttachmentSignedUrl(id, path);

    // Assert
    expect(first).toEqual({ ok: true, signedUrl: 'https://cdn.example/new' });
    expect(createSignedUrlMock).toHaveBeenCalledTimes(1);

    // Act — second call uses cache
    const second = await getOrFetchNoteAttachmentSignedUrl(id, path);

    // Assert
    expect(second).toEqual({ ok: true, signedUrl: 'https://cdn.example/new' });
    expect(createSignedUrlMock).toHaveBeenCalledTimes(1);
  });

  it('returns error when storage rejects', async () => {
    // Arrange
    createSignedUrlMock.mockResolvedValue({
      data: { signedUrl: null },
      error: { message: 'not found' },
    });

    // Act
    const result = await getOrFetchNoteAttachmentSignedUrl(
      'f3333333-3333-4333-8333-333333333333',
      'missing.pdf',
    );

    // Assert
    expect(result).toEqual({ ok: false, error: 'not found' });
  });
});
