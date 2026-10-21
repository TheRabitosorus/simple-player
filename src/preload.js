const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('simplePlayer', {
  // In-window keyboard shortcuts (Space / Left / Right), sent from main.js
  // only while this window has focus.
  onTogglePlay: (callback) => ipcRenderer.on('shortcut:toggle-play', callback),
  onPreviousTrack: (callback) => ipcRenderer.on('shortcut:previous-track', callback),
  onNextTrack: (callback) => ipcRenderer.on('shortcut:next-track', callback),

  getLaunchAtStartup: () => ipcRenderer.invoke('settings:get-launch-at-startup'),
  setLaunchAtStartup: (enabled) => ipcRenderer.invoke('settings:set-launch-at-startup', enabled),

  getZoomFactor: () => ipcRenderer.invoke('display:get-zoom-factor'),
  setZoomFactor: (factor) => ipcRenderer.invoke('display:set-zoom-factor', factor),
  onZoomChanged: (callback) => ipcRenderer.on('zoom:changed', (event, factor) => callback(factor)),

  spotifyGetStatus: () => ipcRenderer.invoke('spotify:get-status'),
  spotifyConnect: () => ipcRenderer.invoke('spotify:connect'),
  spotifyDisconnect: () => ipcRenderer.invoke('spotify:disconnect'),
  spotifyGetAccessToken: () => ipcRenderer.invoke('spotify:get-access-token')
});
