import { CommandPalette } from './components/command-palette';
import { useRootLoaderData } from './context/spa-session-context';
import { useOptionalNotesDataMeta } from './context/notes-data-context';

export function SignedInCommandPalette() {
  const { user } = useRootLoaderData();
  const meta = useOptionalNotesDataMeta();
  const notesUnlocked = !!meta && !meta.loading;

  if (!user) {
    return null;
  }

  if (!notesUnlocked) {
    return null;
  }

  return <CommandPalette />;
}
