import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type JSX,
} from 'react';
import {
  useFetcher,
  useMatches,
  useNavigate,
  useParams,
  useRevalidator,
} from 'react-router';
import { Dialog } from '@base-ui/react/dialog';
import { Command } from 'cmdk';
import {
  ComputerIcon,
  Flowchart01Icon,
  Logout01Icon,
  Moon02Icon,
  NoteAddIcon,
  NoteIcon,
  NoteRemoveIcon,
  Sun01Icon,
  TableIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from '@/lib/utils';
import {
  notaKbdFooterClass,
  notaKbdHintClass,
} from '@/lib/nota-kbd-styles';
import { useNoteEditorCommands } from '../context/note-editor-commands';
import { useRootLoaderData } from '../root';
import { openTodaysNoteClient } from '../lib/open-todays-note';
import { notesFromMatches } from '../lib/notes-from-matches';
import { useNotaPreferencesStore } from '../stores/nota-preferences';
import { useTheme } from './theme-provider';

const NOTES_ACTION = '/notes';
const LOGOUT_ACTION = '/logout';

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
  const { noteId } = useParams();
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();
  const matches = useMatches();
  const notes = notesFromMatches(matches);
  const { user } = useRootLoaderData() ?? { user: null };
  const openTodaysNoteShortcut = useNotaPreferencesStore(
    (s) => s.openTodaysNoteShortcut,
  );
  const deleteNoteAction = noteId ? `/notes/${noteId}` : null;
  const fetcher = useFetcher();
  const busy = fetcher.state === 'submitting' || fetcher.state === 'loading';
  const pendingAction = fetcher.formAction ?? '';
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
        setOpen(false);
        return;
      }

      e.preventDefault();
      setOpen(true);
      return;
    }

    if (!open) {
      return;
    }

    if (
      mod &&
      (e.key === 'n' || e.key === 'N') &&
      !e.shiftKey &&
      !e.altKey
    ) {
      e.preventDefault();
      if (!busy) {
        fetcher.submit(null, {
          method: 'post',
          action: NOTES_ACTION,
        });
        setOpen(false);
      }
      return;
    }

    if (e.key === ' ') {
      const input = commandInputRef.current;
      const t = e.target;
      if (
        input &&
        t instanceof Node &&
        (input === t || input.contains(t))
      ) {
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
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            'fixed inset-0 z-50 bg-black/40',
            'transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0',
          )}
        />
        <Dialog.Popup
          data-nota-command-palette
          className={cn(
            'fixed top-[15%] left-1/2 z-50 w-[min(100vw-2rem,28rem)] -translate-x-1/2',
            'rounded-lg bg-background/55 text-foreground shadow-lg',
            'backdrop-blur-xl backdrop-saturate-150',
            'outline-none',
            'transition-[opacity,transform] data-ending-style:scale-95 data-starting-style:scale-95',
            'data-ending-style:opacity-0 data-starting-style:opacity-0',
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
              <Command.Group heading="Notes" className={groupHeadingClassName}>
                <Command.Item
                  value="create-note"
                  disabled={busy}
                  keywords={['new', 'add']}
                  onSelect={() => {
                    fetcher.submit(null, {
                      method: 'post',
                      action: NOTES_ACTION,
                    });
                    setOpen(false);
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
                    {busy && pendingAction === NOTES_ACTION
                      ? 'Creating note...'
                      : 'Create new note'}
                  </span>
                  <span className={notaKbdHintClass}>{newNoteHotkeyLabel}</span>
                </Command.Item>
                {openTodaysNoteShortcut && user?.id ? (
                  <Command.Item
                    value="open-todays-note"
                    disabled={openingTodaysNote}
                    keywords={['today', 'daily', 'journal', 'date', 'day']}
                    onSelect={() => {
                      void (async () => {
                        setOpeningTodaysNote(true);
                        try {
                          await openTodaysNoteClient({
                            notes,
                            userId: user.id,
                            navigate,
                            revalidate,
                          });
                          setOpen(false);
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
                    navigate('/notes/graph');
                    setOpen(false);
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
              {notes.length > 0 ? (
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
                        navigate(`/notes/${note.id}`);
                        setOpen(false);
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
              {deleteNoteAction ? (
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
                      setOpen(false);
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
                    <span className="min-w-0 flex-1">Insert Mermaid diagram</span>
                  </Command.Item>
                  <Command.Item
                    value="insert-table"
                    disabled={!canInsertTable}
                    keywords={[
                      'table',
                      'grid',
                      'rows',
                      'columns',
                      'insert',
                    ]}
                    onSelect={() => {
                      if (!canInsertTable) return;
                      insertTableAtCursor();
                      setOpen(false);
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
                      fetcher.submit(null, {
                        method: 'post',
                        action: deleteNoteAction,
                      });
                      setOpen(false);
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
                      {busy && pendingAction === deleteNoteAction
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
                    setOpen(false);
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
                    setOpen(false);
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
                    setOpen(false);
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
                    fetcher.submit(null, {
                      method: 'post',
                      action: LOGOUT_ACTION,
                    });
                    setOpen(false);
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
                    {busy && pendingAction === LOGOUT_ACTION
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
                Back <span className={notaKbdFooterClass}>{historyBackHotkeyLabel}</span>
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
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
