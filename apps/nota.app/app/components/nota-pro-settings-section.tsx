import { PricingTable } from '@clerk/clerk-react';
import { useCallback, useState, type JSX } from 'react';
import { Button } from '@/components/ui/button';
import { useNotesData } from '../context/notes-data-context';
import { postNotaProInvalidate } from '../lib/nota-server-client';

export function NotaProSettingsSection(): JSX.Element {
  const { notaProEntitled, refreshNotesList, loading } = useNotesData();
  const [refreshBusy, setRefreshBusy] = useState(false);

  const runRefresh = useCallback(() => {
    setRefreshBusy(true);
    void (async () => {
      try {
        await postNotaProInvalidate();
        await refreshNotesList();
      } finally {
        setRefreshBusy(false);
      }
    })();
  }, [refreshNotesList]);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-foreground">Subscription</h2>
      <div
        className="space-y-5 rounded-xl border border-border/60 bg-linear-to-b from-muted/25 to-muted/10 px-5 py-5 shadow-sm"
      >
        {loading ? (
          <p className="text-sm text-muted-foreground">
            Loading subscription status…
          </p>
        ) : (
          <div className="space-y-4">
            <p
              className={
                notaProEntitled
                  ? 'text-sm text-muted-foreground'
                  : 'text-sm leading-relaxed text-muted-foreground'
              }
            >
              {notaProEntitled ? (
                <>
                  You have an active Nota subscription on this account. Notes
                  sync and attachments are enabled. Manage or change your plan
                  below.
                </>
              ) : (
                <>
                  Nota requires an active subscription. Choose a plan below to
                  subscribe with Clerk Billing.
                </>
              )}
            </p>
            <div className="nota-clerk-pricing-table [&_.cl-card]:bg-transparent [&_.cl-card]:shadow-none">
              <PricingTable />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={refreshBusy}
              onClick={runRefresh}
            >
              {refreshBusy
                ? 'Refreshing…'
                : notaProEntitled
                  ? 'Refresh subscription status'
                  : 'I completed checkout — refresh'}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
