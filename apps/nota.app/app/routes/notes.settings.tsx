import { useLayoutEffect, useState, type JSX } from 'react';
import { Form, Link, useFetcher } from 'react-router';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ModeToggle } from '../components/mode-toggle';
import { useRootLoaderData } from '../root';
import {
  submitUserPreferencesToggle,
  type PreferencesFetcherData,
} from '../lib/use-sync-user-preferences';
import { useNotaPreferencesStore } from '../stores/nota-preferences';
import { useRevenueCatSubscription } from '../context/revenuecat-subscription';

export default function NotesSettings(): JSX.Element {
  const { user } = useRootLoaderData() ?? { user: null };
  const revenueCat = useRevenueCatSubscription();
  const prefsFetcher = useFetcher<PreferencesFetcherData>();
  const openTodaysNoteShortcut = useNotaPreferencesStore(
    (s) => s.openTodaysNoteShortcut,
  );
  const setOpenTodaysNoteShortcut = useNotaPreferencesStore(
    (s) => s.setOpenTodaysNoteShortcut,
  );
  const [modDLabel, setModDLabel] = useState('⌘D');
  const [historyBackLabel, setHistoryBackLabel] = useState('⌘[');
  const [historyForwardLabel, setHistoryForwardLabel] = useState('⌘]');

  useLayoutEffect(() => {
    const isApple =
      /Mac|iPhone|iPad|iPod/i.test(navigator.platform || '') ||
      /\bMac OS X\b/i.test(navigator.userAgent);
    setModDLabel(isApple ? '⌘D' : 'Ctrl+D');
    setHistoryBackLabel(isApple ? '⌘[' : 'Ctrl+[');
    setHistoryForwardLabel(isApple ? '⌘]' : 'Ctrl+]');
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 py-8">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
        <div>
          <h1 className="font-serif text-xl font-semibold tracking-normal text-foreground">
            Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Appearance, shortcuts, Nota Pro, and your account.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">Appearance</h2>
          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ModeToggle />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">Shortcuts</h2>
          <label
            htmlFor="nota-open-todays-note-shortcut"
            className={cn(
              'flex cursor-pointer select-none items-start gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3',
            )}
          >
            <input
              id="nota-open-todays-note-shortcut"
              type="checkbox"
              checked={openTodaysNoteShortcut}
              onChange={(e) => {
                const checked = e.target.checked;
                setOpenTodaysNoteShortcut(checked);
                submitUserPreferencesToggle(prefsFetcher, checked);
              }}
              className="mt-0.5 size-4 shrink-0 rounded border border-input accent-primary"
            />
            <span className="text-sm leading-snug text-muted-foreground">
              Open today’s note with {modDLabel}
            </span>
          </label>
          <p className="text-sm text-muted-foreground">
            Go back and forward through recently visited notes with{' '}
            <span className="tabular-nums text-foreground/80">
              {historyBackLabel}
            </span>{' '}
            and{' '}
            <span className="tabular-nums text-foreground/80">
              {historyForwardLabel}
            </span>
            .
          </p>
          <p className="text-sm text-muted-foreground">
            <Link
              to="/notes/shortcuts"
              className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
            >
              View all shortcuts
            </Link>
          </p>
        </section>

        {user ? (
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-foreground">Nota Pro</h2>
            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
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
              ) : (
                <>
                  {revenueCat.error ? (
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
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        {revenueCat.isPro
                          ? 'You have an active Nota Pro entitlement on this account.'
                          : 'Unlock Nota Pro with a monthly, yearly, or lifetime plan.'}
                      </p>
                      {revenueCat.paywallError ? (
                        <p className="text-sm text-destructive">
                          {revenueCat.paywallError}
                        </p>
                      ) : null}
                      {!revenueCat.isPro ? (
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
                      ) : null}
                      {revenueCat.isPro && revenueCat.managementURL ? (
                        <p className="text-sm">
                          <a
                            href={revenueCat.managementURL}
                            target="_blank"
                            rel="noreferrer"
                            className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
                          >
                            Manage billing
                          </a>
                        </p>
                      ) : null}
                      {revenueCat.isPro && !revenueCat.managementURL ? (
                        <p className="text-sm text-muted-foreground">
                          Use the link in your subscription email from RevenueCat to
                          open the customer portal, or contact support if you need
                          help managing billing.
                        </p>
                      ) : null}
                    </>
                  )}
                </>
              )}
            </div>
          </section>
        ) : null}

        {user ? (
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-foreground">Account</h2>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
              <p
                className="truncate text-sm text-muted-foreground"
                title={user.email ?? undefined}
              >
                {user.email}
              </p>
              <Form action="/logout" method="post" className="mt-4">
                <Button type="submit" variant="secondary" size="sm">
                  Sign out
                </Button>
              </Form>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
