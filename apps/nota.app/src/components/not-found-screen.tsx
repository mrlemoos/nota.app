import type { JSX } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { NotaLogo } from '@/components/nota-logo';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { hashForScreen } from '@/lib/app-navigation';

export function NotFoundScreen({
  signedIn,
}: {
  signedIn: boolean;
}): JSX.Element {
  const homeHref = signedIn
    ? hashForScreen({ kind: 'notes', panel: 'list', noteId: null })
    : hashForScreen({ kind: 'landing' });

  return (
    <main
      id="not-found"
      aria-labelledby="not-found-title"
      className={cn(
        'relative isolate flex min-h-0 flex-1 h-dvh flex-col overflow-y-auto items-center justify-center',
        'px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]',
        'pt-[max(2.5rem,env(safe-area-inset-top))]',
      )}
    >
      {/* Depth: soft pools of tone (theme tokens only) */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
      >
        <div
          className={cn(
            'absolute -top-[35%] left-1/2 aspect-square w-[min(140vw,52rem)] -translate-x-1/2 rounded-full',
            'bg-gradient-to-b from-muted/35 to-transparent blur-3xl',
            'dark:from-muted/20',
          )}
        />
        <div
          className={cn(
            'absolute -bottom-[20%] -left-[15%] aspect-square w-[min(90vw,28rem)] rounded-full',
            'bg-gradient-to-tr from-muted/25 to-transparent blur-3xl',
            'dark:from-muted/12',
          )}
        />
      </div>

      {/* Oversized numeral — editorial margin, not a shouty error chrome */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
        aria-hidden
      >
        <p
          className={cn(
            'translate-x-[4%] translate-y-[6%] select-none text-center',
            'font-serif text-[clamp(5rem,22vw,13rem)] font-normal leading-none tracking-[-0.04em]',
            'text-foreground/[0.045] dark:text-foreground/[0.07]',
          )}
        >
          404
        </p>
      </div>

      {/* Foreground: one calm focal card */}
      <div className="relative z-10 w-full max-w-md md:max-w-lg md:translate-x-[-3%]">
        <div
          className={cn(
            'rounded-2xl border border-border/45 bg-background/80 px-8 py-10 shadow-sm',
            'backdrop-blur-xl ring-1 ring-border/25',
            'dark:bg-background/55 dark:ring-border/20',
          )}
        >
          <div className="mb-6 flex justify-center text-foreground">
            <NotaLogo className="size-11 opacity-90" />
          </div>

          <h1
            id="not-found-title"
            className={cn(
              'text-balance text-center font-serif text-3xl font-normal tracking-normal',
              'text-foreground sm:text-[2rem] sm:leading-snug',
            )}
            style={{ fontFamily: '"Instrument Serif", serif' }}
          >
            Lost in the margin
          </h1>

          <div
            className="mx-auto my-6 h-px w-10 bg-gradient-to-r from-transparent via-border to-transparent"
            aria-hidden
          />

          <p className="mx-auto max-w-[22rem] text-center text-pretty text-muted-foreground text-sm/relaxed">
            Nothing in Nota lives at this address. It may have moved, never
            existed, or the link was copied wrong.
          </p>

          <a
            href={homeHref}
            className={cn(
              buttonVariants({ variant: 'default', size: 'lg' }),
              'mt-8 flex h-10 w-full touch-manipulation items-center justify-center gap-2 text-center',
            )}
          >
            {signedIn ? 'Back to notes' : 'Return home'}
            <span data-icon="inline-end" aria-hidden className="inline-flex">
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
            </span>
          </a>
        </div>
      </div>
    </main>
  );
}
