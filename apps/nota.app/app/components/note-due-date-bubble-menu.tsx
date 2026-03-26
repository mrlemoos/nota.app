import { BubbleMenu, useEditorState } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import type { JSX } from 'react';
import { NoteDueDatePickerPanel } from './note-due-date-picker-panel';
import { firstDateFromText } from '@/lib/parse-natural-due-date';

export interface NoteDueDateBubbleMenuProps {
  editor: Editor | null;
  dueAt: string | null;
  isDeadline: boolean;
  disabled?: boolean;
  onSaveDueDate: (dueAt: string | null, isDeadline: boolean) => Promise<void>;
}

function NoteDueDateBubblePanel({
  editor,
  dueAt,
  isDeadline,
  disabled,
  onSaveDueDate,
}: {
  editor: Editor;
  dueAt: string | null;
  isDeadline: boolean;
  disabled?: boolean;
  onSaveDueDate: (dueAt: string | null, isDeadline: boolean) => Promise<void>;
}): JSX.Element {
  const { from, to, text } = useEditorState({
    editor,
    selector: ({ editor: ed }) => {
      const { from: f, to: t } = ed.state.selection;
      return {
        from: f,
        to: t,
        text: ed.state.doc.textBetween(f, t, ' '),
      };
    },
  });

  return (
    <NoteDueDatePickerPanel
      draftKey={`${from}-${to}`}
      initialNaturalLanguageText={text}
      persistedDueAt={dueAt}
      persistedIsDeadline={isDeadline}
      disabled={disabled}
      onSave={onSaveDueDate}
    />
  );
}

export function NoteDueDateBubbleMenu({
  editor,
  dueAt,
  isDeadline,
  disabled,
  onSaveDueDate,
}: NoteDueDateBubbleMenuProps): JSX.Element | null {
  if (!editor) {
    return null;
  }

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="notaDueDateBubble"
      shouldShow={({ editor: ed }) => {
        if (ed.isActive('table')) {
          return false;
        }
        const { from, to } = ed.state.selection;
        if (from === to) {
          return false;
        }
        const text = ed.state.doc.textBetween(from, to, ' ');
        return firstDateFromText(text, new Date()) !== null;
      }}
      tippyOptions={{
        duration: 100,
        placement: 'top',
        maxWidth: 'none',
      }}
    >
      <NoteDueDateBubblePanel
        editor={editor}
        dueAt={dueAt}
        isDeadline={isDeadline}
        disabled={disabled}
        onSaveDueDate={onSaveDueDate}
      />
    </BubbleMenu>
  );
}
