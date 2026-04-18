/**
 * Vite SPA shim for `@clerk/elements`, which imports `next/navigation`.
 * Maps URL state to the hash fragment so Clerk sign-in/sign-up steps stay in
 * sync with `routing="hash"` and Nota's hash navigation.
 */
import { useMemo, useSyncExternalStore } from 'react';

function readPathnameFromLocation(): string {
  if (typeof window === 'undefined') {
    return '/';
  }
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) {
    return window.location.pathname || '/';
  }
  const pathPart = raw.split('?')[0] ?? '';
  return pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
}

function subscribeToLocation(cb: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  window.addEventListener('hashchange', cb);
  window.addEventListener('popstate', cb);
  return () => {
    window.removeEventListener('hashchange', cb);
    window.removeEventListener('popstate', cb);
  };
}

export function usePathname(): string {
  return useSyncExternalStore(
    subscribeToLocation,
    readPathnameFromLocation,
    () => '/',
  );
}

export function useSearchParams(): ReadonlyURLSearchParams {
  const pathname = usePathname();
  return useMemo(() => {
    if (typeof window === 'undefined') {
      return new URLSearchParams() as ReadonlyURLSearchParams;
    }
    const hash = window.location.hash.replace(/^#/, '');
    const query = hash.includes('?') ? hash.split('?').slice(1).join('?') : '';
    return new URLSearchParams(query) as ReadonlyURLSearchParams;
  }, [pathname]);
}

export function useParams(): Record<string, string | string[]> {
  return {};
}

export function useRouter() {
  return useMemo(
    () => ({
      push: (href: string) => {
        if (typeof window === 'undefined') {
          return;
        }
        if (href.startsWith('#')) {
          window.location.hash = href;
          return;
        }
        window.location.hash = href.startsWith('/') ? href : `/${href}`;
      },
      replace: (href: string) => {
        if (typeof window === 'undefined') {
          return;
        }
        const hash = href.startsWith('#')
          ? href
          : `#${href.startsWith('/') ? href : `/${href}`}`;
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}${window.location.search}${hash}`,
        );
      },
      prefetch: async (_href: string) => {},
      refresh: () => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      },
      back: () => {
        if (typeof window !== 'undefined') {
          window.history.back();
        }
      },
      forward: () => {
        if (typeof window !== 'undefined') {
          window.history.forward();
        }
      },
    }),
    [],
  );
}
