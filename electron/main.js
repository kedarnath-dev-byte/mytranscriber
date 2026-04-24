/**
 * @module ElectronMain
 * @description Main Electron process. Creates desktop window,
 *              manages app lifecycle, handles IPC for audio capture.
 *              Follows Single Responsibility — UI logic stays in renderer.
 */

const { app, BrowserWindow, ipcMain, desktopCapturer, session } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

// ─── Constants ───────────────────────────────────────────────
const WINDOW_CONFIG = {
  width: 1200,
  height: 800,
  minWidth: 900,
  minHeight: 600,
};

const DEV_URL  = 'http://localhost:5173';
const PROD_URL = `file://${path.join(__dirname, '../dist/index.html')}`;

// ─── Window Factory ──────────────────────────────────────────
function createWindow() {
 const win = new BrowserWindow({
    ...WINDOW_CONFIG,
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
    },
  });

  // Allow session cookies between Electron and Express
  win.webContents.session.webRequest.onBeforeSendHeaders(
    (details, callback) => {
      callback({ requestHeaders: { ...details.requestHeaders } });
    }
  );

  // Allow microphone access in Electron
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      const allowed = ['media', 'audioCapture', 'desktopCapture'];
      callback(allowed.includes(permission));
    }
  );

  win.loadURL(isDev ? DEV_URL : PROD_URL);

  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

// ─── App Lifecycle ───────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC: Get Audio Sources ──────────────────────────────────
// Renderer asks for list of screen/audio sources
ipcMain.handle('get-audio-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      fetchWindowIcons: false,
    });
    return sources.map((s) => ({ id: s.id, name: s.name }));
  } catch (err) {
    console.error('[IPC] get-audio-sources failed:', err.message);
    return [];
  }
});

// ─── IPC: Log from Renderer ──────────────────────────────────
ipcMain.on('log', (_event, message) => {
  console.log('[Renderer]', message);
});