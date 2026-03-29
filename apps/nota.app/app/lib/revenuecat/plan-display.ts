import type { CustomerInfo, EntitlementInfo, SubscriptionInfo } from '@revenuecat/purchases-js';
import { ENTITLEMENT_NOTA_PRO } from './constants';

export function getActiveNotaProEntitlement(
  customerInfo: CustomerInfo | null,
): EntitlementInfo | null {
  if (!customerInfo) {
    return null;
  }
  const e = customerInfo.entitlements.active[ENTITLEMENT_NOTA_PRO];
  return e?.isActive === true ? e : null;
}

export function getSubscriptionForProduct(
  customerInfo: CustomerInfo,
  productIdentifier: string,
): SubscriptionInfo | undefined {
  return customerInfo.subscriptionsByProductIdentifier[productIdentifier];
}

export function isLifetimeEntitlement(
  ent: Pick<EntitlementInfo, 'expirationDate'>,
): boolean {
  return ent.expirationDate === null;
}

/** Locale phrase for “billed through …” when web offerings do not list this product. */
export function billingStoreDescription(store: string): string {
  switch (store) {
    case 'app_store':
    case 'mac_app_store':
      return 'the App Store';
    case 'play_store':
      return 'Google Play';
    case 'stripe':
    case 'rc_billing':
    case 'paddle':
      return 'web billing';
    case 'amazon':
      return 'Amazon';
    case 'promotional':
    case 'test_store':
    case 'unknown':
    default:
      return 'your app store or billing provider';
  }
}

export type PlanStatusHints = {
  statusLine: string | null;
  detailLine: string | null;
};

export function buildPlanStatusHints(
  ent: Pick<
    EntitlementInfo,
    | 'expirationDate'
    | 'willRenew'
    | 'periodType'
    | 'unsubscribeDetectedAt'
    | 'billingIssueDetectedAt'
  >,
  sub: Pick<
    SubscriptionInfo,
    | 'expiresDate'
    | 'willRenew'
    | 'periodType'
    | 'unsubscribeDetectedAt'
    | 'billingIssuesDetectedAt'
    | 'gracePeriodExpiresDate'
  > | null,
): PlanStatusHints {
  const expires = sub?.expiresDate ?? ent.expirationDate;
  const willRenew = sub?.willRenew ?? ent.willRenew;
  const periodType = sub?.periodType ?? ent.periodType;
  const unsubAt = sub?.unsubscribeDetectedAt ?? ent.unsubscribeDetectedAt;
  const billingIssueAt = sub?.billingIssuesDetectedAt ?? ent.billingIssueDetectedAt;
  const grace = sub?.gracePeriodExpiresDate ?? null;

  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { dateStyle: 'medium' });

  const parts: string[] = [];
  if (grace) {
    parts.push(`Grace access until ${fmt(grace)}.`);
  }
  if (billingIssueAt) {
    parts.push('There is a billing issue on your account.');
  }
  const detailLine = parts.length > 0 ? parts.join(' ') : null;

  if (ent.expirationDate === null) {
    return { statusLine: 'Lifetime access — no renewal.', detailLine };
  }

  if (periodType === 'trial') {
    return {
      statusLine: expires ? `Free trial ends ${fmt(expires)}.` : 'Free trial.',
      detailLine,
    };
  }
  if (periodType === 'intro') {
    return {
      statusLine: expires
        ? `Introductory price until ${fmt(expires)}.`
        : 'Introductory pricing.',
      detailLine,
    };
  }

  if (!willRenew && unsubAt && expires) {
    return {
      statusLine: `Ends ${fmt(expires)} — auto-renewal is off.`,
      detailLine,
    };
  }
  if (willRenew && expires) {
    return {
      statusLine: `Renews ${fmt(expires)}.`,
      detailLine,
    };
  }
  if (expires) {
    return { statusLine: `Access until ${fmt(expires)}.`, detailLine };
  }
  return { statusLine: null, detailLine };
}
