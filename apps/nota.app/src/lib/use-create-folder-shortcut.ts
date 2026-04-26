import { useEffect, useEffectEvent, useRef } from 'react';

export function useCreateFolderShortcut(
  userId: string | undefined,
  enabled: boolean,
  onOpen: () => void,
): void {
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  const onKeyDown = useEffectEvent((e: KeyboardEvent): void => {
    if (!userId || !enabled) {
      return;
    }

    const mod = e.metaKey || e.ctrlKey;
    if (!mod || !e.shiftKey || e.altKey) {
      return;
    }

    if (e.key !== 'n' && e.key !== 'N') {
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
    onOpenRef.current();
  });

  useEffect(() => {
    if (!userId || !enabled) {
      return;
    }
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); };
  }, [userId, enabled, onKeyDown]);
}
