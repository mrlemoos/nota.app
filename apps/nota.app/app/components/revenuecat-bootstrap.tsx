import type { ReactNode } from 'react';
import { RevenueCatSubscriptionProvider } from '../context/revenuecat-subscription';

/**
 * Wires RevenueCat Web Billing for the signed-in user and exposes subscription context to the tree.
 */
export function RevenueCatBootstrap({ children }: { children: ReactNode }) {
  return (
    <RevenueCatSubscriptionProvider>{children}</RevenueCatSubscriptionProvider>
  );
}
