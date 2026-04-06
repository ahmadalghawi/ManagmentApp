const { app, BrowserWindow, Tray, Menu, dialog, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;
const DEV_PORT = 54321;
const APP_VERSION = require('../package.json').version;

let mainWindow;
let tray = null;
let nextServer = null;

// ─── Paths & Logging ────────────────────────────────────────────────────────
const userDataPath = path.join(app.getPath('userData'), 'data');
const logFile = path.join(app.getPath('userData'), 'mem-server.log');

if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  console.log(msg);
  try { fs.appendFileSync(logFile, line); } catch (_) {}
}

// Set env BEFORE requiring next (so db.js picks it up)
if (!isDev) {
  process.env.NODE_ENV = 'production';
}
process.env.APP_DATA_PATH = userDataPath;

// ─── About Dialog ───────────────────────────────────────────────────────────
function showAbout() {
  const iconPath = path.join(__dirname, '../public/icon.png');
  const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined;

  dialog.showMessageBox(mainWindow, {
    type: 'info',
    icon,
    title: 'About MeM',
    message: 'MeM — Manage Me',
    detail: [
      `Version: ${APP_VERSION}`,
      '',
      'Personal finance, time tracking, and',
      'self-management desktop application.',
      '',
      `Electron: ${process.versions.electron}`,
      `Node.js: ${process.versions.node}`,
      `Platform: ${process.platform} ${process.arch}`,
      '',
      `Data: ${userDataPath}`,
    ].join('\n'),
    buttons: ['OK'],
  });
}

// ─── Application Menu ───────────────────────────────────────────────────────
function createAppMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Data Folder',
          click: () => shell.openPath(userDataPath),
        },
        {
          label: 'Open Log File',
          click: () => shell.openPath(logFile),
        },
        { type: 'separator' },
        {
          label: 'Minimize to Tray',
          click: () => mainWindow.hide(),
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => { app.isQuitting = true; app.quit(); },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(isDev ? [{ type: 'separator' }, { role: 'toggleDevTools' }] : []),
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About MeM',
          click: showAbout,
        },
        { type: 'separator' },
        {
          label: 'Open Data Folder',
          click: () => shell.openPath(userDataPath),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── Start Next.js ──────────────────────────────────────────────────────────
async function startNextJs() {
  if (isDev) {
    return `http://localhost:${DEV_PORT}`;
  }

  try {
    const dir = app.getAppPath();
    log(`App root: ${dir}`);
    log(`Data path: ${userDataPath}`);

    const next = require('next');
    const { createServer } = require('http');

    const nextApp = next({ dev: false, dir });
    await nextApp.prepare();
    const handle = nextApp.getRequestHandler();

    nextServer = createServer((req, res) => handle(req, res));

    const port = await new Promise((resolve, reject) => {
      nextServer.listen(0, 'localhost', () => {
        resolve(nextServer.address().port);
      });
      nextServer.on('error', reject);
    });

    log(`Server running on port ${port}`);
    return `http://localhost:${port}`;
  } catch (err) {
    log(`FATAL: ${err.stack || err.message}`);
    dialog.showErrorBox(
      'MeM — Startup Failed',
      `Server could not start.\n\n${err.message}\n\nLog: ${logFile}`
    );
    app.quit();
  }
}

// ─── Window ─────────────────────────────────────────────────────────────────
function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, '../public/icon.png'),
    title: 'MeM',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(url);

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

// ─── Tray ───────────────────────────────────────────────────────────────────
function createTray() {
  tray = new Tray(path.join(__dirname, '../public/icon.png'));

  const contextMenu = Menu.buildFromTemplate([
    { label: `MeM v${APP_VERSION}`, enabled: false },
    { type: 'separator' },
    { label: 'Show App', click: () => mainWindow.show() },
    {
      label: 'Open Data Folder',
      click: () => shell.openPath(userDataPath),
    },
    { type: 'separator' },
    {
      label: 'About',
      click: () => { mainWindow.show(); showAbout(); },
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => { app.isQuitting = true; app.quit(); },
    },
  ]);

  tray.setToolTip(`MeM v${APP_VERSION}`);
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show());
}

// ─── Boot ───────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  log(`=== MeM v${APP_VERSION} Starting ===`);
  try {
    const url = await startNextJs();
    createAppMenu();
    createWindow(url);
    createTray();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow(url);
    });
  } catch (err) {
    log(`FATAL: ${err.stack || err.message}`);
    dialog.showErrorBox(
      'MeM — Startup Failed',
      `${err.message}\n\nLog: ${logFile}`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => { /* keep in tray */ });

app.on('before-quit', () => {
  if (nextServer) {
    try { nextServer.close(); } catch (_) {}
  }
});
