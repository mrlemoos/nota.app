import { useEffect, useState, type JSX } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useRevenueCatSubscription } from '../context/revenuecat-subscription';
import {
  billingStoreDescription,
  buildPlanStatusHints,
  getActiveNotaProEntitlement,
  getSubscriptionForProduct,
} from '../lib/revenuecat/plan-display';
import {
  findWebBillingProductForProductId,
  getOfferingsSafe,
} from '../lib/revenuecat/purchases';

type OfferingsPrice = {
  title: string;
  formattedPrice: string;
  cadenceLabel: string;
};

export function NotaProSettingsSection(): JSX.Element {
  const revenueCat = useRevenueCatSubscription();
  const [offeringsPrice, setOfferingsPrice] = useState<OfferingsPrice | null>(
    null,
  );
  const [offeringsLoading, setOfferingsLoading] = useState(false);

  const customerInfo = revenueCat.customerInfo;
  const entitlement =
    revenueCat.isPro && customerInfo
      ? getActiveNotaProEntitlement(customerInfo)
      : null;
  const productId = entitlement?.productIdentifier ?? null;
  const subscription =
    customerInfo && productId
      ? getSubscriptionForProduct(customerInfo, productId)
      : undefined;

  useEffect(() => {
    if (!revenueCat.ready || !revenueCat.isPro || !productId) {
      setOfferingsPrice(null);
      setOfferingsLoading(false);
      return;
    }

    let cancelled = false;
    setOfferingsLoading(true);
    setOfferingsPrice(null);

    void (async () => {
      const offerings = await getOfferingsSafe();
      if (cancelled) {
        return;
      }
      if (!offerings) {
        setOfferingsPrice(null);
        setOfferingsLoading(false);
        return;
      }
      const hit = findWebBillingProductForProductId(offerings, productId);
      setOfferingsPrice(hit);
      setOfferingsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [revenueCat.ready, revenueCat.isPro, productId]);

  const statusHints =
    entitlement != null
      ? buildPlanStatusHints(entitlement, subscription ?? null)
      : { statusLine: null, detailLine: null };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-foreground">Nota Pro</h2>
      <div
        className="space-y-5 rounded-xl border border-border/60 bg-linear-to-b from-muted/25 to-muted/10 px-5 py-5 shadow-sm"
      >
        {!revenueCat.available ? (
          <p className="text-sm text-muted-foreground">
            Subscriptions are not configured in this environment (missing{' '}
            <span className="font-mono text-xs">VITE_REVENUECAT_API_KEY</span>
            ).
          </p>
        ) : revenueCat.isLoading ? (
          <p className="text-sm text-muted-foreground">
            Checking subscription…
          </p>
        ) : revenueCat.error ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">{revenueCat.error}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void revenueCat.refreshCustomerInfo()}
            >
              Try again
            </Button>
          </div>
        ) : revenueCat.isPro && !entitlement ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You have an active Nota Pro entitlement on this account.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={
                  !revenueCat.ready ||
                  revenueCat.isPaywallBusy ||
                  revenueCat.isLoading
                }
                onClick={() => void revenueCat.openPaywall()}
              >
                {revenueCat.isPaywallBusy ? 'Opening…' : 'Change plan'}
              </Button>
              {revenueCat.managementURL ? (
                <a
                  href={revenueCat.managementURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'sm',
                  })}
                >
                  Cancel subscription
                </a>
              ) : null}
            </div>
          </div>
        ) : revenueCat.isPro && entitlement ? (
          <div className="space-y-4">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Current plan
              </p>
              <p className="mt-2 font-serif text-lg font-semibold tracking-normal text-foreground">
                {offeringsPrice?.title ?? 'Nota Pro'}
              </p>
              {offeringsLoading ? (
                <div
                  className="mt-3 h-10 w-40 animate-pulse rounded-md bg-muted/60"
                  aria-hidden
                />
              ) : offeringsPrice ? (
                <div className="mt-3 space-y-0.5">
                  <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                    {offeringsPrice.formattedPrice}
                  </p>
                  {offeringsPrice.cadenceLabel ? (
                    <p className="text-sm text-muted-foreground">
                      {offeringsPrice.cadenceLabel === 'one-time'
                        ? 'One-time purchase'
                        : `Billed ${offeringsPrice.cadenceLabel}`}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Billed through {billingStoreDescription(entitlement.store)}.
                  Open your subscription or billing settings there to see what
                  you pay.
                </p>
              )}
            </div>

            {statusHints.statusLine ? (
              <p className="text-sm text-muted-foreground">
                {statusHints.statusLine}
              </p>
            ) : null}
            {statusHints.detailLine ? (
              <p className="text-sm text-muted-foreground">
                {statusHints.detailLine}
              </p>
            ) : null}

            {revenueCat.paywallError ? (
              <p className="text-sm text-destructive">
                {revenueCat.paywallError}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                disabled={
                  !revenueCat.ready ||
                  revenueCat.isPaywallBusy ||
                  revenueCat.isLoading
                }
                onClick={() => void revenueCat.openPaywall()}
              >
                {revenueCat.isPaywallBusy ? 'Opening…' : 'Change plan'}
              </Button>
              {revenueCat.managementURL ? (
                <a
                  href={revenueCat.managementURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'sm',
                  })}
                >
                  Cancel subscription
                </a>
              ) : null}
            </div>
            {revenueCat.managementURL ? (
              <p className="text-sm text-muted-foreground">
                Billing opens in a new tab.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                If you subscribed through the App Store or Google Play, manage
                or cancel in that store’s subscription settings. For web
                billing, use the link in your RevenueCat subscription email to
                open the customer portal. Contact support if you still cannot
                find a way to manage your plan.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Current plan
              </p>
              <p className="mt-2 font-serif text-lg font-semibold tracking-normal text-foreground">
                Not subscribed
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Unlock Nota Pro with a monthly, yearly, or lifetime plan.
              </p>
            </div>
            {revenueCat.paywallError ? (
              <p className="text-sm text-destructive">
                {revenueCat.paywallError}
              </p>
            ) : null}
            <Button
              type="button"
              size="sm"
              disabled={
                !revenueCat.ready ||
                revenueCat.isPaywallBusy ||
                revenueCat.isLoading
              }
              onClick={() => void revenueCat.openPaywall()}
            >
              {revenueCat.isPaywallBusy ? 'Opening…' : 'Upgrade'}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
