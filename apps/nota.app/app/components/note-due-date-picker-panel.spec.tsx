import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NoteDueDatePickerPanel } from './note-due-date-picker-panel';

describe('NoteDueDatePickerPanel', () => {
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
