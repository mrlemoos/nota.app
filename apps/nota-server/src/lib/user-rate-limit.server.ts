const buckets = new Map<string, number[]>();

export type UserRateLimiter = (userId: string) => boolean;

/**
 * Sliding-window rate limiter keyed by `${options.key}:${userId}` (in-memory; single instance).
 */
export function createUserRateLimiter(options: {
  key: string;
  max: number;
  windowMs: number;
}): UserRateLimiter {
  const { key, max, windowMs } = options;
  return (userId: string): boolean => {
    const id = `${key}:${userId}`;
    const now = Date.now();
    const hits = buckets.get(id) ?? [];
    const pruned = hits.filter((t) => now - t < windowMs);
    if (pruned.length >= max) {
      return false;
    }
    pruned.push(now);
    buckets.set(id, pruned);
    return true;
  };
}

/** Semantic search: burst-friendly cap per minute. */
export const rateLimitSemanticSearchPost = createUserRateLimiter({
  key: 'semantic-search',
  max: 60,
  windowMs: 60_000,
});

/** Index one note: moderate cap per minute. */
export const rateLimitIndexNotePost = createUserRateLimiter({
  key: 'index-note',
  max: 40,
  windowMs: 60_000,
});

/** Full reindex: expensive; one run per user per two minutes. */
export const rateLimitReindexAllPost = createUserRateLimiter({
  key: 'reindex-all',
  max: 1,
  windowMs: 120_000,
});
