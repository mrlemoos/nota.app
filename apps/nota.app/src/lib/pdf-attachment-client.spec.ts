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
    // Arrange
    const file = new File([], 'doc.pdf', { type: 'application/pdf' });

    // Act
    const isPdf = isPdfFile(file);
    const isImage = isImageFile(file);
    const classification = classifyNoteAttachmentFile(file);

    // Assert
    expect(isPdf).toBe(true);
    expect(isImage).toBe(false);
    expect(classification).toBe('pdf');
  });

  it('classifies PDF by extension when MIME is empty', () => {
    // Arrange
    const file = new File([], 'report.PDF', { type: '' });

    // Act
    const isPdf = isPdfFile(file);
    const classification = classifyNoteAttachmentFile(file);

    // Assert
    expect(isPdf).toBe(true);
    expect(classification).toBe('pdf');
  });

  it('classifies raster images by MIME', () => {
    // Arrange
    const png = new File([], 'x.png', { type: 'image/png' });
    const webp = new File([], 'x.webp', { type: 'image/webp' });

    // Act
    const isPng = isImageFile(png);
    const pngClassification = classifyNoteAttachmentFile(png);
    const isWebp = isImageFile(webp);
    const webpClassification = classifyNoteAttachmentFile(webp);

    // Assert
    expect(isPng).toBe(true);
    expect(pngClassification).toBe('image');
    expect(isWebp).toBe(true);
    expect(webpClassification).toBe('image');
  });

  it('classifies images by extension when MIME is empty', () => {
    // Arrange
    const jpeg = new File([], 'photo.jpeg', { type: '' });

    // Act
    const isImage = isImageFile(jpeg);
    const classification = classifyNoteAttachmentFile(jpeg);

    // Assert
    expect(isImage).toBe(true);
    expect(classification).toBe('image');
  });

  it('does not treat PDF as image', () => {
    // Arrange
    const file = new File([], 'trick.pdf', { type: '' });

    // Act
    const isPdf = isPdfFile(file);
    const isImage = isImageFile(file);

    // Assert
    expect(isPdf).toBe(true);
    expect(isImage).toBe(false);
  });

  it('returns null for unsupported types', () => {
    // Arrange
    const file = new File([], 'x.exe', { type: 'application/octet-stream' });

    // Act
    const classification = classifyNoteAttachmentFile(file);

    // Assert
    expect(classification).toBeNull();
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
