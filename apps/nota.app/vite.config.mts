/// <reference types='vitest' />
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import {
  spaApiNotaProEntitled,
  spaApiNotaProInvalidate,
  spaApiOgPreview,
} from './app/lib/spa-api-handlers';

const appDir = path.join(fileURLToPath(new URL('.', import.meta.url)), 'app');

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
    plugins: process.env.VITEST
      ? []
      : [
          react(),
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
