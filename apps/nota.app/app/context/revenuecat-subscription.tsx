import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CustomerInfo } from '@revenuecat/purchases-js';
import { useRootLoaderData } from './spa-session-context';
import { useOptionalNotesData } from './notes-data-context';
import {
  getCustomerInfoSafe,
  getRevenueCatApiKey,
  isNotaProEntitled,
  presentPaywall,
  syncPurchasesIdentity,
} from '../lib/revenuecat/purchases';

export type RevenueCatSubscriptionContextValue = {
  /** Public SDK key is present in this build. */
  available: boolean;
  /** SDK configured for the current signed-in user. */
  ready: boolean;
  isLoading: boolean;
  isPro: boolean;
  managementURL: string | null;
  customerInfo: CustomerInfo | null;
  /** Last error from identity sync or customer info fetch. */
  error: string | null;
  /** Last error from presenting the paywall (excluding user cancellation). */
  paywallError: string | null;
  isPaywallBusy: boolean;
  refreshCustomerInfo: () => Promise<void>;
  /**
   * Presents the RevenueCat paywall. Omit `htmlTarget` to use the SDK full-screen overlay.
   */
  openPaywall: (options?: { htmlTarget?: HTMLElement | null }) => Promise<void>;
};

const RevenueCatSubscriptionContext =
  createContext<RevenueCatSubscriptionContextValue | null>(null);

const noopAsync = () => Promise.resolve();

const fallbackValue: RevenueCatSubscriptionContextValue = {
  available: false,
  ready: false,
  isLoading: false,
  isPro: false,
  managementURL: null,
  customerInfo: null,
  error: null,
  paywallError: null,
  isPaywallBusy: false,
  refreshCustomerInfo: noopAsync,
  openPaywall: noopAsync,
};

function customerInfoToState(info: CustomerInfo | null): Pick<
  RevenueCatSubscriptionContextValue,
  'customerInfo' | 'isPro' | 'managementURL'
> {
  return {
    customerInfo: info,
    isPro: info ? isNotaProEntitled(info) : false,
    managementURL: info?.managementURL ?? null,
  };
}

export function RevenueCatSubscriptionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const notesData = useOptionalNotesData();
  const { user } = useRootLoaderData();
  const userId = user?.id ?? null;

  const available = Boolean(getRevenueCatApiKey());

  const [ready, setReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paywallError, setPaywallError] = useState<string | null>(null);
  const [isPaywallBusy, setIsPaywallBusy] = useState(false);
  const [customerSlice, setCustomerSlice] = useState(() =>
    customerInfoToState(null),
  );

  const refreshCustomerInfo = useCallback(async () => {
    if (!available || !userId) {
      setCustomerSlice(customerInfoToState(null));
      return;
    }
    try {
      const info = await getCustomerInfoSafe();
      setCustomerSlice(customerInfoToState(info));
      setError(null);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Could not load subscription status.';
      setError(message);
    }
  }, [available, userId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!available) {
        setReady(false);
        setIsLoading(false);
        setCustomerSlice(customerInfoToState(null));
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        await syncPurchasesIdentity(userId);
        if (cancelled) {
          return;
        }

        if (!userId) {
          setReady(false);
          setCustomerSlice(customerInfoToState(null));
          return;
        }

        setReady(true);
        const info = await getCustomerInfoSafe();
        if (cancelled) {
          return;
        }
        setCustomerSlice(customerInfoToState(info));
      } catch (e) {
        if (!cancelled) {
          const message =
            e instanceof Error
              ? e.message
              : 'Could not initialise subscriptions.';
          setError(message);
          setReady(false);
          setCustomerSlice(customerInfoToState(null));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [available, userId]);

  const openPaywall = useCallback(
    async (options?: { htmlTarget?: HTMLElement | null }) => {
      if (!available || !userId || !ready) {
        return;
      }
      setPaywallError(null);
      setIsPaywallBusy(true);
      try {
        const result = await presentPaywall({
          htmlTarget: options?.htmlTarget ?? undefined,
          customerEmail: user?.email ?? undefined,
        });
        setCustomerSlice(customerInfoToState(result.customerInfo));
        try {
          await fetch('/api/nota-pro-invalidate', {
            method: 'POST',
            credentials: 'same-origin',
          });
        } catch {
          /* ignore */
        }
        void notesData?.refreshNotesList();
      } catch (e) {
        const { PurchasesError, ErrorCode } = await import(
          '@revenuecat/purchases-js'
        );
        if (
          e instanceof PurchasesError &&
          e.errorCode === ErrorCode.UserCancelledError
        ) {
          return;
        }
        const message =
          e instanceof Error ? e.message : 'Paywall could not be shown.';
        setPaywallError(message);
      } finally {
        setIsPaywallBusy(false);
      }
    },
    [available, ready, notesData, user?.email, userId],
  );

  const value = useMemo<RevenueCatSubscriptionContextValue>(
    () => ({
      available,
      ready,
      isLoading,
      error,
      paywallError,
      isPaywallBusy,
      refreshCustomerInfo,
      openPaywall,
      ...customerSlice,
    }),
    [
      available,
      ready,
      isLoading,
      error,
      paywallError,
      isPaywallBusy,
      refreshCustomerInfo,
      openPaywall,
      customerSlice,
    ],
  );

  return (
    <RevenueCatSubscriptionContext.Provider value={value}>
      {children}
    </RevenueCatSubscriptionContext.Provider>
  );
}

export function useRevenueCatSubscription(): RevenueCatSubscriptionContextValue {
  const ctx = useContext(RevenueCatSubscriptionContext);
  return ctx ?? fallbackValue;
}
