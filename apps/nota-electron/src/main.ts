import { app, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { spawn, ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import waitOn from 'wait-on';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEV_PORT = 4200;
const PROD_PORT = 4378;
const DEV_URL = `http://localhost:${DEV_PORT}`;
const PROD_URL = `http://127.0.0.1:${PROD_PORT}`;

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;

const isDev = !app.isPackaged;
const isDarwin = process.platform === 'darwin';

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

function getAppRoot(): string {
  // In packaged app, resources are in different locations
  // app.getAppPath() returns the directory containing package.json (which is inside the asar or app folder)
  if (app.isPackaged) {
    // Go up from app.asar or app directory to reach the resources folder
    return path.dirname(app.getAppPath());
  }
  // In development, we're in apps/nota-electron
  return path.join(__dirname, '..', '..');
}

async function startServer(): Promise<void> {
  if (isDev) {
    // In dev, expect Vite dev server to already be running
    await waitOn({
      resources: [`http://localhost:${DEV_PORT}`],
      timeout: 30_000,
    });
    return;
  }

  // In prod, spawn react-router-serve
  const appRoot = getAppRoot();

  const serverDir = path.join(appRoot, 'nota.app', 'build', 'server');
  const possibleServerPaths = [
    path.join(serverDir, 'index.js'),
    path.join(appRoot, 'nota.app', 'build', 'index.js'),
    path.join(appRoot, 'nota.app', 'dist', 'server', 'index.js'),
    path.join(appRoot, 'nota.app', 'dist', 'index.js'),
  ];

  let serverBuildPath = '';
  for (const candidate of possibleServerPaths) {
    try {
      await import('fs').then(({ promises }) => promises.access(candidate));
      serverBuildPath = candidate;
      console.log(`Found server build at: ${candidate}`);
      break;
    } catch {
      // Path doesn't exist, try next
    }
  }

  if (!serverBuildPath && existsSync(serverDir)) {
    try {
      for (const name of readdirSync(serverDir)) {
        const sub = path.join(serverDir, name);
        if (!statSync(sub).isDirectory()) continue;
        const nestedIndex = path.join(sub, 'index.js');
        if (existsSync(nestedIndex)) {
          serverBuildPath = nestedIndex;
          console.log(`Found server build at: ${nestedIndex}`);
          break;
        }
      }
    } catch {
      // ignore
    }
  }

  if (!serverBuildPath) {
    throw new Error(
      `Could not find server build. Tried:\n${possibleServerPaths.join('\n')}`,
    );
  }

  const nodePath = process.execPath;

  // Try multiple possible react-router-serve locations
  const possibleServePaths = [
    path.join(
      appRoot,
      'nota.app',
      'node_modules',
      '.bin',
      'react-router-serve',
    ),
    path.join(appRoot, 'node_modules', '.bin', 'react-router-serve'),
  ];

  let reactRouterServePath = '';
  for (const path of possibleServePaths) {
    try {
      await import('fs').then(({ promises }) => promises.access(path));
      reactRouterServePath = path;
      console.log(`Found react-router-serve at: ${path}`);
      break;
    } catch {
      // Path doesn't exist, try next
    }
  }

  if (!reactRouterServePath) {
    throw new Error(
      `Could not find react-router-serve. Tried:\n${possibleServePaths.join('\n')}`,
    );
  }

  serverProcess = spawn(nodePath, [reactRouterServePath, serverBuildPath], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: String(PROD_PORT),
      // These must be set in the packaged app environment or via .env
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || '',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || '',
    },
    stdio: 'pipe',
    detached: false,
  });

  serverProcess.stdout?.on('data', (data) => {
    console.log(`[Server] ${data}`);
  });

  serverProcess.stderr?.on('data', (data) => {
    console.error(`[Server] ${data}`);
  });

  serverProcess.on('error', (error) => {
    console.error('Failed to start server:', error);
  });

  serverProcess.on('exit', (code) => {
    console.log(`Server exited with code ${code}`);
    serverProcess = null;
  });

  // Wait for server to be ready
  await waitOn({
    resources: [`http://127.0.0.1:${PROD_PORT}`],
    timeout: 30000,
  });
}

function stopServer(): void {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

function registerAutoUpdater(): void {
  if (!app.isPackaged) {
    return;
  }
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
      registerAutoUpdater();
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
