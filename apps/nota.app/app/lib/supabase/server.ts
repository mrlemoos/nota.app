import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from '@supabase/ssr';
import type { CookieMethodsServer } from '@supabase/ssr';
import type { Database } from '~/types/database.types';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

function getSupabaseEnv() {
  const url = supabaseUrl;
  const key = supabaseAnonKey;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  return { url, key };
}

export function createSupabaseServerClient(request: Request) {
  const { url, key } = getSupabaseEnv();
  const headers = new Headers();

  const cookies: CookieMethodsServer = {
    getAll() {
      return parseCookieHeader(request.headers.get('cookie') ?? '').map(
        ({ name, value }) => ({ name, value: value ?? '' }),
      );
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => {
        headers.append(
          'Set-Cookie',
          serializeCookieHeader(name, value, options),
        );
      });
    },
  };

  const supabase = createServerClient<Database>(url, key, { cookies });

  return { supabase, headers };
}

export { getSupabaseEnv };
