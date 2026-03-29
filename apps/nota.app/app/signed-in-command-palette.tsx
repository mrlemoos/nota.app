import { CommandPalette } from './components/command-palette';
import { useRootLoaderData } from './context/spa-session-context';
import { useOptionalNotesData } from './context/notes-data-context';

export function SignedInCommandPalette() {
  const { user } = useRootLoaderData();
  const notesData = useOptionalNotesData();
  const notesUnlocked = !!notesData && !notesData.loading;

  if (!user) {
    return null;
  }

  if (!notesUnlocked) {
    return null;
  }

  return <CommandPalette />;
}
