import { createSupabaseServerClient } from './server';

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
