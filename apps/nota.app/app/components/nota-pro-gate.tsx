import { Form, type JSX } from 'react-router';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRevenueCatSubscription } from '../context/revenuecat-subscription';
import { useIsElectron } from '../lib/use-is-electron';

/**
 * Full-screen block when the signed-in user cannot use notes without an active Nota Pro entitlement.
 */
export function NotaProGate(): JSX.Element {
  const rc = useRevenueCatSubscription();
  const isElectron = useIsElectron();

  return (
    <div
      className={cn(
        'nota-notes-root flex min-h-dvh flex-col bg-linear-to-b from-muted/25 to-background',
        isElectron && 'pt-[env(safe-area-inset-top)]',
      )}
    >
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6 text-center">
          <div>
            <h1 className="font-serif text-xl font-semibold tracking-normal text-foreground">
              Nota Pro required
            </h1>
            <p className="mt-2 text-pretty text-sm text-muted-foreground">
              Your notes and workspace are available with an active Nota Pro
              subscription on this account.
            </p>
          </div>

          {!rc.available ? (
            <p className="text-sm text-muted-foreground">
              This build is missing{' '}
              <span className="font-mono text-xs">VITE_REVENUECAT_API_KEY</span>
              , so subscriptions cannot be verified.
            </p>
          ) : null}

          {rc.available && rc.isLoading ? (
            <p className="text-sm text-muted-foreground">
              Checking your subscription…
            </p>
          ) : null}

          {rc.available && !rc.isLoading && rc.error ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">{rc.error}</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void rc.refreshCustomerInfo()}
              >
                Try again
              </Button>
            </div>
          ) : null}

          {rc.available && !rc.isLoading && !rc.isPro && !rc.error ? (
            <>
              {rc.paywallError ? (
                <p className="text-sm text-destructive">{rc.paywallError}</p>
              ) : null}
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Button
                  type="button"
                  size="default"
                  disabled={!rc.ready || rc.isPaywallBusy}
                  onClick={() => void rc.openPaywall()}
                >
                  {rc.isPaywallBusy ? 'Opening…' : 'Subscribe with Nota Pro'}
                </Button>
              </div>
            </>
          ) : null}

          <div className="border-t border-border/40 pt-6">
            <Form action="/logout" method="post">
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </Form>
          </div>
        </div>
      </main>
    </div>
  );
}
