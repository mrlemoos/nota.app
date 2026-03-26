import { describe, expect, it } from 'vitest';
import {
  classifyNoteAttachmentFile,
  isImageFile,
  isPdfFile,
} from '../app/lib/pdf-attachment-client';

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
