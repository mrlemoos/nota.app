import { useEffect, useLayoutEffect, type JSX, type ReactNode } from 'react';
import { LandingPage } from './components/landing-page';
import { NotesSpaShell } from './components/notes-spa-shell';
import Login from './routes/login';
import Signup from './routes/signup';
import { useSpaSession } from './context/spa-session-context';
import { NotesDataProvider } from './context/notes-data-context';
import { SignedInCommandPalette } from './signed-in-command-palette';
import { useAppNavigationScreen } from './hooks/use-app-navigation-screen';
import { SpaNotFound } from './components/spa-not-found';
import { replaceAppHash, syncAppNavigation } from './lib/app-navigation';
import { repairClerkAuthLocationHash } from './lib/clerk-hash-navigation';
import { cn } from './lib/utils';

function SpaAuthPanel({
  active,
  panelId,
  children,
}: {
  active: boolean;
  panelId: string;
  children: ReactNode;
}): JSX.Element {
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
  kind:
    | 'landing'
    | 'notFound'
    | 'login'
    | 'signup'
    | 'notes',
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

export function SpaApp(): JSX.Element {
  const { user, loading } = useSpaSession();
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
      <div className="flex h-dvh min-h-0 items-center justify-center bg-background text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background text-foreground">
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
      <SpaAuthPanel active={notFoundActive} panelId="spa-screen-not-found">
        <SpaNotFound signedIn={Boolean(user)} />
      </SpaAuthPanel>
      <SpaAuthPanel active={landingActive} panelId="spa-screen-landing">
        {user ? (
          <div className="flex min-h-0 flex-1 h-dvh items-center justify-center bg-background text-muted-foreground text-sm">
            Loading…
          </div>
        ) : (
          <LandingPage />
        )}
      </SpaAuthPanel>
      <SpaAuthPanel active={loginActive} panelId="spa-screen-login">
        <Login />
      </SpaAuthPanel>
      <SpaAuthPanel active={signupActive} panelId="spa-screen-signup">
        <Signup />
      </SpaAuthPanel>
      <SpaAuthPanel active={notesActive} panelId="spa-screen-notes">
        <NotesDataProvider>
          <SignedInCommandPalette />
          <NotesSpaShell />
        </NotesDataProvider>
      </SpaAuthPanel>
    </div>
  );
}
