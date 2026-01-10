
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Prevent garbage collection
let mainWindow;

// --- POS Requirement: Single Instance Lock ---
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: "VinERP POS",
    icon: path.join(__dirname, '../public/icon.ico'), 
    webPreferences: {
      nodeIntegration: false, // Security: Disable nodeIntegration
      contextIsolation: true, // Security: Enable contextIsolation
      preload: path.join(__dirname, 'preload.js'), // Use preload script
      devTools: !app.isPackaged // Only enable devTools in development
    },
    autoHideMenuBar: true, // Hides the File/Edit menu
    frame: true, 
  });

  // POS Experience: Maximize on start
  mainWindow.maximize();

  // Remove the application menu completely
  Menu.setApplicationMenu(null);

  // In development, load from Vite server. In production, load from built file.
  const isDev = !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools(); 
  } else {
    // Robust path for production build
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
