/** Global CSS class names — keep in sync with `styles.css` */
export const ELECTRON_WINDOW_DRAG_CLASS = 'electron-window-drag';
export const ELECTRON_WINDOW_NO_DRAG_CLASS = 'electron-window-no-drag';

export function electronWindowDragClasses(): {
  drag: typeof ELECTRON_WINDOW_DRAG_CLASS;
  noDrag: typeof ELECTRON_WINDOW_NO_DRAG_CLASS;
} {
  return {
    drag: ELECTRON_WINDOW_DRAG_CLASS,
    noDrag: ELECTRON_WINDOW_NO_DRAG_CLASS,
  };
}
