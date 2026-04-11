// Runs before Vitest tests
import { vi } from 'vitest';
import { setClerkAccessTokenGetter } from './app/lib/clerk-token-ref';
import { setSupabaseClerkGetToken } from './app/lib/supabase/browser';

// TipTap `@tiptap/extension-emoji` pulls `is-emoji-supported`, which probes canvas; jsdom
// otherwise logs "Not implemented: HTMLCanvasElement.prototype.getContext".
const canvasCtor = (
  globalThis as typeof globalThis & {
    HTMLCanvasElement?: {
      prototype: { getContext: (...args: unknown[]) => unknown };
    };
  }
).HTMLCanvasElement;
if (canvasCtor) {
  canvasCtor.prototype.getContext = function () {
    return null;
  };
}

process.env.VITE_SUPABASE_URL = 'http://localhost:54321';
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.VITE_CLERK_PUBLISHABLE_KEY = 'pk_test_placeholder';
process.env.VITE_NOTA_SERVER_API_URL = 'http://127.0.0.1:9';

setSupabaseClerkGetToken(async () => 'test-clerk-jwt');
setClerkAccessTokenGetter(async () => 'test-clerk-jwt');

vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      VITE_CLERK_PUBLISHABLE_KEY: 'pk_test_placeholder',
      VITE_NOTA_SERVER_API_URL: 'http://127.0.0.1:9',
    },
  },
});
