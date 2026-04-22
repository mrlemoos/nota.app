import { describe, expect, it } from 'bun:test';
import { createUserRateLimiter } from './user-rate-limit.server.ts';

let rateLimitSpecKey = 0;

describe('createUserRateLimiter', () => {
  it('allows up to max hits inside the window', () => {
    const limit = createUserRateLimiter({
      key: `test-${++rateLimitSpecKey}`,
      max: 2,
      windowMs: 10_000,
    });
    expect(limit('user-a')).toBe(true);
    expect(limit('user-a')).toBe(true);
    expect(limit('user-a')).toBe(false);
  });

  it('tracks users independently', () => {
    const limit = createUserRateLimiter({
      key: `test-${++rateLimitSpecKey}`,
      max: 1,
      windowMs: 10_000,
    });
    expect(limit('u1')).toBe(true);
    expect(limit('u1')).toBe(false);
    expect(limit('u2')).toBe(true);
  });
});
