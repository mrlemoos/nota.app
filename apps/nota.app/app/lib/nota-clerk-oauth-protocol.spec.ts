import { describe, expect, it } from 'vitest';
import {
  isNotaClerkSsoCallbackPathname,
  NOTA_CLERK_OAUTH_CALLBACK_URL,
  NOTA_CLERK_SSO_CALLBACK_PATH,
} from './nota-clerk-oauth-protocol';

describe('nota-clerk-oauth-protocol', () => {
  it('uses a stable custom-scheme callback for Clerk redirect allowlisting', () => {
    expect(NOTA_CLERK_OAUTH_CALLBACK_URL).toBe('nota://oauth-callback');
    expect(NOTA_CLERK_SSO_CALLBACK_PATH).toBe('/sso-callback');
  });

  it('recognises the SPA pathname used for AuthenticateWithRedirectCallback', () => {
    expect(isNotaClerkSsoCallbackPathname('/sso-callback')).toBe(true);
    expect(isNotaClerkSsoCallbackPathname('/sso-callback/')).toBe(true);
    expect(isNotaClerkSsoCallbackPathname('/notes')).toBe(false);
  });
});
