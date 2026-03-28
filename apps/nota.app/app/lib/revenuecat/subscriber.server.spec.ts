import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getServerNotaProEntitled,
  invalidateServerNotaProCache,
  subscriberJsonHasActiveNotaPro,
} from './subscriber.server';
import { ENTITLEMENT_NOTA_PRO, ENTITLEMENT_NOTA_PRO_REST_ID } from './constants';

describe('subscriberJsonHasActiveNotaPro', () => {
  it('returns false when entitlement is absent', () => {
    expect(subscriberJsonHasActiveNotaPro({})).toBe(false);
    expect(
      subscriberJsonHasActiveNotaPro({
        subscriber: { entitlements: {} },
      }),
    ).toBe(false);
  });

  it('returns true when REST API id key has no expires_date (lifetime)', () => {
    expect(
      subscriberJsonHasActiveNotaPro({
        subscriber: {
          entitlements: {
            [ENTITLEMENT_NOTA_PRO_REST_ID]: {},
          },
        },
      }),
    ).toBe(true);
  });

  it('returns true when dashboard identifier key has no expires_date (lifetime)', () => {
    expect(
      subscriberJsonHasActiveNotaPro({
        subscriber: {
          entitlements: {
            [ENTITLEMENT_NOTA_PRO]: {},
          },
        },
      }),
    ).toBe(true);
    expect(
      subscriberJsonHasActiveNotaPro({
        subscriber: {
          entitlements: {
            [ENTITLEMENT_NOTA_PRO]: { expires_date: null },
          },
        },
      }),
    ).toBe(true);
  });

  it('prefers REST id entry when both keys exist', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(
      subscriberJsonHasActiveNotaPro({
        subscriber: {
          entitlements: {
            [ENTITLEMENT_NOTA_PRO_REST_ID]: { expires_date: future },
            [ENTITLEMENT_NOTA_PRO]: { expires_date: past },
          },
        },
      }),
    ).toBe(true);
    expect(
      subscriberJsonHasActiveNotaPro({
        subscriber: {
          entitlements: {
            [ENTITLEMENT_NOTA_PRO_REST_ID]: { expires_date: past },
            [ENTITLEMENT_NOTA_PRO]: { expires_date: future },
          },
        },
      }),
    ).toBe(false);
  });

  it('returns true when expires_date is in the future', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(
      subscriberJsonHasActiveNotaPro({
        subscriber: {
          entitlements: {
            [ENTITLEMENT_NOTA_PRO]: { expires_date: future },
          },
        },
      }),
    ).toBe(true);
  });

  it('returns false when expires_date is in the past', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(
      subscriberJsonHasActiveNotaPro({
        subscriber: {
          entitlements: {
            [ENTITLEMENT_NOTA_PRO]: { expires_date: past },
          },
        },
      }),
    ).toBe(false);
  });
});

describe('getServerNotaProEntitled', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    invalidateServerNotaProCache('user-1');
  });

  it('returns false when secret is missing', async () => {
    const prev = process.env.REVENUECAT_SECRET_API_KEY;
    delete process.env.REVENUECAT_SECRET_API_KEY;
    await expect(getServerNotaProEntitled('user-1')).resolves.toBe(false);
    if (prev !== undefined) {
      process.env.REVENUECAT_SECRET_API_KEY = prev;
    }
  });

  it('returns false on 404', async () => {
    process.env.REVENUECAT_SECRET_API_KEY = 'sk_test';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    );

    await expect(getServerNotaProEntitled('user-1')).resolves.toBe(false);
  });

  it('returns true when JSON has active entitlement under dashboard identifier', async () => {
    process.env.REVENUECAT_SECRET_API_KEY = 'sk_test';
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const body = {
      subscriber: {
        entitlements: {
          [ENTITLEMENT_NOTA_PRO]: { expires_date: future },
        },
      },
    };
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })),
    );

    await expect(getServerNotaProEntitled('user-1')).resolves.toBe(true);
  });

  it('returns true when JSON has active entitlement under REST API id only', async () => {
    process.env.REVENUECAT_SECRET_API_KEY = 'sk_test';
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const body = {
      subscriber: {
        entitlements: {
          [ENTITLEMENT_NOTA_PRO_REST_ID]: { expires_date: future },
        },
      },
    };
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })),
    );

    await expect(getServerNotaProEntitled('user-1')).resolves.toBe(true);
  });
});
