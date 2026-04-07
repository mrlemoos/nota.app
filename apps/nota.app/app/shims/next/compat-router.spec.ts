import { describe, expect, it } from 'vitest';
import { useRouter } from './compat-router';

describe('next/compat/router shim (Clerk Elements on Vite)', () => {
  it('returns null so Elements path inference prefers the app router branch', () => {
    expect(useRouter()).toBeNull();
  });
});
