const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAvailableModels: () => ipcRenderer.invoke('get-available-models'),
  sendMessage: (data) => ipcRenderer.invoke('send-message', data),
  getLearningProgress: (subject) => ipcRenderer.invoke('get-learning-progress', subject),
  getConversationHistory: (data) => ipcRenderer.invoke('get-conversation-history', data),
  cleanupMemory: (daysToKeep) => ipcRenderer.invoke('cleanup-memory', daysToKeep)
});
