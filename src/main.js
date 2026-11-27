const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog, screen, shell } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn, execFile, execFileSync } = require('child_process');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');
const spotifyAuth = require('./spotifyAuth');
const localMusic = require('./localMusic');
const log = require('./log');
const { pathToFileURL } = require('url');

// IMPORTANT: pin the app name before anything reads app.getPath('userData').
// Without this, Electron derives the name (and therefore where settings are
// stored) from package.json's "name" field when running unpacked (npm start/
// run.bat) but from "productName" when running the installed build — two
// different folders under %APPDATA%. That mismatch is why window position,
// zoom, and other settings looked like they weren't being saved: each launch
// method was reading/writing its own separate file. Pinning the name here
// makes both launch methods always use the same folder.
app.setName('Simple Player');

// Everything the user sees (including Chromium's own menus) is English,
// whatever the Windows display language is.
app.commandLine.appendSwitch('lang', 'en-US');

// Prevent a second copy of the app from ever running at the same time.
// Closing the window via the X button only hides it to the tray (by
// design — see the 'close' handler below) rather than quitting, so
// without this lock, launching Simple Player again while it's already
// running hidden in the tray would start a SECOND, independent process —
// each with its own window, each reading/writing the same settings file,
// stepping on each other's saved window position. This is very likely
// why the window position looked like it kept "resetting": an old,
// still-running hidden copy periodically overwriting what a newer one
// just saved. With the lock, a second launch attempt just brings the
// existing window to the front instead of starting a new instance.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
  return;
}
app.on('second-instance', () => showMainWindow());

const store = new Store({
  defaults: {
    windowBounds: { width: 480, height: 760, x: undefined, y: undefined },
    windowMaximized: false,
    launchAtStartup: false,
    zoomFactor: 1.6,
    ghostSpotifyEnabled: true,
    ghostDefaultOnApplied: false,
    spotifyExePath: null
  }
});

const ZOOM_MIN = 0.7;
const ZOOM_MAX = 2.2;
const ZOOM_STEP = 0.1;

function clampZoom(z) {
  const n = Number(z);
  if (!Number.isFinite(n)) return 1.0; // ignore garbage coming over IPC
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(n * 100) / 100));
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

// False while the user is typing in a text field (the search box): then
// Space and the arrow keys must reach the field, not control playback.
let playbackShortcutsEnabled = true;
ipcMain.handle('shortcuts:set-enabled', (event, enabled) => {
  playbackShortcutsEnabled = !!enabled;
  return playbackShortcutsEnabled;
});

let mainWindow = null;
let tray = null;
let isQuitting = false;

function getIconPath() {
  // build/icon.ico is the multi-size Windows icon; used for the window
  // and, at a smaller fixed size, for the tray.
  return path.join(__dirname, '..', 'build', 'icon.ico');
}

// Module-level (not just a local inside createWindow) so the explicit
// "Save position now" / "Restore saved position" Settings buttons can
// call it too, not only the automatic resize/move/close listeners.
function saveBounds() {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isMaximized() || mainWindow.isMinimized()) return;
  // Full screen (F11, or the immersive mode which switches to it by itself)
  // is not a size to remember: saving it made the window reopen as large as
  // the whole screen the next time.
  if (mainWindow.isFullScreen()) return;
  store.set('windowBounds', mainWindow.getBounds());
}

// resize/move fire dozens of times per second while dragging; writing the
// settings file on every one is wasteful. Debounce those, but keep the
// immediate saveBounds() for close/quit/explicit-save.
let saveBoundsTimer = null;
function saveBoundsSoon() {
  clearTimeout(saveBoundsTimer);
  saveBoundsTimer = setTimeout(saveBounds, 300);
}

// A saved position can end up off-screen if a monitor was unplugged or the
// resolution changed. Only reuse x/y if the window would still be visible.
function isPositionVisible(b) {
  if (typeof b.x !== 'number' || typeof b.y !== 'number') return false;
  return screen.getAllDisplays().some((d) => {
    const a = d.workArea;
    return b.x + 80 < a.x + a.width && b.x + b.width - 80 > a.x &&
           b.y < a.y + a.height - 40 && b.y + 40 > a.y;
  });
}

function createWindow() {
  const bounds = store.get('windowBounds');
  const useSavedPosition = isPositionVisible(bounds);

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    // undefined x/y => Electron centers the window.
    x: useSavedPosition ? bounds.x : undefined,
    y: useSavedPosition ? bounds.y : undefined,
    minWidth: 340,
    minHeight: 520,
    icon: getIconPath(),
    backgroundColor: '#0b0d0f',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Local files: let the next track start by itself (no click needed).
      autoplayPolicy: 'no-user-gesture-required'
    }
  });

  // The UI is a single local page; it never needs to open new windows or
  // navigate away. Block both so injected content can't load remote pages
  // inside a window that has access to the preload API. Real http(s) links
  // (if any) open in the user's browser instead.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.webContents.setZoomFactor(store.get('zoomFactor'));
  // Applied again once the page is really there: a zoom set before the page
  // has loaded is not guaranteed to stick.
  mainWindow.webContents.on('did-finish-load', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.setZoomFactor(clampZoom(store.get('zoomFactor')));
    }
  });

  // Show the app name + version in the real window title, since the
  // in-page title bar no longer shows a visible "Simple Player" label.
  // Electron normally syncs the window title to the loaded page's
  // <title> on every navigation, which would overwrite this — so this
  // intercepts that and keeps our own text instead.
  const windowTitle = 'Simple Player v' + app.getVersion();
  mainWindow.setTitle(windowTitle);
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
    mainWindow.setTitle(windowTitle);
  });

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
  // (saveBounds is the module-level function declared above.)
  mainWindow.on('resize', saveBoundsSoon);
  // Renderer console errors/warnings go to the log too (level 3 = error).
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (event && typeof event === 'object' && event.level !== undefined) { // newer Electron: details object
      level = event.level; message = event.message; line = event.lineNumber;
    }
    if (level === 3 || level === 'error') log.error('renderer: ' + message + ' (line ' + line + ')');
  });
  mainWindow.on('move', saveBoundsSoon);
  mainWindow.on('maximize', () => store.set('windowMaximized', true));
  mainWindow.on('unmaximize', () => store.set('windowMaximized', false));

  // Minimize goes to the taskbar normally. Closing the window with the X
  // button quits the app (see below).
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      // X button = real quit (pause Spotify + kill Ghost), not hide-to-tray.
      event.preventDefault();
      isQuitting = true;
      app.quit();
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
    if (input.key === 'F11') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
      return;
    }
    if (!playbackShortcutsEnabled) return; // typing: let Space / arrows through to the text field
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

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createTray() {
  const trayIconPath = path.join(__dirname, '..', 'build', 'icon_tray.png');
  let icon = nativeImage.createFromPath(trayIconPath);
  // Fall back to the main icon rather than showing an empty tray slot.
  if (icon.isEmpty()) icon = nativeImage.createFromPath(getIconPath());
  if (!icon.isEmpty()) icon = icon.resize({ width: 32, height: 32 });
  tray = new Tray(icon);
  tray.setToolTip('Simple Player');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Simple Player',
      click: showMainWindow
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
      mainWindow.hide();
    } else {
      showMainWindow();
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
// together with Simple Player. Windows-only; works with the classic
// installer (Spotify.exe) and the Microsoft Store version (started through
// the spotify: link). On by default (since v1.14.3).
let ghostLaunched = false; // true only if WE started Spotify this session

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
// a Spotify.exe process. Spotify can take a few seconds to show its
// window after launch, and may replace it (e.g. after its own
// auto-update check), so the caller retries this a couple of times.
function hideSpotifyWindows() {
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
    // By process name (not a single pid) so it works for the Microsoft Store
    // version too, which we start through Windows rather than spawn directly.
    '$targetPids = @(Get-Process -Name Spotify -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })',
    '[SPWin32]::EnumWindows({',
    '  param($hWnd, $lParam)',
    '  $procId = 0',
    '  [void][SPWin32]::GetWindowThreadProcessId($hWnd, [ref]$procId)',
    '  if ($targetPids -contains $procId -and [SPWin32]::IsWindowVisible($hWnd)) {',
    '    [void][SPWin32]::ShowWindow($hWnd, 0)',
    '  }',
    '  return $true',
    '}, [IntPtr]::Zero) | Out-Null'
  ].join('\n');
  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', script], { windowsHide: true }, () => {
    // Best-effort only: if this fails (PowerShell blocked, API shape
    // changed by a Windows/Spotify update, etc.) Spotify just stays
    // visible/minimized instead of fully hidden — not a crash.
  });
}

// Fast hider: one short-lived PowerShell that, for `seconds`, checks every
// 200 ms whether any Spotify process has a visible main window and hides it.
// Started BEFORE Spotify is launched, so the window is gone almost as soon as
// it appears (the timed calls above only fire at 3 s, 6 s, ...). It uses
// Process.MainWindowHandle (no window enumeration), so it stays cheap, and it
// exits by itself. The timed calls above stay as a fallback.
let hiderProc = null;
function watchAndHideSpotify(seconds) {
  if (process.platform !== 'win32') return;
  try { if (hiderProc) hiderProc.kill(); } catch (err) {}
  const script = [
    'Add-Type @"',
    'using System;',
    'using System.Runtime.InteropServices;',
    'public class SPHide {',
    '  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);',
    '}',
    '"@',
    // Fast (200 ms) for the first `seconds`, then every second for as long as Simple Player
    // lives: Spotify may bring its window (and its taskbar icon) back later on its own.
    // It ends by itself if Simple Player is gone (crash), so it can never be left behind.
    '$fastEnd = (Get-Date).AddSeconds(' + Math.max(5, Math.floor(seconds)) + ')',
    '$parent = ' + process.pid,
    '$n = 0',
    'while ($true) {',
    '  Get-Process -Name Spotify -ErrorAction SilentlyContinue | ForEach-Object {',
    '    if ($_.MainWindowHandle -ne [IntPtr]::Zero) { [void][SPHide]::ShowWindow($_.MainWindowHandle, 0) }',
    '  }',
    '  if ((Get-Date) -lt $fastEnd) { Start-Sleep -Milliseconds 200 }',
    '  else {',
    '    Start-Sleep -Milliseconds 1000',
    '    $n++',
    '    if ($n % 5 -eq 0 -and -not (Get-Process -Id $parent -ErrorAction SilentlyContinue)) { break }',
    '  }',
    '}'
  ].join('\n');
  hiderProc = execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', script], { windowsHide: true }, () => {
    hiderProc = null;
    // Best-effort: if it fails, the timed fallback above still hides the window.
  });
}

// True if a Spotify.exe process is already running (the user's own, or one
// we launched). Launching a second copy would just pop the existing window
// to the front instead of starting anything, so we skip it.
function isSpotifyRunning() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve(false);
    execFile('tasklist', ['/FI', 'IMAGENAME eq Spotify.exe', '/NH'], (err, stdout) => {
      resolve(!err && /Spotify\.exe/i.test(String(stdout)));
    });
  });
}

async function launchGhostSpotify() {
  if (process.platform !== 'win32') return;
  if (ghostLaunched) {
    // Launched earlier this session. If the user has since closed it (from its taskbar icon, say),
    // it is gone: start a fresh one instead of waiting for a device that will never come back.
    if (await isSpotifyRunning()) return;
    log.info('ghost: Spotify was closed, starting it again');
    ghostLaunched = false;
    ghostKillDone = false;
  }
  if (await isSpotifyRunning()) {
    // Already up: its Connect device will show by itself. If WE started it in
    // an earlier session that ended abnormally (crash, killed from the Task
    // Manager), it is an orphan: take ownership again so it gets hidden and
    // closed with the app. Otherwise it is the user's own Spotify: hands off.
    if (store.get('ghostOwned')) {
      ghostLaunched = true;
      ghostKillDone = false;
      log.info('ghost: adopted a Spotify left over from a previous session');
      watchAndHideSpotify(30);
    } else {
      log.info('ghost: Spotify already running (not ours), left untouched');
    }
    return;
  }
  if (ghostLaunched) return; // another call won the race while we checked
  ghostLaunched = true;
  store.set('ghostOwned', true); // survives a crash, so the next launch can clean up
  log.info('ghost: launching Spotify');
  try {
    ghostKillDone = false;
    watchAndHideSpotify(90); // catches the window the moment Spotify shows it
    const exe = resolveSpotifyExePath();
    if (exe) {
      // Classic installer: start Spotify.exe directly, minimized.
      const child = spawn(exe, ['--minimized'], { detached: true, stdio: 'ignore', windowsHide: true });
      child.on('error', () => {});
      child.unref();
    } else {
      // No Spotify.exe found (e.g. the Microsoft Store version, which lives in
      // a protected folder): let Windows start whichever Spotify handles the
      // spotify: link. Works for both kinds of install.
      await shell.openExternal('spotify:');
    }
    // Spotify takes a moment to show its window (and may briefly show a
    // login/update screen first), so try hiding it a few times.
    [3000, 6000, 10000, 15000].forEach((delay) => {
      setTimeout(() => { if (ghostLaunched) hideSpotifyWindows(); }, delay);
    });
  } catch (err) {
    ghostLaunched = false;
    store.set('ghostOwned', false);
    log.error('ghost: launch failed', err);
    // Silent: the renderer's "Starting Spotify..." wait then times out and
    // the user gets a clear message.
  }
}

let ghostKillDone = false;
function killGhostSpotifyIfAny() {
  const wasOurs = ghostLaunched;
  ghostLaunched = false;
  if (ghostKillDone) return; // already cleaned up (called from several quit paths)
  ghostKillDone = true;
  // Kill Spotify whenever Ghost is enabled — whether we launched it this
  // session or it was already running. This ensures music stops on quit.
  // Stop our own PowerShell helpers first (window hider).
  try { if (hiderProc) hiderProc.kill(); } catch (err) {}
  hiderProc = null;
  if (!store.get('ghostSpotifyEnabled')) return;
  if (process.platform !== 'win32') return;
  // Only close a Spotify that WE started. The user's own Spotify (opened
  // before Simple Player) is left alone; playback on it is paused through
  // the Spotify API by the quit sequence.
  if (!wasOurs) { log.info('ghost: Spotify not started by us, not closing it'); return; }
  // SYNCHRONOUS on purpose: the app is about to exit, and a fire-and-forget
  // taskkill can be lost if we exit before it has finished. /T also kills
  // Spotify's child processes (renderer, GPU, crashpad...). Exit code 128
  // just means "no Spotify.exe running", which is fine.
  try {
    execFileSync('taskkill', ['/IM', 'Spotify.exe', '/T', '/F'], { stdio: 'ignore', windowsHide: true, timeout: 5000 });
    log.info('ghost: Spotify processes stopped');
    store.set('ghostOwned', false);
  } catch (err) { /* nothing to kill (exit code 128), or already gone */
    store.set('ghostOwned', false);
  }
}

ipcMain.handle('update:install', () => {
  quitSignalSent = true; // skip the pause-before-quit dance
  autoUpdater.quitAndInstall();
});

// Explicit, manual fallback for the position/size memory above — a
// tangible "do it now" control in Settings in case the automatic
// save-on-move/resize ever doesn't fire for some reason.
ipcMain.handle('window:save-position-now', () => {
  saveBounds();
  return true;
});
ipcMain.handle('window:restore-saved-position', () => {
  const bounds = store.get('windowBounds');
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isFullScreen()) mainWindow.setFullScreen(false);
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    if (isPositionVisible(bounds)) {
      mainWindow.setBounds({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
    } else {
      // Nothing saved yet, or the saved spot is off-screen (monitor
      // unplugged): apply the saved size and center the window.
      mainWindow.setSize(bounds.width, bounds.height);
      mainWindow.center();
    }
  }
  return true;
});


// --- Windows master volume -------------------------------------------------
// The volume bars control the computer's own (Windows) volume, not just
// Spotify's. Electron has no API for that, so a small PowerShell helper stays
// running in the background and talks to the Windows Core Audio API; commands
// are sent to it as text lines ("get" / "set 45"). Started on first use,
// stopped when the app quits. Windows only; elsewhere the renderer falls back
// to Spotify's own volume.
const VOLUME_PS_SCRIPT = `
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int f(); int g(); int h(); int i();
  int SetMasterVolumeLevelScalar(float fLevel, Guid pguidEventContext);
  int j();
  int GetMasterVolumeLevelScalar(out float pfLevel);
  int k(); int l(); int m(); int n();
  int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, Guid pguidEventContext);
  int GetMute(out bool pbMute);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice { int Activate(ref Guid id, int clsCtx, int activationParams, out IAudioEndpointVolume aev); }
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator { int f(); int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint); }
[ComImport, Guid("BCDE0395-E52F-49B1-8B6B-A0C0AF5C1B5F")] class MMDeviceEnumeratorComObject { }
public class SPAudio {
  static IAudioEndpointVolume Vol() {
    var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
    IMMDevice dev = null;
    Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(0, 1, out dev));
    IAudioEndpointVolume epv = null;
    var epvid = typeof(IAudioEndpointVolume).GUID;
    Marshal.ThrowExceptionForHR(dev.Activate(ref epvid, 23, 0, out epv));
    return epv;
  }
  public static int Get() { float v = -1; Marshal.ThrowExceptionForHR(Vol().GetMasterVolumeLevelScalar(out v)); return (int)Math.Round(v * 100); }
  public static void Set(int percent) {
    var e = Vol();
    e.SetMasterVolumeLevelScalar(percent / 100f, Guid.Empty);
    if (percent > 0) e.SetMute(false, Guid.Empty);
  }
}
'@
[Console]::Out.WriteLine('READY')
while (($line = [Console]::In.ReadLine()) -ne $null) {
  try {
    if ($line -eq 'get') { [Console]::Out.WriteLine('V ' + [SPAudio]::Get()) }
    elseif ($line -like 'set *') { [SPAudio]::Set([int]$line.Substring(4)) }
  } catch { if ($line -eq 'get') { [Console]::Out.WriteLine('E ' + $_.Exception.Message) } }
}
`;

let volHelper = null;
let volGetWaiters = []; // resolvers waiting for the next "V n" line

function startVolumeHelper() {
  if (volHelper || process.platform !== 'win32') return volHelper;
  const encoded = Buffer.from(VOLUME_PS_SCRIPT, 'utf16le').toString('base64');
  const child = spawn('powershell.exe',
    ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', encoded],
    { stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true });
  let buffer = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    let nl;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line.startsWith('V ')) {
        const waiter = volGetWaiters.shift();
        if (waiter) waiter(parseInt(line.slice(2), 10));
      } else if (line.startsWith('E ')) {
        const waiter = volGetWaiters.shift();
        if (waiter) waiter(null);
      }
    }
  });
  child.stdin.on('error', () => {});
  child.on('error', () => { volHelper = null; });
  child.on('exit', () => {
    volHelper = null;
    volGetWaiters.splice(0).forEach((w) => w(null));
  });
  volHelper = child;
  return child;
}

function stopVolumeHelper() {
  if (volHelper) { try { volHelper.kill(); } catch (err) {} volHelper = null; }
}

ipcMain.handle('volume:is-supported', () => process.platform === 'win32');
ipcMain.handle('volume:get', () => new Promise((resolve) => {
  const h = startVolumeHelper();
  if (!h) return resolve(null);
  const timer = setTimeout(() => resolve(null), 8000); // first call compiles the helper: allow time
  volGetWaiters.push((v) => { clearTimeout(timer); resolve(Number.isFinite(v) ? v : null); });
  h.stdin.write('get\n');
}));
ipcMain.handle('volume:set', (event, percent) => {
  const n = Math.round(Number(percent));
  if (!Number.isFinite(n)) return false;
  const h = startVolumeHelper();
  if (!h) return false;
  h.stdin.write('set ' + Math.min(100, Math.max(0, n)) + '\n');
  return true;
});

// --- Local music files ---------------------------------------------------------
// The "Local" tab plays files stored on this computer. This side finds the
// files (file / folder pickers, or paths dropped on the window), reads their
// tags (see localMusic.js) and remembers the list between launches in its own
// settings file. The window plays them itself through file:// URLs.
const localStore = new Store({ name: 'local-library', defaults: { tracks: [] } });

function localTracksForRenderer() {
  return localStore.get('tracks').map((t) => Object.assign({}, t, { url: pathToFileURL(t.path).href }));
}

let localBusy = Promise.resolve(); // one scan at a time, in order
function addLocalPaths(paths) {
  const run = async () => {
    const list = Array.isArray(paths) ? paths.filter((p) => typeof p === 'string' && p) : [];
    const { files, truncated } = await localMusic.scan(list);
    const existing = localStore.get('tracks');
    const known = new Set(existing.map((t) => t.path));
    const fresh = files.filter((f) => !known.has(f));
    const added = await localMusic.readTracks(fresh, (done, total) => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('local:progress', done, total);
    });
    if (added.length) localStore.set('tracks', localMusic.sortTracks(existing.concat(added)));
    return { tracks: localTracksForRenderer(), found: files.length, added: added.length, truncated };
  };
  const result = localBusy.then(run, run);
  localBusy = result.catch(() => {});
  return result;
}

ipcMain.handle('local:get-library', () => localTracksForRenderer());
ipcMain.handle('local:add-paths', (event, paths) => addLocalPaths(paths));
ipcMain.handle('local:pick-files', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Add audio files',
    filters: [
      { name: 'Audio', extensions: localMusic.AUDIO_EXT.map((e) => e.slice(1)) },
      { name: 'All files', extensions: ['*'] }
    ],
    properties: ['openFile', 'multiSelections']
  });
  if (res.canceled || !res.filePaths.length) return null;
  return addLocalPaths(res.filePaths);
});
ipcMain.handle('local:pick-folder', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Add a music folder',
    properties: ['openDirectory', 'multiSelections']
  });
  if (res.canceled || !res.filePaths.length) return null;
  return addLocalPaths(res.filePaths);
});
ipcMain.handle('local:clear', () => {
  localStore.set('tracks', []);
  localCoverCache.clear();
  return [];
});

// Cover of a track of the list, as a small JPEG data: URL ('thumb' for the
// list, 'full' for the Now Playing screen). Embedded covers can weigh several
// megabytes, so they are always scaled down here before crossing to the window.
const localCoverCache = new Map(); // "size|folder|album" -> data URL or null
ipcMain.handle('local:cover', async (event, filePath, size) => {
  const track = localStore.get('tracks').find((t) => t.path === filePath);
  if (!track) return null; // only files the user added
  const full = size === 'full';
  const key = (full ? 'full|' : 'thumb|') + path.dirname(filePath) + '|' + track.album; // one cover per album folder
  if (localCoverCache.has(key)) return localCoverCache.get(key);
  let url = null;
  try {
    const cover = await localMusic.readCover(filePath);
    if (cover) {
      let img = nativeImage.createFromBuffer(cover.data);
      if (!img.isEmpty()) {
        const max = full ? 1000 : 240;
        const s = img.getSize();
        if (s.width > max || s.height > max) {
          img = s.width >= s.height ? img.resize({ width: max, quality: 'best' }) : img.resize({ height: max, quality: 'best' });
        }
        url = 'data:image/jpeg;base64,' + img.toJPEG(full ? 90 : 82).toString('base64');
      }
    }
  } catch (err) { url = null; }
  if (localCoverCache.size > (full ? 400 : 4000)) localCoverCache.clear();
  localCoverCache.set(key, url);
  return url;
});

ipcMain.handle('display:get-zoom-factor', () => store.get('zoomFactor'));
ipcMain.handle('display:set-zoom-factor', (event, factor) => setZoomFactor(factor));

ipcMain.handle('window:set-fullscreen', (event, value) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setFullScreen(!!value);
  }
});
ipcMain.handle('window:is-fullscreen', () => {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow.isFullScreen() : false;
});

ipcMain.handle('settings:get-launch-at-startup', () => store.get('launchAtStartup'));
ipcMain.handle('settings:set-launch-at-startup', (event, enabled) => {
  setLaunchAtStartup(!!enabled);
  return store.get('launchAtStartup');
});

// --- Spotify connection, driven from the Settings page ---
ipcMain.handle('spotify:get-status', () => spotifyAuth.isConnected());
ipcMain.handle('spotify:connect', async () => {
  try {
    await spotifyAuth.startLogin();
    return { connected: true };
  } catch (err) {
    log.error('spotify: sign-in failed', err);
    return { connected: false, error: friendlySignInError(err) };
  }
});
// Plain-language text for the Settings page; the raw technical detail goes to the log file.
function friendlySignInError(err) {
  const m = String((err && err.message) || '');
  if (/timed out/i.test(m)) return 'Sign-in took too long (5 minutes). Press Connect again and finish signing in in your browser.';
  if (/access_denied|cancel/i.test(m)) return 'Sign-in was cancelled. Press Connect to try again.';
  if (/state mismatch/i.test(m)) return 'The sign-in response did not match this attempt. Press Connect and use the new browser tab that opens.';
  if (/Token exchange failed/i.test(m)) return 'Spotify did not accept the sign-in. Try again; if it keeps failing, open the log file in Settings (Diagnostics).';
  if (/EADDRINUSE/i.test(m)) return 'Another program is using the port needed for sign-in. Close other copies of Simple Player and try again.';
  if (/fetch failed|ENOTFOUND|ECONN|network/i.test(m)) return 'Could not reach Spotify. Check your internet connection and try again.';
  return 'Sign-in failed. Try again; if it keeps failing, open the log file in Settings (Diagnostics).';
}
ipcMain.handle('spotify:disconnect', () => {
  spotifyAuth.disconnect();
  return { connected: false };
});
ipcMain.handle('spotify:get-access-token', async () => {
  // Used by the renderer to call the Spotify Web API directly (player
  // state, library, playlists, search). Throws 'REAUTH_REQUIRED: ...' if the
  // stored refresh token is no longer valid.
  return spotifyAuth.getValidAccessToken();
});

// --- Ghost Spotify settings + trigger, driven from Settings and from
// the renderer's NO_ACTIVE_DEVICE handling ---
ipcMain.handle('ghost:get-settings', () => ({
  enabled: store.get('ghostSpotifyEnabled'),
  exePath: resolveSpotifyExePath(), // null is fine: the Store version is started via the spotify: link
  platformSupported: process.platform === 'win32',
  // Spotify's desktop app names its Connect device after the computer.
  computerName: os.hostname()
}));
ipcMain.handle('ghost:set-enabled', (event, enabled) => {
  store.set('ghostSpotifyEnabled', !!enabled);
  return !!enabled;
});
ipcMain.handle('ghost:pick-exe', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Spotify.exe',
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
// The hidden Spotify is running but never shows up as a playback device (it got stuck, or was left
// half-closed by hand): close OUR copy and start a clean one. Never touches a Spotify we did not start.
let ghostRestartAt = 0;
ipcMain.handle('ghost:restart', async () => {
  if (!store.get('ghostSpotifyEnabled') || process.platform !== 'win32') return false;
  if (!ghostLaunched && !store.get('ghostOwned')) return false;
  if (Date.now() - ghostRestartAt < 30000) return false; // at most once every 30 s
  ghostRestartAt = Date.now();
  log.info('ghost: no playback device, restarting our Spotify');
  try { if (hiderProc) hiderProc.kill(); } catch (err) {}
  hiderProc = null;
  try { execFileSync('taskkill', ['/IM', 'Spotify.exe', '/T', '/F'], { stdio: 'ignore', windowsHide: true, timeout: 5000 }); } catch (err) {}
  await new Promise((r) => setTimeout(r, 1500));
  ghostLaunched = false;
  ghostKillDone = false;
  await launchGhostSpotify();
  return true;
});

// Disable Windows Communications Ducking (the feature that lowers all other
// app volumes when a phone call / Teams / Discord is active). Writes one
// registry value to HKCU — non-destructive, per-user, reversible. Without
// this, the Windows audio engine can randomly drop the master volume to 20%
// and restore it a few seconds later, making the volume bar appear to jump
// on its own every time any communication app opens an audio session.
// Registry key: HKCU\SOFTWARE\Microsoft\Multimedia\Audio
//   UserDuckingPreference = 3  (0=duck-all  1=80%  2=mute-all  3=do-nothing)
function disableWindowsCommunicationsDucking() {
  if (process.platform !== 'win32') return;
  try {
    execFile('reg', [
      'add',
      'HKCU\\SOFTWARE\\Microsoft\\Multimedia\\Audio',
      '/v', 'UserDuckingPreference',
      '/t', 'REG_DWORD',
      '/d', '3',
      '/f'
    ], { windowsHide: true }, () => {});
  } catch (err) {
    // Non-critical — ignore if reg.exe is unavailable
  }
}

app.whenReady().then(() => {
  // Disable Windows audio ducking so volume never drops unexpectedly when
  // communication apps (Teams, Discord, etc.) open an audio session.
  disableWindowsCommunicationsDucking();

  // One-time migration: Ghost Spotify became ON by default in v1.14.3. A
  // `false` already written to the settings file by an older version is just
  // the old default (the toggle never worked before), so switch it on once.
  // After that, the user's own choice is always respected.
  if (!store.get('ghostDefaultOnApplied')) {
    store.set('ghostSpotifyEnabled', true);
    store.set('ghostDefaultOnApplied', true);
  }

  createWindow();
  createTray();

  // Apply the stored startup preference on every launch, in case the
  // user's Windows account settings were reset outside the app.
  setLaunchAtStartup(store.get('launchAtStartup'));

  // Auto-updater: check on launch, download silently, prompt the user when ready.
  if (app.isPackaged) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on('checking-for-update', () => log.info('update: checking (current ' + app.getVersion() + ')'));
    autoUpdater.on('update-available', (info) => log.info('update: available ' + info.version));
    autoUpdater.on('update-not-available', () => log.info('update: none available'));
    autoUpdater.on('error', (err) => log.error('update: error', err));
    autoUpdater.on('update-downloaded', (info) => {
      log.info('update: downloaded ' + info.version);
      // Tell the renderer a new version is ready — it will show the prompt.
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update:ready', info.version);
      }
    });

    // The app can stay open for days (tray), so also look again every 6 hours.
    let updateReady = false;
    autoUpdater.on('update-downloaded', () => { updateReady = true; });
    setInterval(() => {
      if (updateReady) return;
      autoUpdater.checkForUpdates().catch((err) => log.warn('update: periodic check failed', err));
    }, 6 * 60 * 60 * 1000).unref();

    autoUpdater.checkForUpdates().catch((err) => {
      // Not shown to the user (offline, GitHub unreachable...), but logged.
      log.warn('update: check failed', err);
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Tracks whether we already sent the quit signal to the renderer to avoid
// re-entrant calls (before-quit fires once but we replace it with a delayed
// re-emit, so we guard with this flag).
let quitSignalSent = false;

app.on('before-quit', (event) => {
  // Belt-and-suspenders: save the current bounds here too, in case the
  // window is torn down by this quit sequence before its own 'close'
  // handler gets a clean chance to run (e.g. Windows session logoff/shutdown).
  clearTimeout(saveBoundsTimer);
  saveBounds();

  if (!quitSignalSent && mainWindow && !mainWindow.isDestroyed()) {
    // First pass: tell the renderer to pause Spotify, then re-emit quit
    // after a short delay so the pause request has time to reach the server.
    // We wait 1200 ms before killing Ghost Spotify so the API pause call
    // can complete before the local Spotify process is torn down.
    event.preventDefault();
    quitSignalSent = true;
    isQuitting = true;
    mainWindow.webContents.send('app:will-quit');
    // Watchdog: if anything stalls the normal quit (hung renderer, blocked
    // handler), clean up and force the process to end after 6 s.
    setTimeout(() => {
      try { stopVolumeHelper(); killGhostSpotifyIfAny(); } catch (e) {}
      app.exit(0);
    }, 6000).unref();
    setTimeout(() => {
      stopVolumeHelper();
      // Kill Ghost Spotify last, after the pause has had time to land.
      setTimeout(() => {
        killGhostSpotifyIfAny();
        app.quit();
      }, 400);
    }, 800);
    return;
  }

  // Second pass (or no window): proceed normally.
  isQuitting = true;
  killGhostSpotifyIfAny();
  stopVolumeHelper();
});

process.on('uncaughtException', (err) => log.error('uncaughtException', err));
process.on('unhandledRejection', (err) => log.error('unhandledRejection', err));

ipcMain.handle('log:open', async () => {
  const p = log.path();
  try { if (!fs.existsSync(p)) fs.writeFileSync(p, ''); } catch (e) {}
  const err = await shell.openPath(p);
  if (err) { shell.showItemInFolder(p); }
  return true;
});

// Last-resort cleanup on ANY exit path (crash handler, forced exit, logoff):
// the 'exit' event runs synchronously just before the process ends. Both
// helpers are no-ops if already cleaned up.
process.on('exit', () => {
  try { stopVolumeHelper(); } catch (err) {}
  try { killGhostSpotifyIfAny(); } catch (err) {}
});
app.on('will-quit', () => {
  stopVolumeHelper();
  killGhostSpotifyIfAny();
});

// Intentionally no 'window-all-closed' handler: registering one (even an
// empty one) is what stops Electron from quitting when the last window
// closes — and closing the window is meant to quit the app.
