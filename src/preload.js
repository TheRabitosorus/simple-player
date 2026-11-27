const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('simplePlayer', {
  // In-window keyboard shortcuts (Space / Left / Right), sent from main.js
  // only while this window has focus. The raw IPC event object is never
  // passed through to page code.
  onTogglePlay: (callback) => ipcRenderer.on('shortcut:toggle-play', () => callback()),
  onPreviousTrack: (callback) => ipcRenderer.on('shortcut:previous-track', () => callback()),
  onNextTrack: (callback) => ipcRenderer.on('shortcut:next-track', () => callback()),

  // Turn the Space / Left / Right playback shortcuts off while typing.
  setPlaybackShortcutsEnabled: (enabled) => ipcRenderer.invoke('shortcuts:set-enabled', enabled),

  getLaunchAtStartup: () => ipcRenderer.invoke('settings:get-launch-at-startup'),
  setLaunchAtStartup: (enabled) => ipcRenderer.invoke('settings:set-launch-at-startup', enabled),

  openLog: () => ipcRenderer.invoke('log:open'),
  saveWindowPositionNow: () => ipcRenderer.invoke('window:save-position-now'),
  restoreSavedWindowPosition: () => ipcRenderer.invoke('window:restore-saved-position'),

  getZoomFactor: () => ipcRenderer.invoke('display:get-zoom-factor'),
  setZoomFactor: (factor) => ipcRenderer.invoke('display:set-zoom-factor', factor),
  onZoomChanged: (callback) => ipcRenderer.on('zoom:changed', (event, factor) => callback(factor)),

  // Windows master volume (see main.js). volumeGet resolves to 0-100 or null.
  volumeIsSupported: () => ipcRenderer.invoke('volume:is-supported'),
  volumeGet: () => ipcRenderer.invoke('volume:get'),
  volumeSet: (percent) => ipcRenderer.invoke('volume:set', percent),

  spotifyGetStatus: () => ipcRenderer.invoke('spotify:get-status'),
  spotifyConnect: () => ipcRenderer.invoke('spotify:connect'),
  spotifyDisconnect: () => ipcRenderer.invoke('spotify:disconnect'),
  spotifyGetAccessToken: () => ipcRenderer.invoke('spotify:get-access-token'),

  // "Ghost Spotify": optionally launch a hidden real Spotify desktop client
  // on this computer when no device anywhere is active, so playback always
  // has somewhere to go. See CHANGELOG for how this works and its limits.
  ghostGetSettings: () => ipcRenderer.invoke('ghost:get-settings'),
  ghostSetEnabled: (enabled) => ipcRenderer.invoke('ghost:set-enabled', enabled),
  ghostPickExe: () => ipcRenderer.invoke('ghost:pick-exe'),
  ghostNoActiveDevice: () => ipcRenderer.invoke('ghost:no-active-device'),
  ghostRestart: () => ipcRenderer.invoke('ghost:restart'),

  // Called by main just before the app quits, so the renderer can pause
  // Spotify playback gracefully before the process exits.
  onAppWillQuit: (callback) => ipcRenderer.on('app:will-quit', () => callback()),

  // Auto-updater: called when a new version has been downloaded and is ready
  // to install. The callback receives the new version string.
  onUpdateReady: (callback) => ipcRenderer.on('update:ready', (event, version) => callback(version)),
  installUpdate: () => ipcRenderer.invoke('update:install'),

  setFullScreen: (value) => ipcRenderer.invoke('window:set-fullscreen', value),
  isFullScreen: () => ipcRenderer.invoke('window:is-fullscreen'),

  // Local music files (see main.js / localMusic.js). The add* calls resolve to
  // { tracks, found, added, truncated } — or null when a picker was cancelled.
  localGetLibrary: () => ipcRenderer.invoke('local:get-library'),
  localPickFiles: () => ipcRenderer.invoke('local:pick-files'),
  localPickFolder: () => ipcRenderer.invoke('local:pick-folder'),
  localAddPaths: (paths) => ipcRenderer.invoke('local:add-paths', paths),
  localClear: () => ipcRenderer.invoke('local:clear'),
  localCover: (filePath, size) => ipcRenderer.invoke('local:cover', filePath, size),
  onLocalProgress: (callback) => ipcRenderer.on('local:progress', (event, done, total) => callback(done, total)),
  // Real path of a file or folder dropped on the window (the page itself
  // cannot see paths).
  localPathForFile: (file) => { try { return webUtils.getPathForFile(file) || ''; } catch (err) { return ''; } }
});
