
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electronAPI', {
    // Example: send: (channel, data) => ipcRenderer.send(channel, data),
    // Example: on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args))
    getAppVersion: () => process.env.npm_package_version,
    platform: process.platform
  }
);
