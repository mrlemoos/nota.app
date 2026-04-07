import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import type { JSX } from 'react';
import {
  clerkFullSignInUrl,
  clerkFullSignUpUrl,
} from '@/lib/clerk-hash-navigation';
import { isNotaClerkSsoCallbackPathname } from '@/lib/nota-clerk-oauth-protocol';

/**
 * Clerk redirect / SSO handshake for pathname `/sso-callback` (query from OAuth).
 * Renders captcha mount + `handleRedirectCallback` (see Clerk OAuth custom-flow docs).
 */
export function ClerkSsoCallbackRoute(): JSX.Element | null {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!isNotaClerkSsoCallbackPathname(window.location.pathname)) {
    return null;
  }
  return (
    <>
      <div id="clerk-captcha" />
      <AuthenticateWithRedirectCallback
        signInUrl={clerkFullSignInUrl()}
        signUpUrl={clerkFullSignUpUrl()}
      />
    </>
  );
}
