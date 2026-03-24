import { redirect } from 'react-router';
import { createSupabaseServerClient } from './server';

export async function requireAuth(request: Request) {
  const { supabase, headers } = createSupabaseServerClient(request);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw redirect('/login', {
      headers,
    });
  }

  return { user, supabase, headers };
}

export async function getAuthUser(request: Request) {
  const { supabase } = createSupabaseServerClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function isAuthenticated(request: Request) {
  const user = await getAuthUser(request);
  return !!user;
}
