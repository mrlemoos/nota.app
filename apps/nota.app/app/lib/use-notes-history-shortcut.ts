import { useEffect, useEffectEvent } from 'react';
import { useNavigate } from 'react-router';

export function useNotesHistoryShortcut(
  userId: string | undefined,
  enabled = true,
): void {
  const navigate = useNavigate();

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
    navigate(e.key === '[' ? -1 : 1);
  });

  useEffect(() => {
    if (!userId || !enabled) {
      return;
    }
    document.addEventListener('keydown', onKeyDown, { capture: true });
    return () =>
      document.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [userId, enabled, onKeyDown]);
}
