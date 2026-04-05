const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');
const next = require('next');
const { createServer } = require('http');

const isDev = !app.isPackaged;
const port = 54321;

let mainWindow;
let tray = null;
let nextServer;

// Configure database path for Next.js
process.env.APP_DATA_PATH = path.join(app.getPath('userData'), 'data');

async function startNextJs() {
  if (isDev) {
    // In dev, Next.js is run via npm run electron:dev using concurrently on port 3000
    // We just need to wait for it (wait-on handles this in package.json script)
    return `http://localhost:${port}`;
  } else {
    // In production, run the Next.js server programmatically on a RANDOM available port
    const dev = false;
    const dir = app.getAppPath(); // Directory containing the packaged app
    const nextApp = next({ dev, dir });
    await nextApp.prepare();
    const handle = nextApp.getRequestHandler();

    nextServer = createServer((req, res) => {
      handle(req, res);
    });
    
    const assignedPort = await new Promise((resolve) => {
      // listen(0) tells the OS to find ANY free port
      nextServer.listen(0, 'localhost', () => {
        const addr = nextServer.address();
        resolve(addr.port);
      });
    });
    
    console.log(`> MeM Production Server running on port: ${assignedPort}`);
    return `http://localhost:${assignedPort}`;
  }
}

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL(url);

  // Minimizing to tray behavior instead of closing
  mainWindow.on('close', function (event) {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

function createTray() {
  // Use .png for Tray icon which is fine for electron across platforms. 
  // (In Windows ideally .ico, but .png usually works for tray too).
  tray = new Tray(path.join(__dirname, '../public/icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: function () { mainWindow.show(); } },
    { type: 'separator' },
    { label: 'Exit / Close App', click: function () { 
        app.isQuitting = true;
        app.quit();
      } 
    }
  ]);
  
  tray.setToolTip('MeM');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

app.whenReady().then(async () => {
  const url = await startNextJs();
  createWindow(url);
  createTray();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(url);
  });
});

app.on('window-all-closed', function () {
  // We don't quit on window close, it's captured by mainWindow.on('close')
  // But just in case, on non-macOS we do this usually. We'll leave it empty to keep running in tray.
});
