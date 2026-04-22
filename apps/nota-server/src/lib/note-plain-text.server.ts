/** Mirrors `apps/nota.app/src/lib/note-doc-plain-text.ts` for TipTap JSON `doc`. */

export function extractPlainTextFromDocJson(input: unknown): string {
  const parts: string[] = [];

  const walk = (node: unknown): void => {
    if (node === null || node === undefined) {
      return;
    }
    if (typeof node !== 'object') {
      return;
    }
    const o = node as Record<string, unknown>;
    if (o.type === 'noteAudio') {
      parts.push('Recording');
    }
    if (typeof o.text === 'string') {
      parts.push(o.text);
    }
    const content = o.content;
    if (!Array.isArray(content)) {
      return;
    }
    for (const child of content) {
      walk(child);
    }
  };

  walk(input);
  return parts.join('').replace(/\s+/g, ' ').trim();
}
