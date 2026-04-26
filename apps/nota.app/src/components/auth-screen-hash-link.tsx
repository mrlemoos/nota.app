import type { VariantProps } from 'class-variance-authority';
import type { JSX, ReactNode } from 'react';
import { notaButtonVariants } from '@nota.app/web-design/button';
import { hashForScreen, replaceAppHash } from '@/lib/app-navigation';
import { cn } from '@/lib/utils';

type AuthHashTarget = 'login' | 'signup';

type AuthScreenHashLinkButtonProps = Pick<
  VariantProps<typeof notaButtonVariants>,
  'variant' | 'size'
>;

/**
 * Same-tab hash navigation for auth screens. Plain `href="#/…"` can miss React sync when
 * Clerk uses `history.replaceState`; `replaceAppHash` always notifies subscribers.
 */
export function AuthScreenHashLink({
  target,
  className,
  children,
  variant = 'link',
  size = 'sm',
}: {
  target: AuthHashTarget;
  className?: string;
  children: ReactNode;
} & AuthScreenHashLinkButtonProps): JSX.Element {
  const screen = target === 'login' ? ({ kind: 'login' } as const) : ({ kind: 'signup' } as const);
  const href = hashForScreen(screen);

  return (
    <a
      href={href}
      className={cn(
        notaButtonVariants({ variant, size }),
        variant === 'link' ? 'h-auto p-0 text-sm' : undefined,
        className,
      )}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
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
