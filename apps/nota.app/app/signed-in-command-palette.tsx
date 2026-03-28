import { useMatches } from 'react-router';
import { CommandPalette } from './components/command-palette';
import { useRootLoaderData } from './root';

function useNotesUnlockedFromRouteData(): boolean {
  const matches = useMatches();
  let unlocked = false;
  let sawNotesEntitlement = false;
  for (const m of matches) {
    const d = m.data;
    if (
      d &&
      typeof d === 'object' &&
      'notaProLocked' in d &&
      typeof (d as { notaProLocked: unknown }).notaProLocked === 'boolean'
    ) {
      sawNotesEntitlement = true;
      unlocked = !(d as { notaProLocked: boolean }).notaProLocked;
    }
  }
  return sawNotesEntitlement && unlocked;
}

export function SignedInCommandPalette() {
  const { user } = useRootLoaderData() ?? { user: null };
  const notesUnlocked = useNotesUnlockedFromRouteData();

  if (!user) {
    return null;
  }

  if (!notesUnlocked) {
    return null;
  }

  return <CommandPalette />;
}
