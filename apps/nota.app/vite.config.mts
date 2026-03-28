/// <reference types='vitest' />
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { reactRouter } from '@react-router/dev/vite';

const appDir = path.join(fileURLToPath(new URL('.', import.meta.url)), 'app');

export default defineConfig(({ mode }) => {
  // Merge `.env*` into `process.env` so server-only vars (e.g. `REVENUECAT_SECRET_API_KEY`)
  // are visible to React Router loaders during `nx dev`. Skip under Vitest.
  if (!process.env.VITEST) {
    const root = import.meta.dirname;
    const loaded = loadEnv(mode, root, '');
    for (const [key, value] of Object.entries(loaded)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }

  return {
  root: import.meta.dirname,
  resolve: {
    alias: {
      '~': appDir,
      '@': appDir,
    },
  },
  cacheDir: '../../node_modules/.vite/apps/nota.app',
  server: {
    port: 4200,
    host: 'localhost',
  },
  preview: {
    port: 4300,
    host: 'localhost',
  },
  plugins: [!process.env.VITEST && reactRouter()],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [],
  // },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  ssr: {
    // GSAP ships ESM; leaving it external makes Node's CJS loader choke on Vercel SSR.
    noExternal: ['gsap', '@gsap/react'],
  },
  test: {
    name: '@nota.app/nota.app',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['app/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
  },
};
});
