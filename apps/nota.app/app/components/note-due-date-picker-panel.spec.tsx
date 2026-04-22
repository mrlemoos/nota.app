import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MouseEvent as ReactMouseEvent } from 'react';
import {
  dueInstantIsLocalStartOfDay,
  initialIncludeTimeFromPersisted,
  isInteractiveBubbleTarget,
  keepBubbleSelectionUnlessTextField,
  NoteDueDatePickerPanel,
} from './note-due-date-picker-panel';

describe('keepBubbleSelectionUnlessTextField', () => {
  it('does not prevent default when mousedown target is a button', () => {
    // Arrange
    const button = document.createElement('button');
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    const event = {
      target: button,
      preventDefault,
      stopPropagation,
    } as unknown as ReactMouseEvent;

    // Act
    keepBubbleSelectionUnlessTextField(event);

    // Assert
    expect(preventDefault).not.toHaveBeenCalled();
    expect(stopPropagation).not.toHaveBeenCalled();
  });

  it('does not prevent default when mousedown target is a span inside a label', () => {
    // Arrange
    const label = document.createElement('label');
    const span = document.createElement('span');
    span.textContent = 'Include time';
    label.appendChild(span);
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    const event = {
      target: span,
      preventDefault,
      stopPropagation,
    } as unknown as ReactMouseEvent;

    // Act
    keepBubbleSelectionUnlessTextField(event);

    // Assert
    expect(preventDefault).not.toHaveBeenCalled();
    expect(stopPropagation).not.toHaveBeenCalled();
  });

  it('calls preventDefault and stopPropagation for non-interactive panel chrome', () => {
    // Arrange
    const panel = document.createElement('div');
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    const event = {
      target: panel,
      preventDefault,
      stopPropagation,
    } as unknown as ReactMouseEvent;

    // Act
    keepBubbleSelectionUnlessTextField(event);

    // Assert
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
  });
});

describe('isInteractiveBubbleTarget', () => {
  it('returns true for SVG inside a button (calendar chevron)', () => {
    // Arrange
    document.body.innerHTML =
      '<button type="button"><svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"></path></svg></button>';
    const path = document.querySelector('path');

    // Act
    const result = path ? isInteractiveBubbleTarget(path) : false;

    // Assert
    expect(result).toBe(true);
    document.body.innerHTML = '';
  });
});

describe('dueInstantIsLocalStartOfDay', () => {
  it('returns true for local calendar midnight', () => {
    // Arrange
    const localMidnight = new Date(2031, 2, 15, 0, 0, 0, 0);

    // Act
    const result = dueInstantIsLocalStartOfDay(localMidnight);

    // Assert
    expect(result).toBe(true);
  });

  it('returns false when local time is not midnight', () => {
    // Arrange
    const afternoon = new Date(2031, 2, 15, 14, 30, 0, 0);

    // Act
    const result = dueInstantIsLocalStartOfDay(afternoon);

    // Assert
    expect(result).toBe(false);
  });
});

describe('initialIncludeTimeFromPersisted', () => {
  it('returns true when no persisted due (NL workflow)', () => {
    // Act
    const result = initialIncludeTimeFromPersisted(null);

    // Assert
    expect(result).toBe(true);
  });

  it('returns false when persisted instant is local midnight', () => {
    // Arrange
    const localMidnight = new Date(2031, 2, 15, 0, 0, 0, 0);

    // Act
    const result = initialIncludeTimeFromPersisted(localMidnight.toISOString());

    // Assert
    expect(result).toBe(false);
  });

  it('returns true when persisted instant has non-midnight local time', () => {
    // Arrange
    const withTime = new Date(2031, 2, 15, 9, 15, 0, 0);

    // Act
    const result = initialIncludeTimeFromPersisted(withTime.toISOString());

    // Assert
    expect(result).toBe(true);
  });

  it('returns true for invalid ISO string', () => {
    // Act
    const result = initialIncludeTimeFromPersisted('not-a-date');

    // Assert
    expect(result).toBe(true);
  });
});

describe('NoteDueDatePickerPanel', () => {
  it('leaves Include time unchecked when persisted due is date-only (local midnight)', () => {
    // Arrange
    const onSave = vi.fn().mockResolvedValue(undefined);
    const localMidnight = new Date(2031, 2, 15, 0, 0, 0, 0);

    // Act
    render(
      <NoteDueDatePickerPanel
        draftKey="0-10"
        initialNaturalLanguageText="next Friday"
        persistedDueAt={localMidnight.toISOString()}
        persistedIsDeadline={false}
        onSave={onSave}
      />,
    );

    // Assert
    const includeTime = screen.getByRole('checkbox', { name: /include time/i });
    expect((includeTime as HTMLInputElement).checked).toBe(false);
  });

  it('does not nest a form inside a parent form', () => {
    // Arrange
    const onSave = vi.fn().mockResolvedValue(undefined);

    // Act
    const { container } = render(
      <form data-testid="outer-form">
        <NoteDueDatePickerPanel
          draftKey="0-0"
          initialNaturalLanguageText=""
          persistedDueAt={null}
          persistedIsDeadline={false}
          onSave={onSave}
        />
      </form>,
    );

    // Assert
    expect(container.querySelectorAll('form')).toHaveLength(1);
  });
});
