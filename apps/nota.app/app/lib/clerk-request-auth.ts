import { createClerkClient, verifyToken } from '@clerk/backend';

function clerkSecretKey(): string | undefined {
  const k = process.env.CLERK_SECRET_KEY;
  return typeof k === 'string' && k.trim().length > 0 ? k.trim() : undefined;
}

function clerkPublishableKey(): string | undefined {
  const a = process.env.CLERK_PUBLISHABLE_KEY?.trim();
  const b = process.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();
  return a || b || undefined;
}

/**
 * Resolves the Clerk user id from `Authorization: Bearer <session_jwt>` or Clerk session cookies.
 */
export async function getClerkUserIdFromRequest(
  request: Request,
): Promise<string | null> {
  const sk = clerkSecretKey();
  if (!sk) {
    throw new Error(
      'Clerk: set CLERK_SECRET_KEY for server-side authentication',
    );
  }

  const rawAuth = request.headers.get('authorization')?.trim();
  if (rawAuth) {
    const parts = rawAuth.split(/\s+/);
    if (parts[0]?.toLowerCase() === 'bearer') {
      const token = parts.slice(1).join(' ').trim();
      if (!token) {
        return null;
      }
      try {
        const payload = await verifyToken(token, { secretKey: sk });
        const sub = payload.sub;
        return typeof sub === 'string' && sub.length > 0 ? sub : null;
      } catch {
        return null;
      }
    }
  }

  const pk = clerkPublishableKey();
  if (!pk) {
    throw new Error(
      'Clerk: set CLERK_PUBLISHABLE_KEY or VITE_CLERK_PUBLISHABLE_KEY for cookie session auth',
    );
  }

  const clerk = createClerkClient({ secretKey: sk, publishableKey: pk });
  const state = await clerk.authenticateRequest(request, { publishableKey: pk });
  if (!state.isAuthenticated) {
    return null;
  }
  const auth = state.toAuth();
  const uid = auth.userId;
  return typeof uid === 'string' && uid.length > 0 ? uid : null;
}
