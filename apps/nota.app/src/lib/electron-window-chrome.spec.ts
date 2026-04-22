import { describe, expect, it } from 'vitest';
import {
  ELECTRON_WINDOW_DRAG_CLASS,
  ELECTRON_WINDOW_NO_DRAG_CLASS,
  electronWindowDragClasses,
} from './electron-window-chrome';

describe('electronWindowDragClasses', () => {
  it('returns stable CSS class tokens for Electron drag regions', () => {
    // Arrange
    const expectedDrag = 'electron-window-drag';
    const expectedNoDrag = 'electron-window-no-drag';

    // Act
    const classes = electronWindowDragClasses();

    // Assert
    expect(classes.drag).toBe(expectedDrag);
    expect(classes.noDrag).toBe(expectedNoDrag);
    expect(ELECTRON_WINDOW_DRAG_CLASS).toBe(expectedDrag);
    expect(ELECTRON_WINDOW_NO_DRAG_CLASS).toBe(expectedNoDrag);
  });
});
