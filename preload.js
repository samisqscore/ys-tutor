const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAvailableModels: () => ipcRenderer.invoke('get-available-models'),
  sendMessage: (data) => ipcRenderer.invoke('send-message', data)
});
