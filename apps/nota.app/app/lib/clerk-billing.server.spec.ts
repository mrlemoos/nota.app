import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getServerNotaProEntitled,
  invalidateServerNotaProCache,
} from './clerk-billing.server';

const getUserBillingSubscription = vi.fn();

vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({
    billing: {
      getUserBillingSubscription: (...args: unknown[]) =>
        getUserBillingSubscription(...args),
    },
  }),
}));

describe('getServerNotaProEntitled', () => {
  const prevSecret = process.env.CLERK_SECRET_KEY;

  beforeEach(() => {
    process.env.CLERK_SECRET_KEY = 'sk_test_dummy';
    getUserBillingSubscription.mockReset();
  });

  afterEach(() => {
    if (prevSecret === undefined) {
      delete process.env.CLERK_SECRET_KEY;
    } else {
      process.env.CLERK_SECRET_KEY = prevSecret;
    }
    invalidateServerNotaProCache('user-1');
  });

  it('returns false when the secret is missing', async () => {
    delete process.env.CLERK_SECRET_KEY;
    await expect(getServerNotaProEntitled('user-1')).resolves.toBe(false);
  });

  it('returns true for an active subscription', async () => {
    getUserBillingSubscription.mockResolvedValue({ status: 'active' });
    await expect(getServerNotaProEntitled('user-1')).resolves.toBe(true);
  });

  it('returns false on 404 / missing subscription', async () => {
    getUserBillingSubscription.mockRejectedValue({
      status: 404,
      errors: [{ code: 'resource_not_found' }],
    });
    await expect(getServerNotaProEntitled('user-1')).resolves.toBe(false);
  });
});
