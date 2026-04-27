import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  Menu,
  nativeImage,
  shell,
  Tray,
  type WebContents,
} from 'electron';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  NOTA_CLERK_SSO_CALLBACK_PATH,
  NOTA_CUSTOM_SCHEME_URL_PREFIX,
} from '@nota.app/clerk-oauth-protocol';
import { buildNotaAppMenuTemplate } from './native-app-menu.js';
import {
  DEV_PORT,
  resolveMainWindowLoadUrl,
  ssoCallbackBaseUrl,
} from './app-load-url.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDev = !app.isPackaged;
const isDarwin = process.platform === 'darwin';

/** IPC channel; keep in sync with `apps/nota-electron/src/preload.ts`. */
const NOTA_MENUBAR_ACTION_CHANNEL = 'nota-menubar-action';

/** Same cap as `IMAGE_MAX_BYTES` in nota.app (`pdf-attachment-client`). */
const CLIPBOARD_IMAGE_MAX_BYTES = 25 * 1024 * 1024;

let pendingSsoHttpUrl: string | null = null;

let mainWindow: BrowserWindow | null = null;

let tray: Tray | null = null;

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
  if (!protocolUrl.startsWith(NOTA_CUSTOM_SCHEME_URL_PREFIX)) {
    return null;
  }
  try {
    const u = new URL(protocolUrl);
    const search = u.search;
    const base = ssoCallbackBaseUrl(isDev);
    return `${base}${NOTA_CLERK_SSO_CALLBACK_PATH}${search}`;
  } catch {
    return null;
  }
}

function resolveTrayIconPath(): string | null {
  const devPath = path.join(__dirname, '../buildResources/TrayTemplate.png');
  if (existsSync(devPath)) {
    return devPath;
  }
  const packagedPath = path.join(process.resourcesPath, 'TrayTemplate.png');
  if (existsSync(packagedPath)) {
    return packagedPath;
  }
  console.warn(
    '[nota-electron] TrayTemplate.png not found; menu bar extra disabled.',
  );
  return null;
}

function ensureMainWindow(): BrowserWindow {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  }
  const win = mainWindow;
  if (!win) {
    throw new Error('[nota-electron] main window missing after createWindow');
  }
  if (win.isMinimized()) {
    win.restore();
  }
  win.show();
  win.focus();
  return win;
}

function sendMenubarAction(payload: object): void {
  const win = ensureMainWindow();
  win.webContents.send(NOTA_MENUBAR_ACTION_CHANNEL, payload);
}

type ClipboardReadResult =
  | { ok: true; payload: object }
  | { ok: false; reason: 'empty' | 'image_too_large' };

function readClipboardForNote(): ClipboardReadResult {
  const img = clipboard.readImage();
  if (!img.isEmpty()) {
    const png = img.toPNG();
    if (png.length > CLIPBOARD_IMAGE_MAX_BYTES) {
      return { ok: false, reason: 'image_too_large' };
    }
    return {
      ok: true,
      payload: {
        kind: 'clipboard-note',
        clipboard: {
          kind: 'image',
          base64: png.toString('base64'),
          mimeType: 'image/png' as const,
        },
      },
    };
  }
  const raw = clipboard.readText();
  if (!raw.trim()) {
    return { ok: false, reason: 'empty' };
  }
  return {
    ok: true,
    payload: {
      kind: 'clipboard-note',
      clipboard: { kind: 'text', text: raw },
    },
  };
}

function createTray(): void {
  const iconPath = resolveTrayIconPath();
  if (!iconPath) {
    return;
  }
  const icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    console.warn(
      '[nota-electron] Tray icon could not be loaded; menu bar extra disabled.',
    );
    return;
  }
  tray = new Tray(icon);
  tray.setToolTip('Nota');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'New note from clipboard',
        click: () => {
          const win = ensureMainWindow();
          const result = readClipboardForNote();
          if (!result.ok) {
            if (result.reason === 'image_too_large') {
              void dialog.showMessageBox(win, {
                type: 'warning',
                message: 'Clipboard image is too large (max 25 MB).',
              });
              return;
            }
            void dialog.showMessageBox(win, {
              type: 'info',
              message: 'Clipboard is empty.',
            });
            return;
          }
          sendMenubarAction(result.payload);
        },
      },
      {
        label: 'Study notes from recording…',
        click: () => {
          sendMenubarAction({ kind: 'study-recording' });
        },
      },
      { type: 'separator' },
      {
        label: 'Open Nota',
        click: () => {
          ensureMainWindow();
        },
      },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        },
      },
    ]),
  );
}

function installApplicationMenu(): void {
  if (!isDarwin) {
    return;
  }
  Menu.setApplicationMenu(
    Menu.buildFromTemplate(
      buildNotaAppMenuTemplate({
        onNewNote: () => {
          sendMenubarAction({ kind: 'create-note' });
        },
        onMoveToFolder: () => {
          sendMenubarAction({ kind: 'move-note' });
        },
        onNewFolder: () => {
          sendMenubarAction({ kind: 'create-folder' });
        },
        onQuit: () => {
          app.quit();
        },
      }),
    ),
  );
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
function isClerkRelatedHttpsHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h.endsWith('.clerk.accounts.dev') ||
    h.endsWith('.clerk.accounts.com') ||
    h === 'clerk.com' ||
    h.endsWith('.clerk.com') ||
    h === 'clerk.nota.mrlemoos.dev'
  );
}

function shouldOpenHttpsNavigationInSystemBrowser(url: string): boolean {
  if (shouldOpenStripeHostedPageInSystemBrowser(url)) {
    return true;
  }
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') {
      return false;
    }
    const h = u.hostname.toLowerCase();
    return (
      h === 'appleid.apple.com' ||
      h === 'id.apple.com' ||
      h === 'accounts.google.com' ||
      h === 'github.com' ||
      isClerkRelatedHttpsHost(h)
    );
  } catch {
    return false;
  }
}

function createWindow(): void {
  const preloadPath = path.join(__dirname, 'preload.cjs');

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
  } else {
    void win.loadURL(resolveMainWindowLoadUrl(isDev));
  }

  win.on('closed', () => {
    mainWindow = null;
  });
}

async function startServer(): Promise<void> {
  if (!isDev) {
    return;
  }
  const waitOn = (await import('wait-on')).default;
  await waitOn({
    resources: [`http://localhost:${String(DEV_PORT)}`],
    timeout: 30_000,
  });
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
      (a): a is string => typeof a === 'string' && a.startsWith(NOTA_CUSTOM_SCHEME_URL_PREFIX),
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

  void app.whenReady().then(async () => {
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
          if (url.startsWith(NOTA_CUSTOM_SCHEME_URL_PREFIX)) {
            queueOrDeliverSsoFromNotaProtocol(url);
          }
        });
      }

      await startServer();
      createWindow();
      installApplicationMenu();
      createTray();
      await registerAutoUpdater();
    } catch (error) {
      console.error('Failed to start app:', error);
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
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
