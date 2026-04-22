import type { Json } from '~/types/database.types';

/** Mirrors JSON from `POST /api/audio-to-note` event `notes_done` (nota-server xAI pipeline). */
export type AudioNoteBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bulletList'; items: string[] };

export type AudioNoteStudyResult = {
  title: string;
  blocks: AudioNoteBlock[];
};

function textNode(text: string): Record<string, unknown> {
  return { type: 'text', text };
}

export function noteAudioContentNode(recording: {
  attachmentId: string;
  filename: string;
}): Record<string, unknown> {
  return {
    type: 'noteAudio',
    attrs: {
      attachmentId: recording.attachmentId,
      filename: recording.filename || 'Recording',
    },
  };
}

/**
 * TipTap nodes for the model-generated blocks only (no recording wrapper).
 */
export function studyNotesBlocksToTiptapNodes(
  result: AudioNoteStudyResult,
): Record<string, unknown>[] {
  const content: Record<string, unknown>[] = [];

  for (const block of result.blocks) {
    if (block.type === 'heading') {
      content.push({
        type: 'heading',
        attrs: { level: block.level },
        content: block.text.trim()
          ? [textNode(block.text.trim())]
          : [],
      });
      continue;
    }
    if (block.type === 'paragraph') {
      const t = block.text.trim();
      content.push({
        type: 'paragraph',
        content: t ? [textNode(t)] : [],
      });
      continue;
    }
    if (block.type === 'bulletList') {
      content.push({
        type: 'bulletList',
        content: block.items.map((item) => ({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: item.trim() ? [textNode(item.trim())] : [],
            },
          ],
        })),
      });
    }
  }

  return content;
}

export type StudyNotesDocOptions = {
  /** Original recording block (prepended above generated study content). */
  recording?: { attachmentId: string; filename: string };
};

/**
 * Converts assistive-capture study-note blocks to TipTap / StarterKit-compatible JSON.
 */
export function studyNotesResultToTiptapDoc(
  result: AudioNoteStudyResult,
  opts?: StudyNotesDocOptions,
): Json {
  const nodes: Record<string, unknown>[] = [];
  if (opts?.recording?.attachmentId) {
    nodes.push(noteAudioContentNode(opts.recording));
  }
  nodes.push(...studyNotesBlocksToTiptapNodes(result));

  return {
    type: 'doc',
    content:
      nodes.length > 0
        ? nodes
        : [{ type: 'paragraph', content: [] }],
  } as Json;
}
