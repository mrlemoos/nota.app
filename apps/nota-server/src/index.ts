import cors from 'cors';
import express from 'express';
import multer from 'multer';
import {
  AUDIO_UPLOAD_MAX_BYTES,
  isAllowedAudioUploadMime,
} from './lib/audio-upload.server.ts';
import {
  expressToWebRequest,
  expressToWebRequestWithJsonBody,
  sendWebResponse,
} from './http-utils.ts';
import { audioToNoteHandler } from './routes/audio-to-note.ts';
import { ogPreviewHandler } from './routes/og-preview.ts';
import {
  notaProEntitledHandler,
  notaProInvalidateHandler,
} from './routes/nota-pro.ts';
import {
  indexNotePostHandler,
  reindexAllPostHandler,
  semanticSearchPostHandler,
} from './routes/semantic-search.ts';

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

const corsOriginOption = getCorsOriginOption();

if (
  process.env.NODE_ENV === 'production' &&
  corsOriginOption === true &&
  !process.env.NOTA_SERVER_ALLOW_INSECURE_CORS?.trim()
) {
  throw new Error(
    '[nota-server] Refusing to start with NOTA_SERVER_CORS_ORIGINS=* in production (reflects any Origin). Set an explicit comma-separated allowlist, or set NOTA_SERVER_ALLOW_INSECURE_CORS=1 to override (not recommended).',
  );
}

if (corsOriginOption === true && process.env.NODE_ENV === 'production') {
  console.warn(
    '[nota-server] NOTA_SERVER_ALLOW_INSECURE_CORS is set; CORS reflects any browser Origin.',
  );
}

if (corsOriginOption === true && process.env.NODE_ENV !== 'production') {
  console.warn(
    '[nota-server] NOTA_SERVER_CORS_ORIGINS=* reflects any browser Origin. Prefer an explicit comma-separated list in production.',
  );
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AUDIO_UPLOAD_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    cb(null, isAllowedAudioUploadMime(file.mimetype));
  },
});

const corsMw = cors({
  origin: corsOriginOption,
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

app.get('/api/og-preview', (req, res, next) => {
  void (async () => {
    try {
      const r = await ogPreviewHandler(expressToWebRequest(req));
      await sendWebResponse(res, r);
    } catch (e) {
      next(e);
    }
  })();
});

app.post('/api/audio-to-note', audioUpload.single('audio'), (req, res, next) => {
  void audioToNoteHandler(req, res).catch(next);
});

app.post('/api/semantic-search', (req, res, next) => {
  void (async () => {
    try {
      const r = await semanticSearchPostHandler(expressToWebRequestWithJsonBody(req));
      await sendWebResponse(res, r);
    } catch (e) {
      next(e);
    }
  })();
});

app.post('/api/search/index-note', (req, res, next) => {
  void (async () => {
    try {
      const r = await indexNotePostHandler(expressToWebRequestWithJsonBody(req));
      await sendWebResponse(res, r);
    } catch (e) {
      next(e);
    }
  })();
});

app.post('/api/search/reindex-all', (req, res, next) => {
  void (async () => {
    try {
      const r = await reindexAllPostHandler(expressToWebRequestWithJsonBody(req));
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
    if (res.headersSent) {
      return;
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ error: 'Audio file too large' });
        return;
      }
      res.status(400).json({ error: 'Upload failed' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  },
);

app.listen(PORT, () => {
  console.log(`[nota-server] listening on http://127.0.0.1:${PORT}`);
});
