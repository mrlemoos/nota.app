import { verifyToken } from '@clerk/backend';

function clerkVerifyOptions(secretKey: string): {
  secretKey: string;
  clockSkewInMs: number;
  authorizedParties?: string[];
} {
  const rawSkew = process.env.NOTA_SERVER_CLERK_CLOCK_SKEW_MS?.trim();
  const parsedSkew = rawSkew ? Number(rawSkew) : Number.NaN;
  const clockSkewInMs =
    Number.isFinite(parsedSkew) && parsedSkew >= 0 ? parsedSkew : 5000;

  const partiesRaw = process.env.NOTA_SERVER_CLERK_AUTHORIZED_PARTIES?.trim();
  const authorizedParties = partiesRaw
    ? partiesRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

  return {
    secretKey,
    clockSkewInMs,
    ...(authorizedParties && authorizedParties.length > 0
      ? { authorizedParties }
      : {}),
  };
}

/**
 * Resolves the Clerk user id from `Authorization: Bearer <session_jwt>`.
 */
export async function getUserIdFromBearer(
  request: Request,
): Promise<string | null> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return null;
  }
  const token = auth.slice('Bearer '.length).trim();
  if (!token) {
    return null;
  }

  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error('nota-server: set CLERK_SECRET_KEY');
  }

  try {
    const payload = await verifyToken(token, clerkVerifyOptions(secretKey));
    const sub = payload.sub;
    return typeof sub === 'string' && sub.length > 0 ? sub : null;
  } catch {
    return null;
  }
}
