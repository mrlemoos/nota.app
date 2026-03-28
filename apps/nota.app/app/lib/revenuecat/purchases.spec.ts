import { describe, expect, it } from 'vitest';
import { ENTITLEMENT_NOTA_PRO } from './constants';
import { isNotaProEntitled } from './purchases';

describe('isNotaProEntitled', () => {
  it('returns true when the Nota Pro entitlement is active', () => {
    const customerInfo = {
      entitlements: {
        active: {
          [ENTITLEMENT_NOTA_PRO]: { isActive: true },
        },
        all: {},
      },
    } as unknown as import('@revenuecat/purchases-js').CustomerInfo;

    expect(isNotaProEntitled(customerInfo)).toBe(true);
  });

  it('returns false when the entitlement is missing or inactive', () => {
    const missing = {
      entitlements: { active: {}, all: {} },
    } as unknown as import('@revenuecat/purchases-js').CustomerInfo;

    const inactive = {
      entitlements: {
        active: {
          [ENTITLEMENT_NOTA_PRO]: { isActive: false },
        },
        all: {},
      },
    } as unknown as import('@revenuecat/purchases-js').CustomerInfo;

    expect(isNotaProEntitled(missing)).toBe(false);
    expect(isNotaProEntitled(inactive)).toBe(false);
  });
});
