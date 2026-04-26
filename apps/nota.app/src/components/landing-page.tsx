import type { JSX } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import {
  NotaCard,
  NotaCardContent,
  NotaCardDescription,
  NotaCardFooter,
  NotaCardHeader,
} from '@nota.app/web-design/card';
import { AuthScreenHashLink } from '@/components/auth-screen-hash-link';
import { CartoonLandscape } from '@/components/cartoon-landscape';
import { NotaLogo } from '@/components/nota-logo';

export function LandingPage(): JSX.Element {
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

      <div className="relative z-10 w-full max-w-md">
        <NotaCard
          className={cn(
            'border-border/50 bg-background/70 shadow-lg backdrop-blur-xl ring-1 ring-border/40',
          )}
        >
          <NotaCardHeader className="text-center">
            <div className="mb-3 flex justify-center">
              <NotaLogo className="size-14" />
            </div>
            <h1
              className="text-balance text-2xl font-normal leading-tight sm:text-3xl"
              style={{ fontFamily: '"Instrument Serif", serif' }}
            >
              Think clearly. Write slowly.
            </h1>
            <NotaCardDescription className="text-pretty">
              A quiet space for your thoughts, away from the noise.
            </NotaCardDescription>
          </NotaCardHeader>
          <NotaCardContent className="flex flex-col gap-3">
            <AuthScreenHashLink
              target="login"
              variant="default"
              size="lg"
              className={cn(
                'h-10 w-full touch-manipulation justify-center text-center',
              )}
            >
              Continue with email
              <span data-icon="inline-end" aria-hidden className="inline-flex">
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
              </span>
            </AuthScreenHashLink>
          </NotaCardContent>
          <NotaCardFooter className="justify-center border-t border-border/40 pt-4">
            <p className="text-center text-muted-foreground text-xs/relaxed">
              New here?{' '}
              <AuthScreenHashLink
                target="signup"
                className="text-xs underline-offset-4"
              >
                Create an account
              </AuthScreenHashLink>
            </p>
          </NotaCardFooter>
        </NotaCard>
      </div>
    </main>
  );
}
