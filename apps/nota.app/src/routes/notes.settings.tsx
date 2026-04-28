import { UserButton } from '@clerk/react';
import { useLayoutEffect, useState, type JSX } from 'react';
import { cn } from '@/lib/utils';
import { LOCALE_OPTIONS } from '@nota.app/i18n';
import { ThemeMenu } from '../components/theme-menu';
import { useRootLoaderData } from '../context/session-context';
import {
  useNotesDataActions,
  useNotesDataMeta,
} from '../context/notes-data-context';
import { submitUserPreferencesPatch } from '../lib/use-sync-user-preferences';
import {
  useNotaPreferencesStore,
  type CursorVisualStyle,
} from '../stores/nota-preferences';
import { NotaProSettingsSection } from '../components/nota-pro-settings-section';
import { hashForScreen } from '../lib/app-navigation';
import { navigatorLooksLikeApplePlatform } from '../lib/navigator-apple-platform';

const CURSOR_STYLE_OPTIONS: ReadonlyArray<{
  value: CursorVisualStyle;
  label: string;
  description: string;
}> = [
  {
    value: 'line',
    label: 'Line',
    description: 'Classic text cursor',
  },
  {
    value: 'block',
    label: 'Block',
    description: 'Solid cursor block',
  },
] as const;

export default function NotesSettings(): JSX.Element {
  const { user } = useRootLoaderData();
  const { notaProEntitled, userPreferences } = useNotesDataMeta();
  const { setUserPreferencesInState } = useNotesDataActions();
  const openTodaysNoteShortcut = useNotaPreferencesStore(
    (s) => s.openTodaysNoteShortcut,
  );
  const setOpenTodaysNoteShortcut = useNotaPreferencesStore(
    (s) => s.setOpenTodaysNoteShortcut,
  );
  const locale = useNotaPreferencesStore((s) => s.locale);
  const setLocale = useNotaPreferencesStore((s) => s.setLocale);
  const showNoteBacklinks = useNotaPreferencesStore((s) => s.showNoteBacklinks);
  const setShowNoteBacklinks = useNotaPreferencesStore(
    (s) => s.setShowNoteBacklinks,
  );
  const semanticSearchEnabled = useNotaPreferencesStore(
    (s) => s.semanticSearchEnabled,
  );
  const setSemanticSearchEnabled = useNotaPreferencesStore(
    (s) => s.setSemanticSearchEnabled,
  );
  const emojiReplacerEnabled = useNotaPreferencesStore(
    (s) => s.emojiReplacerEnabled,
  );
  const setEmojiReplacerEnabled = useNotaPreferencesStore(
    (s) => s.setEmojiReplacerEnabled,
  );
  const cursorVisualStyle = useNotaPreferencesStore((s) => s.cursorVisualStyle);
  const setCursorVisualStyle = useNotaPreferencesStore(
    (s) => s.setCursorVisualStyle,
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
      navigatorLooksLikeApplePlatform() ||
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
            Appearance, shortcuts, subscription, and your account.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">Appearance</h2>
          <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label htmlFor="nota-locale" className="text-sm text-muted-foreground">
                Language
              </label>
              <select
                id="nota-locale"
                value={locale ?? 'system'}
                onChange={(event) => {
                  const next = event.target.value === 'system' ? null : event.target.value;
                  setLocale(next);
                  submitUserPreferencesPatch(
                    { locale: next },
                    user?.id,
                    setUserPreferencesInState,
                    notaProEntitled,
                  );
                }}
                className="min-w-48 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                {LOCALE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              If you leave this on system default, Nota follows your device language.
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeMenu />
          </div>
          <fieldset className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
            <legend className="px-1 text-xs font-medium tracking-wide text-foreground/80 uppercase">
              Editor cursor
            </legend>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {CURSOR_STYLE_OPTIONS.map((option) => {
                const checked = cursorVisualStyle === option.value;
                return (
                  <label
                    key={option.value}
                    htmlFor={`nota-cursor-style-${option.value}`}
                    className={cn(
                      'group relative flex cursor-pointer select-none flex-col gap-1 rounded-md border px-3 py-2 transition-colors',
                      checked
                        ? 'border-foreground/40 bg-background/80'
                        : 'border-border/70 bg-background/40 hover:border-border',
                    )}
                  >
                    <input
                      id={`nota-cursor-style-${option.value}`}
                      name="nota-cursor-style"
                      type="radio"
                      checked={checked}
                      onChange={() => {
                        setCursorVisualStyle(option.value);
                      }}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium text-foreground">
                      {option.label}
                    </span>
                    <span className="text-xs leading-snug text-muted-foreground">
                      {option.description}
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        'pointer-events-none absolute top-2 right-2 h-2 w-2 rounded-full transition-opacity',
                        checked ? 'bg-foreground/70 opacity-100' : 'opacity-0',
                      )}
                    />
                  </label>
                );
              })}
            </div>
          </fieldset>
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
                submitUserPreferencesPatch(
                  { open_todays_note_shortcut: checked },
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

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">Notes</h2>
          <label
            htmlFor="nota-show-note-backlinks"
            className={cn(
              'flex cursor-pointer select-none items-start gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3',
            )}
          >
            <input
              id="nota-show-note-backlinks"
              type="checkbox"
              checked={showNoteBacklinks}
              onChange={(e) => {
                const checked = e.target.checked;
                setShowNoteBacklinks(checked);
                submitUserPreferencesPatch(
                  { show_note_backlinks: checked },
                  user?.id,
                  setUserPreferencesInState,
                  notaProEntitled,
                );
              }}
              className="mt-0.5 size-4 shrink-0 rounded border border-input accent-primary"
            />
            <span className="text-sm leading-snug text-muted-foreground">
              Show backlinks on open notes
            </span>
          </label>
          <p className="text-sm text-muted-foreground">
            Lists other notes that link to the note you have open.
          </p>
          <label
            htmlFor="nota-delete-empty-folders"
            className={cn(
              'mt-3 flex cursor-pointer select-none items-start gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3',
            )}
          >
            <input
              id="nota-delete-empty-folders"
              type="checkbox"
              checked={userPreferences?.delete_empty_folders !== false}
              onChange={(e) => {
                const checked = e.target.checked;
                submitUserPreferencesPatch(
                  { delete_empty_folders: checked },
                  user?.id,
                  setUserPreferencesInState,
                  notaProEntitled,
                );
              }}
              className="mt-0.5 size-4 shrink-0 rounded border border-input accent-primary"
            />
            <span className="text-sm leading-snug text-muted-foreground">
              Delete folder when it has no notes
            </span>
          </label>
          <p className="text-sm text-muted-foreground">
            After you move or delete the last note in a folder, remove the empty
            folder automatically.
          </p>
          <label
            htmlFor="nota-emoji-replacer-enabled"
            className={cn(
              'mt-3 flex cursor-pointer select-none items-start gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3',
            )}
          >
            <input
              id="nota-emoji-replacer-enabled"
              type="checkbox"
              checked={emojiReplacerEnabled}
              onChange={(e) => {
                const checked = e.target.checked;
                setEmojiReplacerEnabled(checked);
                submitUserPreferencesPatch(
                  { emoji_replacer_enabled: checked },
                  user?.id,
                  setUserPreferencesInState,
                  notaProEntitled,
                );
              }}
              className="mt-0.5 size-4 shrink-0 rounded border border-input accent-primary"
            />
            <span className="text-sm leading-snug text-muted-foreground">
              Replace typed smileys with emoji
            </span>
          </label>
          <p className="text-sm text-muted-foreground">
            Turn off to keep text like <code className="text-foreground/90">:-)</code> as
            plain characters.
          </p>
        </section>

        {notaProEntitled ? (
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-foreground">Search</h2>
            <label
              htmlFor="nota-semantic-search-enabled"
              className={cn(
                'flex cursor-pointer select-none items-start gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3',
              )}
            >
              <input
                id="nota-semantic-search-enabled"
                type="checkbox"
                checked={semanticSearchEnabled}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSemanticSearchEnabled(checked);
                  submitUserPreferencesPatch(
                    { semantic_search_enabled: checked },
                    user?.id,
                    setUserPreferencesInState,
                    notaProEntitled,
                  );
                }}
                className="mt-0.5 size-4 shrink-0 rounded border border-input accent-primary"
              />
              <span className="text-sm leading-snug text-muted-foreground">
                Enable Semantic Search in ⌘K
              </span>
            </label>
            <p className="text-sm text-muted-foreground">
              Reorders notes by meaning as you type. Turn off to use text
              matching only.
            </p>
          </section>
        ) : null}

        {user ? <NotaProSettingsSection /> : null}

        {user ? (
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-foreground">Account</h2>
            <div className="flex flex-col gap-4 rounded-lg border border-border/60 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Signed in as</p>
                <p
                  className="mt-0.5 truncate text-sm font-medium text-foreground"
                  title={user.email ?? undefined}
                >
                  {user.email}
                </p>
              </div>
              <div className="flex shrink-0 justify-start sm:justify-end">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: 'size-9 ring-1 ring-border/40',
                      userButtonPopoverCard:
                        'border border-border/60 bg-background shadow-lg',
                      userButtonPopoverActionButton:
                        'text-foreground hover:bg-muted',
                      userButtonPopoverActionButtonText: 'text-foreground',
                    },
                  }}
                />
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
