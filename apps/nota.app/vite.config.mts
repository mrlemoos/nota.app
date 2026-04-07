/// <reference types='vitest' />
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import * as esbuild from 'esbuild';
import type { Plugin } from 'vite';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import {
  spaApiNotaProEntitled,
  spaApiNotaProInvalidate,
} from './app/lib/spa-api-handlers';
import { spaApiOgPreview } from './app/lib/spa-api-og-preview';

const appDir = path.join(fileURLToPath(new URL('.', import.meta.url)), 'app');
const monorepoRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');
/** `@clerk/clerk-react` pins `@clerk/shared@3.x`; the repo also hoists `@clerk/shared@4.x` for `@clerk/backend`. Always bundle the React-line copy so Clerk hooks match `<ClerkProvider>`. */
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

function webHeaders(req: IncomingMessage): Headers {
  const h = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      for (const x of v) {
        h.append(k, x);
      }
    } else {
      h.set(k, v);
    }
  }
  return h;
}

function collectBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c as Buffer));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function sendWebResponse(res: ServerResponse, r: Response): Promise<void> {
  res.statusCode = r.status;
  r.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  const buf = Buffer.from(await r.arrayBuffer());
  res.end(buf);
}

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
      await esbuild.build({
        entryPoints: [
          path.join(appRoot, 'app/lib/electron-og-preview-entry.ts'),
        ],
        bundle: true,
        platform: 'node',
        format: 'esm',
        outfile: path.join(outDir, 'electron-og-api.mjs'),
        absWorkingDir: appRoot,
        alias: {
          '~': path.join(appRoot, 'app'),
          '@': path.join(appRoot, 'app'),
        },
        // Packaged Electron runs this bundle in the main process; verifyToken needs a secret.
        // CI should set CLERK_SECRET_KEY when building the client that ships inside the DMG/ZIP.
        define: {
          'process.env.CLERK_SECRET_KEY': JSON.stringify(
            process.env.CLERK_SECRET_KEY ?? '',
          ),
        },
        logLevel: 'warning',
      });
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
      : [
          react(),
          notaDesktopArtifactsPlugin(import.meta.dirname),
          {
            name: 'nota-spa-api',
            configureServer(server) {
              server.middlewares.use(async (req, res, next) => {
                const rawUrl = req.url ?? '';
                const pathname = rawUrl.split('?')[0] ?? '';
                if (!pathname.startsWith('/api/')) {
                  next();
                  return;
                }
                try {
                  const host = req.headers.host ?? 'localhost';
                  const fullUrl = new URL(rawUrl, `http://${host}`);
                  const nodeReq = req as IncomingMessage;
                  let body: Buffer = Buffer.alloc(0);
                  if (nodeReq.method !== 'GET' && nodeReq.method !== 'HEAD') {
                    body = (await collectBody(nodeReq)) as Buffer;
                  }
                  const request = new Request(fullUrl.toString(), {
                    method: nodeReq.method,
                    headers: webHeaders(nodeReq),
                    body: body.length ? new Uint8Array(body) : undefined,
                  });
                  let response: Response;
                  if (pathname === '/api/og-preview') {
                    response = await spaApiOgPreview(request);
                  } else if (pathname === '/api/nota-pro-entitled') {
                    response = await spaApiNotaProEntitled(request);
                  } else if (pathname === '/api/nota-pro-invalidate') {
                    response = await spaApiNotaProInvalidate(request);
                  } else {
                    next();
                    return;
                  }
                  await sendWebResponse(res as ServerResponse, response);
                } catch (e) {
                  next(e);
                }
              });
            },
          },
        ],
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
