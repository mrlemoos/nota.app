import { PricingTable, useClerk } from '@clerk/react';
import type { JSX } from 'react';
import { NotaButton } from '@nota.app/web-design/button';
import { cn } from '@/lib/utils';
import { useIsElectron } from '../lib/use-is-electron';
import { setAppHash } from '../lib/app-navigation';

/**
 * Full-screen block when the signed-in user cannot use notes without an active Nota Pro entitlement.
 */
export function NotaProGate(): JSX.Element {
  const { signOut } = useClerk();
  const isElectron = useIsElectron();

  return (
    <div
      className={cn(
        'nota-notes-root flex h-full min-h-0 flex-1 flex-col bg-linear-to-b from-muted/25 to-background',
        isElectron && 'pt-[env(safe-area-inset-top)]',
      )}
    >
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-6 text-center">
          <div>
            <h1 className="font-serif text-xl font-semibold tracking-normal text-foreground">
              Nota Pro required
            </h1>
            <p className="mt-2 text-pretty text-sm text-muted-foreground">
              Your notes and workspace are available with an active Nota
              subscription on this account.
            </p>
          </div>

          <div className="nota-clerk-pricing-table text-left [&_.cl-card]:bg-background/80">
            <PricingTable />
          </div>

          <div className="border-t border-border/40 pt-6">
            <NotaButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                void (async () => {
                  await signOut();
                  setAppHash({ kind: 'landing' });
                })();
              }}
            >
              Sign out
            </NotaButton>
          </div>
        </div>
      </main>
    </div>
  );
}
