import { useEffect, useLayoutEffect, type JSX, type ReactNode } from 'react';
import { LandingPage } from './components/landing-page';
import { NotesShell } from './components/notes-shell';
import Login from './routes/login';
import Signup from './routes/signup';
import { useAppSession } from './context/session-context';
import { NotesDataProvider } from './context/notes-data-context';
import { SignedInCommandPalette } from './signed-in-command-palette';
import { useAppNavigationScreen } from './hooks/use-app-navigation-screen';
import { ElectronWindowDragBand } from './components/electron-window-drag-band';
import { NotFoundScreen } from './components/not-found-screen';
import { replaceAppHash, syncAppNavigation } from './lib/app-navigation';
import { repairClerkAuthLocationHash } from './lib/clerk-hash-navigation';
import { cn } from './lib/utils';

interface AppShellProps {
  children: ReactNode;
  active: boolean;
  panelId: string;
}

function AppShellPanel({
  active,
  panelId,
  children,
}: AppShellProps): JSX.Element {
  return (
    <div
      id={panelId}
      className={cn(
        !active && 'hidden',
        active && 'flex min-h-0 flex-1 flex-col',
      )}
      aria-hidden={!active}
      inert={active ? undefined : true}
    >
      {children}
    </div>
  );
}

function redirectAuthShell(
  user: { id: string } | null,
  loading: boolean,
  kind: 'landing' | 'notFound' | 'login' | 'signup' | 'notes',
): void {
  if (loading) {
    return;
  }
  if (kind === 'notFound') {
    return;
  }
  if (user && kind === 'landing') {
    replaceAppHash({ kind: 'notes', panel: 'list', noteId: null });
    return;
  }
  if (!user && kind === 'notes') {
    replaceAppHash({ kind: 'login' });
    return;
  }
  if (user && (kind === 'login' || kind === 'signup')) {
    replaceAppHash({ kind: 'notes', panel: 'list', noteId: null });
  }
}

export function NotaApp(): JSX.Element {
  const { user, loading } = useAppSession();
  const screen = useAppNavigationScreen();
  const kind = screen.kind;

  useLayoutEffect(() => {
    redirectAuthShell(user, loading, kind);
  }, [user, loading, kind]);

  useLayoutEffect(() => {
    if (kind === 'login' || kind === 'signup') {
      repairClerkAuthLocationHash();
    }
  }, [kind]);

  const landingActive = kind === 'landing';
  const notFoundActive = kind === 'notFound';
  const loginActive = kind === 'login';
  const signupActive = kind === 'signup';
  const notesActive = kind === 'notes';
  const anyShellActive =
    notFoundActive ||
    landingActive ||
    loginActive ||
    signupActive ||
    notesActive;

  useEffect(() => {
    if (loading || anyShellActive) {
      return;
    }
    syncAppNavigation();
  }, [loading, anyShellActive]);

  if (loading) {
    return (
      <div className="relative flex h-dvh min-h-0 items-center justify-center bg-background text-muted-foreground text-sm">
        <ElectronWindowDragBand />
        Loading…
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh min-h-0 flex-col bg-background text-foreground">
      <ElectronWindowDragBand />
      {!anyShellActive ? (
        <div
          className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground"
          role="status"
        >
          <p>Reconnecting to this screen…</p>
          <button
            type="button"
            className="rounded-md border border-border bg-muted/40 px-3 py-1.5 text-foreground text-xs hover:bg-muted/60"
            onClick={() => {
              syncAppNavigation();
              if (user) {
                replaceAppHash({
                  kind: 'notes',
                  panel: 'list',
                  noteId: null,
                });
              } else {
                replaceAppHash({ kind: 'landing' });
              }
            }}
          >
            Open Nota
          </button>
        </div>
      ) : null}
      <AppShellPanel active={notFoundActive} panelId="screen-not-found">
        <NotFoundScreen signedIn={Boolean(user)} />
      </AppShellPanel>
      <AppShellPanel active={landingActive} panelId="screen-landing">
        {user ? (
          <div className="flex min-h-0 flex-1 h-dvh items-center justify-center bg-background text-muted-foreground text-sm">
            Loading…
          </div>
        ) : (
          <LandingPage />
        )}
      </AppShellPanel>
      <AppShellPanel active={loginActive} panelId="screen-login">
        <Login />
      </AppShellPanel>
      <AppShellPanel active={signupActive} panelId="screen-signup">
        <Signup />
      </AppShellPanel>
      <AppShellPanel active={notesActive} panelId="screen-notes">
        <NotesDataProvider>
          <SignedInCommandPalette />
          <NotesShell />
        </NotesDataProvider>
      </AppShellPanel>
    </div>
  );
}
