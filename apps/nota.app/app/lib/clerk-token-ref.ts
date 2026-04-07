/** Set from `ClerkSupabaseBridge` so non-hook modules can attach Bearer tokens to API calls. */
let clerkGetToken: (() => Promise<string | null>) | null = null;

export function isClerkAccessTokenGetterRegistered(): boolean {
  return clerkGetToken !== null;
}

export function setClerkAccessTokenGetter(
  fn: (() => Promise<string | null>) | null,
): void {
  clerkGetToken = fn;
}

export async function getClerkAccessToken(): Promise<string | null> {
  if (!clerkGetToken) {
    return null;
  }
  try {
    return await clerkGetToken();
  } catch {
    return null;
  }
}
