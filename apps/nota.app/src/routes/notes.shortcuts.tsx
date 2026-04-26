import { useLayoutEffect, useState, type JSX } from 'react';
import { cn } from '@/lib/utils';
import { notaKbdReferenceValueClass } from '@/lib/nota-kbd-styles';
import {
  filterShortcutCatalogSections,
  NOTA_SHORTCUT_SECTIONS,
} from '@/lib/nota-shortcuts-catalogue';
import { navigatorLooksLikeApplePlatform } from '@/lib/navigator-apple-platform';
import { useNotaPreferencesStore } from '@/stores/nota-preferences';

export default function NotesShortcuts(): JSX.Element {
  const openTodaysNoteShortcut = useNotaPreferencesStore(
    (s) => s.openTodaysNoteShortcut,
  );
  const [isApple, setIsApple] = useState(true);

  useLayoutEffect(() => {
    setIsApple(
      navigatorLooksLikeApplePlatform() ||
        /\bMac OS X\b/i.test(navigator.userAgent),
    );
  }, []);

  const sections = filterShortcutCatalogSections(
    NOTA_SHORTCUT_SECTIONS,
    openTodaysNoteShortcut,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 py-8">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-10">
        <div>
          <h1 className="font-serif text-xl font-semibold tracking-normal text-foreground">
            Shortcuts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Keyboard reference for Nota. Mod means {isApple ? '⌘' : 'Ctrl'} on
            your device.
          </p>
        </div>

        {sections.map((section) => (
          <section key={section.id} className="space-y-3">
            <h2 className="text-sm font-medium text-foreground">
              {section.title}
            </h2>
            <ul className="divide-y divide-border/60 rounded-lg border border-border/60 bg-muted/20">
              {section.rows.map((row, rowIndex) => {
                const keys = isApple ? row.keysApple : row.keysOther;
                const showKbd = keys !== '—';
                return (
                  <li
                    key={`${section.id}-${rowIndex}`}
                    className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">{row.description}</p>
                      {row.detail ? (
                        <p className="mt-1 text-muted-foreground text-xs leading-snug">
                          {row.detail}
                        </p>
                      ) : null}
                    </div>
                    {showKbd ? (
                      <kbd
                        className={cn(
                          notaKbdReferenceValueClass,
                          'font-sans sm:max-w-[min(100%,14rem)] sm:pt-0.5',
                        )}
                      >
                        {keys}
                      </kbd>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
