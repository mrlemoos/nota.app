import { useAuth, useUser } from '@clerk/react';
import { useOrThrow } from '@nota.app/helper-hooks';
import { createContext, useMemo, type ReactNode, type JSX } from 'react';

/** Minimal session shape for components that previously used Supabase `User`. */
export interface AppUser {
  id: string;
  email: string | null;
}

export interface AppSessionContextValue {
  user: AppUser | null;
  loading: boolean;
}

const AppSessionContext = createContext<AppSessionContextValue | null>(null);

export interface AppSessionProviderProps {
  children: ReactNode;
}

export function AppSessionProvider({ children }: AppSessionProviderProps): JSX.Element {
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
  return useOrThrow(AppSessionContext, 'AppSessionProvider is required');
}

/** A custom hook to load a (nullable) instance of the user */
export function useRootLoaderData(): { user: AppUser | null } {
  const { user } = useAppSession();
  return { user };
}
