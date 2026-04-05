import { useLayoutEffect, type JSX, type ReactNode } from 'react';
import { LandingPage } from './components/landing-page';
import { NotesSpaShell } from './components/notes-spa-shell';
import Login from './routes/login';
import Signup from './routes/signup';
import { useSpaSession } from './context/spa-session-context';
import { NotesDataProvider } from './context/notes-data-context';
import { SignedInCommandPalette } from './signed-in-command-palette';
import { useAppNavigationScreen } from './hooks/use-app-navigation-screen';
import { SpaNotFound } from './components/spa-not-found';
import { replaceAppHash } from './lib/app-navigation';
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
      className={cn(!active && 'hidden')}
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

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  const landingActive = kind === 'landing';
  const notFoundActive = kind === 'notFound';
  const loginActive = kind === 'login';
  const signupActive = kind === 'signup';
  const notesActive = kind === 'notes';

  return (
    <>
      <SpaAuthPanel active={notFoundActive} panelId="spa-screen-not-found">
        <SpaNotFound signedIn={Boolean(user)} />
      </SpaAuthPanel>
      <SpaAuthPanel active={landingActive} panelId="spa-screen-landing">
        {user ? (
          <div className="min-h-dvh bg-background" aria-hidden />
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
    </>
  );
}
