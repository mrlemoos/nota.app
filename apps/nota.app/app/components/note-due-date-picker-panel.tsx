import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type JSX,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { DayPicker } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { firstDateFromText } from '@/lib/parse-natural-due-date';

function toTimeInputValue(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function applyTimeToDate(date: Date, timeStr: string): Date {
  const [h, m] = timeStr.split(':').map((x) => Number(x));
  const next = new Date(date);
  next.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return next;
}

function mergeCalendarDay(preserveFrom: Date | null, picked: Date): Date {
  const base = preserveFrom ?? picked;
  const next = new Date(picked);
  next.setHours(base.getHours(), base.getMinutes(), base.getSeconds(), base.getMilliseconds());
  return next;
}

function startOfLocalDay(d: Date): Date {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

function defaultTimeWhenEnablingDateOnly(d: Date): Date {
  const next = new Date(d);
  if (
    next.getHours() === 0 &&
    next.getMinutes() === 0 &&
    next.getSeconds() === 0 &&
    next.getMilliseconds() === 0
  ) {
    next.setHours(9, 0, 0, 0);
  }
  return next;
}

/** Keeps the ProseMirror selection when clicking bubble controls (not text fields). */
export function keepBubbleSelectionUnlessTextField(e: ReactMouseEvent) {
  const t = e.target;
  if (!(t instanceof HTMLElement)) {
    return;
  }
  if (t.tagName === 'TEXTAREA' || t.isContentEditable) {
    return;
  }
  if (t.tagName === 'INPUT') {
    const type = (t as HTMLInputElement).type;
    if (
      type === 'text' ||
      type === 'search' ||
      type === 'time' ||
      type === 'checkbox'
    ) {
      return;
    }
  }
  e.preventDefault();
  e.stopPropagation();
}

/** For explicit button actions inside the bubble. */
export function keepEditorTextSelection(e: ReactMouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

export interface NoteDueDatePickerPanelProps {
  /** Resets draft state when the user selects different text (e.g. `${from}-${to}`). */
  draftKey: string;
  initialNaturalLanguageText: string;
  persistedDueAt: string | null;
  persistedIsDeadline: boolean;
  disabled?: boolean;
  onSave: (dueAt: string | null, isDeadline: boolean) => Promise<void>;
}

export function NoteDueDatePickerPanel({
  draftKey,
  initialNaturalLanguageText,
  persistedDueAt,
  persistedIsDeadline,
  disabled,
  onSave,
}: NoteDueDatePickerPanelProps): JSX.Element {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [draftDeadline, setDraftDeadline] = useState(false);
  const [includeTime, setIncludeTime] = useState(true);
  const [nlInput, setNlInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [nlError, setNlError] = useState<string | null>(null);

  useEffect(() => {
    const ref = new Date();
    const trimmed = initialNaturalLanguageText.trim();
    setNlInput(initialNaturalLanguageText);
    setIncludeTime(true);
    const parsed = firstDateFromText(initialNaturalLanguageText, ref);
    setSelectedDate(parsed);
    setDraftDeadline(Boolean(persistedIsDeadline && persistedDueAt));
    if (!trimmed) {
      setNlError(null);
    } else if (!parsed) {
      setNlError('Could not parse a date from that text.');
    } else {
      setNlError(null);
    }
  }, [
    draftKey,
    initialNaturalLanguageText,
    persistedDueAt,
    persistedIsDeadline,
  ]);

  const applyNaturalLanguage = useCallback(() => {
    const parsed = firstDateFromText(nlInput, new Date());
    if (!nlInput.trim()) {
      setNlError(null);
      return;
    }
    if (!parsed) {
      setNlError('Could not parse a date from that text.');
      return;
    }
    setNlError(null);
    setSelectedDate(
      includeTime ? parsed : parsed ? startOfLocalDay(parsed) : parsed,
    );
  }, [nlInput, includeTime]);

  const now = new Date();

  const handleSave = async () => {
    setSaving(true);
    try {
      const toSave =
        selectedDate && !includeTime
          ? startOfLocalDay(selectedDate)
          : selectedDate;
      const iso = toSave ? toSave.toISOString() : null;
      const deadline = Boolean(iso && draftDeadline);
      await onSave(iso, deadline);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await onSave(null, false);
    } finally {
      setSaving(false);
    }
  };

  const onNlSubmit = (e: FormEvent) => {
    e.preventDefault();
    applyNaturalLanguage();
  };

  return (
    <div
      className={cn(
        'w-[min(100vw-1.5rem,20rem)] rounded-lg border border-border bg-background p-3 text-foreground shadow-md',
      )}
      role="dialog"
      aria-label="Note due date"
      onMouseDownCapture={keepBubbleSelectionUnlessTextField}
    >
      <form onSubmit={onNlSubmit} className="space-y-2">
        <label className="block text-xs font-medium text-muted-foreground">
          Natural language
          <input
            type="text"
            value={nlInput}
            onChange={(e) => setNlInput(e.target.value)}
            onBlur={applyNaturalLanguage}
            placeholder="e.g. next Friday 3pm"
            className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
            disabled={saving || disabled}
          />
        </label>
        {nlError ? (
          <p className="text-xs text-destructive" role="alert">
            {nlError}
          </p>
        ) : null}
      </form>

      <div className="nota-due-day-picker mt-3 flex justify-center">
        <DayPicker
          mode="single"
          selected={selectedDate ?? undefined}
          onSelect={(day) => {
            if (!day) {
              return;
            }
            setSelectedDate((prev) => {
              const merged = mergeCalendarDay(prev, day);
              return includeTime ? merged : startOfLocalDay(merged);
            });
          }}
          defaultMonth={selectedDate ?? new Date()}
          className="text-sm"
        />
      </div>

      <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={includeTime}
          disabled={!selectedDate || saving || disabled}
          onChange={(e) => {
            const on = e.target.checked;
            setIncludeTime(on);
            if (!on) {
              setSelectedDate((d) => (d ? startOfLocalDay(d) : d));
            } else {
              setSelectedDate((d) => (d ? defaultTimeWhenEnablingDateOnly(d) : d));
            }
          }}
          className="size-3.5 rounded border-input accent-primary"
        />
        <span>Include time</span>
      </label>

      {includeTime ? (
        <div className="mt-2">
          <label className="block text-xs font-medium text-muted-foreground">
            Time
            <input
              type="time"
              value={selectedDate ? toTimeInputValue(selectedDate) : ''}
              onChange={(e) => {
                if (!selectedDate) {
                  return;
                }
                setSelectedDate(applyTimeToDate(selectedDate, e.target.value));
              }}
              disabled={!selectedDate || saving || disabled}
              className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:opacity-50"
            />
          </label>
        </div>
      ) : null}

      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draftDeadline}
          disabled={!selectedDate || saving || disabled}
          onChange={(e) => setDraftDeadline(e.target.checked)}
          className="size-3.5 rounded border-input accent-primary"
        />
        <span
          className={cn(
            draftDeadline &&
              selectedDate &&
              selectedDate.getTime() < now.getTime() &&
              'text-rose-600 dark:text-rose-400',
          )}
        >
          Deadline
        </span>
      </label>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={
            saving || disabled || (!persistedDueAt && !selectedDate)
          }
          onMouseDown={keepEditorTextSelection}
          onClick={handleClear}
        >
          Clear
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={saving || disabled}
          onMouseDown={keepEditorTextSelection}
          onClick={handleSave}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
