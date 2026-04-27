import { describe, expect, it, vi } from 'vitest';
import { buildNotaAppMenuTemplate } from './native-app-menu.js';

describe('buildNotaAppMenuTemplate', () => {
  it('includes note actions with accelerators', () => {
    // Arrange
    const onNewNote = vi.fn();
    const onMoveToFolder = vi.fn();
    const onNewFolder = vi.fn();
    const onQuit = vi.fn();

    // Act
    const template = buildNotaAppMenuTemplate({
      onNewNote,
      onMoveToFolder,
      onNewFolder,
      onQuit,
    });

    // Assert
    const submenu = template[0]?.submenu;
    expect(Array.isArray(submenu)).toBe(true);
    const items = submenu ?? [];
    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'New note', accelerator: 'CmdOrCtrl+N' }),
        expect.objectContaining({ label: 'Move to folder', accelerator: 'CmdOrCtrl+M' }),
        expect.objectContaining({ label: 'New folder', accelerator: 'CmdOrCtrl+Shift+N' }),
      ]),
    );
  });

  it('wires click handlers to the provided callbacks', () => {
    // Arrange
    const onNewNote = vi.fn();
    const onMoveToFolder = vi.fn();
    const onNewFolder = vi.fn();
    const onQuit = vi.fn();

    // Act
    const template = buildNotaAppMenuTemplate({
      onNewNote,
      onMoveToFolder,
      onNewFolder,
      onQuit,
    });
    const items = (template[0]?.submenu ?? []) as Array<{ label?: string; click?: () => void }>;
    items.find((item) => item.label === 'New note')?.click?.();
    items.find((item) => item.label === 'Move to folder')?.click?.();
    items.find((item) => item.label === 'New folder')?.click?.();

    // Assert
    expect(onNewNote).toHaveBeenCalledTimes(1);
    expect(onMoveToFolder).toHaveBeenCalledTimes(1);
    expect(onNewFolder).toHaveBeenCalledTimes(1);
    expect(onQuit).not.toHaveBeenCalled();
  });
});
