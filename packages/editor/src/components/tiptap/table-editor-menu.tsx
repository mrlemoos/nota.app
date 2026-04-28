import type { Editor } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/react';
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  Delete01Icon,
  DeleteColumnIcon,
  DeleteRowIcon,
  LayoutTable01Icon,
  TableRowsSplitIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { type JSX, type MouseEvent as ReactMouseEvent } from 'react';
import { NotaButton } from '@nota.app/web-design/button';
import { cn } from '@nota.app/web-design/utils';

const menuClass =
  'flex flex-wrap items-center gap-0.5 rounded-md border border-border bg-popover p-1 shadow-md';

/** Keeps ProseMirror `CellSelection` when using the bubble menu (button focus otherwise clears it). */
function keepEditorCellSelection(e: ReactMouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

type TableEditorMenuProps = {
  editor: Editor | null;
};

export function TableEditorMenu({ editor }: TableEditorMenuProps): JSX.Element | null {
  if (!editor) {
    return null;
  }

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="notaTableBubbleMenu"
      shouldShow={({ editor: ed }) => ed.isActive('table')}
      tippyOptions={{
        duration: 100,
        placement: 'top',
        maxWidth: 'none',
      }}
    >
      <div
        className={cn(menuClass)}
        role="toolbar"
        aria-label="Table"
        onMouseDownCapture={keepEditorCellSelection}
      >
        <NotaButton
          type="button"
          variant="ghost"
          size="icon-xs"
          title="Row above"
          aria-label="Add row above"
          onMouseDownCapture={keepEditorCellSelection}
          onClick={() => editor.chain().addRowBefore().focus().run()}
        >
          <HugeiconsIcon icon={ArrowUp01Icon} size={14} />
        </NotaButton>
        <NotaButton
          type="button"
          variant="ghost"
          size="icon-xs"
          title="Row below"
          aria-label="Add row below"
          onMouseDownCapture={keepEditorCellSelection}
          onClick={() => editor.chain().addRowAfter().focus().run()}
        >
          <HugeiconsIcon icon={ArrowDown01Icon} size={14} />
        </NotaButton>
        <NotaButton
          type="button"
          variant="ghost"
          size="icon-xs"
          title="Delete row"
          aria-label="Delete selected row or rows"
          onMouseDownCapture={keepEditorCellSelection}
          onClick={() => editor.chain().deleteRow().focus().run()}
        >
          <HugeiconsIcon icon={DeleteRowIcon} size={14} />
        </NotaButton>
        <span
          className="mx-0.5 h-4 w-px shrink-0 bg-border"
          aria-hidden
        />
        <NotaButton
          type="button"
          variant="ghost"
          size="icon-xs"
          title="Column left"
          aria-label="Add column left"
          onMouseDownCapture={keepEditorCellSelection}
          onClick={() => editor.chain().addColumnBefore().focus().run()}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
        </NotaButton>
        <NotaButton
          type="button"
          variant="ghost"
          size="icon-xs"
          title="Column right"
          aria-label="Add column right"
          onMouseDownCapture={keepEditorCellSelection}
          onClick={() => editor.chain().addColumnAfter().focus().run()}
        >
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
        </NotaButton>
        <NotaButton
          type="button"
          variant="ghost"
          size="icon-xs"
          title="Delete column"
          aria-label="Delete selected column or columns"
          onMouseDownCapture={keepEditorCellSelection}
          onClick={() => editor.chain().deleteColumn().focus().run()}
        >
          <HugeiconsIcon icon={DeleteColumnIcon} size={14} />
        </NotaButton>
        <span
          className="mx-0.5 h-4 w-px shrink-0 bg-border"
          aria-hidden
        />
        <NotaButton
          type="button"
          variant="ghost"
          size="icon-xs"
          title="Toggle header row"
          aria-label="Toggle header row"
          onMouseDownCapture={keepEditorCellSelection}
          onClick={() => editor.chain().toggleHeaderRow().focus().run()}
        >
          <HugeiconsIcon icon={TableRowsSplitIcon} size={14} />
        </NotaButton>
        <NotaButton
          type="button"
          variant="ghost"
          size="icon-xs"
          title="Toggle header column"
          aria-label="Toggle header column"
          onMouseDownCapture={keepEditorCellSelection}
          onClick={() => editor.chain().toggleHeaderColumn().focus().run()}
        >
          <HugeiconsIcon icon={LayoutTable01Icon} size={14} />
        </NotaButton>
        <span
          className="mx-0.5 h-4 w-px shrink-0 bg-border"
          aria-hidden
        />
        <NotaButton
          type="button"
          variant="ghost"
          size="icon-xs"
          title="Delete table"
          aria-label="Delete table"
          className="text-destructive hover:text-destructive"
          onMouseDownCapture={keepEditorCellSelection}
          onClick={() => editor.chain().deleteTable().focus().run()}
        >
          <HugeiconsIcon icon={Delete01Icon} size={14} />
        </NotaButton>
      </div>
    </BubbleMenu>
  );
}
