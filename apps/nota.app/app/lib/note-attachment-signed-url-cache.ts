import { ATTACHMENT_SIGNED_URL_TTL_SEC } from './pdf-attachment-client';

export type NoteAttachmentSignedUrlCacheEntry = {
  signedUrl: string;
  storagePath: string;
  expiresAtMs: number;
};

const cacheByAttachmentId = new Map<string, NoteAttachmentSignedUrlCacheEntry>();

/** Same idea as banner refresh: refresh before the token is close to expiry. */
function safetyMarginMs(): number {
  return Math.max(60_000, Math.floor(ATTACHMENT_SIGNED_URL_TTL_SEC * 0.15 * 1000));
}

function isStillUsable(entry: NoteAttachmentSignedUrlCacheEntry, now: number): boolean {
  return now < entry.expiresAtMs - safetyMarginMs();
}

/**
 * Returns a cached signed URL for a note attachment when still valid.
 * When `expectedStoragePath` is set, it must match the cached path or the entry is dropped.
 * When `expectedStoragePath` is null/undefined, path is not checked (attachments list may still be loading).
 */
export function getCachedNoteAttachmentSignedUrl(
  attachmentId: string,
  expectedStoragePath?: string | null,
): string | null {
  const entry = getValidNoteAttachmentSignedUrlCacheEntry(
    attachmentId,
    expectedStoragePath,
  );
  return entry?.signedUrl ?? null;
}

export function getValidNoteAttachmentSignedUrlCacheEntry(
  attachmentId: string,
  expectedStoragePath?: string | null,
): NoteAttachmentSignedUrlCacheEntry | null {
  const entry = cacheByAttachmentId.get(attachmentId);
  if (!entry) return null;

  const now = Date.now();

  if (!isStillUsable(entry, now)) {
    cacheByAttachmentId.delete(attachmentId);
    return null;
  }

  if (expectedStoragePath != null && entry.storagePath !== expectedStoragePath) {
    cacheByAttachmentId.delete(attachmentId);
    return null;
  }

  return entry;
}

export function setCachedNoteAttachmentSignedUrl(
  attachmentId: string,
  storagePath: string,
  signedUrl: string,
  ttlSec: number,
): void {
  cacheByAttachmentId.set(attachmentId, {
    signedUrl,
    storagePath,
    expiresAtMs: Date.now() + ttlSec * 1000,
  });
}

export function clearNoteAttachmentSignedUrlCache(): void {
  cacheByAttachmentId.clear();
}
