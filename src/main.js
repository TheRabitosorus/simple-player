const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');
const spotifyAuth = require('./spotifyAuth');

const store = new Store({
  defaults: {
    windowBounds: { width: 480, height: 760, x: undefined, y: undefined },
    windowMaximized: false,
    launchAtStartup: false
  }
});

let mainWindow = null;
let tray = null;
let isQuitting = false;

function getIconPath() {
  // build/icon.ico is the multi-size Windows icon; used for the window
  // and, at a smaller fixed size, for the tray.
  return path.join(__dirname, '..', 'build', 'icon.ico');
}

function createWindow() {
  const bounds = store.get('windowBounds');

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 340,
    minHeight: 520,
    icon: getIconPath(),
    backgroundColor: '#0b0d0f',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  if (store.get('windowMaximized')) {
    mainWindow.maximize();
  }

  // Persist window position/size/maximized state as the user moves,
  // resizes, or closes the window, so it reopens exactly where it was.
  const saveBounds = () => {
    if (!mainWindow || mainWindow.isMaximized() || mainWindow.isMinimized()) return;
    store.set('windowBounds', mainWindow.getBounds());
  };
  mainWindow.on('resize', saveBounds);
  mainWindow.on('move', saveBounds);
  mainWindow.on('maximize', () => store.set('windowMaximized', true));
  mainWindow.on('unmaximize', () => store.set('windowMaximized', false));

  // Minimize to tray instead of the taskbar, and keep running when the
  // window is closed via the X button (only Quit from the tray menu exits).
  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    } else {
      saveBounds();
    }
  });

  // In-window keyboard shortcuts, active only while this window has focus
  // (never registered as OS-wide globalShortcut media keys).
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === ' ') {
      mainWindow.webContents.send('shortcut:toggle-play');
      event.preventDefault();
    } else if (input.key === 'ArrowLeft') {
      mainWindow.webContents.send('shortcut:previous-track');
      event.preventDefault();
    } else if (input.key === 'ArrowRight') {
      mainWindow.webContents.send('shortcut:next-track');
      event.preventDefault();
    }
  });
}

function createTray() {
  const trayIconPath = path.join(__dirname, '..', 'build', 'icon_tray.png');
  const icon = nativeImage.createFromPath(trayIconPath).resize({ width: 32, height: 32 });
  tray = new Tray(icon);
  tray.setToolTip('Simple Player');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Afficher Simple Player',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    { type: 'separator' },
    {
      label: 'Quitter',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function setLaunchAtStartup(enabled) {
  store.set('launchAtStartup', enabled);
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: process.execPath
  });
}

ipcMain.handle('settings:get-launch-at-startup', () => store.get('launchAtStartup'));
ipcMain.handle('settings:set-launch-at-startup', (event, enabled) => {
  setLaunchAtStartup(enabled);
  return store.get('launchAtStartup');
});

// --- Spotify connection, driven from the Settings page ---
ipcMain.handle('spotify:get-status', () => spotifyAuth.isConnected());
ipcMain.handle('spotify:connect', async () => {
  try {
    await spotifyAuth.startLogin();
    return { connected: true };
  } catch (err) {
    return { connected: false, error: err.message };
  }
});
ipcMain.handle('spotify:disconnect', () => {
  spotifyAuth.disconnect();
  return { connected: false };
});

app.whenReady().then(() => {
  createWindow();
  createTray();

  // Apply the stored startup preference on every launch, in case the
  // user's Windows account settings were reset outside the app.
  setLaunchAtStartup(store.get('launchAtStartup'));

  // Check for a new version every time the app is opened (not on a timer).
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {
      // Silent failure (e.g. offline): the user can keep using the current version.
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  // Tray keeps the app alive on Windows/Linux; macOS convention would
  // normally quit here too, but this app is Windows-only.
  if (process.platform !== 'darwin') {
    // no-op: closing to tray means we never actually reach "all closed"
    // unless the user explicitly quit via the tray menu.
  }
});
