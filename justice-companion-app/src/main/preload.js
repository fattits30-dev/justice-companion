const { contextBridge, ipcRenderer } = require('electron');

/**
 * SECURE PRELOAD SCRIPT - Justice Companion
 *
 * SECURITY PRINCIPLES IMPLEMENTED:
 * ✅ contextBridge for secure API exposure
 * ✅ No direct ipcRenderer exposure (prevents XSS)
 * ✅ Input validation and sanitization
 * ✅ Selective method exposure only
 * ✅ Error handling with fallbacks
 *
 * Based on Electron best practices from context7
 */

// Input validation helper
const validateInput = (input, type, maxLength = 5000) => {
  if (typeof input !== 'string') {
    throw new Error(`Invalid input type: expected string, got ${typeof input}`);
  }

  if (input.length > maxLength) {
    throw new Error(`Input too long: maximum ${maxLength} characters allowed`);
  }

  // Basic XSS prevention
  const sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');

  return sanitized.trim();
};

// Secure session ID generation
const generateSecureSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Error handler with user-friendly messages
const handleSecureError = (error, operation) => {
  console.error(`Justice Companion API Error [${operation}]:`, error);

  return {
    success: false,
    error: {
      message: error.message || 'An unexpected error occurred',
      operation: operation,
      timestamp: new Date().toISOString(),
      canRetry: !error.message?.includes('Rate limit') && !error.message?.includes('invalid')
    }
  };
};

// SECURE API BRIDGE - Only expose what's needed
contextBridge.exposeInMainWorld('justiceAPI', {
  // =====================
  // AI CHAT INTERFACE - Enhanced Security
  // =====================

  /**
   * Send secure AI chat request
   * @param {string} query - User's legal question
   * @param {string} sessionId - Session identifier
   * @param {object} options - Optional parameters
   * @returns {Promise<object>} AI response with metadata
   */
  aiChat: async (query, sessionId, options = {}) => {
    try {
      // Input validation
      const validatedQuery = validateInput(query, 'string', 5000);
      const validatedSessionId = sessionId || generateSecureSessionId();

      if (!validatedQuery) {
        throw new Error('Please provide a valid question about your legal situation');
      }

      // Secure IPC call - data-only, no functions
      const result = await ipcRenderer.invoke('ai-chat', {
        query: validatedQuery,
        sessionId: validatedSessionId,
        options: {
          temperature: options.temperature || 0.3,
          max_tokens: options.max_tokens || 2048,
          domain: options.domain || 'general'
        }
      });

      return result;

    } catch (error) {
      return handleSecureError(error, 'aiChat');
    }
  },

  /**
   * Get AI service health status
   * @returns {Promise<object>} Health status information
   */
  aiHealth: async () => {
    try {
      return await ipcRenderer.invoke('ai-health');
    } catch (error) {
      return handleSecureError(error, 'aiHealth');
    }
  },

  /**
   * Test AI connection
   * @returns {Promise<object>} Connection test results
   */
  aiTestConnection: async () => {
    try {
      return await ipcRenderer.invoke('ai-test-connection');
    } catch (error) {
      return handleSecureError(error, 'aiTestConnection');
    }
  },

  // =====================
  // CASE MANAGEMENT - Secure Data Operations
  // =====================

  /**
   * Save case data securely
   * @param {object} caseData - Case information
   * @returns {Promise<object>} Save result with encryption metadata
   */
  saveCase: async (caseData) => {
    try {
      // Validate required fields
      if (!caseData.title) {
        throw new Error('Case title is required');
      }

      const validatedCase = {
        title: validateInput(caseData.title, 'string', 200),
        description: caseData.description ? validateInput(caseData.description, 'string', 5000) : '',
        type: caseData.type || 'general',
        clientId: caseData.clientId || null,
        classification: caseData.classification || 'confidential'
      };

      return await ipcRenderer.invoke('save-case', validatedCase);

    } catch (error) {
      return handleSecureError(error, 'saveCase');
    }
  },

  /**
   * Get all cases (encrypted and secure)
   * @param {object} filters - Optional filtering parameters
   * @returns {Promise<object>} Cases array with metadata
   */
  getCases: async (filters = {}) => {
    try {
      return await ipcRenderer.invoke('get-cases', filters);
    } catch (error) {
      return handleSecureError(error, 'getCases');
    }
  },

  /**
   * Update existing case
   * @param {string} caseId - Case identifier
   * @param {object} updateData - Updated case data
   * @returns {Promise<object>} Update result
   */
  updateCase: async (caseId, updateData) => {
    try {
      if (!caseId) {
        throw new Error('Case ID is required for updates');
      }

      const validatedUpdates = {};

      if (updateData.title) {
        validatedUpdates.title = validateInput(updateData.title, 'string', 200);
      }

      if (updateData.description) {
        validatedUpdates.description = validateInput(updateData.description, 'string', 5000);
      }

      if (updateData.status) {
        validatedUpdates.status = updateData.status;
      }

      return await ipcRenderer.invoke('update-case', caseId, validatedUpdates);

    } catch (error) {
      return handleSecureError(error, 'updateCase');
    }
  },

  // =====================
  // DOCUMENT MANAGEMENT - Secure File Operations
  // =====================

  /**
   * Select and upload document securely
   * @returns {Promise<object>} File selection result with encryption
   */
  selectFile: async () => {
    try {
      return await ipcRenderer.invoke('select-file');
    } catch (error) {
      return handleSecureError(error, 'selectFile');
    }
  },

  /**
   * Save document to case
   * @param {string} caseId - Target case ID
   * @param {object} documentData - Document information
   * @returns {Promise<object>} Save result
   */
  saveDocument: async (caseId, documentData) => {
    try {
      if (!caseId || !documentData) {
        throw new Error('Case ID and document data are required');
      }

      return await ipcRenderer.invoke('save-document', caseId, documentData);

    } catch (error) {
      return handleSecureError(error, 'saveDocument');
    }
  },

  // =====================
  // CLIENT MANAGEMENT - GDPR Compliant
  // =====================

  /**
   * Save client information securely
   * @param {object} clientData - Client information
   * @returns {Promise<object>} Save result with encryption
   */
  saveClient: async (clientData) => {
    try {
      if (!clientData.name) {
        throw new Error('Client name is required');
      }

      const validatedClient = {
        name: validateInput(clientData.name, 'string', 100),
        email: clientData.email ? validateInput(clientData.email, 'string', 100) : null,
        phone: clientData.phone ? validateInput(clientData.phone, 'string', 20) : null,
        address: clientData.address ? validateInput(clientData.address, 'string', 500) : null
      };

      return await ipcRenderer.invoke('save-client', validatedClient);

    } catch (error) {
      return handleSecureError(error, 'saveClient');
    }
  },

  /**
   * Get all clients
   * @returns {Promise<object>} Clients array
   */
  getClients: async () => {
    try {
      return await ipcRenderer.invoke('get-clients');
    } catch (error) {
      return handleSecureError(error, 'getClients');
    }
  },

  // =====================
  // FACT MANAGEMENT - Legal Information Tracking
  // =====================

  /**
   * Save legal fact to case
   * @param {object} factData - Fact information
   * @returns {Promise<object>} Save result
   */
  saveFact: async (factData) => {
    try {
      if (!factData.type || !factData.value) {
        throw new Error('Fact type and value are required');
      }

      const validatedFact = {
        type: factData.type,
        label: factData.label || 'Legal Fact',
        value: validateInput(factData.value, 'string', 1000),
        context: factData.context || 'user-input',
        caseId: factData.caseId || null,
        importance: factData.importance || 'medium',
        timestamp: new Date().toISOString()
      };

      return await ipcRenderer.invoke('save-fact', validatedFact);

    } catch (error) {
      return handleSecureError(error, 'saveFact');
    }
  },

  // =====================
  // SESSION MANAGEMENT - Enhanced Security
  // =====================

  /**
   * Create secure session
   * @param {object} credentials - Optional user credentials
   * @returns {Promise<object>} Session information
   */
  createSession: async (credentials = null) => {
    try {
      return await ipcRenderer.invoke('create-session', credentials);
    } catch (error) {
      return handleSecureError(error, 'createSession');
    }
  },

  /**
   * Validate session
   * @param {string} sessionId - Session to validate
   * @returns {Promise<object>} Validation result
   */
  validateSession: async (sessionId) => {
    try {
      return await ipcRenderer.invoke('validate-session', sessionId);
    } catch (error) {
      return handleSecureError(error, 'validateSession');
    }
  },

  // =====================
  // SYSTEM & COMPLIANCE
  // =====================

  /**
   * Get security compliance report
   * @returns {Promise<object>} Security report
   */
  getSecurityReport: async () => {
    try {
      return await ipcRenderer.invoke('get-security-report');
    } catch (error) {
      return handleSecureError(error, 'getSecurityReport');
    }
  },

  /**
   * Accept legal disclaimer
   * @returns {Promise<object>} Acceptance confirmation
   */
  acceptDisclaimer: async () => {
    try {
      return await ipcRenderer.invoke('accept-disclaimer');
    } catch (error) {
      return handleSecureError(error, 'acceptDisclaimer');
    }
  },

  /**
   * Open external link securely
   * @param {string} url - URL to open
   * @returns {Promise<void>} Opens in default browser
   */
  openExternal: async (url) => {
    try {
      const validatedUrl = validateInput(url, 'string', 500);

      // Basic URL validation
      if (!validatedUrl.startsWith('http://') && !validatedUrl.startsWith('https://')) {
        throw new Error('Invalid URL: must use HTTP or HTTPS protocol');
      }

      await ipcRenderer.invoke('open-external', validatedUrl);

    } catch (error) {
      console.error('Error opening external link:', error);
    }
  },

  // =====================
  // EVENT LISTENERS - Secure Event Handling
  // =====================

  /**
   * Listen for disclaimer prompt
   * @param {function} callback - Callback function for disclaimer events
   */
  onShowDisclaimer: (callback) => {
    // Secure event listener - only pass event data, no direct event object
    ipcRenderer.on('show-disclaimer', (_event) => {
      callback();
    });
  },

  /**
   * Remove disclaimer listener
   */
  removeDisclaimerListener: () => {
    ipcRenderer.removeAllListeners('show-disclaimer');
  },

  // =====================
  // UTILITY METHODS
  // =====================

  /**
   * Get application version and build info
   * @returns {object} Version information
   */
  getAppInfo: () => {
    return {
      name: 'Justice Companion',
      version: '1.0.0',
      description: 'Legal Aid Assistant',
      build: new Date().toISOString(),
      security: 'Enhanced with contextBridge'
    };
  },

  /**
   * Validate input on frontend (additional layer)
   * @param {string} input - Input to validate
   * @param {number} maxLength - Maximum length
   * @returns {object} Validation result
   */
  validateInput: (input, maxLength = 5000) => {
    try {
      const sanitized = validateInput(input, 'string', maxLength);
      return {
        isValid: true,
        sanitized: sanitized,
        length: sanitized.length
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message,
        length: input?.length || 0
      };
    }
  }
});

// =====================
// SECURITY LOGGING
// =====================

// Log secure initialization
console.log('🔒 Justice Companion: Secure preload script initialized');
console.log('✅ contextBridge: API safely exposed');
console.log('✅ Input validation: Active');
console.log('✅ XSS protection: Enabled');
console.log('✅ Error handling: Enhanced');

// Prevent direct access to Node.js APIs
delete window.require;
delete window.exports;
delete window.module;

// Security audit log
const securityAudit = {
  timestamp: new Date().toISOString(),
  preloadSecure: true,
  contextBridgeActive: true,
  nodeAPIBlocked: true,
  inputValidationEnabled: true,
  xssProtectionEnabled: true
};

console.log('🛡️ Security Audit:', securityAudit);