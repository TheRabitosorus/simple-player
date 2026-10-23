const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execFile } = require('child_process');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');
const spotifyAuth = require('./spotifyAuth');

// IMPORTANT: pin the app name before anything reads app.getPath('userData').
// Without this, Electron derives the name (and therefore where settings are
// stored) from package.json's "name" field when running unpacked (npm start/
// run.bat) but from "productName" when running the installed build — two
// different folders under %APPDATA%. That mismatch is why window position,
// zoom, and other settings looked like they weren't being saved: each launch
// method was reading/writing its own separate file. Pinning the name here
// makes both launch methods always use the same folder.
app.setName('Simple Player');

const store = new Store({
  defaults: {
    windowBounds: { width: 480, height: 760, x: undefined, y: undefined },
    windowMaximized: false,
    launchAtStartup: false,
    zoomFactor: 1.6,
    ghostSpotifyEnabled: false,
    spotifyExePath: null
  }
});

const ZOOM_MIN = 0.7;
const ZOOM_MAX = 2.2;
const ZOOM_STEP = 0.1;

function clampZoom(z) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));
}

function setZoomFactor(factor) {
  const clamped = clampZoom(factor);
  store.set('zoomFactor', clamped);
  if (mainWindow) {
    mainWindow.webContents.setZoomFactor(clamped);
    mainWindow.webContents.send('zoom:changed', clamped);
  }
  return clamped;
}

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
  mainWindow.webContents.setZoomFactor(store.get('zoomFactor'));

  if (store.get('windowMaximized')) {
    mainWindow.maximize();
  }

  // Ctrl+molette, comme dans n'importe quelle fenêtre Chromium (Chrome,
  // Edge...). Electron expose directement cet événement — pas besoin de
  // l'intercepter nous-mêmes.
  mainWindow.webContents.on('zoom-changed', (event, zoomDirection) => {
    const current = mainWindow.webContents.getZoomFactor();
    const next = zoomDirection === 'in' ? current + ZOOM_STEP : current - ZOOM_STEP;
    setZoomFactor(next);
  });

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
    if (input.control && (input.key === '=' || input.key === '+')) {
      setZoomFactor(mainWindow.webContents.getZoomFactor() + ZOOM_STEP);
      event.preventDefault();
      return;
    }
    if (input.control && input.key === '-') {
      setZoomFactor(mainWindow.webContents.getZoomFactor() - ZOOM_STEP);
      event.preventDefault();
      return;
    }
    if (input.control && input.key === '0') {
      setZoomFactor(1.0);
      event.preventDefault();
      return;
    }
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

// --- "Ghost Spotify": optionally launch a hidden real Spotify desktop
// client on this machine when no Spotify Connect device anywhere is
// active, so playback always has somewhere to go. This runs the user's
// own, officially-installed Spotify.exe — nothing unofficial or
// reverse-engineered — we just also hide its window and close it
// together with Simple Player. Windows-only; requires the classic
// (non-Microsoft-Store) Spotify installer. Off by default.
let ghostSpotifyPid = null; // only set when WE spawned it this session

function defaultSpotifyExePath() {
  return path.join(process.env.APPDATA || '', 'Spotify', 'Spotify.exe');
}

function resolveSpotifyExePath() {
  const stored = store.get('spotifyExePath');
  if (stored && fs.existsSync(stored)) return stored;
  const def = defaultSpotifyExePath();
  if (fs.existsSync(def)) return def;
  return null;
}

// Best-effort: ask Windows to hide any visible top-level window owned by
// the given process id. Spotify can take a few seconds to show its
// window after launch, and may replace it (e.g. after its own
// auto-update check), so the caller retries this a couple of times.
function hideWindowsOfPid(pid) {
  if (process.platform !== 'win32') return;
  const script = [
    'Add-Type @"',
    'using System;',
    'using System.Runtime.InteropServices;',
    'public class SPWin32 {',
    '  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);',
    '  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);',
    '  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);',
    '  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);',
    '  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);',
    '}',
    '"@',
    `$targetPid = ${Number(pid)}`,
    '[SPWin32]::EnumWindows({',
    '  param($hWnd, $lParam)',
    '  $procId = 0',
    '  [void][SPWin32]::GetWindowThreadProcessId($hWnd, [ref]$procId)',
    '  if ($procId -eq $targetPid -and [SPWin32]::IsWindowVisible($hWnd)) {',
    '    [void][SPWin32]::ShowWindow($hWnd, 0)',
    '  }',
    '  return $true',
    '}, [IntPtr]::Zero) | Out-Null'
  ].join('\n');
  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', script], () => {
    // Best-effort only: if this fails (PowerShell blocked, API shape
    // changed by a Windows/Spotify update, etc.) Spotify just stays
    // visible/minimized instead of fully hidden — not a crash.
  });
}

function launchGhostSpotify() {
  if (ghostSpotifyPid) return; // already launched one this session
  const exe = resolveSpotifyExePath();
  if (!exe) return;
  try {
    const child = spawn(exe, ['--minimized'], { detached: true, stdio: 'ignore' });
    ghostSpotifyPid = child.pid;
    child.unref();
    child.on('exit', () => { ghostSpotifyPid = null; });
    // Spotify takes a moment to show its window (and may briefly show a
    // login/update screen first), so try hiding it a few times.
    [3000, 6000, 10000].forEach((delay) => {
      setTimeout(() => { if (ghostSpotifyPid) hideWindowsOfPid(ghostSpotifyPid); }, delay);
    });
  } catch (err) {
    // Silent: worst case, the user still sees the normal "no active
    // device" message and can open Spotify themselves as before.
  }
}

function killGhostSpotifyIfAny() {
  if (!ghostSpotifyPid) return;
  const pid = ghostSpotifyPid;
  ghostSpotifyPid = null;
  if (process.platform === 'win32') {
    // /T also closes any helper processes Spotify launched under it.
    execFile('taskkill', ['/PID', String(pid), '/T', '/F'], () => {});
  } else {
    try { process.kill(pid); } catch (err) {}
  }
}

ipcMain.handle('display:get-zoom-factor', () => store.get('zoomFactor'));
ipcMain.handle('display:set-zoom-factor', (event, factor) => setZoomFactor(factor));

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
ipcMain.handle('spotify:get-access-token', async () => {
  // Used by the renderer both to init the Web Playback SDK and to call
  // the Web API directly (library, playlists, search).
  return spotifyAuth.getValidAccessToken();
});

// --- Ghost Spotify settings + trigger, driven from Settings and from
// the renderer's NO_ACTIVE_DEVICE handling ---
ipcMain.handle('ghost:get-settings', () => ({
  enabled: store.get('ghostSpotifyEnabled'),
  exePath: resolveSpotifyExePath(),
  platformSupported: process.platform === 'win32'
}));
ipcMain.handle('ghost:set-enabled', (event, enabled) => {
  store.set('ghostSpotifyEnabled', !!enabled);
  return !!enabled;
});
ipcMain.handle('ghost:pick-exe', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Sélectionne Spotify.exe',
    defaultPath: defaultSpotifyExePath(),
    filters: [{ name: 'Spotify', extensions: ['exe'] }],
    properties: ['openFile']
  });
  if (!res.canceled && res.filePaths[0]) {
    store.set('spotifyExePath', res.filePaths[0]);
  }
  return resolveSpotifyExePath();
});
ipcMain.handle('ghost:no-active-device', () => {
  if (store.get('ghostSpotifyEnabled')) launchGhostSpotify();
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
  // Belt-and-suspenders: save the current bounds here too, in case the
  // window is torn down by this quit sequence before its own 'close'
  // handler gets a clean chance to run (e.g. Windows session logoff/shutdown).
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isMaximized() && !mainWindow.isMinimized()) {
    store.set('windowBounds', mainWindow.getBounds());
  }
  // Only closes the Spotify instance Simple Player itself launched this
  // session — never one the user already had open before starting Simple
  // Player.
  killGhostSpotifyIfAny();
});

app.on('window-all-closed', () => {
  // Tray keeps the app alive on Windows/Linux; macOS convention would
  // normally quit here too, but this app is Windows-only.
  if (process.platform !== 'darwin') {
    // no-op: closing to tray means we never actually reach "all closed"
    // unless the user explicitly quit via the tray menu.
  }
});
