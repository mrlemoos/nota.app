import type { MenuItemConstructorOptions } from 'electron';

export type NotaAppMenuActions = {
  onNewNote: () => void;
  onMoveToFolder: () => void;
  onNewFolder: () => void;
  onQuit: () => void;
};

export function buildNotaAppMenuTemplate(
  actions: NotaAppMenuActions,
): MenuItemConstructorOptions[] {
  return [
    {
      label: 'Nota',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'New note',
          accelerator: 'CmdOrCtrl+N',
          click: actions.onNewNote,
        },
        {
          label: 'Move to folder',
          accelerator: 'CmdOrCtrl+M',
          click: actions.onMoveToFolder,
        },
        {
          label: 'New folder',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: actions.onNewFolder,
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        {
          label: 'Quit Nota',
          role: 'quit',
          click: actions.onQuit,
        },
      ],
    },
  ];
}
