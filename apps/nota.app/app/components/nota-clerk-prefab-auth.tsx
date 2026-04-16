import { SignIn, SignUp } from '@clerk/react';
import type { Theme } from '@clerk/ui/internal';
import type { JSX } from 'react';
import {
  clerkFullNotesUrl,
  clerkFullSignInUrl,
  clerkFullSignUpUrl,
} from '@/lib/clerk-hash-navigation';

/** Hide Clerk’s built-in “Don’t have an account? / Already have…” row; Nota renders its own below the card. */
const NOTA_CLERK_HIDE_ACCOUNT_SWITCH: Pick<Theme, 'elements'> = {
  elements: {
    footerAction: { display: 'none' },
  },
};

/**
 * Prebuilt Clerk `<SignIn />` / `<SignUp />` (Core 3 `@clerk/react`) with hash routing for this SPA.
 */
export function NotaClerkSignIn(): JSX.Element {
  return (
    <SignIn
      routing="hash"
      appearance={NOTA_CLERK_HIDE_ACCOUNT_SWITCH}
      signInUrl={clerkFullSignInUrl()}
      signUpUrl={clerkFullSignUpUrl()}
      forceRedirectUrl={clerkFullNotesUrl()}
      signUpForceRedirectUrl={clerkFullNotesUrl()}
      fallback={
        <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
      }
    />
  );
}

export function NotaClerkSignUp(): JSX.Element {
  return (
    <SignUp
      routing="hash"
      appearance={NOTA_CLERK_HIDE_ACCOUNT_SWITCH}
      signInUrl={clerkFullSignInUrl()}
      signUpUrl={clerkFullSignUpUrl()}
      forceRedirectUrl={clerkFullNotesUrl()}
      signInForceRedirectUrl={clerkFullNotesUrl()}
      fallback={
        <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
      }
    />
  );
}
