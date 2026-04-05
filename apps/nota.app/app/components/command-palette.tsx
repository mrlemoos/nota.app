import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type JSX,
} from 'react';
import { Dialog } from '@base-ui/react/dialog';
import type { DialogRoot } from '@base-ui/react/dialog';
import { Command } from 'cmdk';
import {
  ComputerIcon,
  Flowchart01Icon,
  Logout01Icon,
  Moon02Icon,
  NoteAddIcon,
  NoteIcon,
  NoteRemoveIcon,
  SparklesIcon,
  Sun01Icon,
  TableIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from '@/lib/utils';
import { notaKbdFooterClass, notaKbdHintClass } from '@/lib/nota-kbd-styles';
import { useNoteEditorCommands } from '../context/note-editor-commands';
import { useRootLoaderData } from '../context/spa-session-context';
import { useNotesData } from '../context/notes-data-context';
import { useAppNavigationScreen } from '../hooks/use-app-navigation-screen';
import { openTodaysNoteClient } from '../lib/open-todays-note';
import { navigateFromLegacyPath, setAppHash } from '../lib/app-navigation';
import { spaCreateNote } from '../lib/spa-create-note';
import { spaDeleteNoteById } from '../lib/spa-delete-note';
import { getBrowserClient } from '../lib/supabase/browser';
import { useNotaPreferencesStore } from '../stores/nota-preferences';
import { useTheme } from './theme-provider';
import {
  gsap,
  NOTA_MOTION_EASE_IN,
  NOTA_MOTION_EASE_OUT,
  NOTA_PALETTE_ENTER_S,
  NOTA_PALETTE_EXIT_S,
  useGSAP,
  usePrefersReducedMotion,
} from '@/lib/nota-motion';

const groupHeadingClassName =
  'px-1 py-1 text-muted-foreground text-xs [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5';

const commandItemRowClass =
  'flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm outline-none select-none';

/** Scrollable list: keep overflow but hide scrollbar (WebKit / Firefox / legacy Edge). */
const commandListClassName = cn(
  'max-h-72 overflow-y-auto p-1',
  '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
);

function PaletteItemIcon({
  icon,
  className,
}: {
  icon: ComponentProps<typeof HugeiconsIcon>['icon'];
  className?: string;
}): JSX.Element {
  return (
    <span aria-hidden className={cn('inline-flex shrink-0', className)}>
      <HugeiconsIcon icon={icon} size={16} />
    </span>
  );
}

export function CommandPalette(): JSX.Element {
  const [open, setOpen] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const dialogActionsRef = useRef<DialogRoot.Actions | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const popupMotionRef = useRef<HTMLDivElement | null>(null);
  const screen = useAppNavigationScreen();
  const activeNoteId =
    screen.kind === 'notes' && screen.panel === 'note'
      ? screen.noteId
      : null;
  const {
    notes,
    notaProEntitled,
    refreshNotesList,
    insertNoteAtFront,
    removeNoteFromList,
  } = useNotesData();
  const { user } = useRootLoaderData();
  const openTodaysNoteShortcut = useNotaPreferencesStore(
    (s) => s.openTodaysNoteShortcut,
  );
  const [busyAction, setBusyAction] = useState<
    'create' | 'delete' | 'logout' | null
  >(null);
  const busy = busyAction !== null;
  const { theme, setTheme } = useTheme();
  const {
    insertMermaidAtCursor,
    canInsertMermaid,
    insertTableAtCursor,
    canInsertTable,
  } = useNoteEditorCommands();
  const commandInputRef = useRef<HTMLInputElement | null>(null);
  const [newNoteHotkeyLabel, setNewNoteHotkeyLabel] = useState('⌘N');
  const [todaysNoteHotkeyLabel, setTodaysNoteHotkeyLabel] = useState('⌘D');
  const [historyBackHotkeyLabel, setHistoryBackHotkeyLabel] = useState('⌘[');
  const [historyForwardHotkeyLabel, setHistoryForwardHotkeyLabel] =
    useState('⌘]');
  const [openingTodaysNote, setOpeningTodaysNote] = useState(false);

  const closePalette = useCallback((): void => {
    dialogActionsRef.current?.close();
  }, []);

  const handleDialogOpenChange = useCallback(
    (next: boolean, eventDetails: DialogRoot.ChangeEventDetails): void => {
      if (next) {
        setOpen(true);
        return;
      }
      if (prefersReducedMotion) {
        setOpen(false);
        return;
      }
      // Keep the portal mounted until GSAP finishes; then call `unmount()` on the dialog actions ref.
      eventDetails.preventUnmountOnClose();
      setOpen(false);
    },
    [prefersReducedMotion],
  );

  useGSAP(
    () => {
      const backdrop = backdropRef.current;
      const panel = popupMotionRef.current;
      if (!backdrop || !panel) {
        return;
      }

      if (prefersReducedMotion) {
        if (open) {
          gsap.set([backdrop, panel], { clearProps: 'all' });
        }
        return;
      }

      if (open) {
        gsap.set(backdrop, { autoAlpha: 0 });
        gsap.set(panel, { autoAlpha: 0, scale: 0.96, y: -8 });
        gsap
          .timeline()
          .to(backdrop, {
            autoAlpha: 1,
            duration: NOTA_PALETTE_ENTER_S,
            ease: NOTA_MOTION_EASE_OUT,
          })
          .to(
            panel,
            {
              autoAlpha: 1,
              scale: 1,
              y: 0,
              duration: NOTA_PALETTE_ENTER_S,
              ease: NOTA_MOTION_EASE_OUT,
            },
            0,
          );
        return;
      }

      const tl = gsap.timeline({
        onComplete: () => {
          dialogActionsRef.current?.unmount();
        },
      });
      tl.to(panel, {
        autoAlpha: 0,
        scale: 0.96,
        y: -8,
        duration: NOTA_PALETTE_EXIT_S,
        ease: NOTA_MOTION_EASE_IN,
      }).to(
        backdrop,
        {
          autoAlpha: 0,
          duration: NOTA_PALETTE_EXIT_S,
          ease: NOTA_MOTION_EASE_IN,
        },
        0,
      );

      return () => {
        tl.kill();
      };
    },
    { dependencies: [open, prefersReducedMotion] },
  );

  useLayoutEffect(() => {
    const isApple =
      /Mac|iPhone|iPad|iPod/i.test(navigator.platform || '') ||
      /\bMac OS X\b/i.test(navigator.userAgent);
    setNewNoteHotkeyLabel(isApple ? '⌘N' : 'Ctrl+N');
    setTodaysNoteHotkeyLabel(isApple ? '⌘D' : 'Ctrl+D');
    setHistoryBackHotkeyLabel(isApple ? '⌘[' : 'Ctrl+[');
    setHistoryForwardHotkeyLabel(isApple ? '⌘]' : 'Ctrl+]');
  }, []);

  const onKeyDown = useEffectEvent((e: KeyboardEvent): void => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && (e.key === 'k' || e.key === 'K')) {
      if (open) {
        e.preventDefault();
        dialogActionsRef.current?.close();
        return;
      }

      e.preventDefault();
      setOpen(true);
      return;
    }

    if (!open) {
      return;
    }

    if (mod && (e.key === 'n' || e.key === 'N') && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      if (!notaProEntitled) {
        return;
      }
      if (!busy) {
        setBusyAction('create');
        void (async () => {
          try {
            await spaCreateNote({
              insertNoteAtFront,
              refreshNotesList,
              notaProEntitled,
            });
            closePalette();
          } finally {
            setBusyAction(null);
          }
        })();
      }
      return;
    }

    if (e.key === ' ') {
      const input = commandInputRef.current;
      const t = e.target;
      if (input && t instanceof Node && (input === t || input.contains(t))) {
        return;
      }
      e.preventDefault();
      input?.focus();
    }
  });

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={handleDialogOpenChange}
      actionsRef={dialogActionsRef}
    >
      <Dialog.Portal>
        <Dialog.Backdrop
          ref={backdropRef}
          className={cn('fixed inset-0 z-50 bg-black/40')}
        />
        <Dialog.Popup
          data-nota-command-palette
          className={cn(
            'fixed top-[15%] left-1/2 z-50 w-[min(100vw-2rem,28rem)] -translate-x-1/2 outline-none',
          )}
        >
          <div
            ref={popupMotionRef}
            className={cn(
              'rounded-lg bg-background/55 text-foreground shadow-lg',
              'backdrop-blur-xl backdrop-saturate-150',
            )}
          >
            <Dialog.Title className="sr-only">Command palette</Dialog.Title>
            <Dialog.Description className="sr-only">
              Search for a command. Use arrow keys to move, Enter to run.
            </Dialog.Description>
            <Command
              className="overflow-hidden"
              label="Command palette"
              vimBindings={false}
            >
              <Command.Input
                ref={commandInputRef}
                placeholder="Type a command…"
                className={cn(
                  'w-full bg-transparent px-3 py-3 text-sm',
                  'text-foreground outline-none placeholder:text-muted-foreground',
                )}
              />
              <Command.List className={commandListClassName}>
                {notaProEntitled ? (
                  <Command.Group
                    heading="Notes"
                    className={groupHeadingClassName}
                  >
                    <Command.Item
                      value="create-note"
                      disabled={busy}
                      keywords={['new', 'add']}
                      onSelect={() => {
                        setBusyAction('create');
                        void (async () => {
                          try {
                            await spaCreateNote({
                              insertNoteAtFront,
                              refreshNotesList,
                              notaProEntitled,
                            });
                            closePalette();
                          } finally {
                            setBusyAction(null);
                          }
                        })();
                      }}
                      className={cn(
                        commandItemRowClass,
                        'group text-foreground',
                        'aria-selected:bg-accent aria-selected:text-accent-foreground',
                        'aria-disabled:pointer-events-none aria-disabled:opacity-50',
                      )}
                    >
                      <PaletteItemIcon
                        icon={NoteAddIcon}
                        className="text-muted-foreground group-aria-selected:text-accent-foreground"
                      />
                      <span className="min-w-0 flex-1">
                        {busy && busyAction === 'create'
                          ? 'Creating note...'
                          : 'Create new note'}
                      </span>
                      <span className={notaKbdHintClass}>
                        {newNoteHotkeyLabel}
                      </span>
                    </Command.Item>
                    {openTodaysNoteShortcut && user?.id ? (
                      <Command.Item
                        value="open-todays-note"
                        disabled={openingTodaysNote}
                        keywords={[
                          'today',
                          'daily',
                          'journal',
                          'date',
                          'day',
                        ]}
                        onSelect={() => {
                          void (async () => {
                            setOpeningTodaysNote(true);
                            try {
                              await openTodaysNoteClient({
                                notes,
                                userId: user.id,
                                navigate: navigateFromLegacyPath,
                                revalidate: () => {
                                  void refreshNotesList();
                                },
                                notaProEntitled,
                              });
                              closePalette();
                            } finally {
                              setOpeningTodaysNote(false);
                            }
                          })();
                        }}
                        className={cn(
                          commandItemRowClass,
                          'group text-foreground',
                          'aria-selected:bg-accent aria-selected:text-accent-foreground',
                          'aria-disabled:pointer-events-none aria-disabled:opacity-50',
                        )}
                      >
                        <PaletteItemIcon
                          icon={NoteIcon}
                          className="text-muted-foreground group-aria-selected:text-accent-foreground"
                        />
                        <span className="min-w-0 flex-1">
                          {openingTodaysNote
                            ? 'Opening today’s note…'
                            : 'Open today’s note'}
                        </span>
                        <span className={notaKbdHintClass}>
                          {todaysNoteHotkeyLabel}
                        </span>
                      </Command.Item>
                    ) : null}
                    <Command.Item
                      value="open-note-graph"
                      keywords={[
                        'graph',
                        'map',
                        'visual',
                        'links',
                        'connections',
                        'network',
                      ]}
                      onSelect={() => {
                        navigateFromLegacyPath('/notes/graph');
                        closePalette();
                      }}
                      className={cn(
                        commandItemRowClass,
                        'group text-foreground',
                        'aria-selected:bg-accent aria-selected:text-accent-foreground',
                      )}
                    >
                      <PaletteItemIcon
                        icon={Flowchart01Icon}
                        className="text-muted-foreground group-aria-selected:text-accent-foreground"
                      />
                      <span className="min-w-0 flex-1">Open note graph</span>
                    </Command.Item>
                  </Command.Group>
                ) : (
                  <Command.Group
                    heading="Subscription"
                    className={groupHeadingClassName}
                  >
                    <Command.Item
                      value="open-settings-subscribe"
                      keywords={['upgrade', 'pay', 'billing', 'plan']}
                      onSelect={() => {
                        navigateFromLegacyPath('/notes/settings');
                        closePalette();
                      }}
                      className={cn(
                        commandItemRowClass,
                        'group text-foreground',
                        'aria-selected:bg-accent aria-selected:text-accent-foreground',
                      )}
                    >
                      <PaletteItemIcon
                        icon={SparklesIcon}
                        className="text-muted-foreground group-aria-selected:text-accent-foreground"
                      />
                      <span className="min-w-0 flex-1">
                        Open Settings to subscribe
                      </span>
                    </Command.Item>
                  </Command.Group>
                )}
                {notaProEntitled && notes.length > 0 ? (
                  <Command.Group
                    heading={
                      <span className="flex w-full items-center gap-2 pr-1 font-normal">
                        <span className="min-w-0 flex-1">Open note</span>
                        <span className={notaKbdHintClass}>Space</span>
                      </span>
                    }
                    className={groupHeadingClassName}
                  >
                    {notes.map((note) => (
                      <Command.Item
                        key={note.id}
                        value={`${note.title} ${note.id}`}
                        keywords={[
                          'go',
                          'open',
                          'switch',
                          note.title,
                          note.id.slice(0, 8),
                        ]}
                        onSelect={() => {
                          navigateFromLegacyPath(`/notes/${note.id}`);
                          closePalette();
                        }}
                        className={cn(
                          commandItemRowClass,
                          'group text-foreground',
                          'aria-selected:bg-accent aria-selected:text-accent-foreground',
                        )}
                      >
                        <PaletteItemIcon
                          icon={NoteIcon}
                          className="text-muted-foreground group-aria-selected:text-accent-foreground"
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {note.title || 'Untitled Note'}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}
                {notaProEntitled && activeNoteId ? (
                  <Command.Group
                    heading="This note"
                    className={groupHeadingClassName}
                  >
                    <Command.Item
                      value="insert-mermaid-diagram"
                      disabled={!canInsertMermaid}
                      keywords={[
                        'mermaid',
                        'diagram',
                        'flowchart',
                        'chart',
                        'graph',
                        'insert',
                      ]}
                      onSelect={() => {
                        if (!canInsertMermaid) return;
                        insertMermaidAtCursor();
                        closePalette();
                      }}
                      className={cn(
                        commandItemRowClass,
                        'group text-foreground',
                        'aria-selected:bg-accent aria-selected:text-accent-foreground',
                        'aria-disabled:pointer-events-none aria-disabled:opacity-50',
                      )}
                    >
                      <PaletteItemIcon
                        icon={Flowchart01Icon}
                        className="text-muted-foreground group-aria-selected:text-accent-foreground"
                      />
                      <span className="min-w-0 flex-1">
                        Insert Mermaid diagram
                      </span>
                    </Command.Item>
                    <Command.Item
                      value="insert-table"
                      disabled={!canInsertTable}
                      keywords={['table', 'grid', 'rows', 'columns', 'insert']}
                      onSelect={() => {
                        if (!canInsertTable) return;
                        insertTableAtCursor();
                        closePalette();
                      }}
                      className={cn(
                        commandItemRowClass,
                        'group text-foreground',
                        'aria-selected:bg-accent aria-selected:text-accent-foreground',
                        'aria-disabled:pointer-events-none aria-disabled:opacity-50',
                      )}
                    >
                      <PaletteItemIcon
                        icon={TableIcon}
                        className="text-muted-foreground group-aria-selected:text-accent-foreground"
                      />
                      <span className="min-w-0 flex-1">Insert table</span>
                    </Command.Item>
                    <Command.Item
                      value="delete-this-note"
                      disabled={busy}
                      keywords={['remove', 'trash', 'delete note']}
                      onSelect={() => {
                        if (
                          !confirm('Are you sure you want to delete this note?')
                        ) {
                          return;
                        }
                        setBusyAction('delete');
                        void (async () => {
                          try {
                            await spaDeleteNoteById(activeNoteId, {
                              removeNoteFromList,
                              refreshNotesList,
                              notaProEntitled,
                            });
                            closePalette();
                          } finally {
                            setBusyAction(null);
                          }
                        })();
                      }}
                      className={cn(
                        commandItemRowClass,
                        'group text-destructive',
                        'aria-selected:bg-destructive/15 aria-selected:text-destructive',
                        'aria-disabled:pointer-events-none aria-disabled:opacity-50',
                      )}
                    >
                      <PaletteItemIcon
                        icon={NoteRemoveIcon}
                        className="text-destructive group-aria-selected:text-destructive"
                      />
                      <span className="min-w-0 flex-1">
                        {busy && busyAction === 'delete'
                          ? 'Deleting...'
                          : 'Delete this note'}
                      </span>
                    </Command.Item>
                  </Command.Group>
                ) : null}
                <Command.Group
                  heading="Appearance"
                  className={groupHeadingClassName}
                >
                  <Command.Item
                    value="use-light-theme"
                    keywords={[
                      'light',
                      'appearance',
                      'theme',
                      'color scheme',
                      'mode',
                    ]}
                    onSelect={() => {
                      setTheme('light');
                      closePalette();
                    }}
                    className={cn(
                      commandItemRowClass,
                      'group text-foreground',
                      'aria-selected:bg-accent aria-selected:text-accent-foreground',
                    )}
                  >
                    <PaletteItemIcon
                      icon={Sun01Icon}
                      className="text-muted-foreground group-aria-selected:text-accent-foreground"
                    />
                    <span className="min-w-0 flex-1">Use light theme</span>
                    {theme === 'light' ? (
                      <span className="shrink-0 text-muted-foreground text-xs">
                        (current)
                      </span>
                    ) : null}
                  </Command.Item>
                  <Command.Item
                    value="use-dark-theme"
                    keywords={[
                      'dark',
                      'appearance',
                      'theme',
                      'color scheme',
                      'mode',
                    ]}
                    onSelect={() => {
                      setTheme('dark');
                      closePalette();
                    }}
                    className={cn(
                      commandItemRowClass,
                      'group text-foreground',
                      'aria-selected:bg-accent aria-selected:text-accent-foreground',
                    )}
                  >
                    <PaletteItemIcon
                      icon={Moon02Icon}
                      className="text-muted-foreground group-aria-selected:text-accent-foreground"
                    />
                    <span className="min-w-0 flex-1">Use dark theme</span>
                    {theme === 'dark' ? (
                      <span className="shrink-0 text-muted-foreground text-xs">
                        (current)
                      </span>
                    ) : null}
                  </Command.Item>
                  <Command.Item
                    value="use-system-theme"
                    keywords={[
                      'system',
                      'auto',
                      'os',
                      'default',
                      'appearance',
                      'theme',
                      'color scheme',
                      'mode',
                    ]}
                    onSelect={() => {
                      setTheme('system');
                      closePalette();
                    }}
                    className={cn(
                      commandItemRowClass,
                      'group text-foreground',
                      'aria-selected:bg-accent aria-selected:text-accent-foreground',
                    )}
                  >
                    <PaletteItemIcon
                      icon={ComputerIcon}
                      className="text-muted-foreground group-aria-selected:text-accent-foreground"
                    />
                    <span className="min-w-0 flex-1">Use system theme</span>
                    {theme === 'system' ? (
                      <span className="shrink-0 text-muted-foreground text-xs">
                        (current)
                      </span>
                    ) : null}
                  </Command.Item>
                </Command.Group>
                <Command.Group
                  heading="Account"
                  className={groupHeadingClassName}
                >
                  <Command.Item
                    value="sign-out"
                    disabled={busy}
                    keywords={['logout', 'log out', 'exit']}
                    onSelect={() => {
                      setBusyAction('logout');
                      void (async () => {
                        try {
                          await getBrowserClient().auth.signOut();
                          setAppHash({ kind: 'landing' });
                          closePalette();
                        } finally {
                          setBusyAction(null);
                        }
                      })();
                    }}
                    className={cn(
                      commandItemRowClass,
                      'group text-destructive',
                      'aria-selected:bg-destructive/15 aria-selected:text-destructive',
                      'aria-disabled:pointer-events-none aria-disabled:opacity-50',
                    )}
                  >
                    <PaletteItemIcon
                      icon={Logout01Icon}
                      className="text-destructive group-aria-selected:text-destructive"
                    />
                    <span className="min-w-0 flex-1">
                      {busy && busyAction === 'logout'
                        ? 'Signing out...'
                        : 'Sign out'}
                    </span>
                  </Command.Item>
                </Command.Group>
              </Command.List>
              <div
                className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/40 px-3 py-2 text-muted-foreground text-xs"
                aria-hidden
              >
                <span>
                  Back{' '}
                  <span className={notaKbdFooterClass}>
                    {historyBackHotkeyLabel}
                  </span>
                </span>
                <span>
                  Forward{' '}
                  <span className={notaKbdFooterClass}>
                    {historyForwardHotkeyLabel}
                  </span>
                </span>
              </div>
            </Command>
            <Dialog.Close
              type="button"
              className="sr-only"
              aria-label="Close command palette"
            >
              Close
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
