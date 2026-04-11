/// <reference types='vitest' />
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const appDir = path.join(fileURLToPath(new URL('.', import.meta.url)), 'app');
const monorepoRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');
/** `@clerk/clerk-react` pins `@clerk/shared@3.x`; the repo also hoists `@clerk/shared@4.x`. Always bundle the React-line copy so Clerk hooks match `<ClerkProvider>`. */
const clerkSharedRoot = (() => {
  const nextToReact = path.join(
    monorepoRoot,
    'node_modules/@clerk/clerk-react/node_modules/@clerk/shared',
  );
  if (fs.existsSync(nextToReact)) {
    return nextToReact;
  }
  return path.join(monorepoRoot, 'node_modules/@clerk/shared');
})();
const clerkReactRoot = path.join(monorepoRoot, 'node_modules/@clerk/clerk-react');
const clerkTypesRoot = path.join(monorepoRoot, 'node_modules/@clerk/types');

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
      alias: [
        // Force a single Clerk runtime: `@clerk/elements` may install nested `@clerk/*` copies
        // that break React context (`useClerk` vs `<ClerkProvider>`). Always resolve to the
        // workspace-hoisted packages (same as `main.tsx` imports).
        { find: /^@clerk\/shared$/, replacement: clerkSharedRoot },
        { find: /^@clerk\/shared\//, replacement: `${clerkSharedRoot}/` },
        { find: /^@clerk\/clerk-react$/, replacement: clerkReactRoot },
        { find: /^@clerk\/clerk-react\//, replacement: `${clerkReactRoot}/` },
        { find: /^@clerk\/types$/, replacement: clerkTypesRoot },
        { find: /^@clerk\/types\//, replacement: `${clerkTypesRoot}/` },
        { find: '~', replacement: appDir },
        { find: '@', replacement: appDir },
        {
          find: 'next/navigation',
          replacement: path.join(appDir, 'shims/next/navigation.ts'),
        },
        {
          find: 'next/compat/router',
          replacement: path.join(appDir, 'shims/next/compat-router.ts'),
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
