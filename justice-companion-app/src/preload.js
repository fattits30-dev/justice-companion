const { contextBridge, ipcRenderer } = require('electron');

// Preload script - Bridge between renderer and main process
// Provides secure IPC communication

contextBridge.exposeInMainWorld('justiceAPI', {
  // Case management operations
  saveCase: (caseData) => ipcRenderer.invoke('save-case', caseData),
  getCases: (filters) => ipcRenderer.invoke('get-cases', filters),
  exportCase: (caseId) => ipcRenderer.invoke('export-case', caseId),
  updateCase: (caseId, updateData) => ipcRenderer.invoke('update-case', caseId, updateData),

  // Client management - secure client data
  saveClient: (clientData) => ipcRenderer.invoke('save-client', clientData),
  getClients: () => ipcRenderer.invoke('get-clients'),

  // Fact management
  saveFact: (factData) => ipcRenderer.invoke('save-fact', factData),

  // Document management - encrypted evidence
  saveDocument: (caseId, documentData) => ipcRenderer.invoke('save-document', caseId, documentData),

  // AI Integration
  aiChat: (query, sessionId, options) => ipcRenderer.invoke('ai-chat', { query, sessionId, options }),
  aiHealth: () => ipcRenderer.invoke('ai-health'),
  aiMetrics: () => ipcRenderer.invoke('ai-metrics'),
  aiTestConnection: () => ipcRenderer.invoke('ai-test-connection'),
  aiAnalyzeDocument: (documentText, documentType, analysisType) =>
    ipcRenderer.invoke('ai-analyze-document', { documentText, documentType, analysisType }),
  aiGenerateTemplate: (templateType, formData) =>
    ipcRenderer.invoke('ai-generate-template', { templateType, formData }),
  aiClearSession: (sessionId) => ipcRenderer.invoke('ai-clear-session', sessionId),

  // Security & Compliance
  getSecurityReport: () => ipcRenderer.invoke('get-security-report'),
  getAuditTrail: (filters) => ipcRenderer.invoke('get-audit-trail', filters),
  exportPersonalData: (clientId) => ipcRenderer.invoke('export-personal-data', clientId),
  deletePersonalData: (clientId, legalBasis) => ipcRenderer.invoke('delete-personal-data', clientId, legalBasis),

  // Session management
  createSession: (userCredentials) => ipcRenderer.invoke('create-session', userCredentials),
  validateSession: (sessionId) => ipcRenderer.invoke('validate-session', sessionId),

  // System operations
  acceptDisclaimer: () => ipcRenderer.invoke('accept-disclaimer'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  selectFile: () => ipcRenderer.invoke('select-file'),
  
  // Event communication channels
  onShowDisclaimer: (callback) => {
    ipcRenderer.on('show-disclaimer', callback);
  },
  
  onFactFound: (callback) => {
    ipcRenderer.on('fact-found', callback);
  },
  
  onCaseUpdate: (callback) => {
    ipcRenderer.on('case-update', callback);
  },
  
  // Remove event listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// System information
contextBridge.exposeInMainWorld('systemInfo', {
  platform: process.platform,
  version: process.versions.electron,
  nodeVersion: process.versions.node,
  isWindows: process.platform === 'win32',
  isMac: process.platform === 'darwin',
  isLinux: process.platform === 'linux'
});

console.log('Preload bridge initialized. IPC channels ready.');
