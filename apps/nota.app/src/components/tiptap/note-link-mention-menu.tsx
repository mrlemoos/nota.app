import { useEffect, useRef, type JSX } from 'react';
import { createPortal } from 'react-dom';
import { NotaButton } from '@nota.app/web-design/button';
import { cn } from '@/lib/utils';
import { persistedDisplayTitle } from '../../lib/note-title';
import type { Note } from '~/types/database.types';

export interface NoteLinkMentionMenuProps {
  open: boolean;
  /** Viewport coordinates to place the menu under (e.g. coordsAtPos for `@`). */
  anchor: { left: number; top: number } | null;
  notes: Note[];
  selectedIndex: number;
  onHighlightIndex: (index: number) => void;
  onSelect: (note: Note) => void;
  emptyMessage: string;
}

export function NoteLinkMentionMenu({
  open,
  anchor,
  notes,
  selectedIndex,
  onHighlightIndex,
  onSelect,
  emptyMessage,
}: NoteLinkMentionMenuProps): JSX.Element | null {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const row = listRef.current.querySelector<HTMLElement>(
      `[data-note-index="${selectedIndex}"]`,
    );
    row?.scrollIntoView({ block: 'nearest' });
  }, [open, selectedIndex]);

  if (!open || !anchor) return null;

  const menu = (
    <div
      className={cn(
        'fixed z-100 max-h-60 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-md',
      )}
      style={{
        left: anchor.left,
        top: anchor.top + 4,
      }}
      role="listbox"
      aria-label="Link to note"
      onMouseDown={(e) => { e.preventDefault(); }}
    >
      {notes.length === 0 ? (
        <p className="px-3 py-3 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <ul ref={listRef} className="max-h-56 overflow-y-auto py-0.5">
          {notes.map((note, i) => (
            <li key={note.id} role="none">
              <NotaButton
                type="button"
                tabIndex={-1}
                variant="ghost"
                size="sm"
                data-note-index={i}
                aria-selected={i === selectedIndex}
                className={cn(
                  'h-auto w-full justify-start whitespace-normal rounded-none px-3 py-1.5 text-left font-normal',
                  i === selectedIndex && 'bg-muted',
                )}
                onMouseEnter={() => { onHighlightIndex(i); }}
                onClick={() => { onSelect(note); }}
              >
                {persistedDisplayTitle(note.title || '')}
              </NotaButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return createPortal(menu, document.body);
}
