/**
 * `@clerk/elements` statically imports `next/navigation` for its path router. This stub keeps
 * the Vite client bundle resolvable; `SignIn.Root` uses `routing="virtual"` so these hooks
 * are not invoked for Nota's sign-in surface.
 */
export function useRouter(): { push: () => void; replace: () => void } {
  return {
    push: () => {},
    replace: () => {},
  };
}

export function usePathname(): string {
  return '/';
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams();
}

export function useParams(): Record<string, never> {
  return {};
}
