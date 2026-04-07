import { createClerkClient } from '@clerk/backend';

const CACHE_TTL_MS = 60_000;

const entitlementCache = new Map<
  string,
  { expiresAtMs: number; entitled: boolean }
>();

function getClerkSecretKey(): string | undefined {
  const k = process.env.CLERK_SECRET_KEY;
  return typeof k === 'string' && k.trim().length > 0 ? k.trim() : undefined;
}

/** Subscription statuses that grant vault access (fail closed for unknown). */
function subscriptionStatusGrantsNotaPro(status: string | undefined): boolean {
  if (!status) {
    return false;
  }
  return (
    status === 'active' ||
    status === 'trialing' ||
    status === 'past_due'
  );
}

export function invalidateServerNotaProCache(userId: string): void {
  entitlementCache.delete(userId);
}

/**
 * Server truth for Nota Pro via Clerk Billing (fail closed).
 */
export async function getServerNotaProEntitled(
  userId: string,
): Promise<boolean> {
  const secret = getClerkSecretKey();
  if (!secret) {
    return false;
  }

  const now = Date.now();
  const cached = entitlementCache.get(userId);
  if (cached && cached.expiresAtMs > now) {
    return cached.entitled;
  }

  const clerk = createClerkClient({ secretKey: secret });

  try {
    const sub = await clerk.billing.getUserBillingSubscription(userId);
    const entitled = subscriptionStatusGrantsNotaPro(sub?.status ?? undefined);
    entitlementCache.set(userId, {
      expiresAtMs: now + CACHE_TTL_MS,
      entitled,
    });
    return entitled;
  } catch (e: unknown) {
    const err = e as { status?: number; errors?: { code?: string }[] };
    const status = err?.status;
    const notFound =
      status === 404 ||
      err?.errors?.some((x) => x.code === 'resource_not_found');
    if (notFound) {
      entitlementCache.set(userId, {
        expiresAtMs: now + CACHE_TTL_MS,
        entitled: false,
      });
      return false;
    }
    return false;
  }
}
