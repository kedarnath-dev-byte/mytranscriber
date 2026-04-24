/**
 * @module ElectronPreload
 * @description Secure IPC bridge between Electron main process
 *              and React renderer. Exposes only required APIs.
 *              contextBridge ensures renderer cannot access Node directly.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to React via window.electron
contextBridge.exposeInMainWorld('electron', {

  // Get available audio/screen sources for capture
  getAudioSources: () => ipcRenderer.invoke('get-audio-sources'),

  // Send log messages from React to Electron console
  log: (message) => ipcRenderer.send('log', message),

  // App info
  platform: process.platform,
});