import { describe, expect, it } from 'vitest';
import type { Json } from '~/types/database.types';
import { buildAudioNoteApplyPatch } from './audio-to-note-apply';
import type { AudioNoteStudyResult } from './audio-note-blocks-to-doc';

describe('buildAudioNoteApplyPatch', () => {
  it('replace mode formats title and puts recording before generated blocks', () => {
    // Arrange
    const result: AudioNoteStudyResult = {
      title: 'Topic A',
      blocks: [{ type: 'paragraph', text: 'Body' }],
    };
    const createdAt = '2024-06-01T12:00:00.000Z';

    // Act
    const patch = buildAudioNoteApplyPatch({
      mode: 'replace',
      existingTitle: 'ignored',
      existingContent: { type: 'doc', content: [] },
      noteCreatedAtIso: createdAt,
      result,
      recording: {
        attachmentId: '00000000-0000-4000-8000-000000000001',
        filename: 'r.webm',
      },
    });

    // Assert
    expect(patch.title).toContain('Topic A');
    const doc = patch.content as {
      type: string;
      content: Array<Record<string, unknown>>;
    };
    expect(doc.content[0]).toMatchObject({ type: 'noteAudio' });
    expect(doc.content[1]).toMatchObject({ type: 'paragraph' });
  });

  it('append mode preserves existing title and order: existing, noteAudio, generated', () => {
    // Arrange
    const existingContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Already here.' }],
        },
      ],
    } as Json;
    const result: AudioNoteStudyResult = {
      title: 'Model title should not affect sidebar',
      blocks: [{ type: 'paragraph', text: 'New study line' }],
    };

    // Act
    const patch = buildAudioNoteApplyPatch({
      mode: 'append',
      existingTitle: 'My note title',
      existingContent,
      noteCreatedAtIso: '2024-06-01T12:00:00.000Z',
      result,
      recording: {
        attachmentId: '00000000-0000-4000-8000-000000000002',
        filename: 'rec.webm',
      },
    });

    // Assert
    expect(patch.title).toBe('My note title');
    const doc = patch.content as {
      content: Array<Record<string, unknown>>;
    };
    expect(doc.content).toHaveLength(3);
    expect(doc.content[0]).toMatchObject({ type: 'paragraph' });
    expect(doc.content[1]).toMatchObject({
      type: 'noteAudio',
      attrs: {
        attachmentId: '00000000-0000-4000-8000-000000000002',
        filename: 'rec.webm',
      },
    });
    expect(doc.content[2]).toMatchObject({ type: 'paragraph' });
  });

  it('append mode without recording only appends generated blocks', () => {
    // Arrange
    const existingContent = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }],
    } as Json;
    const result: AudioNoteStudyResult = {
      title: 'T',
      blocks: [{ type: 'paragraph', text: 'Only generated' }],
    };

    // Act
    const patch = buildAudioNoteApplyPatch({
      mode: 'append',
      existingTitle: 'T1',
      existingContent,
      noteCreatedAtIso: '2024-06-01T12:00:00.000Z',
      result,
    });

    // Assert
    expect(patch.title).toBe('T1');
    const doc = patch.content as { content: Array<Record<string, unknown>> };
    expect(doc.content).toHaveLength(2);
    expect(doc.content[1]).toMatchObject({ type: 'paragraph' });
  });
});
