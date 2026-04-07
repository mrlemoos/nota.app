import { useAuth } from '@clerk/clerk-react';
import type { JSX } from 'react';
import { AuthCardEpigraph } from '@/components/auth-card-epigraph';
import { ClerkElementsSignUp } from '@/components/clerk-elements-sign-up';
import { CartoonLandscape } from '@/components/cartoon-landscape';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { hashForScreen } from '../lib/app-navigation';

export default function Signup(): JSX.Element {
  const { isLoaded, userId } = useAuth();

  return (
    <main
      id="main-content"
      className={cn(
        'relative isolate flex min-h-dvh items-center justify-center px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]',
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
          <p className="py-10 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : userId ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Opening Nota…
          </p>
        ) : (
          <>
            <ClerkElementsSignUp />
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <a
                href={hashForScreen({ kind: 'login' })}
                className={cn(
                  buttonVariants({ variant: 'link', size: 'sm' }),
                  'h-auto p-0 text-sm',
                )}
              >
                Sign in
              </a>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
