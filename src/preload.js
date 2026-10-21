const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('simplePlayer', {
  // In-window keyboard shortcuts (Space / Left / Right), sent from main.js
  // only while this window has focus.
  onTogglePlay: (callback) => ipcRenderer.on('shortcut:toggle-play', callback),
  onPreviousTrack: (callback) => ipcRenderer.on('shortcut:previous-track', callback),
  onNextTrack: (callback) => ipcRenderer.on('shortcut:next-track', callback),

  getLaunchAtStartup: () => ipcRenderer.invoke('settings:get-launch-at-startup'),
  setLaunchAtStartup: (enabled) => ipcRenderer.invoke('settings:set-launch-at-startup', enabled),

  spotifyGetStatus: () => ipcRenderer.invoke('spotify:get-status'),
  spotifyConnect: () => ipcRenderer.invoke('spotify:connect'),
  spotifyDisconnect: () => ipcRenderer.invoke('spotify:disconnect')
});
