import type {
  CustomerInfo,
  Offering,
  Offerings,
  PaywallPurchaseResult,
  PresentPaywallParams,
  Product,
} from '@revenuecat/purchases-js';
import { PeriodUnit, ProductType } from '@revenuecat/purchases-js';
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

export async function getOfferingsSafe(): Promise<Offerings | null> {
  const { Purchases } = await loadPurchasesModule();
  if (!Purchases.isConfigured()) {
    return null;
  }
  try {
    return await Purchases.getSharedInstance().getOfferings();
  } catch {
    return null;
  }
}

function formatProductCadenceLabel(product: Product): string {
  if (product.productType === ProductType.NonConsumable) {
    return 'one-time';
  }
  if (product.productType === ProductType.Subscription && product.period) {
    const n = product.period.number;
    const u = product.period.unit;
    if (u === PeriodUnit.Month) {
      return n === 1 ? 'per month' : `every ${n} months`;
    }
    if (u === PeriodUnit.Year) {
      return n === 1 ? 'per year' : `every ${n} years`;
    }
    if (u === PeriodUnit.Week) {
      return n === 1 ? 'per week' : `every ${n} weeks`;
    }
    if (u === PeriodUnit.Day) {
      return n === 1 ? 'per day' : `every ${n} days`;
    }
  }
  return '';
}

/**
 * Resolves dashboard title, formatted price, and cadence for a product id from cached offerings.
 */
export function findWebBillingProductForProductId(
  offerings: Offerings,
  productId: string,
): { title: string; formattedPrice: string; cadenceLabel: string } | null {
  const tryOffering = (o: Offering | null | undefined) => {
    if (!o) {
      return null;
    }
    for (const pkg of o.availablePackages) {
      if (pkg.webBillingProduct.identifier !== productId) {
        continue;
      }
      const product = pkg.webBillingProduct;
      return {
        title: product.title,
        formattedPrice: product.price.formattedPrice,
        cadenceLabel: formatProductCadenceLabel(product),
      };
    }
    return null;
  };
  const fromCurrent = tryOffering(offerings.current);
  if (fromCurrent) {
    return fromCurrent;
  }
  for (const key of Object.keys(offerings.all)) {
    const hit = tryOffering(offerings.all[key]);
    if (hit) {
      return hit;
    }
  }
  return null;
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
