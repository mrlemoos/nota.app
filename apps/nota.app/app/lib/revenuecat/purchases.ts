import type {
  CustomerInfo,
  PaywallPurchaseResult,
  PresentPaywallParams,
} from '@revenuecat/purchases-js';
import { ENTITLEMENT_NOTA_PRO } from './constants';

export function getRevenueCatApiKey(): string | undefined {
  const key = import.meta.env.VITE_REVENUECAT_API_KEY;
  return typeof key === 'string' && key.length > 0 ? key : undefined;
}

export function isNotaProEntitled(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements.active[ENTITLEMENT_NOTA_PRO]?.isActive === true;
}

export async function loadPurchasesModule() {
  return import('@revenuecat/purchases-js');
}

/**
 * Configures or re-identifies RevenueCat for the signed-in Supabase user, or tears down when signed out.
 */
export async function syncPurchasesIdentity(
  appUserId: string | null,
): Promise<import('@revenuecat/purchases-js').Purchases | null> {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    return null;
  }

  const { Purchases } = await loadPurchasesModule();

  if (!appUserId) {
    if (Purchases.isConfigured()) {
      Purchases.getSharedInstance().close();
    }
    return null;
  }

  if (!Purchases.isConfigured()) {
    return Purchases.configure({ apiKey, appUserId });
  }

  const purchases = Purchases.getSharedInstance();
  if (purchases.getAppUserId() !== appUserId) {
    await purchases.changeUser(appUserId);
  }
  return purchases;
}

export async function getCustomerInfoSafe(): Promise<CustomerInfo | null> {
  const { Purchases } = await loadPurchasesModule();
  if (!Purchases.isConfigured()) {
    return null;
  }
  return Purchases.getSharedInstance().getCustomerInfo();
}

export async function presentPaywall(
  params: PresentPaywallParams,
): Promise<PaywallPurchaseResult> {
  const { Purchases } = await loadPurchasesModule();
  if (!Purchases.isConfigured()) {
    throw new Error('RevenueCat is not configured.');
  }
  return Purchases.getSharedInstance().presentPaywall(params);
}
