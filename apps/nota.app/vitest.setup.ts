// Runs before Vitest tests
import { vi } from 'vitest';

// TipTap `@tiptap/extension-emoji` pulls `is-emoji-supported`, which probes canvas; jsdom
// otherwise logs "Not implemented: HTMLCanvasElement.prototype.getContext".
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function () {
    return null;
  } as typeof HTMLCanvasElement.prototype.getContext;
}

process.env.VITE_SUPABASE_URL = 'http://localhost:54321';
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.VITE_REVENUECAT_API_KEY = '';
process.env.REVENUECAT_SECRET_API_KEY = '';

vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      VITE_REVENUECAT_API_KEY: '',
    },
  },
});
