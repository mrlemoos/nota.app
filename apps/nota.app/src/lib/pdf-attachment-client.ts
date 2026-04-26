import { getBrowserClient } from './supabase/browser';
import {
  getValidNoteAttachmentSignedUrlCacheEntry,
  setCachedNoteAttachmentSignedUrl,
} from './note-attachment-signed-url-cache';
import {
  NOTE_PDFS_BUCKET,
  createNoteAttachmentRecord,
  noteAttachmentStoragePath,
} from '../models/note-attachments';
import type { NoteAttachment } from '~/types/database.types';

export const ATTACHMENT_SIGNED_URL_TTL_SEC = 3600;
/** @deprecated use ATTACHMENT_SIGNED_URL_TTL_SEC */
export const PDF_SIGNED_URL_TTL_SEC = ATTACHMENT_SIGNED_URL_TTL_SEC;

export type GetOrFetchNoteAttachmentSignedUrlResult =
  | { ok: true; signedUrl: string }
  | { ok: false; error: string };

/**
 * Returns a still-valid signed URL from the in-memory cache when possible,
 * otherwise creates one via Supabase Storage and stores it in the cache.
 */
export async function getOrFetchNoteAttachmentSignedUrl(
  attachmentId: string,
  storagePath: string,
): Promise<GetOrFetchNoteAttachmentSignedUrlResult> {
  const cached = getValidNoteAttachmentSignedUrlCacheEntry(
    attachmentId,
    storagePath,
  );
  if (cached) {
    return { ok: true, signedUrl: cached.signedUrl };
  }

  const client = getBrowserClient();
  const { data, error } = await client.storage
    .from(NOTE_PDFS_BUCKET)
    .createSignedUrl(storagePath, ATTACHMENT_SIGNED_URL_TTL_SEC);

  if (error || !data?.signedUrl) {
    return {
      ok: false,
      error: error?.message ?? 'Could not create signed URL',
    };
  }

  setCachedNoteAttachmentSignedUrl(
    attachmentId,
    storagePath,
    data.signedUrl,
    ATTACHMENT_SIGNED_URL_TTL_SEC,
  );
  return { ok: true, signedUrl: data.signedUrl };
}

export const PDF_MAX_BYTES = 25 * 1024 * 1024;
export const IMAGE_MAX_BYTES = PDF_MAX_BYTES;

export const NOTE_ATTACHMENT_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

export function isPdfFile(file: File) {
  return (
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')
  );
}

export function isImageFile(file: File): boolean {
  if (isPdfFile(file)) {
    return false;
  }
  if (
    (NOTE_ATTACHMENT_IMAGE_MIMES as readonly string[]).includes(file.type)
  ) {
    return true;
  }
  const n = file.name.toLowerCase();
  return /\.(jpe?g|png|gif|webp)$/.test(n);
}

export type NoteAttachmentFileKind = 'pdf' | 'image';

export function classifyNoteAttachmentFile(
  file: File,
): NoteAttachmentFileKind | null {
  if (isPdfFile(file)) return 'pdf';
  if (isImageFile(file)) return 'image';
  return null;
}

function storageMetaForFile(
  file: File,
  kind: NoteAttachmentFileKind,
): { ext: string; contentType: string } {
  if (kind === 'pdf') {
    return {
      ext: '.pdf',
      contentType:
        file.type === 'application/pdf' ? file.type : 'application/pdf',
    };
  }

  const name = file.name.toLowerCase();
  const mime = file.type;

  if (mime === 'image/png' || name.endsWith('.png')) {
    return { ext: '.png', contentType: mime || 'image/png' };
  }
  if (mime === 'image/gif' || name.endsWith('.gif')) {
    return { ext: '.gif', contentType: mime || 'image/gif' };
  }
  if (mime === 'image/webp' || name.endsWith('.webp')) {
    return { ext: '.webp', contentType: mime || 'image/webp' };
  }
  // jpeg is the default image branch
  return { ext: '.jpg', contentType: mime || 'image/jpeg' };
}

export async function downloadBlobFromSignedUrl(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Download failed');
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename || 'download';
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** @deprecated use downloadBlobFromSignedUrl */
export const downloadPdfFromSignedUrl = downloadBlobFromSignedUrl;

/**
 * Upload a PDF or allowlisted raster image to the note attachments bucket
 * and create a `note_attachments` row.
 */
export async function uploadNoteAttachmentFile(
  noteId: string,
  userId: string,
  file: File,
): Promise<NoteAttachment> {
  const kind = classifyNoteAttachmentFile(file);
  if (!kind) {
    throw new Error(
      'Unsupported file type. Use a PDF or JPEG, PNG, GIF, or WebP image.',
    );
  }

  const maxBytes = kind === 'pdf' ? PDF_MAX_BYTES : IMAGE_MAX_BYTES;
  if (file.size > maxBytes) {
    throw new Error('This file is too large (max 25 MB).');
  }

  const { ext, contentType } = storageMetaForFile(file, kind);
  const objectId = crypto.randomUUID();
  const storagePath = noteAttachmentStoragePath(
    userId,
    noteId,
    objectId,
    ext,
  );
  const client = getBrowserClient();

  const { error: upErr } = await client.storage
    .from(NOTE_PDFS_BUCKET)
    .upload(storagePath, file, {
      contentType,
      upsert: false,
    });

  if (upErr) {
    throw new Error(upErr.message);
  }

  try {
    return await createNoteAttachmentRecord(client, {
      note_id: noteId,
      user_id: userId,
      storage_path: storagePath,
      filename: file.name,
      size_bytes: file.size,
      content_type: contentType,
    });
  } catch (rowErr) {
    await client.storage.from(NOTE_PDFS_BUCKET).remove([storagePath]);
    throw rowErr;
  }
}

export async function uploadPdfAndCreateRecord(
  noteId: string,
  userId: string,
  file: File,
): Promise<NoteAttachment> {
  if (!isPdfFile(file)) {
    throw new Error('Please choose a PDF file.');
  }
  return uploadNoteAttachmentFile(noteId, userId, file);
}

export const STUDY_RECORDING_MAX_BYTES = PDF_MAX_BYTES;

/** Maps normalised audio/video MIME to storage extension and upload filename. */
export function storageMetaForStudyRecording(mimeRaw: string): {
  ext: string;
  contentType: string;
  filename: string;
} {
  const mime = mimeRaw.split(';')[0].trim().toLowerCase();
  const table: Record<string, { ext: string; filename: string }> = {
    'audio/webm': { ext: '.webm', filename: 'recording.webm' },
    'video/webm': { ext: '.webm', filename: 'recording.webm' },
    'audio/mp4': { ext: '.mp4', filename: 'recording.mp4' },
    'audio/m4a': { ext: '.m4a', filename: 'recording.m4a' },
    'audio/x-m4a': { ext: '.m4a', filename: 'recording.m4a' },
    'audio/ogg': { ext: '.ogg', filename: 'recording.ogg' },
    'audio/wav': { ext: '.wav', filename: 'recording.wav' },
    'audio/wave': { ext: '.wav', filename: 'recording.wav' },
    'audio/mpeg': { ext: '.mp3', filename: 'recording.mp3' },
    'audio/mp3': { ext: '.mp3', filename: 'recording.mp3' },
  };
  const row = table[mime] ?? {
    ext: '.webm',
    filename: 'recording.webm',
  };
  return {
    ext: row.ext,
    contentType: mime || 'audio/webm',
    filename: row.filename,
  };
}

/**
 * Uploads the original assistive recording (not the WAV used only for xAI STT).
 */
export async function uploadStudyRecordingAttachment(
  noteId: string,
  userId: string,
  blob: Blob,
  mimeHint: string,
): Promise<NoteAttachment> {
  const meta = storageMetaForStudyRecording(
    mimeHint || blob.type || 'audio/webm',
  );
  const file = new File([blob], meta.filename, { type: meta.contentType });
  if (file.size > STUDY_RECORDING_MAX_BYTES) {
    throw new Error('Recording is too large (max 25 MB).');
  }

  const objectId = crypto.randomUUID();
  const storagePath = noteAttachmentStoragePath(
    userId,
    noteId,
    objectId,
    meta.ext,
  );
  const client = getBrowserClient();

  const { error: upErr } = await client.storage
    .from(NOTE_PDFS_BUCKET)
    .upload(storagePath, file, {
      contentType: meta.contentType,
      upsert: false,
    });

  if (upErr) {
    throw new Error(upErr.message);
  }

  try {
    return await createNoteAttachmentRecord(client, {
      note_id: noteId,
      user_id: userId,
      storage_path: storagePath,
      filename: meta.filename,
      size_bytes: file.size,
      content_type: meta.contentType,
    });
  } catch (rowErr) {
    await client.storage.from(NOTE_PDFS_BUCKET).remove([storagePath]);
    throw rowErr;
  }
}
