import { CommandPalette } from './components/command-palette';
import { useRootLoaderData } from './root';

export function SignedInCommandPalette() {
  const { user } = useRootLoaderData() ?? { user: null };

  if (!user) {
    return null;
  }

  return <CommandPalette />;
}
