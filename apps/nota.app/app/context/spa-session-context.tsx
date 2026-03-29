import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { getBrowserClient } from '../lib/supabase/browser';

export type SpaSessionContextValue = {
  user: User | null;
  loading: boolean;
};

const SpaSessionContext = createContext<SpaSessionContextValue | null>(null);

export function SpaSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    try {
      const c = getBrowserClient();
      void c.auth.getSession().then(({ data }) => {
        if (!cancelled) {
          setUser(data.session?.user ?? null);
          setLoading(false);
        }
      });
      const { data: sub } = c.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
      return () => {
        cancelled = true;
        sub.subscription.unsubscribe();
      };
    } catch {
      if (!cancelled) {
        setUser(null);
        setLoading(false);
      }
      return undefined;
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading } satisfies SpaSessionContextValue),
    [user, loading],
  );

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

/** Replaces root loader shape for components that still expect `user` from the shell. */
export function useRootLoaderData(): { user: User | null } {
  const { user } = useSpaSession();
  return { user };
}
