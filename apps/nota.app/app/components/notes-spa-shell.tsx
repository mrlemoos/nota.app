import {
  useEffect,
  useLayoutEffect,
  useRef,
  lazy,
  Suspense,
  type JSX,
} from 'react';
import {
  Flowchart01Icon,
  Settings01Icon,
  SparklesIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '@/components/ui/button';
import { SimpleTooltip, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useStickyDocTitle } from '../context/sticky-doc-title';
import { useIsElectron } from '../lib/use-is-electron';
import { useNotesOfflineSync } from '../lib/use-notes-offline-sync';
import { useNotesHistoryShortcut } from '../lib/use-notes-history-shortcut';
import { useNotesSidebarShortcut } from '../lib/use-notes-sidebar-shortcut';
import { useTodaysNoteShortcut } from '../lib/use-todays-note-shortcut';
import { useSyncUserPreferences } from '../lib/use-sync-user-preferences';
import { useNotaPreferencesStore } from '../stores/nota-preferences';
import type { Note } from '~/types/database.types';
import {
  gsap,
  NOTA_MOTION_EASE_IN_OUT,
  NOTA_SIDEBAR_S,
  NOTA_SIDEBAR_WIDTH_PX,
  useGSAP,
  usePrefersReducedMotion,
} from '@/lib/nota-motion';
import { useNotesSidebarStore } from '../stores/notes-sidebar';
import { useRootLoaderData } from '../context/spa-session-context';
import { useNotesData } from '../context/notes-data-context';
import { useAppNavigationScreen } from '../hooks/use-app-navigation-screen';
import {
  hashForScreen,
  replaceAppHash,
  type NotesShellPanel,
} from '../lib/app-navigation';
import { noteHashHref, NoteDetailPanel } from './note-detail-panel';
import { spaCreateNote } from '../lib/spa-create-note';
import { spaDeleteNoteById } from '../lib/spa-delete-note';

const NotesGraphRoute = lazy(async () => import('../routes/notes.graph'));
const NotesSettingsRoute = lazy(async () => import('../routes/notes.settings'));
const NotesShortcutsRoute = lazy(async () => import('../routes/notes.shortcuts'));

/** Avoid `fallback={null}`: paywall redirect hits Settings before the chunk loads; Electron notes root is transparent so an empty main reads as a blank screen. */
function LazyNotesRouteFallback({ label }: { label: string }): JSX.Element {
  return (
    <div
      className={cn(
        'flex min-h-[40vh] flex-col items-center justify-center px-4',
        'bg-background/80 text-sm text-muted-foreground',
      )}
      role="status"
      aria-live="polite"
    >
      {label}
    </div>
  );
}

function SidebarToggle({ className }: { className?: string }): JSX.Element {
  const { open, toggle } = useNotesSidebarStore();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      onClick={toggle}
      className={cn('text-foreground', className)}
      aria-label={open ? 'Close sidebar' : 'Open sidebar'}
      aria-expanded={open}
    >
      {open ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 4.5l7.5 7.5-7.5 7.5"
          />
        </svg>
      )}
    </Button>
  );
}

function NotesIndexPanel({
  onCreate,
}: {
  onCreate: () => void;
}): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
            className="h-16 w-16 text-muted-foreground"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>
        <h2 className="mb-2 font-serif text-xl font-semibold tracking-normal text-foreground">
          Select a note
        </h2>
        <p className="mb-6 text-muted-foreground">
          Choose a note from the sidebar or create a new one.
        </p>
        <Button type="button" size="lg" className="min-h-10 px-6" onClick={onCreate}>
          Create New Note
        </Button>
      </div>
    </div>
  );
}

function ShellPanel({
  active,
  panelId,
  children,
}: {
  active: boolean;
  panelId: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div
      id={panelId}
      className={cn(!active && 'hidden')}
      aria-hidden={!active}
      inert={!active ? true : undefined}
    >
      {children}
    </div>
  );
}

export function NotesSpaShell(): JSX.Element {
  const screen = useAppNavigationScreen();
  const panel: NotesShellPanel =
    screen.kind === 'notes' ? screen.panel : 'list';
  const routeNoteId =
    screen.kind === 'notes' && screen.panel === 'note' ? screen.noteId : null;

  const {
    notes,
    loadError,
    userPreferences,
    notaProEntitled,
    loading,
    refreshNotesList,
    insertNoteAtFront,
    removeNoteFromList,
    setUserPreferencesInState,
  } = useNotesData();
  const { open } = useNotesSidebarStore();
  const asideRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const sidebarMotionReadyRef = useRef(false);
  const { user } = useRootLoaderData();
  const shellReady = !loading;
  const paywalled = Boolean(user && shellReady && !notaProEntitled);
  const { registerScrollRoot, resetSticky, sticky } = useStickyDocTitle();
  const isElectron = useIsElectron();
  const openTodaysNoteShortcut = useNotaPreferencesStore(
    (s) => s.openTodaysNoteShortcut,
  );

  useSyncUserPreferences(
    userPreferences,
    user?.id,
    setUserPreferencesInState,
    notaProEntitled,
  );

  useNotesHistoryShortcut(user?.id, shellReady);
  useNotesSidebarShortcut(user?.id, shellReady);
  useTodaysNoteShortcut(
    notes,
    user?.id,
    openTodaysNoteShortcut && shellReady,
    notaProEntitled,
  );

  useNotesOfflineSync(user?.id, notaProEntitled && shellReady);

  useEffect(() => {
    void import('../routes/notes.settings');
    void import('../routes/notes.shortcuts');
    void import('../routes/notes.graph');
  }, []);

  useLayoutEffect(() => {
    if (!paywalled) {
      return;
    }
    if (panel === 'settings') {
      return;
    }
    replaceAppHash({ kind: 'notes', panel: 'settings', noteId: null });
  }, [paywalled, panel]);

  useEffect(() => {
    return () => {
      registerScrollRoot(null);
      resetSticky();
    };
  }, [registerScrollRoot, resetSticky]);

  useGSAP(
    () => {
      const el = asideRef.current;
      if (!el) {
        return;
      }

      if (prefersReducedMotion) {
        gsap.set(el, {
          maxWidth: open ? NOTA_SIDEBAR_WIDTH_PX : 0,
          opacity: open ? 1 : 0,
        });
        return;
      }

      if (!sidebarMotionReadyRef.current) {
        sidebarMotionReadyRef.current = true;
        gsap.set(el, {
          maxWidth: open ? NOTA_SIDEBAR_WIDTH_PX : 0,
          opacity: open ? 1 : 0,
        });
        return;
      }

      gsap.to(el, {
        maxWidth: open ? NOTA_SIDEBAR_WIDTH_PX : 0,
        opacity: open ? 1 : 0,
        duration: NOTA_SIDEBAR_S,
        ease: NOTA_MOTION_EASE_IN_OUT,
        overwrite: 'auto',
      });
    },
    { dependencies: [open, prefersReducedMotion] },
  );

  const notesChrome =
    'bg-background/55 backdrop-blur-xl backdrop-saturate-150 text-foreground';

  const onCreateNote = (): void => {
    if (!user?.id) {
      return;
    }
    void spaCreateNote({
      userId: user.id,
      insertNoteAtFront,
      refreshNotesList,
      notaProEntitled,
    });
  };

  const graphHref = hashForScreen({
    kind: 'notes',
    panel: 'graph',
    noteId: null,
  });
  const settingsHref = hashForScreen({
    kind: 'notes',
    panel: 'settings',
    noteId: null,
  });
  const shortcutsHref = hashForScreen({
    kind: 'notes',
    panel: 'shortcuts',
    noteId: null,
  });
  return (
    <>
      {sticky.visible && sticky.label ? (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center pt-[max(0.5rem,env(safe-area-inset-top))]"
          aria-hidden
        >
          <span className="max-w-[min(20rem,calc(100%-2rem))] truncate rounded-md bg-background/80 px-3 py-1 text-center text-sm font-medium text-foreground backdrop-blur-sm">
            {sticky.label}
          </span>
        </div>
      ) : null}
      <div
        className={cn(
          'nota-notes-root flex h-full min-h-0 flex-1 bg-linear-to-b from-muted/25 to-background',
        )}
      >
        {!paywalled && !open ? (
          <div
            className={cn(
              'fixed z-40 flex items-center',
              isElectron
                ? 'pointer-events-none top-0 left-0 min-h-[52px] pl-20 pt-[env(safe-area-inset-top)]'
                : 'left-4 top-4',
            )}
          >
            <SidebarToggle
              className={cn(
                'text-foreground',
                isElectron && 'pointer-events-auto',
              )}
            />
          </div>
        ) : null}
        {!paywalled ? (
          <aside
            ref={asideRef}
            className={cn(
              'flex h-full min-h-0 min-w-0 shrink-0 flex-col overflow-hidden',
              notesChrome,
              !open && 'pointer-events-none',
            )}
            aria-hidden={!open}
          >
          <TooltipProvider>
            <div
              className={cn(
                'flex shrink-0 items-center justify-between pr-4 pb-4',
                isElectron
                  ? 'pl-20 pt-[max(1rem,env(safe-area-inset-top))]'
                  : 'pl-4 pt-4',
              )}
            >
              <h2 className="font-serif text-lg font-semibold tracking-normal">
                Notes
              </h2>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  size="icon-lg"
                  variant="default"
                  aria-label="Create new note"
                  onClick={onCreateNote}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                </Button>
                <SidebarToggle />
              </div>
            </div>

            {loadError && (
              <div
                className="m-4 shrink-0 rounded-md bg-destructive/15 p-3 text-sm text-destructive"
                role="alert"
              >
                {loadError}
              </div>
            )}

            <nav className="min-h-0 flex-1 overflow-y-auto p-2">
              {notes.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="mb-3 text-sm text-muted-foreground">
                    No notes yet.
                  </p>
                  <Button type="button" variant="default" onClick={onCreateNote}>
                    Create your first note
                  </Button>
                </div>
              ) : (
                <ul className="space-y-1">
                  {notes.map((note: Note) => {
                    const isActive =
                      panel === 'note' && routeNoteId === note.id;
                    const noteLabel = note.title || 'Untitled Note';
                    return (
                      <li key={note.id}>
                        <div
                          className={cn(
                            'flex items-center gap-0 rounded-md transition-colors',
                            isActive
                              ? 'bg-muted'
                              : 'text-foreground hover:bg-muted/60',
                          )}
                        >
                          <a
                            href={noteHashHref(note.id)}
                            className={cn(
                              'min-w-0 flex-1 px-3 py-2 text-sm transition-colors',
                              isActive
                                ? 'font-medium text-foreground'
                                : 'text-foreground',
                            )}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            <div className="font-medium">{noteLabel}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {new Date(note.updated_at).toLocaleDateString(
                                undefined,
                                {
                                  month: 'short',
                                  day: 'numeric',
                                },
                              )}
                            </div>
                          </a>
                          <div className="shrink-0 pr-1">
                            <SimpleTooltip label="Delete note" side="left">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:bg-transparent hover:text-destructive"
                                aria-label={`Delete note: ${noteLabel}`}
                                onClick={() => {
                                  if (
                                    !confirm(
                                      'Are you sure you want to delete this note?',
                                    )
                                  ) {
                                    return;
                                  }
                                  void spaDeleteNoteById(note.id, {
                                    userId: user?.id ?? '',
                                    removeNoteFromList,
                                    refreshNotesList,
                                    notaProEntitled,
                                  });
                                }}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={1.5}
                                  stroke="currentColor"
                                  className="h-4 w-4"
                                  aria-hidden
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                  />
                                </svg>
                              </Button>
                            </SimpleTooltip>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </nav>

            {user ? (
              <footer className="mt-auto shrink-0 border-t border-border/40 p-3">
                <div className="flex flex-col gap-3">
                  <a
                    href={graphHref}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                      panel === 'graph'
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    <span className="inline-flex shrink-0" aria-hidden>
                      <HugeiconsIcon icon={Flowchart01Icon} size={16} />
                    </span>
                    Note Graph
                  </a>
                  <a
                    href={shortcutsHref}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                      panel === 'shortcuts'
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    <span className="inline-flex shrink-0" aria-hidden>
                      <HugeiconsIcon icon={SparklesIcon} size={16} />
                    </span>
                    Shortcuts
                  </a>
                  <a
                    href={settingsHref}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                      panel === 'settings'
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    <span className="inline-flex shrink-0" aria-hidden>
                      <HugeiconsIcon icon={Settings01Icon} size={16} />
                    </span>
                    Settings
                  </a>
                </div>
              </footer>
            ) : null}
          </TooltipProvider>
        </aside>
        ) : null}

        <main
          ref={registerScrollRoot}
          className={cn(
            'min-h-0 flex-1 overflow-auto',
            '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
            notesChrome,
            paywalled
              ? isElectron
                ? 'pt-[max(1rem,env(safe-area-inset-top))]'
                : 'pt-8'
              : isElectron
                ? 'pt-[max(3.5rem,calc(env(safe-area-inset-top)+2.75rem))]'
                : 'pt-16',
          )}
        >
          {paywalled ? (
            <div
              className="border-b border-border/60 bg-muted/20 px-4 py-4 text-center"
              role="status"
            >
              <p className="text-sm leading-relaxed text-muted-foreground">
                An active Nota subscription is required to write and sync notes.
                Choose a plan in{' '}
                <span className="font-medium text-foreground">Settings</span>{' '}
                below.
              </p>
            </div>
          ) : null}
          <ShellPanel active={panel === 'list'} panelId="nota-panel-list">
            <NotesIndexPanel onCreate={onCreateNote} />
          </ShellPanel>
          <ShellPanel active={panel === 'note'} panelId="nota-panel-note">
            {routeNoteId ? (
              <NoteDetailPanel noteId={routeNoteId} />
            ) : null}
          </ShellPanel>
          <ShellPanel active={panel === 'graph'} panelId="nota-panel-graph">
            <Suspense fallback={<LazyNotesRouteFallback label="Loading graph…" />}>
              <NotesGraphRoute />
            </Suspense>
          </ShellPanel>
          <ShellPanel active={panel === 'settings'} panelId="nota-panel-settings">
            <Suspense
              fallback={<LazyNotesRouteFallback label="Loading settings…" />}
            >
              <NotesSettingsRoute />
            </Suspense>
          </ShellPanel>
          <ShellPanel
            active={panel === 'shortcuts'}
            panelId="nota-panel-shortcuts"
          >
            <Suspense
              fallback={<LazyNotesRouteFallback label="Loading shortcuts…" />}
            >
              <NotesShortcutsRoute />
            </Suspense>
          </ShellPanel>
        </main>
      </div>
    </>
  );
}
