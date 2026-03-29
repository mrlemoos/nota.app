import { describe, expect, it } from 'vitest';
import type { CustomerInfo } from '@revenuecat/purchases-js';
import { ENTITLEMENT_NOTA_PRO } from './constants';
import {
  billingStoreDescription,
  buildPlanStatusHints,
  getActiveNotaProEntitlement,
  getSubscriptionForProduct,
  isLifetimeEntitlement,
} from './plan-display';

describe('billingStoreDescription', () => {
  it('maps app stores to readable names', () => {
    // Act & Assert
    expect(billingStoreDescription('app_store')).toBe('the App Store');
    expect(billingStoreDescription('mac_app_store')).toBe('the App Store');
    expect(billingStoreDescription('play_store')).toBe('Google Play');
  });

  it('maps web billing providers', () => {
    // Act & Assert
    expect(billingStoreDescription('stripe')).toBe('web billing');
    expect(billingStoreDescription('rc_billing')).toBe('web billing');
    expect(billingStoreDescription('paddle')).toBe('web billing');
  });

  it('falls back for unknown stores', () => {
    // Act & Assert
    expect(billingStoreDescription('unknown')).toBe(
      'your app store or billing provider',
    );
  });
});

describe('isLifetimeEntitlement', () => {
  it('is true when expiration is null', () => {
    // Arrange
    const ent = { expirationDate: null as Date | null };

    // Act
    const result = isLifetimeEntitlement(ent);

    // Assert
    expect(result).toBe(true);
  });

  it('is false when expiration is set', () => {
    // Arrange
    const ent = { expirationDate: new Date('2030-01-01') };

    // Act
    const result = isLifetimeEntitlement(ent);

    // Assert
    expect(result).toBe(false);
  });
});

describe('getSubscriptionForProduct', () => {
  it('returns subscription row for product id', () => {
    // Arrange
    const sub = {
      productIdentifier: 'nota_monthly',
      purchaseDate: new Date(),
      originalPurchaseDate: null,
      expiresDate: new Date('2030-06-01'),
      store: 'stripe' as const,
      unsubscribeDetectedAt: null,
      isSandbox: false,
      billingIssuesDetectedAt: null,
      gracePeriodExpiresDate: null,
      ownershipType: 'PURCHASED' as const,
      periodType: 'normal' as const,
      refundedAt: null,
      storeTransactionId: null,
      isActive: true,
      willRenew: true,
      managementURL: null,
    };
    const customerInfo = {
      subscriptionsByProductIdentifier: {
        nota_monthly: sub,
      },
    } as unknown as CustomerInfo;

    // Act
    const result = getSubscriptionForProduct(customerInfo, 'nota_monthly');

    // Assert
    expect(result).toBe(sub);
  });
});

describe('getActiveNotaProEntitlement', () => {
  it('returns null when customer info is null', () => {
    // Arrange & Act
    const result = getActiveNotaProEntitlement(null);

    // Assert
    expect(result).toBeNull();
  });

  it('returns entitlement when Nota Pro is active', () => {
    // Arrange
    const entitlement = {
      identifier: ENTITLEMENT_NOTA_PRO,
      isActive: true,
      willRenew: true,
      store: 'rc_billing',
      latestPurchaseDate: new Date(),
      originalPurchaseDate: new Date(),
      expirationDate: new Date('2030-01-01'),
      productIdentifier: 'nota_monthly',
      productPlanIdentifier: null,
      unsubscribeDetectedAt: null,
      billingIssueDetectedAt: null,
      isSandbox: false,
      periodType: 'normal' as const,
      ownershipType: 'PURCHASED' as const,
    };
    const customerInfo = {
      entitlements: {
        active: { [ENTITLEMENT_NOTA_PRO]: entitlement },
        all: { [ENTITLEMENT_NOTA_PRO]: entitlement },
      },
    } as unknown as CustomerInfo;

    // Act
    const result = getActiveNotaProEntitlement(customerInfo);

    // Assert
    expect(result).toEqual(entitlement);
  });
});

describe('buildPlanStatusHints', () => {
  it('describes lifetime access', () => {
    // Arrange
    const ent = {
      expirationDate: null,
      willRenew: false,
      periodType: 'normal' as const,
      unsubscribeDetectedAt: null,
      billingIssueDetectedAt: null,
    };

    // Act
    const hints = buildPlanStatusHints(ent, null);

    // Assert
    expect(hints.statusLine).toBe('Lifetime access — no renewal.');
    expect(hints.detailLine).toBeNull();
  });

  it('describes an active trial with end date', () => {
    // Arrange
    const end = new Date('2026-04-15');
    const ent = {
      expirationDate: end,
      willRenew: true,
      periodType: 'trial' as const,
      unsubscribeDetectedAt: null,
      billingIssueDetectedAt: null,
    };

    // Act
    const hints = buildPlanStatusHints(ent, null);

    // Assert
    expect(hints.statusLine).toContain('Free trial ends');
    expect(hints.detailLine).toBeNull();
  });

  it('prefers subscription expiry for renewal copy', () => {
    // Arrange
    const entExp = new Date('2099-01-01');
    const subExp = new Date('2026-08-01');
    const ent = {
      expirationDate: entExp,
      willRenew: true,
      periodType: 'normal' as const,
      unsubscribeDetectedAt: null,
      billingIssueDetectedAt: null,
    };
    const sub = {
      expiresDate: subExp,
      willRenew: true,
      periodType: 'normal' as const,
      unsubscribeDetectedAt: null,
      billingIssuesDetectedAt: null,
      gracePeriodExpiresDate: null,
    };

    // Act
    const hints = buildPlanStatusHints(ent, sub);

    // Assert
    expect(hints.statusLine).toContain('Renews');
    expect(hints.statusLine).toContain('2026');
  });

  it('notes when auto-renewal is off but access continues', () => {
    // Arrange
    const end = new Date('2026-12-01');
    const ent = {
      expirationDate: end,
      willRenew: false,
      periodType: 'normal' as const,
      unsubscribeDetectedAt: new Date(),
      billingIssueDetectedAt: null,
    };

    // Act
    const hints = buildPlanStatusHints(ent, null);

    // Assert
    expect(hints.statusLine).toMatch(/Ends/);
    expect(hints.statusLine).toMatch(/auto-renewal is off/);
  });

  it('surfaces billing issue and grace copy', () => {
    // Arrange
    const end = new Date('2026-06-01');
    const grace = new Date('2026-06-10');
    const ent = {
      expirationDate: end,
      willRenew: true,
      periodType: 'normal' as const,
      unsubscribeDetectedAt: null,
      billingIssueDetectedAt: new Date(),
    };
    const sub = {
      expiresDate: end,
      willRenew: true,
      periodType: 'normal' as const,
      unsubscribeDetectedAt: null,
      billingIssuesDetectedAt: new Date(),
      gracePeriodExpiresDate: grace,
    };

    // Act
    const hints = buildPlanStatusHints(ent, sub);

    // Assert
    expect(hints.detailLine).toContain('Grace access until');
    expect(hints.detailLine).toContain('billing issue');
  });
});
