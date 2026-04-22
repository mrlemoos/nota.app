import { useAuth, useUser } from '@clerk/react';
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

/** Minimal session shape for components that previously used Supabase `User`. */
export type AppUser = {
  id: string;
  email: string | null;
};

export type AppSessionContextValue = {
  user: AppUser | null;
  loading: boolean;
};

const AppSessionContext = createContext<AppSessionContextValue | null>(null);

export function AppSessionProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();

  const value = useMemo((): AppSessionContextValue => {
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
    <AppSessionContext.Provider value={value}>
      {children}
    </AppSessionContext.Provider>
  );
}

export function useAppSession(): AppSessionContextValue {
  const v = useContext(AppSessionContext);
  if (!v) {
    throw new Error('AppSessionProvider is required');
  }
  return v;
}

export function useRootLoaderData(): { user: AppUser | null } {
  const { user } = useAppSession();
  return { user };
}
