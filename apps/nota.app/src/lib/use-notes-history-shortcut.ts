import { useEffect, useEffectEvent } from 'react';

export function useNotesHistoryShortcut(
  userId: string | undefined,
  enabled = true,
): void {
  const onKeyDown = useEffectEvent((e: KeyboardEvent): void => {
    if (!userId || !enabled) {
      return;
    }

    const mod = e.metaKey || e.ctrlKey;
    if (!mod || e.shiftKey || e.altKey) {
      return;
    }

    if (e.key !== '[' && e.key !== ']') {
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
    if (e.key === '[') {
      window.history.back();
    } else {
      window.history.forward();
    }
  });

  useEffect(() => {
    if (!userId || !enabled) {
      return;
    }
    document.addEventListener('keydown', onKeyDown, { capture: true });
    return () =>
      { document.removeEventListener('keydown', onKeyDown, { capture: true }); };
  }, [userId, enabled, onKeyDown]);
}
