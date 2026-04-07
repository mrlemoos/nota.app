import { verifyToken } from '@clerk/backend';

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
    const payload = await verifyToken(token, { secretKey });
    const sub = payload.sub;
    return typeof sub === 'string' && sub.length > 0 ? sub : null;
  } catch {
    return null;
  }
}
