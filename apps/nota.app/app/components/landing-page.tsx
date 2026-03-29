import type { JSX } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { CartoonLandscape } from '@/components/cartoon-landscape';
import { NotaLogo } from '@/components/nota-logo';
import { hashForScreen } from '../lib/app-navigation';

export function LandingPage(): JSX.Element {
  const loginHref = hashForScreen({ kind: 'login' });
  const signupHref = hashForScreen({ kind: 'signup' });

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

      <div className="relative z-10 w-full max-w-md">
        <Card
          className={cn(
            'border-border/50 bg-background/70 shadow-lg backdrop-blur-xl ring-1 ring-border/40',
          )}
        >
          <CardHeader className="text-center">
            <div className="mb-3 flex justify-center">
              <NotaLogo className="size-14" />
            </div>
            <h1
              className="text-balance text-2xl font-normal leading-tight sm:text-3xl"
              style={{ fontFamily: '"Instrument Serif", serif' }}
            >
              Think clearly. Write slowly.
            </h1>
            <CardDescription className="text-pretty">
              A quiet space for your thoughts, away from the noise.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <a
              href={loginHref}
              className={cn(
                buttonVariants({ variant: 'default', size: 'lg' }),
                'h-10 w-full touch-manipulation justify-center text-center',
              )}
            >
              Continue with email
              <span data-icon="inline-end" aria-hidden className="inline-flex">
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
              </span>
            </a>
          </CardContent>
          <CardFooter className="justify-center border-t border-border/40 pt-4">
            <p className="text-center text-muted-foreground text-xs/relaxed">
              New here?{' '}
              <a
                href={signupHref}
                className={cn(
                  buttonVariants({ variant: 'link', size: 'sm' }),
                  'h-auto p-0 text-xs underline-offset-4',
                )}
              >
                Create an account
              </a>
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
