const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  // Server configuration (will be set by main process)
  serverPort: parseInt(process.env.SERVER_PORT || '8888'),
  isDev: process.env.NODE_ENV !== 'production',
});

// Log that preload script has loaded
console.log('Preload script loaded successfully');
console.log('Server port:', process.env.SERVER_PORT || '8888');
