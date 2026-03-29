import { app, BrowserWindow } from 'electron';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { createServer, type Server } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEV_PORT = 4200;
const PROD_PORT = 4378;
const DEV_URL = `http://localhost:${DEV_PORT}`;
const PROD_URL = `http://127.0.0.1:${PROD_PORT}`;

let mainWindow: BrowserWindow | null = null;
let staticServer: Server | null = null;

const isDev = !app.isPackaged;
const isDarwin = process.platform === 'darwin';

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

  // Load the app
  if (isDev) {
    win.loadURL(DEV_URL);
  } else {
    win.loadURL(PROD_URL);
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

  const rootResolved = path.resolve(staticRoot);

  staticServer = createServer(async (req, res) => {
    const urlPath = req.url?.split('?')[0] ?? '/';
    if (urlPath.startsWith('/api/')) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(
        'Server-only API routes are not bundled in the desktop app. Use the web build for link previews.',
      );
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
      const st = await stat(resolved);
      if (st.isDirectory()) {
        throw new Error('directory');
      }
      const buf = await readFile(resolved);
      res.setHeader('Content-Type', contentType(resolved));
      res.statusCode = 200;
      res.end(buf);
    } catch {
      try {
        const buf = await readFile(path.join(staticRoot, 'index.html'));
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.statusCode = 200;
        res.end(buf);
      } catch {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Missing index.html');
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
  app.on('second-instance', () => {
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
