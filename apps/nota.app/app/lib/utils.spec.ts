import { describe, expect, it } from 'vitest';
import { twMerge } from 'tailwind-merge';
import { cn } from './utils';

describe('cn / tailwind-merge layout safety', () => {
  it('drops min-h-0 when min-h-dvh appears later in the same string (do not combine both in cn())', () => {
    expect(twMerge('min-h-0 min-h-dvh')).toBe('min-h-dvh');
  });

  it('keeps both h-dvh and min-h-0 (different groups — safe for viewport + flex overflow)', () => {
    const merged = twMerge('flex h-dvh min-h-0 flex-col');
    expect(merged).toContain('h-dvh');
    expect(merged).toContain('min-h-0');
  });

  it('cn() preserves h-dvh and min-h-0 together', () => {
    const merged = cn('flex h-dvh min-h-0 flex-col bg-background');
    expect(merged).toContain('h-dvh');
    expect(merged).toContain('min-h-0');
  });
});
