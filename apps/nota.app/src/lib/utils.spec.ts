import { describe, expect, it } from 'vitest';
import { twMerge } from 'tailwind-merge';
import { cn } from './utils';

describe('cn / tailwind-merge layout safety', () => {
  it('drops min-h-0 when min-h-dvh appears later in the same string (do not combine both in cn())', () => {
    // Arrange
    const classList = 'min-h-0 min-h-dvh';

    // Act
    const merged = twMerge(classList);

    // Assert
    expect(merged).toBe('min-h-dvh');
  });

  it('keeps both h-dvh and min-h-0 (different groups — safe for viewport + flex overflow)', () => {
    // Arrange
    const classList = 'flex h-dvh min-h-0 flex-col';

    // Act
    const merged = twMerge(classList);

    // Assert
    expect(merged).toContain('h-dvh');
    expect(merged).toContain('min-h-0');
  });

  it('cn() preserves h-dvh and min-h-0 together', () => {
    // Arrange
    const classList = 'flex h-dvh min-h-0 flex-col bg-background';

    // Act
    const merged = cn(classList);

    // Assert
    expect(merged).toContain('h-dvh');
    expect(merged).toContain('min-h-0');
  });
});
