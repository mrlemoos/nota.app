import { useAuth } from '@clerk/clerk-react';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { setClerkAccessTokenGetter } from '../lib/clerk-token-ref';
import { setSupabaseClerkGetToken } from '../lib/supabase/browser';

/**
 * Registers Clerk `getToken` with the Supabase client factory (must sit under `ClerkProvider`).
 * Uses `useLayoutEffect` and a ref so registration runs before child `useEffect` (e.g. notes
 * bootstrap) and is not torn down whenever Clerk changes `getToken` identity.
 */
export function ClerkSupabaseBridge({ children }: { children: ReactNode }) {
  const { getToken, isLoaded } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useLayoutEffect(() => {
    if (!isLoaded) {
      setSupabaseClerkGetToken(null);
      setClerkAccessTokenGetter(null);
      return;
    }
    const resolveToken = () => getTokenRef.current();
    setSupabaseClerkGetToken(resolveToken);
    setClerkAccessTokenGetter(resolveToken);
    return () => {
      setSupabaseClerkGetToken(null);
      setClerkAccessTokenGetter(null);
    };
  }, [isLoaded]);

  return <>{children}</>;
}
