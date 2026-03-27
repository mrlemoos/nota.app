import { useEffect, useRef, useState, type JSX } from 'react';
import { TypeCursorIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { NoteEditorSettings } from '../lib/note-editor-settings';

type NoteLayoutMenuProps = {
  settings: NoteEditorSettings;
  onSettingsChange: (next: NoteEditorSettings) => void;
  disabled?: boolean;
};

const panelClass =
  'absolute right-0 z-50 mt-1 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-border bg-popover p-3 shadow-md';

export function NoteLayoutMenu({
  settings,
  onSettingsChange,
  disabled,
}: NoteLayoutMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointer, true);
    return () => document.removeEventListener('pointerdown', onPointer, true);
  }, [open]);

  const selectClass = cn(
    'mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground',
    'outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30',
  );

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Note layout"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((o) => !o)}
      >
        <HugeiconsIcon icon={TypeCursorIcon} size={18} />
      </Button>
      {open ? (
        <div
          role="dialog"
          aria-label="Note layout"
          className={panelClass}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              setOpen(false);
            }
          }}
        >
          <h2 className="sr-only">Note layout</h2>
          <div className="space-y-3">
            <div>
              <label
                htmlFor="nota-note-layout-font"
                className="text-xs font-medium text-muted-foreground"
              >
                Font
              </label>
              <select
                id="nota-note-layout-font"
                className={selectClass}
                value={settings.font ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  onSettingsChange({
                    ...settings,
                    font:
                      v === ''
                        ? undefined
                        : (v as NonNullable<NoteEditorSettings['font']>),
                  });
                }}
              >
                <option value="">App default (sans)</option>
                <option value="serif">Serif</option>
                <option value="mono">Monospace</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="nota-note-layout-measure"
                className="text-xs font-medium text-muted-foreground"
              >
                Column width
              </label>
              <select
                id="nota-note-layout-measure"
                className={selectClass}
                value={settings.measure ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  onSettingsChange({
                    ...settings,
                    measure:
                      v === ''
                        ? undefined
                        : (v as NonNullable<NoteEditorSettings['measure']>),
                  });
                }}
              >
                <option value="">Standard</option>
                <option value="narrow">Narrow</option>
                <option value="wide">Wide</option>
              </select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onSettingsChange({})}
            >
              Reset to defaults
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
