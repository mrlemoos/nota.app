/**
 * `@clerk/elements` bundles optional `next/compat/router` imports. Vite does not install
 * Next.js, so we provide a minimal stub. With `routing="virtual"` on `SignIn.Root`, Elements
 * never calls these hooks at runtime.
 */
export function useRouter(): null {
  return null;
}
