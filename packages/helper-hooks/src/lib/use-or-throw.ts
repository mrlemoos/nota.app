import { use, type Context } from 'react';

export class CannotUseContextNullError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CannotUseContextNullError';
  }
}

export function useOrThrow<T>(context: Context<T | null>, message: string): T {
  const value = use(context);
  if (value === null) {
    throw new CannotUseContextNullError(message);
  }
  return value;
}
