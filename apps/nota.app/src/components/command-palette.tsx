import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type JSX,
} from 'react';
import { Dialog } from '@base-ui/react/dialog';
import type { DialogRoot } from '@base-ui/react/dialog';
import { Command, defaultFilter } from 'cmdk';
import {
  AiAudioIcon,
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
  TaskDaily01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from '@/lib/utils';
import { notaKbdFooterClass, notaKbdHintClass } from '@/lib/nota-kbd-styles';
import { useNoteEditorCommands } from '../context/note-editor-commands';
import { useRootLoaderData } from '../context/session-context';
import { useNotesData } from '../context/notes-data-context';
import { useAppNavigationScreen } from '../hooks/use-app-navigation-screen';
import { openTodaysNoteClient } from '../lib/open-todays-note';
import { navigateFromLegacyPath, setAppHash } from '../lib/app-navigation';
import { useClerk } from '@clerk/react';
import { clientCreateNote } from '../lib/create-note-client';
import { clientDeleteNoteById } from '../lib/delete-note-client';
import { clientMoveNoteToFolder } from '../lib/move-note-folder-client';
import type { Folder } from '~/types/database.types';
import { FolderCreateDialog } from './folder-create-dialog';
import { FolderDeleteDialog } from './folder-delete-dialog';
import {
  startStudyNotesAppendToOpenNote,
  startStudyNotesFromRecording,
} from '../lib/audio-to-note-start';
import { useNotaPreferencesStore } from '../stores/nota-preferences';
import { useTheme } from './theme-provider';
import { CommandPaletteSemanticSync } from './command-palette-semantic-sync';
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

function pickCreateNoteFolderId(
  pickerOpen: boolean,
  paletteValue: string,
): string | undefined {
  if (!pickerOpen) {
    return undefined;
  }
  if (!paletteValue.startsWith('new-note-f:')) {
    return undefined;
  }
  const tail = paletteValue.slice('new-note-f:'.length);
  if (tail === 'root') {
    return undefined;
  }
  return tail;
}

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
  const [semanticOrderedIds, setSemanticOrderedIds] = useState<
    string[] | null
  >(null);
  const [semanticSearchLoading, setSemanticSearchLoading] = useState(false);
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
    folders,
    notaProEntitled,
    userPreferences,
    refreshNotesList,
    insertNoteAtFront,
    insertFolderSorted,
    patchNoteInList,
    removeNoteFromList,
    removeFolderFromList,
  } = useNotesData();
  const { user } = useRootLoaderData();
  const { signOut } = useClerk();
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
    insertTaskListAtCursor,
    canInsertTaskList,
  } = useNoteEditorCommands();
  const commandInputRef = useRef<HTMLInputElement | null>(null);
  const [newNoteHotkeyLabel, setNewNoteHotkeyLabel] = useState('⌘N');
  const [todaysNoteHotkeyLabel, setTodaysNoteHotkeyLabel] = useState('⌘D');
  const [historyBackHotkeyLabel, setHistoryBackHotkeyLabel] = useState('⌘[');
  const [historyForwardHotkeyLabel, setHistoryForwardHotkeyLabel] =
    useState('⌘]');
  const [createFolderHotkeyLabel, setCreateFolderHotkeyLabel] =
    useState('⇧⌘N');
  const [openingTodaysNote, setOpeningTodaysNote] = useState(false);
  const [startingAudioNote, setStartingAudioNote] = useState(false);
  const [paletteValue, setPaletteValue] = useState('');
  const [newNoteFolderPickerOpen, setNewNoteFolderPickerOpen] =
    useState(false);
  const [folderCreateDlgOpen, setFolderCreateDlgOpen] = useState(false);
  const [folderDeleteTarget, setFolderDeleteTarget] = useState<Folder | null>(
    null,
  );
  const [moveFlow, setMoveFlow] = useState<'idle' | 'pickNote' | 'pickFolder'>(
    'idle',
  );
  const [moveNoteId, setMoveNoteId] = useState<string | null>(null);
  const [deleteFolderPickerOpen, setDeleteFolderPickerOpen] = useState(false);

  const semanticSearchUserPref = useNotaPreferencesStore(
    (s) => s.semanticSearchEnabled,
  );
  const notaServerUrl =
    typeof import.meta.env.VITE_NOTA_SERVER_API_URL === 'string'
      ? import.meta.env.VITE_NOTA_SERVER_API_URL.trim()
      : '';
  const semanticSearchEnabled =
    notaProEntitled && notaServerUrl.length > 0 && semanticSearchUserPref;

  const handleSemanticOrderedIds = useCallback(
    (ids: string[] | null) => {
      setSemanticOrderedIds(ids);
    },
    [],
  );

  const handleSemanticLoading = useCallback((loading: boolean) => {
    setSemanticSearchLoading(loading);
  }, []);

  useEffect(() => {
    if (!open) {
      setSemanticOrderedIds(null);
      setSemanticSearchLoading(false);
      setNewNoteFolderPickerOpen(false);
      setPaletteValue('');
      setMoveFlow('idle');
      setMoveNoteId(null);
      setFolderDeleteTarget(null);
      setDeleteFolderPickerOpen(false);
    }
  }, [open]);

  const notesForOpenPalette = useMemo(() => {
    if (semanticOrderedIds === null) {
      return notes;
    }
    return semanticOrderedIds
      .map((id) => notes.find((n) => n.id === id))
      .filter((n): n is (typeof notes)[number] => Boolean(n));
  }, [notes, semanticOrderedIds]);

  const commandFilter = useCallback(
    (value: string, search: string, keywords?: string[]) => {
      if (value.startsWith('note-open:')) {
        const id = value.slice('note-open:'.length);
        if (semanticOrderedIds === null) {
          return defaultFilter(value, search, keywords);
        }
        if (semanticOrderedIds.length === 0) {
          return 0;
        }
        return semanticOrderedIds.includes(id) ? 1 : 0;
      }
      return defaultFilter(value, search, keywords);
    },
    [semanticOrderedIds],
  );

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
    setCreateFolderHotkeyLabel(isApple ? '⇧⌘N' : 'Ctrl+Shift+N');
  }, []);

  const paletteValueRef = useRef('');
  paletteValueRef.current = paletteValue;
  const newNotePickerOpenRef = useRef(false);
  newNotePickerOpenRef.current = newNoteFolderPickerOpen;

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
            const picked = pickCreateNoteFolderId(
              newNotePickerOpenRef.current,
              paletteValueRef.current,
            );
            await clientCreateNote({
              userId: user?.id ?? '',
              insertNoteAtFront,
              refreshNotesList,
              notaProEntitled,
              notes,
              ...(picked !== undefined ? { folderId: picked } : {}),
            });
            closePalette();
          } finally {
            setBusyAction(null);
          }
        })();
      }
      return;
    }

    if (e.key === 'Tab' && notaProEntitled) {
      if (newNotePickerOpenRef.current && e.shiftKey) {
        e.preventDefault();
        setNewNoteFolderPickerOpen(false);
        return;
      }
      if (
        !newNotePickerOpenRef.current &&
        !e.shiftKey &&
        paletteValueRef.current === 'create-note'
      ) {
        e.preventDefault();
        setNewNoteFolderPickerOpen(true);
        return;
      }
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
    <>
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
              Search commands and notes. Use arrow keys to move, Enter to run.
              Quoted phrases match note text literally; other text uses Semantic
              Search when Nota Pro is active.
            </Dialog.Description>
            <Command
              className="overflow-hidden"
              label="Command palette"
              vimBindings={false}
              filter={commandFilter}
              value={paletteValue}
              onValueChange={setPaletteValue}
            >
              <CommandPaletteSemanticSync
                enabled={semanticSearchEnabled && open}
                onSemanticOrderedIds={handleSemanticOrderedIds}
                onLoadingChange={handleSemanticLoading}
              />
              <Command.Input
                ref={commandInputRef}
                placeholder={
                  semanticSearchEnabled
                    ? 'Commands and Semantic Search — use quotes for exact phrases…'
                    : 'Type a command…'
                }
                className={cn(
                  'w-full bg-transparent px-3 py-3 text-sm',
                  'text-foreground outline-none placeholder:text-muted-foreground',
                )}
              />
              <Command.List className={commandListClassName}>
                {notaProEntitled && moveFlow !== 'idle' ? (
                  <Command.Group
                    heading={moveFlow === 'pickNote' ? 'Move note — pick note' : 'Move note — destination'}
                    className={groupHeadingClassName}
                  >
                    {moveFlow === 'pickNote'
                      ? notesForOpenPalette.map((n) => (
                          <Command.Item
                            key={`move-pick-${n.id}`}
                            value={`move-pick:${n.id}`}
                            keywords={['move', 'folder', n.title]}
                            onSelect={() => {
                              setMoveNoteId(n.id);
                              setMoveFlow('pickFolder');
                            }}
                            className={cn(
                              commandItemRowClass,
                              'group text-foreground',
                              'aria-selected:bg-accent aria-selected:text-accent-foreground',
                            )}
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {n.title || 'Untitled Note'}
                            </span>
                          </Command.Item>
                        ))
                      : null}
                    {moveFlow === 'pickFolder' && moveNoteId ? (
                      <>
                        <Command.Item
                          value="move-to:root"
                          keywords={['root', 'default', 'move']}
                          onSelect={() => {
                            const nid = moveNoteId;
                            const note = notes.find((x) => x.id === nid);
                            void clientMoveNoteToFolder({
                              noteId: nid,
                              targetFolderId: null,
                              previousFolderId: note?.folder_id ?? null,
                              userId: user?.id ?? '',
                              notaProEntitled,
                              userPreferences,
                              patchNoteInList,
                              removeFolderFromList,
                              refreshNotesList,
                            });
                            setMoveFlow('idle');
                            setMoveNoteId(null);
                            closePalette();
                          }}
                          className={cn(
                            commandItemRowClass,
                            'group text-foreground',
                            'aria-selected:bg-accent aria-selected:text-accent-foreground',
                          )}
                        >
                          <span className="min-w-0 flex-1">No folder</span>
                        </Command.Item>
                        {folders.map((f) => (
                          <Command.Item
                            key={`move-to-${f.id}`}
                            value={`move-to:${f.id}`}
                            keywords={['move', f.name]}
                            onSelect={() => {
                              const nid = moveNoteId;
                              const note = notes.find((x) => x.id === nid);
                              void clientMoveNoteToFolder({
                                noteId: nid,
                                targetFolderId: f.id,
                                previousFolderId: note?.folder_id ?? null,
                                userId: user?.id ?? '',
                                notaProEntitled,
                                userPreferences,
                                patchNoteInList,
                                removeFolderFromList,
                                refreshNotesList,
                              });
                              setMoveFlow('idle');
                              setMoveNoteId(null);
                              closePalette();
                            }}
                            className={cn(
                              commandItemRowClass,
                              'group text-foreground',
                              'aria-selected:bg-accent aria-selected:text-accent-foreground',
                            )}
                          >
                            <span className="min-w-0 flex-1 truncate">{f.name}</span>
                          </Command.Item>
                        ))}
                      </>
                    ) : null}
                    <Command.Item
                      value="move-cancel"
                      keywords={['cancel', 'back']}
                      onSelect={() => {
                        setMoveFlow('idle');
                        setMoveNoteId(null);
                      }}
                      className={cn(
                        commandItemRowClass,
                        'group text-muted-foreground',
                        'aria-selected:bg-accent aria-selected:text-accent-foreground',
                      )}
                    >
                      Cancel
                    </Command.Item>
                  </Command.Group>
                ) : null}
                {notaProEntitled && deleteFolderPickerOpen ? (
                  <Command.Group
                    heading="Delete folder — pick folder"
                    className={groupHeadingClassName}
                  >
                    {folders.map((f) => (
                      <Command.Item
                        key={`del-pick-${f.id}`}
                        value={`del-pick:${f.id}`}
                        keywords={['delete', 'folder', f.name]}
                        onSelect={() => {
                          setFolderDeleteTarget(f);
                          setDeleteFolderPickerOpen(false);
                        }}
                        className={cn(
                          commandItemRowClass,
                          'group text-foreground',
                          'aria-selected:bg-accent aria-selected:text-accent-foreground',
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate">{f.name}</span>
                      </Command.Item>
                    ))}
                    <Command.Item
                      value="del-pick-cancel"
                      keywords={['cancel']}
                      onSelect={() => {
                        setDeleteFolderPickerOpen(false);
                      }}
                      className={cn(
                        commandItemRowClass,
                        'group text-muted-foreground',
                        'aria-selected:bg-accent aria-selected:text-accent-foreground',
                      )}
                    >
                      Cancel
                    </Command.Item>
                  </Command.Group>
                ) : null}
                {notaProEntitled &&
                folderDeleteTarget === null &&
                moveFlow === 'idle' &&
                !deleteFolderPickerOpen ? (
                  <Command.Group
                    heading="Folders"
                    className={groupHeadingClassName}
                  >
                    <Command.Item
                      value="cmd-create-folder"
                      keywords={['folder', 'new folder', 'add folder']}
                      onSelect={() => {
                        setFolderCreateDlgOpen(true);
                      }}
                      className={cn(
                        commandItemRowClass,
                        'group text-foreground',
                        'aria-selected:bg-accent aria-selected:text-accent-foreground',
                      )}
                    >
                      <span className="min-w-0 flex-1">Create folder</span>
                      <span className={notaKbdHintClass}>
                        {createFolderHotkeyLabel}
                      </span>
                    </Command.Item>
                    <Command.Item
                      value="cmd-move-note"
                      disabled={notesForOpenPalette.length === 0}
                      keywords={['move note', 'folder', 'organise']}
                      onSelect={() => {
                        setMoveFlow('pickNote');
                      }}
                      className={cn(
                        commandItemRowClass,
                        'group text-foreground',
                        'aria-selected:bg-accent aria-selected:text-accent-foreground',
                        'aria-disabled:pointer-events-none aria-disabled:opacity-50',
                      )}
                    >
                      <span className="min-w-0 flex-1">Move note…</span>
                    </Command.Item>
                    <Command.Item
                      value="cmd-delete-folder"
                      disabled={folders.length === 0}
                      keywords={['delete folder', 'remove folder']}
                      onSelect={() => {
                        setDeleteFolderPickerOpen(true);
                      }}
                      className={cn(
                        commandItemRowClass,
                        'group text-foreground',
                        'aria-selected:bg-accent aria-selected:text-accent-foreground',
                        'aria-disabled:pointer-events-none aria-disabled:opacity-50',
                      )}
                    >
                      <span className="min-w-0 flex-1">Delete folder…</span>
                    </Command.Item>
                  </Command.Group>
                ) : null}
                {notaProEntitled ? (
                  <Command.Group
                    heading="Notes"
                    className={groupHeadingClassName}
                  >
                    <Command.Item
                      value="create-note"
                      disabled={busy || moveFlow !== 'idle'}
                      keywords={['new', 'add']}
                      onSelect={() => {
                        setBusyAction('create');
                        void (async () => {
                          try {
                            await clientCreateNote({
                              userId: user?.id ?? '',
                              insertNoteAtFront,
                              refreshNotesList,
                              notaProEntitled,
                              notes,
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
                    {newNoteFolderPickerOpen ? (
                      <Command.Group
                        heading="Folder for new note"
                        className={groupHeadingClassName}
                      >
                        <Command.Item
                          value="new-note-f:root"
                          keywords={['root', 'default', 'folder']}
                          onSelect={() => {
                            setBusyAction('create');
                            void (async () => {
                              try {
                                await clientCreateNote({
                                  userId: user?.id ?? '',
                                  insertNoteAtFront,
                                  refreshNotesList,
                                  notaProEntitled,
                                  notes,
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
                          )}
                        >
                          <span className="min-w-0 flex-1">Today</span>
                        </Command.Item>
                        {folders.map((f) => (
                          <Command.Item
                            key={`new-note-f-${f.id}`}
                            value={`new-note-f:${f.id}`}
                            keywords={['folder', f.name, 'new note']}
                            onSelect={() => {
                              setBusyAction('create');
                              void (async () => {
                                try {
                                  await clientCreateNote({
                                    userId: user?.id ?? '',
                                    insertNoteAtFront,
                                    refreshNotesList,
                                    notaProEntitled,
                                    notes,
                                    folderId: f.id,
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
                            )}
                          >
                            <span className="min-w-0 flex-1 truncate">{f.name}</span>
                          </Command.Item>
                        ))}
                      </Command.Group>
                    ) : null}
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
                                  void refreshNotesList({ silent: true });
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
                    <Command.Item
                      value="study-notes-from-recording"
                      disabled={busy || startingAudioNote}
                      keywords={[
                        'record',
                        'audio',
                        'lecture',
                        'class',
                        'transcript',
                        'capture',
                        'study',
                        'assistive',
                        'microphone',
                      ]}
                      onSelect={() => {
                        setStartingAudioNote(true);
                        void (async () => {
                          try {
                            await startStudyNotesFromRecording({
                              userId: user?.id ?? '',
                              notaProEntitled,
                              insertNoteAtFront,
                              refreshNotesList,
                            });
                            closePalette();
                          } finally {
                            setStartingAudioNote(false);
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
                        icon={AiAudioIcon}
                        className="text-muted-foreground group-aria-selected:text-accent-foreground"
                      />
                      <span className="min-w-0 flex-1">
                        {startingAudioNote
                          ? 'Starting capture…'
                          : 'Generate study notes from recording'}
                      </span>
                    </Command.Item>
                    {activeNoteId ? (
                      <Command.Item
                        value="study-notes-append-to-open-note"
                        disabled={busy || startingAudioNote}
                        keywords={[
                          'record',
                          'audio',
                          'lecture',
                          'append',
                          'add',
                          'existing',
                          'current',
                          'merge',
                          'study',
                          'assistive',
                          'microphone',
                        ]}
                        onSelect={() => {
                          setStartingAudioNote(true);
                          void (async () => {
                            try {
                              await startStudyNotesAppendToOpenNote({
                                userId: user?.id ?? '',
                                notaProEntitled,
                                openNoteId: activeNoteId,
                              });
                              closePalette();
                            } finally {
                              setStartingAudioNote(false);
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
                          icon={AiAudioIcon}
                          className="text-muted-foreground group-aria-selected:text-accent-foreground"
                        />
                        <span className="min-w-0 flex-1">
                          {startingAudioNote
                            ? 'Starting capture…'
                            : 'Add study notes from recording to this note'}
                        </span>
                      </Command.Item>
                    ) : null}
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
                        <span className="min-w-0 flex-1">
                          {semanticSearchLoading
                            ? 'Semantic search…'
                            : 'Open note'}
                        </span>
                        <span className={notaKbdHintClass}>Space</span>
                      </span>
                    }
                    className={groupHeadingClassName}
                  >
                    {notesForOpenPalette.map((note) => (
                      <Command.Item
                        key={note.id}
                        value={`note-open:${note.id}`}
                        keywords={[
                          'go',
                          'open',
                          'switch',
                          note.title,
                          note.id,
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
                      value="insert-task-list"
                      disabled={!canInsertTaskList}
                      keywords={[
                        'task',
                        'todo',
                        'checklist',
                        'checkbox',
                        'list',
                        'insert',
                      ]}
                      onSelect={() => {
                        if (!canInsertTaskList) return;
                        insertTaskListAtCursor();
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
                        icon={TaskDaily01Icon}
                        className="text-muted-foreground group-aria-selected:text-accent-foreground"
                      />
                      <span className="min-w-0 flex-1">Insert task list</span>
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
                            const delNote = notes.find((x) => x.id === activeNoteId);
                            await clientDeleteNoteById(activeNoteId, {
                              userId: user?.id ?? '',
                              removeNoteFromList,
                              removeFolderFromList,
                              refreshNotesList,
                              notaProEntitled,
                              noteFolderId: delNote?.folder_id ?? null,
                              userPreferences,
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
                          await signOut();
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
    <FolderCreateDialog
      open={folderCreateDlgOpen}
      onOpenChange={setFolderCreateDlgOpen}
      userId={user?.id}
      insertFolderSorted={insertFolderSorted}
      refreshNotesList={refreshNotesList}
    />
    <FolderDeleteDialog
      folder={folderDeleteTarget}
      allFolders={folders}
      open={folderDeleteTarget !== null}
      onOpenChange={(next) => {
        if (!next) {
          setFolderDeleteTarget(null);
        }
      }}
      removeNoteFromList={removeNoteFromList}
      removeFolderFromList={removeFolderFromList}
      refreshNotesList={refreshNotesList}
    />
    </>
  );
}
