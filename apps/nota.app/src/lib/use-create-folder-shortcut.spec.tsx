import { render, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useCreateFolderShortcut } from './use-create-folder-shortcut';

function Harness({
  userId,
  enabled = true,
  onOpen,
}: {
  userId?: string;
  enabled?: boolean;
  onOpen: () => void;
}): null {
  useCreateFolderShortcut(userId, enabled, onOpen);
  return null;
}

describe('useCreateFolderShortcut', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls onOpen when Mod+Shift+N is pressed', () => {
    // Arrange
    const onOpen = vi.fn();
    render(<Harness userId="user-1" onOpen={onOpen} />);
    const keyEvent = { key: 'n', metaKey: true, shiftKey: true, bubbles: true };

    // Act
    fireEvent.keyDown(document, keyEvent);

    // Assert
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('calls onOpen when Ctrl+Shift+N is pressed', () => {
    // Arrange
    const onOpen = vi.fn();
    render(<Harness userId="user-1" onOpen={onOpen} />);
    const keyEvent = { key: 'N', ctrlKey: true, shiftKey: true, bubbles: true };

    // Act
    fireEvent.keyDown(document, keyEvent);

    // Assert
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('does nothing without a signed-in user', () => {
    // Arrange
    const onOpen = vi.fn();
    render(<Harness userId={undefined} onOpen={onOpen} />);
    const keyEvent = { key: 'n', metaKey: true, shiftKey: true, bubbles: true };

    // Act
    fireEvent.keyDown(document, keyEvent);

    // Assert
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('does nothing when the shortcut hook is disabled', () => {
    // Arrange
    const onOpen = vi.fn();
    render(
      <Harness userId="user-1" enabled={false} onOpen={onOpen} />,
    );
    const keyEvent = { key: 'n', metaKey: true, shiftKey: true, bubbles: true };

    // Act
    fireEvent.keyDown(document, keyEvent);

    // Assert
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('does not run while the command palette is focused', () => {
    // Arrange
    const onOpen = vi.fn();
    const { container } = render(
      <div>
        <div data-nota-command-palette>
          <input type="text" data-testid="palette-input" />
        </div>
        <Harness userId="user-1" onOpen={onOpen} />
      </div>,
    );
    const input = container.querySelector(
      '[data-testid="palette-input"]',
    ) as HTMLInputElement;
    input.focus();
    const keyEvent = { key: 'n', metaKey: true, shiftKey: true, bubbles: true };

    // Act
    fireEvent.keyDown(input, keyEvent);

    // Assert
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('does not run for Mod+N without Shift', () => {
    // Arrange
    const onOpen = vi.fn();
    render(<Harness userId="user-1" onOpen={onOpen} />);
    const keyEvent = { key: 'n', metaKey: true, bubbles: true };

    // Act
    fireEvent.keyDown(document, keyEvent);

    // Assert
    expect(onOpen).not.toHaveBeenCalled();
  });
});
