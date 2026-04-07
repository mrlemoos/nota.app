import { useAuth, useUser } from '@clerk/clerk-react';
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

/** Minimal session shape for components that previously used Supabase `User`. */
export type SpaUser = {
  id: string;
  email: string | null;
};

export type SpaSessionContextValue = {
  user: SpaUser | null;
  loading: boolean;
};

const SpaSessionContext = createContext<SpaSessionContextValue | null>(null);

export function SpaSessionProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();

  const value = useMemo((): SpaSessionContextValue => {
    if (!isLoaded) {
      return { user: null, loading: true };
    }
    if (!isSignedIn || !userId) {
      return { user: null, loading: false };
    }
    const primary =
      user?.primaryEmailAddress?.emailAddress ??
      user?.emailAddresses?.[0]?.emailAddress ??
      null;
    return {
      user: { id: userId, email: primary },
      loading: false,
    };
  }, [isLoaded, isSignedIn, userId, user]);

  return (
    <SpaSessionContext.Provider value={value}>
      {children}
    </SpaSessionContext.Provider>
  );
}

export function useSpaSession(): SpaSessionContextValue {
  const v = useContext(SpaSessionContext);
  if (!v) {
    throw new Error('SpaSessionProvider is required');
  }
  return v;
}

export function useRootLoaderData(): { user: SpaUser | null } {
  const { user } = useSpaSession();
  return { user };
}
