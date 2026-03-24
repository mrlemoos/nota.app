import { getBrowserClient } from './supabase/browser';
import {
  NOTE_PDFS_BUCKET,
  createNoteAttachmentRecord,
  pdfStoragePath,
} from '../models/note-attachments';
import type { NoteAttachment } from '~/types/database.types';

export const PDF_SIGNED_URL_TTL_SEC = 3600;
export const PDF_MAX_BYTES = 25 * 1024 * 1024;

export function isPdfFile(file: File) {
  return (
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')
  );
}

export async function downloadPdfFromSignedUrl(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Download failed');
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename || 'document.pdf';
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function uploadPdfAndCreateRecord(
  noteId: string,
  userId: string,
  file: File,
): Promise<NoteAttachment> {
  const objectId = crypto.randomUUID();
  const storagePath = pdfStoragePath(userId, noteId, objectId);
  const client = getBrowserClient();

  const { error: upErr } = await client.storage
    .from(NOTE_PDFS_BUCKET)
    .upload(storagePath, file, {
      contentType: 'application/pdf',
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
    });
  } catch (rowErr) {
    await client.storage.from(NOTE_PDFS_BUCKET).remove([storagePath]);
    throw rowErr;
  }
}
