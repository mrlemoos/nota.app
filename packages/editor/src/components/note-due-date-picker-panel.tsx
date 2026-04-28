import {
  useCallback,
  useEffect,
  useId,
  useState,
  type JSX,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { DayPicker } from 'react-day-picker';
import { NotaButton } from '@nota.app/web-design/button';
import { cn } from '@nota.app/web-design/utils';
import { firstDateFromText } from '../lib/parse-natural-due-date';

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

export function dueInstantIsLocalStartOfDay(d: Date): boolean {
  return (
    d.getHours() === 0 &&
    d.getMinutes() === 0 &&
    d.getSeconds() === 0 &&
    d.getMilliseconds() === 0
  );
}

export function initialIncludeTimeFromPersisted(persistedDueAt: string | null): boolean {
  if (!persistedDueAt) return true;
  const d = new Date(persistedDueAt);
  if (Number.isNaN(d.getTime())) return true;
  return !dueInstantIsLocalStartOfDay(d);
}

export function isInteractiveBubbleTarget(el: Element): boolean {
  if (el instanceof HTMLElement) {
    if (el.tagName === 'TEXTAREA' || el.isContentEditable) return true;
    if (el.tagName === 'INPUT') {
      const type = (el as HTMLInputElement).type;
      if (type === 'text' || type === 'search' || type === 'time' || type === 'checkbox') {
        return true;
      }
    }
  }
  return Boolean(
    el.closest('button') ||
      el.closest('[role="button"]') ||
      el.closest('[role="gridcell"]') ||
      el.closest('label') ||
      el.closest('a[href]') ||
      el.closest('select'),
  );
}

export function keepBubbleSelectionUnlessTextField(e: ReactMouseEvent) {
  const t = e.target;
  if (!(t instanceof Element)) return;
  if (isInteractiveBubbleTarget(t)) return;
  e.preventDefault();
  e.stopPropagation();
}

export function keepEditorTextSelection(e: ReactMouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

export interface NoteDueDatePickerPanelProps {
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
  const includeTimeCheckboxId = useId();
  const deadlineCheckboxId = useId();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [draftDeadline, setDraftDeadline] = useState(false);
  const [includeTime, setIncludeTime] = useState(true);
  const [nlInput, setNlInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [nlError, setNlError] = useState<string | null>(null);

  useEffect(() => {
    const ref = new Date();
    void ref;
    const trimmed = initialNaturalLanguageText.trim();
    const parsedNl = firstDateFromText(initialNaturalLanguageText, new Date());
    setNlInput(initialNaturalLanguageText);

    let nextSelected: Date | null = null;
    let nextIncludeTime = true;

    if (persistedDueAt) {
      const fromPersisted = new Date(persistedDueAt);
      if (!Number.isNaN(fromPersisted.getTime())) {
        nextSelected = fromPersisted;
        nextIncludeTime = initialIncludeTimeFromPersisted(persistedDueAt);
      }
    }

    if (!nextSelected) {
      nextSelected = parsedNl;
      nextIncludeTime = true;
    }

    setSelectedDate(nextSelected);
    setIncludeTime(nextIncludeTime);
    setDraftDeadline(Boolean(persistedIsDeadline && persistedDueAt));
    if (!trimmed) {
      setNlError(null);
    } else if (!parsedNl) {
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

  const onNlInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
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
      <div className="space-y-2">
        <label className="block text-xs font-medium text-muted-foreground">
          Natural language
          <input
            type="text"
            value={nlInput}
            onChange={(e) => { setNlInput(e.target.value); }}
            onBlur={applyNaturalLanguage}
            onKeyDown={onNlInputKeyDown}
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
      </div>

      <div className="nota-due-day-picker mt-3 flex justify-center">
        <DayPicker
          mode="single"
          selected={selectedDate ?? undefined}
          onSelect={(day) => {
            if (!day) return;
            setSelectedDate((prev) => {
              const merged = mergeCalendarDay(prev, day);
              return includeTime ? merged : startOfLocalDay(merged);
            });
          }}
          defaultMonth={selectedDate ?? new Date()}
          className="text-sm"
        />
      </div>

      <div className="mt-2 flex items-center gap-2 text-sm">
        <input
          id={includeTimeCheckboxId}
          type="checkbox"
          checked={includeTime}
          disabled={!selectedDate || saving || disabled}
          onChange={(e) => {
            const on = e.target.checked;
            setIncludeTime(on);
            if (!on) {
              setSelectedDate((d) => (d ? startOfLocalDay(d) : d));
            }
          }}
          className="size-3.5 cursor-pointer rounded border-input accent-primary"
        />
        <label
          htmlFor={includeTimeCheckboxId}
          className="cursor-pointer select-none"
        >
          Include time
        </label>
      </div>

      {includeTime ? (
        <div className="mt-2">
          <label className="block text-xs font-medium text-muted-foreground">
            Time
            <input
              type="time"
              value={selectedDate ? toTimeInputValue(selectedDate) : ''}
              onChange={(e) => {
                if (!selectedDate) return;
                setSelectedDate(applyTimeToDate(selectedDate, e.target.value));
              }}
              disabled={!selectedDate || saving || disabled}
              className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:opacity-50"
            />
          </label>
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-2 text-sm">
        <input
          id={deadlineCheckboxId}
          type="checkbox"
          checked={draftDeadline}
          disabled={!selectedDate || saving || disabled}
          onChange={(e) => { setDraftDeadline(e.target.checked); }}
          className="size-3.5 cursor-pointer rounded border-input accent-primary"
        />
        <label
          htmlFor={deadlineCheckboxId}
          className={cn(
            'cursor-pointer select-none',
            draftDeadline &&
              selectedDate &&
              selectedDate.getTime() < now.getTime() &&
              'text-rose-600 dark:text-rose-400',
          )}
        >
          Deadline
        </label>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <NotaButton
          type="button"
          variant="ghost"
          size="sm"
          disabled={saving || disabled || (!persistedDueAt && !selectedDate)}
          onMouseDown={keepEditorTextSelection}
          onClick={() => { void handleClear(); }}
        >
          Clear
        </NotaButton>
        <NotaButton
          type="button"
          size="sm"
          disabled={saving || disabled}
          onMouseDown={keepEditorTextSelection}
          onClick={() => { void handleSave(); }}
        >
          Save
        </NotaButton>
      </div>
    </div>
  );
}
