const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('simplePlayer', {
  // In-window keyboard shortcuts (Space / Left / Right), sent from main.js
  // only while this window has focus. The raw IPC event object is never
  // passed through to page code.
  onTogglePlay: (callback) => ipcRenderer.on('shortcut:toggle-play', () => callback()),
  onPreviousTrack: (callback) => ipcRenderer.on('shortcut:previous-track', () => callback()),
  onNextTrack: (callback) => ipcRenderer.on('shortcut:next-track', () => callback()),

  getLaunchAtStartup: () => ipcRenderer.invoke('settings:get-launch-at-startup'),
  setLaunchAtStartup: (enabled) => ipcRenderer.invoke('settings:set-launch-at-startup', enabled),

  saveWindowPositionNow: () => ipcRenderer.invoke('window:save-position-now'),
  restoreSavedWindowPosition: () => ipcRenderer.invoke('window:restore-saved-position'),

  getZoomFactor: () => ipcRenderer.invoke('display:get-zoom-factor'),
  setZoomFactor: (factor) => ipcRenderer.invoke('display:set-zoom-factor', factor),
  onZoomChanged: (callback) => ipcRenderer.on('zoom:changed', (event, factor) => callback(factor)),

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
  ghostNoActiveDevice: () => ipcRenderer.invoke('ghost:no-active-device')
});
