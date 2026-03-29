import { useLayoutEffect, useState, type JSX } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ThemeMenu } from '../components/theme-menu';
import { useRootLoaderData } from '../context/spa-session-context';
import { useNotesData } from '../context/notes-data-context';
import { submitUserPreferencesToggle } from '../lib/use-sync-user-preferences';
import { useNotaPreferencesStore } from '../stores/nota-preferences';
import { NotaProSettingsSection } from '../components/nota-pro-settings-section';
import { getBrowserClient } from '../lib/supabase/browser';
import { hashForScreen, setAppHash } from '../lib/app-navigation';

export default function NotesSettings(): JSX.Element {
  const { user } = useRootLoaderData();
  const { setUserPreferencesInState, notaProEntitled } = useNotesData();
  const openTodaysNoteShortcut = useNotaPreferencesStore(
    (s) => s.openTodaysNoteShortcut,
  );
  const setOpenTodaysNoteShortcut = useNotaPreferencesStore(
    (s) => s.setOpenTodaysNoteShortcut,
  );
  const [modDLabel, setModDLabel] = useState('⌘D');
  const [historyBackLabel, setHistoryBackLabel] = useState('⌘[');
  const [historyForwardLabel, setHistoryForwardLabel] = useState('⌘]');

  const shortcutsHref = hashForScreen({
    kind: 'notes',
    panel: 'shortcuts',
    noteId: null,
  });

  useLayoutEffect(() => {
    const isApple =
      /Mac|iPhone|iPad|iPod/i.test(navigator.platform || '') ||
      /\bMac OS X\b/i.test(navigator.userAgent);
    setModDLabel(isApple ? '⌘D' : 'Ctrl+D');
    setHistoryBackLabel(isApple ? '⌘[' : 'Ctrl+[');
    setHistoryForwardLabel(isApple ? '⌘]' : 'Ctrl+]');
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 py-8">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
        <div>
          <h1 className="font-serif text-xl font-semibold tracking-normal text-foreground">
            Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Appearance, shortcuts, Nota Pro, and your account.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">Appearance</h2>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeMenu />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">Shortcuts</h2>
          <label
            htmlFor="nota-open-todays-note-shortcut"
            className={cn(
              'flex cursor-pointer select-none items-start gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3',
            )}
          >
            <input
              id="nota-open-todays-note-shortcut"
              type="checkbox"
              checked={openTodaysNoteShortcut}
              onChange={(e) => {
                const checked = e.target.checked;
                setOpenTodaysNoteShortcut(checked);
                submitUserPreferencesToggle(
                  checked,
                  user?.id,
                  setUserPreferencesInState,
                  notaProEntitled,
                );
              }}
              className="mt-0.5 size-4 shrink-0 rounded border border-input accent-primary"
            />
            <span className="text-sm leading-snug text-muted-foreground">
              Open today’s note with {modDLabel}
            </span>
          </label>
          <p className="text-sm text-muted-foreground">
            Go back and forward through recently visited notes with{' '}
            <span className="tabular-nums text-foreground/80">
              {historyBackLabel}
            </span>{' '}
            and{' '}
            <span className="tabular-nums text-foreground/80">
              {historyForwardLabel}
            </span>
            .
          </p>
          <p className="text-sm text-muted-foreground">
            <a
              href={shortcutsHref}
              className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
            >
              View all shortcuts
            </a>
          </p>
        </section>

        {user ? <NotaProSettingsSection /> : null}

        {user ? (
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-foreground">Account</h2>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
              <p
                className="truncate text-sm text-muted-foreground"
                title={user.email ?? undefined}
              >
                {user.email}
              </p>
              <div className="mt-4">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    void (async () => {
                      await getBrowserClient().auth.signOut();
                      setAppHash({ kind: 'landing' });
                    })();
                  }}
                >
                  Sign out
                </Button>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
