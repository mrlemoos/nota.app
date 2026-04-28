import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
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
import { NotaButton } from '@nota.app/web-design/button';
import { NotaTooltipProvider } from '@nota.app/web-design/tooltip';
import { NotaLoadingStatus } from '@nota.app/web-design/spinner';
import { ELECTRON_WINDOW_NO_DRAG_CLASS } from '@/lib/electron-window-chrome';
import { cn } from '@/lib/utils';
import { useStickyDocTitle } from '../context/sticky-doc-title';
import { useIsElectron } from '../lib/use-is-electron';
import { useNotesOfflineSync } from '../lib/use-notes-offline-sync';
import { useNotesHistoryShortcut } from '../lib/use-notes-history-shortcut';
import { useNotesSidebarShortcut } from '../lib/use-notes-sidebar-shortcut';
import { useCreateFolderShortcut } from '../lib/use-create-folder-shortcut';
import { useSettingsShortcut } from '../lib/use-settings-shortcut';
import { useTodaysNoteShortcut } from '../lib/use-todays-note-shortcut';
import { useSyncUserPreferences } from '../lib/use-sync-user-preferences';
import { useNotaPreferencesStore } from '../stores/nota-preferences';
import {
  gsap,
  NOTA_MOTION_EASE_IN_OUT,
  NOTA_SIDEBAR_S,
  NOTA_SIDEBAR_WIDTH_PX,
  useGSAP,
  usePrefersReducedMotion,
} from '@/lib/nota-motion';
import { useNotesSidebarStore } from '../stores/notes-sidebar';
import { useRootLoaderData } from '../context/session-context';
import { useNotesData } from '../context/notes-data-context';
import { useAppNavigationScreen } from '../hooks/use-app-navigation-screen';
import {
  hashForScreen,
  replaceAppHash,
  type NotesShellPanel,
} from '../lib/app-navigation';
import { NOTA_MENUBAR_NEW_FOLDER_REQUEST_EVENT } from '../lib/electron-menubar-events';
import { NoteDetailPanel } from './note-detail-panel';
import { clientCreateNote } from '../lib/create-note-client';
import { FolderCreateDialog } from './folder-create-dialog';
import { NotesSidebarList } from './notes-sidebar-list';
import { AudioToNoteDock } from './audio-to-note-dock';
import { ElectronMenubarBridge } from './electron-menubar-bridge';
import { StudyRecordingUploadWarningBanner } from './study-recording-upload-warning-banner';
import { useAudioNotePendingDrain } from '../hooks/use-audio-note-pending-drain';
import { useNotaTranslator } from '@/lib/use-nota-translator';
import {
  LazyNotesRouteFallback,
  NotesIndexPanel,
  ShellPanel,
  SidebarToggle,
} from './notes-shell-parts';

const NotesGraphRoute = lazy(async () => import('../routes/notes.graph'));
const NotesSettingsRoute = lazy(async () => import('../routes/notes.settings'));
const NotesShortcutsRoute = lazy(
  async () => import('../routes/notes.shortcuts'),
);

export function NotesShell(): JSX.Element {
  const screen = useAppNavigationScreen();
  const panel: NotesShellPanel =
    screen.kind === 'notes' ? screen.panel : 'list';
  const routeNoteId =
    screen.kind === 'notes' && screen.panel === 'note' ? screen.noteId : null;

  const {
    notes,
    folders,
    loadError,
    userPreferences,
    notaProEntitled,
    loading,
    refreshNotesList,
    insertNoteAtFront,
    patchNoteInList,
    insertFolderSorted,
    patchFolderInList,
    removeNoteFromList,
    removeFolderFromList,
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
  const [folderCreateOpen, setFolderCreateOpen] = useState(false);
  const { t } = useNotaTranslator();

  useSyncUserPreferences(
    userPreferences,
    user?.id,
    setUserPreferencesInState,
    notaProEntitled,
  );

  useNotesHistoryShortcut(user?.id, shellReady);
  useNotesSidebarShortcut(user?.id, shellReady);
  useSettingsShortcut(user?.id, shellReady);
  useTodaysNoteShortcut(
    notes,
    user?.id,
    openTodaysNoteShortcut && shellReady,
    notaProEntitled,
  );
  useCreateFolderShortcut(
    user?.id,
    Boolean(user?.id && shellReady && notaProEntitled),
    () => {
      setFolderCreateOpen(true);
    },
  );

  useEffect(() => {
    function onNewFolderRequest(): void {
      if (!user?.id || !notaProEntitled || !shellReady) {
        return;
      }
      setFolderCreateOpen(true);
    }

    window.addEventListener(
      NOTA_MENUBAR_NEW_FOLDER_REQUEST_EVENT,
      onNewFolderRequest,
    );
    return () => {
      window.removeEventListener(
        NOTA_MENUBAR_NEW_FOLDER_REQUEST_EVENT,
        onNewFolderRequest,
      );
    };
  }, [notaProEntitled, shellReady, user?.id]);

  useNotesOfflineSync(user?.id, notaProEntitled && shellReady);

  useAudioNotePendingDrain(Boolean(user?.id && notaProEntitled && shellReady));

  useEffect(() => {
    // Vitest: prefetch completes after jsdom teardown and triggers EnvironmentTeardownError
    // on nested imports (e.g. notes.shortcuts → nota-kbd-styles).
    if (import.meta.env.MODE === 'test') {
      return;
    }
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
    void clientCreateNote({
      userId: user.id,
      insertNoteAtFront,
      refreshNotesList,
      notaProEntitled,
      notes,
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
  const showVaultLoading = Boolean(user?.id && loading);
  return (
    <>
      <ElectronMenubarBridge />
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
      {showVaultLoading ? (
        <div
          className={cn(
            'flex h-full min-h-0 flex-1 items-center justify-center',
            'bg-linear-to-b from-muted/25 to-background text-muted-foreground',
          )}
        >
          <NotaLoadingStatus label={t('Loading notes…')} />
        </div>
      ) : (
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
                  isElectron &&
                    cn('pointer-events-auto', ELECTRON_WINDOW_NO_DRAG_CLASS),
                )}
              />
            </div>
          ) : null}
          {!paywalled ? (
            <aside
              ref={asideRef}
              className={cn(
                'flex h-full min-h-0 min-w-0 shrink-0 flex-col overflow-hidden',
                // Match NOTA_SIDEBAR_WIDTH_PX so first paint is capped before GSAP applies inline maxWidth.
                open ? 'max-w-[288px]' : 'max-w-0',
                notesChrome,
                !open && 'pointer-events-none',
              )}
              aria-hidden={!open}
            >
              <NotaTooltipProvider>
                <div
                  className={cn(
                    'flex shrink-0 items-center justify-between pr-4 pb-4',
                    isElectron
                      ? cn(
                          'relative z-40 pl-20 pt-[max(1rem,env(safe-area-inset-top))]',
                          ELECTRON_WINDOW_NO_DRAG_CLASS,
                        )
                      : 'pl-4 pt-4',
                  )}
                >
                  <h2 className="font-serif text-lg font-semibold tracking-normal">
                    Notes
                  </h2>
                  <div className="flex items-center gap-2">
                    <NotaButton
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
                    </NotaButton>
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
                  <NotesSidebarList
                    notes={notes}
                    folders={folders}
                    panel={panel}
                    routeNoteId={routeNoteId}
                    userId={user?.id}
                    notaProEntitled={notaProEntitled}
                    userPreferences={userPreferences}
                    insertNoteAtFront={insertNoteAtFront}
                    insertFolderSorted={insertFolderSorted}
                    patchNoteInList={patchNoteInList}
                    patchFolderInList={patchFolderInList}
                    removeNoteFromList={removeNoteFromList}
                    removeFolderFromList={removeFolderFromList}
                    refreshNotesList={refreshNotesList}
                  />
                </nav>
                <FolderCreateDialog
                  open={folderCreateOpen}
                  onOpenChange={setFolderCreateOpen}
                  userId={user?.id}
                  insertFolderSorted={insertFolderSorted}
                  refreshNotesList={refreshNotesList}
                />

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
                        {t('Note Graph')}
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
                        {t('Shortcuts')}
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
                        {t('Settings')}
                      </a>
                    </div>
                  </footer>
                ) : null}
              </NotaTooltipProvider>
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
                  {t(
                    'An active Nota subscription is required to write and sync notes.',
                  )}{' '}
                  {t('Choose a plan in')}{' '}
                  <span className="font-medium text-foreground">
                    {t('Settings')}
                  </span>{' '}
                  {t('below.')}
                </p>
              </div>
            ) : null}
            <ShellPanel active={panel === 'list'} panelId="nota-panel-list">
              <NotesIndexPanel onCreate={onCreateNote} />
            </ShellPanel>
            <ShellPanel active={panel === 'note'} panelId="nota-panel-note">
              {routeNoteId ? <NoteDetailPanel noteId={routeNoteId} /> : null}
            </ShellPanel>
            <ShellPanel active={panel === 'graph'} panelId="nota-panel-graph">
              <Suspense
                fallback={
                  <LazyNotesRouteFallback label={t('Loading graph…')} />
                }
              >
                <NotesGraphRoute />
              </Suspense>
            </ShellPanel>
            <ShellPanel
              active={panel === 'settings'}
              panelId="nota-panel-settings"
            >
              <Suspense
                fallback={
                  <LazyNotesRouteFallback label={t('Loading settings…')} />
                }
              >
                <NotesSettingsRoute />
              </Suspense>
            </ShellPanel>
            <ShellPanel
              active={panel === 'shortcuts'}
              panelId="nota-panel-shortcuts"
            >
              <Suspense
                fallback={
                  <LazyNotesRouteFallback label={t('Loading shortcuts…')} />
                }
              >
                <NotesShortcutsRoute />
              </Suspense>
            </ShellPanel>
          </main>
        </div>
      )}
      {!paywalled ? (
        <>
          <StudyRecordingUploadWarningBanner />
          <AudioToNoteDock />
        </>
      ) : null}
    </>
  );
}
