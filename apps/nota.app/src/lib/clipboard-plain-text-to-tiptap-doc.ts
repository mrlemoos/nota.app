import type { Json } from '~/types/database.types';

function textNode(text: string): Record<string, unknown> {
  return { type: 'text', text };
}

const TITLE_MAX = 120;

/**
 * Derives a note title from pasted plain text (first non-empty line, capped).
 */
export function titleFromClipboardPlainText(text: string): string {
  const line = text.split(/\r?\n/).find((l) => l.trim().length > 0);
  if (!line) {
    return 'Clipboard';
  }
  const t = line.trim();
  if (t.length <= TITLE_MAX) {
    return t;
  }
  return `${t.slice(0, TITLE_MAX)}…`;
}

/**
 * Converts clipboard plain text into StarterKit-compatible TipTap JSON (paragraphs per line).
 */
export function clipboardPlainTextToTiptapDoc(text: string): Json {
  const lines = text.split(/\r?\n/);
  const content = lines.map((line) => ({
    type: 'paragraph',
    content: line.length ? [textNode(line)] : [],
  }));
  return {
    type: 'doc',
    content:
      content.length > 0 ? content : [{ type: 'paragraph', content: [] }],
  } as Json;
}
