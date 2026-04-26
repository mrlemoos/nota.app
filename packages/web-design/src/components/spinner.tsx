import type { JSX, ReactNode } from 'react';

import { cn } from '../lib/utils.js';

const NOTA_SPINNER_SIZE_CLASS: Record<'sm' | 'md', string> = {
  sm: 'size-3.5 border-2',
  md: 'size-5 border-2',
};

export type NotaSpinnerProps = {
  className?: string;
  size?: 'sm' | 'md';
};

/**
 * Indeterminate progress ring. Pair with copy via {@link NotaLoadingStatus} where possible.
 */
export function NotaSpinner({
  className,
  size = 'md',
}: NotaSpinnerProps): JSX.Element {
  return (
    <span
      className={cn(
        'inline-block shrink-0 animate-spin rounded-full border-muted-foreground/20 border-t-muted-foreground/55',
        NOTA_SPINNER_SIZE_CLASS[size],
        className,
      )}
      aria-hidden
    />
  );
}

export type NotaLoadingStatusProps = {
  label: ReactNode;
  className?: string;
  spinnerSize?: 'sm' | 'md';
};

export function NotaLoadingStatus({
  label,
  className,
  spinnerSize = 'md',
}: NotaLoadingStatusProps): JSX.Element {
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
