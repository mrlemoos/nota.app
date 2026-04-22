import { parseNoteLinkPath } from './internal-note-link';
import type { Note } from '~/types/database.types';

/** Avoid re-walking unchanged TipTap JSON when only one note’s body changes (e.g. after autosave). */
const outgoingIdsByContentRoot = new WeakMap<object, string[]>();

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

function collectHrefTargets(href: unknown, into: Set<string>): void {
  if (typeof href !== 'string') return;
  const id = parseNoteLinkPath(href);
  if (id) into.add(id);
}

function visitTipTapJson(node: unknown, into: Set<string>): void {
  if (!isRecord(node)) return;

  if (node['type'] === 'linkPreview') {
    const attrs = node['attrs'];
    if (isRecord(attrs)) {
      collectHrefTargets(attrs['href'], into);
    }
  }

  const marks = node['marks'];
  if (Array.isArray(marks)) {
    for (const m of marks) {
      if (!isRecord(m) || m['type'] !== 'link') continue;
      const attrs = m['attrs'];
      if (!isRecord(attrs)) continue;
      collectHrefTargets(attrs['href'], into);
    }
  }

  const content = node['content'];
  if (!Array.isArray(content)) return;
  for (const child of content) {
    visitTipTapJson(child, into);
  }
}

/**
 * Returns distinct note ids linked from stored TipTap / ProseMirror JSON (`notes.content`).
 *
 * Backlinks and the graph use the merged `/notes` layout `notes` list. The open note’s
 * unsaved body is reflected after autosave and parent `revalidate()`, not live from the editor.
 */
export function extractOutgoingNoteIdsFromContent(content: unknown): string[] {
  if (content !== null && typeof content === 'object') {
    const cached = outgoingIdsByContentRoot.get(content as object);
    if (cached) {
      return cached;
    }
  }
  const into = new Set<string>();
  visitTipTapJson(content, into);
  const result = [...into];
  if (content !== null && typeof content === 'object') {
    outgoingIdsByContentRoot.set(content as object, result);
  }
  return result;
}

export function buildNoteLinkGraph(notes: Note[]): {
  outgoing: Map<string, Set<string>>;
  backlinks: Map<string, Set<string>>;
} {
  const outgoing = new Map<string, Set<string>>();
  const backlinks = new Map<string, Set<string>>();

  for (const note of notes) {
    const raw = extractOutgoingNoteIdsFromContent(note.content);
    const targets = new Set<string>();
    for (const t of raw) {
      if (t === note.id) continue;
      targets.add(t);
    }
    outgoing.set(note.id, targets);
  }

  for (const [sourceId, targets] of outgoing) {
    for (const targetId of targets) {
      let sources = backlinks.get(targetId);
      if (!sources) {
        sources = new Set();
        backlinks.set(targetId, sources);
      }
      sources.add(sourceId);
    }
  }

  return { outgoing, backlinks };
}
