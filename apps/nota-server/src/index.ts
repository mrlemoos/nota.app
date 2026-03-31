import cors from 'cors';
import express from 'express';
import { expressToWebRequest, sendWebResponse } from './http-utils.ts';
import {
  notaProEntitledHandler,
  notaProInvalidateHandler,
} from './routes/nota-pro.ts';

const PORT = Number(process.env.PORT ?? '8787');

const DEFAULT_CORS_ORIGINS = [
  'http://127.0.0.1:4378',
  'http://localhost:4200',
  'http://localhost:4300',
];

/** `*` alone (or only `*` entries) → reflect any `Origin` (`origin: true`). Otherwise exact allowlist; `*` entries mixed with URLs are dropped. */
function getCorsOriginOption(): boolean | string[] {
  const raw = process.env.NOTA_SERVER_CORS_ORIGINS?.trim();
  if (!raw) {
    return DEFAULT_CORS_ORIGINS;
  }
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) {
    return DEFAULT_CORS_ORIGINS;
  }
  if (parts.length === 1 && parts[0] === '*') {
    return true;
  }
  const explicit = parts.filter((p) => p !== '*');
  if (explicit.length === 0) {
    return true;
  }
  return explicit;
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

const corsMw = cors({
  origin: getCorsOriginOption(),
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  maxAge: 86_400,
});
app.use(corsMw);
app.options('*', corsMw);

app.get('/api/nota-pro-entitled', (req, res, next) => {
  void (async () => {
    try {
      const r = await notaProEntitledHandler(expressToWebRequest(req));
      await sendWebResponse(res, r);
    } catch (e) {
      next(e);
    }
  })();
});

app.post('/api/nota-pro-invalidate', (req, res, next) => {
  void (async () => {
    try {
      const r = await notaProInvalidateHandler(expressToWebRequest(req));
      await sendWebResponse(res, r);
    } catch (e) {
      next(e);
    }
  })();
});

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error('[nota-server]', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

app.listen(PORT, () => {
  console.log(`[nota-server] listening on http://127.0.0.1:${PORT}`);
});
