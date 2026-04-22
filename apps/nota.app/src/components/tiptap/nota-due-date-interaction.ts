import { Extension } from '@tiptap/core';
import type { Node as PmNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import {
  allDateSpansInText,
  dateSpanContainingOffset,
  firstDateFromText,
} from '@/lib/parse-natural-due-date';

const key = new PluginKey('notaDueDateInteraction');

function ancestorHasTableName($pos: { node: (d: number) => { type: { name: string } } }, depth: number): boolean {
  for (let d = depth; d > 0; d--) {
    if ($pos.node(d).type.name === 'table') {
      return true;
    }
  }
  return false;
}

function textblockRange(
  doc: PmNode,
  pos: number,
): { start: number; end: number; text: string } | null {
  const $pos = doc.resolve(pos);
  for (let d = $pos.depth; d >= 0; d--) {
    const node = $pos.node(d);
    if (!node.isTextblock || node.type.name === 'codeBlock') {
      continue;
    }
    if (ancestorHasTableName($pos, d)) {
      return null;
    }
    const start = $pos.start(d);
    const end = $pos.end(d);
    const text = doc.textBetween(start, end, '');
    return { start, end, text };
  }
  return null;
}

function buildDecorationSet(doc: PmNode): DecorationSet {
  const ref = new Date();
  const decos: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock || node.type.name === 'codeBlock') {
      return;
    }
    const $at = doc.resolve(Math.min(pos + 1, doc.content.size));
    if (ancestorHasTableName($at, $at.depth)) {
      return;
    }
    const start = pos + 1;
    const end = pos + node.nodeSize - 1;
    if (end < start) {
      return;
    }
    const text = doc.textBetween(start, end, '');
    const spans = allDateSpansInText(text, ref);
    for (const s of spans) {
      decos.push(
        Decoration.inline(start + s.start, start + s.end, {
          class: 'nota-nl-due-date-hit',
        }),
      );
    }
  });
  return DecorationSet.create(doc, decos);
}

export const NotaDueDateInteraction = Extension.create({
  name: 'notaDueDateInteraction',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key,
        state: {
          init: (_, { doc }) => buildDecorationSet(doc),
          apply(tr, oldSet) {
            if (!tr.docChanged) {
              return oldSet;
            }
            return buildDecorationSet(tr.doc);
          },
        },
        props: {
          decorations(state) {
            return key.getState(state) as DecorationSet;
          },
          handleClick(view, pos, event) {
            if (event.button !== 0) {
              return false;
            }
            if (event.metaKey || event.ctrlKey) {
              return false;
            }
            const { state } = view;
            const range = textblockRange(state.doc, pos);
            if (!range) {
              return false;
            }
            const ref = new Date();
            const offset = pos - range.start;
            const span = dateSpanContainingOffset(range.text, offset, ref);
            if (!span) {
              return false;
            }
            const from = range.start + span.start;
            const to = range.start + span.end;
            const slice = state.doc.textBetween(from, to, ' ');
            if (firstDateFromText(slice, ref) === null) {
              return false;
            }
            view.dispatch(
              state.tr.setSelection(TextSelection.create(state.doc, from, to)),
            );
            view.focus();
            return true;
          },
        },
      }),
    ];
  },
});
