import { describe, expect, it } from 'vitest';
import {
  NOTA_MOTION_EASE_IN,
  NOTA_MOTION_EASE_IN_OUT,
  NOTA_MOTION_EASE_OUT,
  NOTA_PALETTE_ENTER_S,
  NOTA_PALETTE_EXIT_S,
  NOTA_SIDEBAR_S,
} from './nota-motion';

// Arrange: calm motion band and non-snappy eases
// Act + Assert: exported constants document product intent
describe('nota-motion', () => {
  it('keeps shell/palette timings in a slow, intentional band (0.3–0.55s)', () => {
    const timings = [
      NOTA_PALETTE_ENTER_S,
      NOTA_PALETTE_EXIT_S,
      NOTA_SIDEBAR_S,
    ] as const;
    for (const t of timings) {
      expect(t).toBeGreaterThanOrEqual(0.3);
      expect(t).toBeLessThanOrEqual(0.55);
    }
  });

  it('uses sine eases for settled motion (no power2 snappiness)', () => {
    expect(NOTA_MOTION_EASE_OUT).toBe('sine.out');
    expect(NOTA_MOTION_EASE_IN).toBe('sine.in');
    expect(NOTA_MOTION_EASE_IN_OUT).toBe('sine.inOut');
  });
});
