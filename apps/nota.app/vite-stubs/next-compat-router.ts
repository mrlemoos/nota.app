/**
 * Vite SPA shim for `@clerk/elements`, which imports `next/compat/router`.
 * Nota uses a hash router, not Next.js Pages: return `null` so Clerk path
 * inference uses `next/navigation` hooks instead (see `next-navigation.ts`).
 */
export function useRouter(): null {
  return null;
}
