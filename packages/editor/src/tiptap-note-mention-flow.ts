/* eslint-disable @typescript-eslint/no-deprecated -- `MutableRefObject` matches writable `.current` for TipTap refs */
import type { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Note } from '@nota.app/database-types';
import { hrefForNote } from './lib/internal-note-link';
import { persistedDisplayTitle } from './lib/note-title';
import { findNoteMentionTrigger } from './lib/tiptap-note-mention';

export function insertNoteLinkAtMentionRangeView(
  view: EditorView,
  from: number,
  to: number,
  target: Note,
): boolean {
  const { state } = view;
  const linkMark = state.schema.marks.link;
  if (!linkMark) return false;

  const href = hrefForNote(target.id);
  const label = persistedDisplayTitle(target.title || '');
  const mark = linkMark.create({
    href,
    target: null,
    rel: null,
    class: 'tiptap-link',
    skipLinkPreview: true,
  });

  const tr = state.tr;
  tr.delete(from, to);
  tr.insert(from, state.schema.text(label, [mark]));
  tr.setSelection(TextSelection.create(tr.doc, from + label.length));
  tr.setStoredMarks([]);
  view.dispatch(tr.scrollIntoView());

  const dom = view.dom as HTMLElement & { editor?: Editor };
  const ed = dom.editor;
  if (ed && !ed.isDestroyed) {
    ed
      .chain()
      .focus()
      .setParagraph()
      .command(({ tr: innerTr, dispatch }) => {
        if (dispatch) {
          innerTr.setStoredMarks([]);
        }
        return true;
      })
      .run();
  } else {
    view.focus();
  }
  return true;
}

export function insertNoteLinkAtMentionRange(
  ed: Editor,
  from: number,
  to: number,
  target: Note,
): void {
  insertNoteLinkAtMentionRangeView(ed.view, from, to, target);
}

export type NoteMentionConfirmRefs = {
  canInsertAttachmentsRef: MutableRefObject<boolean>;
  filterNoteCandidatesRef: MutableRefObject<(query: string) => Note[]>;
  mentionTriggerKeyRef: MutableRefObject<string | null>;
  mentionSelectedIndexRef: MutableRefObject<number>;
};

export function tryConfirmNoteMention(
  view: EditorView,
  setMention: Dispatch<
    SetStateAction<{ from: number; query: string; selectedIndex: number } | null>
  >,
  refs: NoteMentionConfirmRefs,
): boolean {
  const state = view.state;

  if (!refs.canInsertAttachmentsRef.current) return false;
  const trigger = findNoteMentionTrigger(state);
  if (!trigger) return false;
  const filtered = refs.filterNoteCandidatesRef.current(trigger.query);
  if (filtered.length === 0) return false;

  const triggerKey = `${trigger.from}:${trigger.query}`;
  if (refs.mentionTriggerKeyRef.current !== triggerKey) {
    refs.mentionSelectedIndexRef.current = 0;
    refs.mentionTriggerKeyRef.current = triggerKey;
  }

  const idx = Math.min(
    refs.mentionSelectedIndexRef.current,
    filtered.length - 1,
  );
  const target = filtered[idx];
  const to = state.selection.from;
  const inserted = insertNoteLinkAtMentionRangeView(
    view,
    trigger.from,
    to,
    target,
  );
  if (!inserted) return false;
  setMention(null);
  return true;
}
