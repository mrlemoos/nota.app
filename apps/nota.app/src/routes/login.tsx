import { useAuth } from '@clerk/react';
import type { JSX } from 'react';
import { AuthCardEpigraph } from '@/components/auth-card-epigraph';
import { AuthScreenHashLink } from '@/components/auth-screen-hash-link';
import { NotaClerkSignIn } from '@/components/nota-clerk-elements-auth';
import { CartoonLandscape } from '@/components/cartoon-landscape';
import { LoadingStatus } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export default function Login(): JSX.Element {
  const { isLoaded, userId } = useAuth();

  return (
    <main
      id="main-content"
      className={cn(
        'relative isolate flex min-h-0 flex-1 h-dvh overflow-y-auto items-center justify-center px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]',
      )}
    >
      <div className="absolute inset-0 z-0">
        <CartoonLandscape className="size-full" />
      </div>

      <div
        className={cn(
          'relative z-10 w-full max-w-md rounded-xl border border-border/50 bg-background/70 p-8 shadow-lg backdrop-blur-xl ring-1 ring-border/40',
        )}
      >
        <AuthCardEpigraph />
        {!isLoaded ? (
          <div className="py-10">
            <LoadingStatus label="Loading…" spinnerSize="sm" />
          </div>
        ) : userId ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Opening Nota…
          </p>
        ) : (
          <>
            <NotaClerkSignIn />
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <AuthScreenHashLink target="signup">Sign up</AuthScreenHashLink>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
