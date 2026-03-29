import { createClient } from '@supabase/supabase-js';

/**
 * Resolves the Supabase user id from `Authorization: Bearer <access_token>`.
 * Uses the Supabase secret key server-side only (never exposed to clients).
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

  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim();
  const secretKey =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !secretKey) {
    throw new Error(
      'nota-server: set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SECRET_KEY',
    );
  }

  const supabase = createClient(url, secretKey);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }
  return user.id;
}
