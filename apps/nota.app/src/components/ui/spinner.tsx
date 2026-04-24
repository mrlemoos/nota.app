import { cn } from '@/lib/utils';
import type { JSX, ReactNode } from 'react';

const spinnerSizeClass: Record<'sm' | 'md', string> = {
  sm: 'size-3.5 border-2',
  md: 'size-5 border-2',
};

/**
 * Indeterminate progress ring. Pair with copy via {@link LoadingStatus} where possible.
 */
export function NotaSpinner({
  className,
  size = 'md',
}: {
  className?: string;
  size?: 'sm' | 'md';
}): JSX.Element {
  return (
    <span
      className={cn(
        'inline-block shrink-0 animate-spin rounded-full border-muted-foreground/20 border-t-muted-foreground/55',
        spinnerSizeClass[size],
        className,
      )}
      aria-hidden
    />
  );
}

export function LoadingStatus({
  label,
  className,
  spinnerSize = 'md',
}: {
  label: ReactNode;
  className?: string;
  spinnerSize?: 'sm' | 'md';
}): JSX.Element {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 text-sm text-muted-foreground',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <NotaSpinner size={spinnerSize} />
      <span>{label}</span>
    </div>
  );
}
