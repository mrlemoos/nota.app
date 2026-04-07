import * as Clerk from '@clerk/elements/common';
import type { JSX } from 'react';
import { ClerkDesktopOAuthButton } from '@/components/clerk-desktop-oauth-button';
import { buttonVariants } from '@/components/ui/button';
import { isElectronShellSync } from '@/lib/use-is-electron';
import { cn } from '@/lib/utils';

export const clerkOAuthButtonClass = cn(
  buttonVariants({ variant: 'outline', size: 'lg' }),
  'w-full justify-center gap-2 border-border bg-background text-foreground hover:bg-muted/60',
);

export type ClerkOAuthProvider = 'google';

export function ClerkOAuthConnection({
  flow = 'sign-in',
  provider = 'google',
  label,
}: {
  flow?: 'sign-in' | 'sign-up';
  provider?: ClerkOAuthProvider;
  label: string;
}): JSX.Element {
  if (isElectronShellSync()) {
    return <ClerkDesktopOAuthButton flow={flow} label={label} />;
  }
  const scope = `provider:${provider}` as const;
  return (
    <Clerk.Loading scope={scope}>
      {(isLoading) => (
        <Clerk.Connection
          name={provider}
          disabled={isLoading}
          className={clerkOAuthButtonClass}
        >
          <Clerk.Icon className="size-4" />
          {isLoading ? 'Connecting…' : label}
        </Clerk.Connection>
      )}
    </Clerk.Loading>
  );
}
