import { getBrowserClient } from './supabase/browser';
import {
  NOTE_PDFS_BUCKET,
  createNoteAttachmentRecord,
  noteAttachmentStoragePath,
} from '../models/note-attachments';
import type { NoteAttachment } from '~/types/database.types';

export const ATTACHMENT_SIGNED_URL_TTL_SEC = 3600;
/** @deprecated use ATTACHMENT_SIGNED_URL_TTL_SEC */
export const PDF_SIGNED_URL_TTL_SEC = ATTACHMENT_SIGNED_URL_TTL_SEC;

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
