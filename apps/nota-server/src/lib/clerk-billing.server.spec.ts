import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';

const getUserBillingSubscription = mock();

mock.module('@clerk/backend', () => ({
  createClerkClient: () => ({
    billing: {
      getUserBillingSubscription: (...args: unknown[]) =>
        getUserBillingSubscription(...args),
    },
  }),
}));

const { getServerNotaProEntitled, invalidateServerNotaProCache } = await import(
  './clerk-billing.server.ts'
);

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
    expect(await getServerNotaProEntitled('user-1')).toBe(false);
  });

  it('returns true for an active subscription', async () => {
    getUserBillingSubscription.mockImplementation(() =>
      Promise.resolve({ status: 'active' }),
    );
    expect(await getServerNotaProEntitled('user-1')).toBe(true);
  });

  it('returns false on 404 / missing subscription', async () => {
    getUserBillingSubscription.mockImplementation(() =>
      Promise.reject({
        status: 404,
        errors: [{ code: 'resource_not_found' }],
      }),
    );
    expect(await getServerNotaProEntitled('user-1')).toBe(false);
  });
});
