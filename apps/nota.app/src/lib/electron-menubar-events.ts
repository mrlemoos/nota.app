export const NOTA_MENUBAR_NEW_FOLDER_REQUEST_EVENT =
  'nota:menubar-new-folder-request';

export const NOTA_MENUBAR_MOVE_NOTE_REQUEST_EVENT =
  'nota:menubar-move-note-request';

export function dispatchMenubarNewFolderRequest(): void {
  window.dispatchEvent(new Event(NOTA_MENUBAR_NEW_FOLDER_REQUEST_EVENT));
}

export function dispatchMenubarMoveNoteRequest(): void {
  window.dispatchEvent(new Event(NOTA_MENUBAR_MOVE_NOTE_REQUEST_EVENT));
}
