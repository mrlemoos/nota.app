import { render, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { setAppHash } from './app-navigation';
import { useSettingsShortcut } from './use-settings-shortcut';

vi.mock('./app-navigation', () => ({
  setAppHash: vi.fn(),
}));

function Harness({
  userId,
  enabled = true,
}: {
  userId?: string;
  enabled?: boolean;
}): null {
  useSettingsShortcut(userId, enabled);
  return null;
}

describe('useSettingsShortcut', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('navigates to settings when Mod+comma is pressed', () => {
    // Arrange
    render(<Harness userId="user-1" />);
    const keyEvent = { key: ',', metaKey: true, bubbles: true };

    // Act
    fireEvent.keyDown(document, keyEvent);

    // Assert
    expect(vi.mocked(setAppHash)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(setAppHash)).toHaveBeenCalledWith({
      kind: 'notes',
      panel: 'settings',
      noteId: null,
    });
  });

  it('navigates to settings when Ctrl+comma is pressed', () => {
    // Arrange
    render(<Harness userId="user-1" />);
    const keyEvent = { key: ',', ctrlKey: true, bubbles: true };

    // Act
    fireEvent.keyDown(document, keyEvent);

    // Assert
    expect(vi.mocked(setAppHash)).toHaveBeenCalledWith({
      kind: 'notes',
      panel: 'settings',
      noteId: null,
    });
  });

  it('does nothing without a signed-in user', () => {
    // Arrange
    render(<Harness userId={undefined} />);
    const keyEvent = { key: ',', metaKey: true, bubbles: true };

    // Act
    fireEvent.keyDown(document, keyEvent);

    // Assert
    expect(vi.mocked(setAppHash)).not.toHaveBeenCalled();
  });

  it('does nothing when the shortcut hook is disabled', () => {
    // Arrange
    render(<Harness userId="user-1" enabled={false} />);
    const keyEvent = { key: ',', metaKey: true, bubbles: true };

    // Act
    fireEvent.keyDown(document, keyEvent);

    // Assert
    expect(vi.mocked(setAppHash)).not.toHaveBeenCalled();
  });

  it('does not run while the command palette is focused', () => {
    // Arrange
    const { container } = render(
      <div>
        <div data-nota-command-palette>
          <input type="text" data-testid="palette-input" />
        </div>
        <Harness userId="user-1" />
      </div>,
    );
    const input = container.querySelector(
      '[data-testid="palette-input"]',
    ) as HTMLInputElement;
    input.focus();
    const keyEvent = { key: ',', metaKey: true, bubbles: true };

    // Act
    fireEvent.keyDown(input, keyEvent);

    // Assert
    expect(vi.mocked(setAppHash)).not.toHaveBeenCalled();
  });
});
