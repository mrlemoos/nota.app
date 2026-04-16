import type { JSX, MouseEvent, ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { hashForScreen, replaceAppHash } from '@/lib/app-navigation';
import { cn } from '@/lib/utils';

type AuthHashTarget = 'login' | 'signup';

/**
 * Same-tab hash navigation for auth screens. Plain `href="#/…"` can miss React sync when
 * Clerk uses `history.replaceState`; `replaceAppHash` always notifies subscribers.
 */
export function AuthScreenHashLink({
  target,
  className,
  children,
}: {
  target: AuthHashTarget;
  className?: string;
  children: ReactNode;
}): JSX.Element {
  const screen = target === 'login' ? ({ kind: 'login' } as const) : ({ kind: 'signup' } as const);
  const href = hashForScreen(screen);

  return (
    <a
      href={href}
      className={cn(buttonVariants({ variant: 'link', size: 'sm' }), 'h-auto p-0 text-sm', className)}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        if (e.defaultPrevented) return;
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
          return;
        }
        e.preventDefault();
        replaceAppHash(screen);
      }}
    >
      {children}
    </a>
  );
}
