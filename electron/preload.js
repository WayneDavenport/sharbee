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
  // Connection mode
  mode: process.env.APP_MODE || 'host', // 'host' or 'guest'
  guestHostName: process.env.GUEST_HOST_NAME || null,
  guestHostUrl: process.env.GUEST_HOST_URL || null,
  // IPC methods for guest mode management
  switchToHostMode: () => ipcRenderer.invoke('switch-to-host-mode'),
  // Native dialogs (window.confirm/alert break keyboard input in Electron)
  showConfirm: (message, title) => ipcRenderer.invoke('show-confirm', { message, title }),
  showAlert: (message, title) => ipcRenderer.invoke('show-alert', { message, title }),
  // App controls
  openDownloadsFolder: () => ipcRenderer.invoke('open-downloads-folder'),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  exitApp: () => ipcRenderer.invoke('exit-app'),
  refreshApp: () => ipcRenderer.invoke('refresh-app'),
  // Auto-updater
  onUpdateReady: (callback) => ipcRenderer.on('update-ready', (_event, info) => callback(info)),
  onUpdaterStatus: (callback) => ipcRenderer.on('updater-status', (_event, info) => callback(info)),
  applyUpdate: () => ipcRenderer.invoke('apply-update'),
  // Native right-click context menu (cut/copy/paste/select-all)
  showContextMenu: () => ipcRenderer.invoke('show-context-menu'),
});

// Log that preload script has loaded
console.log('Preload script loaded successfully');
console.log('Server port:', process.env.SERVER_PORT || '8888');
