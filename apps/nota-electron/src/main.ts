import { app, BrowserWindow, shell, type WebContents } from 'electron';
import { createReadStream, existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createConnection } from 'node:net';
import {
  createServer,
  type IncomingHttpHeaders,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEV_PORT = 4200;
const PROD_PORT = 4378;
const DEV_URL = `http://localhost:${DEV_PORT}`;
const PROD_URL = `http://127.0.0.1:${PROD_PORT}`;

const isDev = !app.isPackaged;
const isDarwin = process.platform === 'darwin';

/** Keep in sync with `apps/nota.app/app/lib/nota-clerk-oauth-protocol.ts`. */
const NOTA_OAUTH_PROTOCOL_PREFIX = 'nota://';

let pendingSsoHttpUrl: string | null = null;

let mainWindow: BrowserWindow | null = null;
let staticServer: Server | null = null;

/**
 * Clerk Billing / Stripe often uses `window.open` for checkout. Those URLs should open in
 * the user’s default browser so payments complete reliably.
 *
 * OAuth popups: Stripe stays external; other HTTPS popups use a non-sandboxed child window (see
 * `browserWindowOptionsForOAuthPopup`). **Desktop sign-in** uses `signIn.sso` + `will-navigate` to
 * open Clerk/IdP in the **system browser** and completes via `nota://oauth-callback` → `/sso-callback`.
 */
function shouldOpenStripeHostedPageInSystemBrowser(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return false;
    }
    const { hostname } = u;
    return (
      hostname === 'checkout.stripe.com' ||
      hostname === 'pay.stripe.com' ||
      hostname === 'buy.stripe.com' ||
      hostname === 'billing.stripe.com' ||
      hostname === 'invoice.stripe.com'
    );
  } catch {
    return false;
  }
}

/**
 * Clerk OAuth opens `window.open` popups (then IdPs like Apple). On macOS, Chromium’s WebAuthn /
 * FIDO path inside **sandboxed** child windows often never surfaces Touch ID / passkey UI (stuck
 * spinner on appleid.apple.com). Use a non-sandboxed renderer for those popups only; keep the main
 * app window sandboxed.
 *
 * Nested `window.open` calls must get the same handler — attach via `did-create-window`.
 */
function browserWindowOptionsForOAuthPopup(): Electron.BrowserWindowConstructorOptions {
  return {
    width: 500,
    height: 720,
    minWidth: 400,
    minHeight: 560,
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  };
}

function attachOauthPopupOpenHandler(contents: WebContents): void {
  contents.setWindowOpenHandler((details) => {
    if (shouldOpenStripeHostedPageInSystemBrowser(details.url)) {
      void shell.openExternal(details.url);
      return { action: 'deny' };
    }
    return {
      action: 'allow',
      overrideBrowserWindowOptions: browserWindowOptionsForOAuthPopup(),
    };
  });
}

function wireOauthPopupChain(contents: WebContents): void {
  attachOauthPopupOpenHandler(contents);
  contents.on('did-create-window', (childWindow: BrowserWindow) => {
    wireOauthPopupChain(childWindow.webContents);
  });
}

function notaProtocolOAuthUrlToSsoHttpUrl(protocolUrl: string): string | null {
  if (!protocolUrl.startsWith(NOTA_OAUTH_PROTOCOL_PREFIX)) {
    return null;
  }
  try {
    const u = new URL(protocolUrl);
    const search = u.search;
    const base = isDev ? DEV_URL : PROD_URL;
    return `${base}/sso-callback${search}`;
  } catch {
    return null;
  }
}

function queueOrDeliverSsoFromNotaProtocol(protocolUrl: string): void {
  const mapped = notaProtocolOAuthUrlToSsoHttpUrl(protocolUrl);
  if (!mapped) {
    return;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    void mainWindow.loadURL(mapped);
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
    return;
  }
  pendingSsoHttpUrl = mapped;
}

/**
 * Clerk `signIn.sso` assigns `window.location` to the hosted OAuth URL. In Electron, Apple / passkey
 * flows must run in the **system browser**; intercept main-window navigations to HTTPS IdP/Clerk OAuth.
 */
function shouldOpenHttpsNavigationInSystemBrowser(url: string): boolean {
  if (shouldOpenStripeHostedPageInSystemBrowser(url)) {
    return true;
  }
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') {
      return false;
    }
    const h = u.hostname;
    return (
      h === 'appleid.apple.com' ||
      h === 'id.apple.com' ||
      h === 'accounts.google.com' ||
      h === 'github.com' ||
      h.endsWith('.clerk.accounts.dev') ||
      h.endsWith('.clerk.accounts.com') ||
      (h.includes('clerk') &&
        (h.includes('accounts') || u.pathname.includes('oauth')))
    );
  } catch {
    return false;
  }
}

type OgPreviewHandler = (request: Request) => Promise<Response>;
let ogPreviewHandler: OgPreviewHandler | null = null;
let desktopSupabaseEnvLoaded = false;

async function ensureDesktopSupabaseEnv(staticRoot: string): Promise<void> {
  if (desktopSupabaseEnvLoaded) {
    return;
  }
  if (
    process.env.VITE_SUPABASE_URL &&
    process.env.VITE_SUPABASE_ANON_KEY &&
    process.env.VITE_CLERK_PUBLISHABLE_KEY
  ) {
    desktopSupabaseEnvLoaded = true;
    return;
  }
  try {
    const raw = await readFile(
      path.join(staticRoot, 'nota-public-env.json'),
      'utf8',
    );
    const j = JSON.parse(raw) as {
      VITE_SUPABASE_URL?: string;
      VITE_SUPABASE_ANON_KEY?: string;
      VITE_CLERK_PUBLISHABLE_KEY?: string;
    };
    if (j.VITE_SUPABASE_URL) {
      process.env.VITE_SUPABASE_URL = j.VITE_SUPABASE_URL;
    }
    if (j.VITE_SUPABASE_ANON_KEY) {
      process.env.VITE_SUPABASE_ANON_KEY = j.VITE_SUPABASE_ANON_KEY;
    }
    if (j.VITE_CLERK_PUBLISHABLE_KEY) {
      process.env.VITE_CLERK_PUBLISHABLE_KEY = j.VITE_CLERK_PUBLISHABLE_KEY;
    }
  } catch {
    /* OG handler will fail until env is present */
  }
  desktopSupabaseEnvLoaded = true;
}

async function loadOgPreviewHandler(staticRoot: string): Promise<OgPreviewHandler> {
  if (ogPreviewHandler) {
    return ogPreviewHandler;
  }
  const modPath = path.join(staticRoot, 'electron-og-api.mjs');
  const mod = (await import(pathToFileURL(modPath).href)) as {
    default: OgPreviewHandler;
  };
  ogPreviewHandler = mod.default;
  return ogPreviewHandler;
}

function webHeadersFromNode(headers: IncomingHttpHeaders): Headers {
  const h = new Headers();
  for (const [k, v] of Object.entries(headers)) {
    if (v === undefined) {
      continue;
    }
    if (Array.isArray(v)) {
      for (const x of v) {
        if (x !== undefined) {
          h.append(k, x);
        }
      }
    } else if (typeof v === 'string') {
      h.set(k, v);
    }
  }
  return h;
}

/** Match `isSpaShellPathnameAllowed` in `apps/nota.app/app/lib/spa-pathname-policy.ts` for SPA fallback. */
function shouldSpaFallbackForMissingPath(pathname: string): boolean {
  const p =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname;
  if (p === '/' || p === '') {
    return true;
  }
  if (p === '/index.html') {
    return true;
  }
  if (p === '/favicon.svg') {
    return true;
  }
  if (p.startsWith('/assets/')) {
    return true;
  }
  if (p === '/notes' || p.startsWith('/notes/')) {
    return true;
  }
  if (p === '/sso-callback' || p.startsWith('/sso-callback/')) {
    return true;
  }
  return false;
}

function probeTcpPort(host: string, port: number, connectTimeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.removeAllListeners();
      if (ok) {
        socket.end();
      } else {
        socket.destroy();
      }
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), connectTimeoutMs);
    socket.on('connect', () => finish(true));
    socket.on('error', () => finish(false));
  });
}

/** Wait until something accepts TCP connections (HTTP 2xx is not required). */
async function waitForLocalPort(
  host: string,
  port: number,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const connectTimeoutMs = 400;
  while (Date.now() < deadline) {
    if (await probeTcpPort(host, port, connectTimeoutMs)) {
      return;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for ${host}:${port}`);
}

function createWindow(): void {
  const preloadPath = path.join(__dirname, 'preload.js');

  if (!existsSync(preloadPath)) {
    console.error(
      `[nota-electron] Preload missing at ${preloadPath}. Build the shell: cd apps/nota-electron && npm run build`,
    );
  } else if (isDev) {
    console.log(`[nota-electron] Preload ok: ${preloadPath}`);
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hiddenInset',
    transparent: true,
    // Without vibrancy, transparent windows often composite as solid black on macOS.
    ...(isDarwin
      ? {
          vibrancy: 'under-window' as const,
          visualEffectState: 'followWindow' as const,
        }
      : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: preloadPath,
    },
  });

  const win = mainWindow;

  wireOauthPopupChain(win.webContents);

  win.webContents.on('will-navigate', (event, url) => {
    if (!shouldOpenHttpsNavigationInSystemBrowser(url)) {
      return;
    }
    event.preventDefault();
    void shell.openExternal(url);
  });

  // Load the app (or resume Clerk OAuth handshake from a `nota://` deep link).
  if (pendingSsoHttpUrl) {
    const resume = pendingSsoHttpUrl;
    pendingSsoHttpUrl = null;
    void win.loadURL(resume);
  } else if (isDev) {
    void win.loadURL(DEV_URL);
  } else {
    void win.loadURL(PROD_URL);
  }

  win.on('closed', () => {
    mainWindow = null;
  });
}

async function startServer(): Promise<void> {
  if (isDev) {
    const waitOn = (await import('wait-on')).default;
    await waitOn({
      resources: [`http://localhost:${DEV_PORT}`],
      timeout: 30_000,
    });
    return;
  }

  // Packaged layout: electron-builder puts `nota.app/build` and `nota.app/node_modules`
  // inside app.asar next to this package. Resolve from app.getAppPath() (the asar root),
  // not path.dirname(app.getAppPath()) (Resources/), or bundled files are invisible.
  const bundledRoot = app.getAppPath();
  const staticRoot = path.join(bundledRoot, 'nota.app', 'dist');
  try {
    await stat(staticRoot);
  } catch {
    throw new Error(
      `Could not find Vite SPA build at ${staticRoot}. Build nota.app before packaging.`,
    );
  }

  function contentType(file: string): string {
    switch (path.extname(file).toLowerCase()) {
      case '.html':
        return 'text/html; charset=utf-8';
      case '.js':
        return 'application/javascript; charset=utf-8';
      case '.css':
        return 'text/css; charset=utf-8';
      case '.svg':
        return 'image/svg+xml';
      case '.json':
        return 'application/json';
      case '.woff2':
        return 'font/woff2';
      case '.png':
        return 'image/png';
      case '.ico':
        return 'image/x-icon';
      case '.map':
        return 'application/json';
      default:
        return 'application/octet-stream';
    }
  }

  /** Long-lived cache for Vite content-hashed files; no-cache for HTML shell. */
  function cacheControlForStaticFile(resolved: string): string {
    const rel = path.relative(staticRoot, resolved).split(path.sep).join('/');
    const base = path.basename(resolved).toLowerCase();
    if (base === 'index.html') {
      return 'no-cache';
    }
    const inAssets = rel.startsWith('assets/');
    const ext = path.extname(resolved).toLowerCase();
    const longCacheExt = new Set([
      '.js',
      '.css',
      '.mjs',
      '.woff2',
      '.woff',
      '.ttf',
      '.map',
    ]);
    if (inAssets && longCacheExt.has(ext)) {
      return 'public, max-age=31536000, immutable';
    }
    return 'public, max-age=86400';
  }

  async function sendStaticFile(
    req: IncomingMessage,
    res: ServerResponse,
    resolved: string,
  ): Promise<void> {
    const st = await stat(resolved);
    if (st.isDirectory()) {
      throw new Error('directory');
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType(resolved));
    res.setHeader('Cache-Control', cacheControlForStaticFile(resolved));
    res.setHeader('Content-Length', String(st.size));
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    try {
      await pipeline(createReadStream(resolved), res);
    } catch {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end();
      } else {
        res.destroy();
      }
    }
  }

  const rootResolved = path.resolve(staticRoot);

  staticServer = createServer(async (req, res) => {
    const urlPath = req.url?.split('?')[0] ?? '/';
    if (urlPath === '/api/og-preview') {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Method Not Allowed');
        return;
      }
      try {
        await ensureDesktopSupabaseEnv(staticRoot);
        const handler = await loadOgPreviewHandler(staticRoot);
        const host = req.headers.host ?? `127.0.0.1:${PROD_PORT}`;
        const fullUrl = new URL(req.url ?? '/', `http://${host}`);
        const request = new Request(fullUrl.toString(), {
          method: req.method,
          headers: webHeadersFromNode(req.headers),
        });
        const r = await handler(request);
        res.statusCode = r.status;
        r.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });
        res.end(Buffer.from(await r.arrayBuffer()));
      } catch (e) {
        console.error('[nota-electron] /api/og-preview', e);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('OG preview failed');
      }
      return;
    }
    if (urlPath.startsWith('/api/')) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(
        'This API route is not bundled in the desktop app. Set VITE_NOTA_SERVER_API_URL for Nota Pro entitlement, or use the web app for other server routes.',
      );
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Method Not Allowed');
      return;
    }

    const rel = urlPath === '/' ? 'index.html' : urlPath.slice(1);
    const resolved = path.resolve(staticRoot, rel);
    if (
      resolved !== rootResolved &&
      !resolved.startsWith(rootResolved + path.sep)
    ) {
      res.statusCode = 400;
      res.end();
      return;
    }

    try {
      await sendStaticFile(req, res, resolved);
    } catch {
      if (!shouldSpaFallbackForMissingPath(urlPath)) {
        if (!res.headersSent) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end('Not Found');
        }
        return;
      }
      const indexPath = path.join(staticRoot, 'index.html');
      try {
        await sendStaticFile(req, res, indexPath);
      } catch {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end('Missing index.html');
        }
      }
    }
  });

  await new Promise<void>((resolve, reject) => {
    staticServer!.once('error', reject);
    staticServer!.listen(PROD_PORT, '127.0.0.1', () => resolve());
  });

  await waitForLocalPort('127.0.0.1', PROD_PORT, 30_000);
}

function stopServer(): void {
  if (staticServer) {
    staticServer.close();
    staticServer = null;
  }
}

async function registerAutoUpdater(): Promise<void> {
  if (!app.isPackaged) {
    return;
  }
  const electronUpdater = (await import('electron-updater')).default;
  const { autoUpdater } = electronUpdater;
  autoUpdater.autoDownload = true;
  autoUpdater.on('error', (error) => {
    console.error('[nota-electron] auto-updater error', error);
  });
  autoUpdater.on('update-downloaded', () => {
    console.log('[nota-electron] update downloaded; restart to apply');
  });
  void autoUpdater.checkForUpdatesAndNotify();
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const protocolUrl = argv.find(
      (a): a is string => typeof a === 'string' && a.startsWith(NOTA_OAUTH_PROTOCOL_PREFIX),
    );
    if (protocolUrl) {
      queueOrDeliverSsoFromNotaProtocol(protocolUrl);
    }
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      if (process.defaultApp) {
        if (process.argv.length >= 2) {
          app.setAsDefaultProtocolClient('nota', process.execPath, [
            path.resolve(process.argv[1] ?? ''),
          ]);
        }
      } else {
        app.setAsDefaultProtocolClient('nota');
      }

      if (isDarwin) {
        app.on('open-url', (event, url) => {
          event.preventDefault();
          if (url.startsWith(NOTA_OAUTH_PROTOCOL_PREFIX)) {
            queueOrDeliverSsoFromNotaProtocol(url);
          }
        });
      }

      await startServer();
      createWindow();
      await registerAutoUpdater();
    } catch (error) {
      console.error('Failed to start app:', error);
      app.quit();
    }
  });

  app.on('before-quit', () => {
    stopServer();
  });

  app.on('window-all-closed', () => {
    stopServer();
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}
