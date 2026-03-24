import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '~/types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function getSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Singleton instance for client components
let browserClient: ReturnType<typeof getSupabaseBrowserClient> | null = null;

export function getBrowserClient() {
  if (!browserClient) {
    browserClient = getSupabaseBrowserClient();
  }
  return browserClient;
}
