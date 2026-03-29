import type { EditorState } from '@tiptap/pm/state';

function isInsideCodeBlock(state: EditorState, pos: number): boolean {
  const $pos = state.doc.resolve(pos);
  for (let d = $pos.depth; d > 0; d--) {
    const name = $pos.node(d).type.name;
    if (name === 'codeBlock') return true;
  }
  return false;
}

function hasLinkMarkAt(state: EditorState, pos: number): boolean {
  const safe = Math.max(1, pos - 1);
  const $p = state.doc.resolve(safe);
  return Boolean($p.marks().find((m) => m.type.name === 'link'));
}

function hasCodeMarkAt(state: EditorState, pos: number): boolean {
  const safe = Math.max(1, pos - 1);
  const $p = state.doc.resolve(safe);
  return Boolean($p.marks().find((m) => m.type.name === 'code'));
}

/**
 * Build plain text from the start of the parent block to `to`, and map each character index to its doc position.
 */
function blockTextMap(
  state: EditorState,
  blockStart: number,
  to: number,
): { text: string; indexToPos: number[] } {
  let text = '';
  const indexToPos: number[] = [];
  state.doc.nodesBetween(blockStart, to, (node, pos) => {
    if (!node.isText || !node.text) {
      return undefined;
    }
    for (let o = 0; o < node.text.length; o++) {
      const docPos = pos + o;
      if (docPos >= to) return false;
      text += node.text[o]!;
      indexToPos.push(docPos);
    }
    return undefined;
  });
  return { text, indexToPos };
}

/**
 * When the cursor is right after `@` plus optional filter text in the same text run, returns the doc position of `@` and the filter query (no `@`).
 */
export function findNoteMentionTrigger(
  state: EditorState,
): { from: number; query: string } | null {
  const { selection } = state;
  if (!selection.empty) return null;
  const $from = selection.$from;
  if (!$from.parent.isTextblock) return null;
  if (isInsideCodeBlock(state, $from.pos)) return null;

  const blockStart = $from.start();
  const cursor = $from.pos;
  if (hasLinkMarkAt(state, cursor)) return null;
  if (hasCodeMarkAt(state, cursor)) return null;

  const { text, indexToPos } = blockTextMap(state, blockStart, cursor);
  if (text.length === 0 || indexToPos.length !== text.length) return null;

  const match = text.match(/@([^\s@]*)$/);
  if (!match) return null;

  const full = match[0];
  const relStart = text.length - full.length;
  if (relStart < 0 || relStart >= indexToPos.length) return null;

  const from = indexToPos[relStart]!;
  if (from === undefined) return null;

  const query = match[1] ?? '';
  return { from, query };
}
