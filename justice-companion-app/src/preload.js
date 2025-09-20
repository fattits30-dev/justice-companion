const { contextBridge, ipcRenderer } = require('electron');

// The bridge between worlds - where UI meets raw power
// This is the translator, the messenger, the weapon courier

contextBridge.exposeInMainWorld('justiceAPI', {
  // Case operations - the war chest
  saveCase: (caseData) => ipcRenderer.invoke('save-case', caseData),
  getCases: () => ipcRenderer.invoke('get-cases'),
  exportCase: (caseId) => ipcRenderer.invoke('export-case', caseId),
  
  // Fact management - the truth arsenal
  saveFact: (factData) => ipcRenderer.invoke('save-fact', factData),
  
  // System operations
  acceptDisclaimer: () => ipcRenderer.invoke('accept-disclaimer'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  selectFile: () => ipcRenderer.invoke('select-file'),
  
  // Communication channels - for real-time combat
  onShowDisclaimer: (callback) => {
    ipcRenderer.on('show-disclaimer', callback);
  },
  
  onFactFound: (callback) => {
    ipcRenderer.on('fact-found', callback);
  },
  
  onCaseUpdate: (callback) => {
    ipcRenderer.on('case-update', callback);
  },
  
  // Remove listeners - clean up the battlefield
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// System info for the warriors
contextBridge.exposeInMainWorld('systemInfo', {
  platform: process.platform,
  version: process.versions.electron,
  nodeVersion: process.versions.node,
  isWindows: process.platform === 'win32',
  isMac: process.platform === 'darwin',
  isLinux: process.platform === 'linux'
});

console.log('Bridge deployed. Frontend and backend united in the fight.');
