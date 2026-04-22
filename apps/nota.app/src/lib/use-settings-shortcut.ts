import { useEffect, useEffectEvent } from 'react';
import { setAppHash } from './app-navigation';

export function useSettingsShortcut(
  userId: string | undefined,
  enabled = true,
): void {
  const onKeyDown = useEffectEvent((e: KeyboardEvent): void => {
    if (!userId || !enabled) {
      return;
    }

    const mod = e.metaKey || e.ctrlKey;
    if (!mod || e.key !== ',' || e.shiftKey || e.altKey) {
      return;
    }

    const t = e.target;
    if (
      t instanceof Node &&
      (t as Element).closest?.('[data-nota-command-palette]')
    ) {
      return;
    }

    e.preventDefault();
    setAppHash({ kind: 'notes', panel: 'settings', noteId: null });
  });

  useEffect(() => {
    if (!userId || !enabled) {
      return;
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [userId, enabled, onKeyDown]);
}
