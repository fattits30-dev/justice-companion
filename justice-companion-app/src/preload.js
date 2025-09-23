const { contextBridge, ipcRenderer } = require('electron');

// Preload script - Bridge between renderer and main process
// Provides secure IPC communication

// Expose new chat API for ChatService architecture
contextBridge.exposeInMainWorld('electronAPI', {
  // Unified invoke method for ChatAPI compatibility
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
});

// Keep legacy justiceAPI for backward compatibility
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

  // Legal Compliance & Consent Management
  acceptDisclaimer: (acceptanceData) => ipcRenderer.invoke('accept-disclaimer', acceptanceData),
  withdrawConsent: (withdrawalData) => ipcRenderer.invoke('withdraw-consent', withdrawalData),
  getConsentStatus: () => ipcRenderer.invoke('get-consent-status'),
  getConsentReport: (filters) => ipcRenderer.invoke('get-consent-report', filters),

  // System operations
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
  },

  // MCP Memory Integration Support
  // These functions provide memory persistence for case data
  mcpMemorySearch: (params) => ipcRenderer.invoke('mcp-memory-search', params),
  mcpMemoryCreateEntities: (params) => ipcRenderer.invoke('mcp-memory-create-entities', params),
  mcpMemoryAddObservations: (params) => ipcRenderer.invoke('mcp-memory-add-observations', params),
  mcpMemoryCreateRelations: (params) => ipcRenderer.invoke('mcp-memory-create-relations', params),

  // Flag to indicate this is the Electron API
  _isElectronAPI: true
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

// Expose MCP Memory functions globally for compatibility with existing code
contextBridge.exposeInMainWorld('mcp__memory__search_nodes', (params) =>
  ipcRenderer.invoke('mcp-memory-search', params)
);

contextBridge.exposeInMainWorld('mcp__memory__create_entities', (params) =>
  ipcRenderer.invoke('mcp-memory-create-entities', params)
);

contextBridge.exposeInMainWorld('mcp__memory__add_observations', (params) =>
  ipcRenderer.invoke('mcp-memory-add-observations', params)
);

contextBridge.exposeInMainWorld('mcp__memory__create_relations', (params) =>
  ipcRenderer.invoke('mcp-memory-create-relations', params)
);

console.log('Preload bridge initialized. IPC channels ready.');
console.log('MCP Memory functions exposed globally for case management compatibility.');
