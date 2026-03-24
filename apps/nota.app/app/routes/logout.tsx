import { redirect, type ActionFunctionArgs } from 'react-router'
import { createSupabaseServerClient } from '../lib/supabase/server'

export async function action({ request }: ActionFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)

  await supabase.auth.signOut()

  throw redirect('/login', { headers })
}

export async function loader() {
  return redirect('/login')
}
