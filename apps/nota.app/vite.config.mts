/// <reference types='vitest' />
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const appDir = path.join(fileURLToPath(new URL('.', import.meta.url)), 'app');
const viteStubsDir = path.join(import.meta.dirname, 'vite-stubs');

function notaDesktopArtifactsPlugin(appRoot: string): Plugin {
  return {
    name: 'nota-desktop-artifacts',
    async writeBundle(options) {
      const outDir =
        typeof options.dir === 'string'
          ? options.dir
          : path.join(appRoot, 'dist');
      await fsPromises.writeFile(
        path.join(outDir, 'nota-public-env.json'),
        JSON.stringify({
          VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? '',
          VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? '',
          VITE_CLERK_PUBLISHABLE_KEY:
            process.env.VITE_CLERK_PUBLISHABLE_KEY ?? '',
        }),
        'utf8',
      );
    },
  };
}

export default defineConfig(({ mode }) => {
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
    publicDir: 'public',
    resolve: {
      // Prefer the hoisted `@clerk/shared` v4 (same React context as `ClerkProvider` from `@clerk/react`).
      // Do not alias `@clerk/shared/*` to a filesystem path — that skips `exports` and breaks `@clerk/shared/error`, etc.
      dedupe: ['@clerk/shared'],
      alias: [
        // App imports use `@/` and `~/`.
        { find: '~', replacement: appDir },
        { find: '@', replacement: appDir },
        // `@clerk/elements` imports Next.js router hooks; Nota is Vite + hash SPA only.
        {
          find: 'next/navigation',
          replacement: path.join(viteStubsDir, 'next-navigation.ts'),
        },
        {
          find: 'next/compat/router',
          replacement: path.join(viteStubsDir, 'next-compat-router.ts'),
        },
      ],
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
    plugins: process.env.VITEST
      ? []
      : [react(), notaDesktopArtifactsPlugin(import.meta.dirname)],
    build: {
      outDir: './dist',
      emptyOutDir: true,
      reportCompressedSize: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      rollupOptions: {
        input: path.resolve(import.meta.dirname, 'index.html'),
        output: {
          manualChunks(id: string) {
            if (!id.includes('node_modules')) {
              return;
            }
            const norm = id.replace(/\\/g, '/');
            if (norm.includes('/node_modules/react-dom/')) {
              return 'vendor-react';
            }
            if (norm.includes('/node_modules/scheduler/')) {
              return 'vendor-react';
            }
            if (/\/node_modules\/react\//.test(norm)) {
              return 'vendor-react';
            }
            if (norm.includes('/node_modules/@tiptap/')) {
              return 'vendor-tiptap';
            }
            if (norm.includes('/node_modules/prosemirror-')) {
              return 'vendor-tiptap';
            }
          },
        },
      },
    },
    ssr: {
      // `@clerk/elements` imports `next/*`; alias those to `vite-stubs/*`. Vitest must
      // transform this package (not serve prebundled node_modules) or aliases are skipped.
      noExternal: ['gsap', '@gsap/react', '@clerk/elements'],
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
