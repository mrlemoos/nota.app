import { use, type Context } from 'react';

export class CannotUseContextNullError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CannotUseContextNullError';
  }
}

/**
 * Returns the value of the context if it is not null, otherwise throws an error.
 *
 * ## Usage
 *
 * ```tsx
 * const value = useOrThrow(context, 'error message');
 * ```
 *
 * In case the context is not provided, the error message is thrown.
 * The error message is thrown even if the context is provided but the value is null.
 *
 * ```tsx
 * const value = useOrThrow(context, 'error message');
 * ```
 */
export function useOrThrow<T>(context: Context<T | null>, message: string): T {
  const value = use(context);
  if (value === null) {
    throw new CannotUseContextNullError(message);
  }
  return value;
}
