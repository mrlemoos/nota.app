import { describe, expect, it } from 'vitest';
import {
  studyNotesBlocksToTiptapNodes,
  studyNotesResultToTiptapDoc,
  type AudioNoteStudyResult,
} from './audio-note-blocks-to-doc';

describe('studyNotesResultToTiptapDoc', () => {
  it('builds heading, paragraph, and bullet list', () => {
    // Arrange
    const input: AudioNoteStudyResult = {
      title: 'Lecture 1',
      blocks: [
        { type: 'heading', level: 2, text: 'Key ideas' },
        { type: 'paragraph', text: 'Energy is conserved.' },
        {
          type: 'bulletList',
          items: ['First point', 'Second point'],
        },
      ],
    };

    // Act
    const doc = studyNotesResultToTiptapDoc(input) as {
      type: string;
      content: Array<Record<string, unknown>>;
    };

    // Assert
    expect(doc.type).toBe('doc');
    expect(doc.content).toHaveLength(3);
    expect(doc.content[0]).toMatchObject({
      type: 'heading',
      attrs: { level: 2 },
    });
    expect(doc.content[1]).toMatchObject({ type: 'paragraph' });
    expect(doc.content[2]).toMatchObject({ type: 'bulletList' });
  });

  it('returns empty paragraph when blocks are empty', () => {
    // Arrange
    const input: AudioNoteStudyResult = {
      title: 'T',
      blocks: [],
    };

    // Act
    const doc = studyNotesResultToTiptapDoc(input) as { content: unknown[] };

    // Assert
    expect(doc.content).toHaveLength(1);
    expect(doc.content[0]).toMatchObject({ type: 'paragraph', content: [] });
  });

  it('prepends noteAudio when recording attachment is provided', () => {
    // Arrange
    const input: AudioNoteStudyResult = {
      title: 'T',
      blocks: [{ type: 'paragraph', text: 'Body' }],
    };
    const options = {
      recording: {
        attachmentId: '00000000-0000-4000-8000-000000000001',
        filename: 'recording.webm',
      },
    };

    // Act
    const doc = studyNotesResultToTiptapDoc(input, options) as {
      content: Array<Record<string, unknown>>;
    };

    // Assert
    expect(doc.content[0]).toMatchObject({
      type: 'noteAudio',
      attrs: {
        attachmentId: '00000000-0000-4000-8000-000000000001',
        filename: 'recording.webm',
      },
    });
    expect(doc.content[1]).toMatchObject({ type: 'paragraph' });
  });
});

describe('studyNotesBlocksToTiptapNodes', () => {
  it('returns only generated blocks (no recording node)', () => {
    // Arrange
    const input: AudioNoteStudyResult = {
      title: 'X',
      blocks: [{ type: 'paragraph', text: 'Generated' }],
    };

    // Act
    const nodes = studyNotesBlocksToTiptapNodes(input);

    // Assert
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({ type: 'paragraph' });
  });
});
