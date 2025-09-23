// Web API Bridge for Justice Companion
// Provides web-compatible alternatives to Electron APIs
// Ensures seamless operation in browser environments

class WebAPIBridge {
  constructor() {
    this.storagePrefix = 'justice_companion_';
    // Don't initialize here - let the bottom of the file handle it
  }

  init() {
    // Only initialize if we're in a web environment
    // Check for actual Electron API flag, not just existence of justiceAPI
    const isElectron = window.justiceAPI && window.justiceAPI._isElectronAPI;

    if (!isElectron) {
      console.log('🌐 Web API Bridge: Initializing browser compatibility layer...');
      this.setupWebAPI();
      return true;
    } else {
      console.log('🖥️ Electron environment detected, WebAPIBridge not needed');
      return false;
    }
  }

  getFallbackResponse(input) {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('tenant') || lowerInput.includes('landlord') || lowerInput.includes('evict')) {
      return `**Housing Law Information**\n\nRegarding eviction notices:\n\n• **Minimum Notice**: In the UK, landlords must give at least 2 months' notice for Section 21 evictions\n• **2 Days is ILLEGAL**: A 2-day eviction notice is not legally valid\n• **Your Rights**: You cannot be forcibly evicted without a court order\n• **Immediate Action**: Do not leave the property. Contact Shelter or Citizens Advice immediately\n\n**URGENT**: Call Shelter's emergency helpline: 0808 800 4444\n\nThis is legal information, not formal legal advice.`;
    }
    
    return `I understand you need legal assistance. While I cannot connect to the AI service right now, I can provide general information.\n\nPlease describe your legal issue and I'll provide relevant resources and guidance.\n\nFor urgent matters, contact:\n• Citizens Advice: 0800 144 8848\n• Shelter (housing): 0808 800 4444\n\nThis is legal information, not formal legal advice.`;
  }

  setupWebAPI() {
    // Create a mock justiceAPI for web environments
    window.justiceAPI = {
      // Error storage using localStorage
      storeError: async (errorReport) => {
        try {
          const errors = this.getStoredErrors();
          errors.push({
            ...errorReport,
            id: Date.now().toString(),
            stored: new Date().toISOString()
          });

          // Keep only last 100 errors
          if (errors.length > 100) {
            errors.splice(0, errors.length - 100);
          }

          localStorage.setItem(`${this.storagePrefix}errors`, JSON.stringify(errors));
          console.log('📝 Error stored locally:', errorReport.type);
          return { success: true };
        } catch (error) {
          console.error('Failed to store error:', error);
          return { success: false, error: error.message };
        }
      },

      // Case management
      getCases: async () => {
        try {
          const cases = JSON.parse(localStorage.getItem(`${this.storagePrefix}cases`) || '[]');
          return { success: true, cases };
        } catch (error) {
          console.error('Failed to get cases:', error);
          return { success: false, cases: [], error: error.message };
        }
      },

      saveCase: async (caseData) => {
        try {
          const cases = JSON.parse(localStorage.getItem(`${this.storagePrefix}cases`) || '[]');
          const newCase = {
            ...caseData,
            id: caseData.id || Date.now().toString(),
            created: caseData.created || new Date().toISOString(),
            updated: new Date().toISOString()
          };

          const existingIndex = cases.findIndex(c => c.id === newCase.id);
          if (existingIndex >= 0) {
            cases[existingIndex] = newCase;
          } else {
            cases.push(newCase);
          }

          localStorage.setItem(`${this.storagePrefix}cases`, JSON.stringify(cases));
          return { success: true, case: newCase };
        } catch (error) {
          console.error('Failed to save case:', error);
          return { success: false, error: error.message };
        }
      },

      // Consent management functions
      getConsentStatus: async () => {
        try {
          const consent = localStorage.getItem(`${this.storagePrefix}consent`);
          const consentStatus = {
            hasValidConsent: consent === 'true',
            hasConsent: consent === 'true', // Legacy compatibility
            disclaimerAccepted: consent === 'true',
            consentRequired: consent !== 'true',
            consentWithdrawn: localStorage.getItem(`${this.storagePrefix}consent_withdrawn`) === 'true',
            disclaimerAcceptedAt: localStorage.getItem(`${this.storagePrefix}consent_timestamp`),
            disclaimerVersion: localStorage.getItem(`${this.storagePrefix}disclaimer_version`) || '2.0',
            timestamp: localStorage.getItem(`${this.storagePrefix}consent_timestamp`)
          };
          return {
            success: true,
            consentStatus: consentStatus,
            // Legacy properties for backwards compatibility
            hasConsent: consentStatus.hasValidConsent,
            hasValidConsent: consentStatus.hasValidConsent,
            timestamp: consentStatus.timestamp
          };
        } catch (error) {
          console.error('Failed to get consent status:', error);
          return {
            success: false,
            hasConsent: false,
            hasValidConsent: false,
            error: error.message,
            consentStatus: {
              hasValidConsent: false,
              hasConsent: false,
              consentRequired: true,
              error: error.message
            }
          };
        }
      },

      setConsent: async (consent) => {
        try {
          localStorage.setItem(`${this.storagePrefix}consent`, consent.toString());
          localStorage.setItem(`${this.storagePrefix}consent_timestamp`, new Date().toISOString());
          localStorage.setItem(`${this.storagePrefix}disclaimer_version`, '2.0');
          // Clear withdrawal status if consenting
          if (consent) {
            localStorage.removeItem(`${this.storagePrefix}consent_withdrawn`);
          }
          return { success: true };
        } catch (error) {
          console.error('Failed to set consent:', error);
          return { success: false, error: error.message };
        }
      },

      withdrawConsent: async (withdrawalData) => {
        try {
          localStorage.setItem(`${this.storagePrefix}consent`, 'false');
          localStorage.setItem(`${this.storagePrefix}consent_withdrawn`, 'true');
          localStorage.setItem(`${this.storagePrefix}consent_withdrawn_at`, new Date().toISOString());
          return {
            success: true,
            withdrawalId: `web-withdrawal-${Date.now()}`,
            withdrawnAt: new Date().toISOString()
          };
        } catch (error) {
          console.error('Failed to withdraw consent:', error);
          return { success: false, error: error.message };
        }
      },

      // AI Chat functionality - Direct Ollama connection for browser mode
      aiChat: async (input, sessionId, options = {}) => {
        try {
          // Use OllamaClient singleton directly in browser
          const LMStudioClient = (await import('./LMStudioClient.js')).default;
          const client = LMStudioClient;
          
          // Check connection first
          const isConnected = await client.checkConnection();
          if (!isConnected) {
            throw new Error('Ollama not connected');
          }
          
          // Get AI response
          const response = await client.generateResponse(input, options.context);
          
          return {
            success: true,
            response: response.response || response,
            model: client.model,
            fallback: false,
            processingTime: Date.now()
          };
        } catch (error) {
          console.warn('⚠️ AI chat failed, using fallback:', error.message);
          // Return fallback response
          return {
            success: true,
            response: this.getFallbackResponse(input),
            model: 'fallback',
            fallback: true,
            error: error.message
          };
        }
      },

      aiHealth: async () => {
        try {
          const LMStudioClient = (await import('./LMStudioClient.js')).default;
          const client = LMStudioClient;
          const isConnected = await client.checkConnection();
          return {
            success: true,
            health: {
              available: isConnected,
              model: client.model,
              baseUrl: client.baseUrl
            },
            // Also return in the format the app expects
            status: isConnected ? 'healthy' : 'unhealthy',
            mode: isConnected ? 'ollama' : 'fallback',
            message: isConnected ? 'AI engine online' : 'AI offline'
          };
        } catch (error) {
          return {
            success: false,
            health: { available: false },
            error: error.message
          };
        }
      },

      createSession: async () => {
        // Simple session creation for browser mode
        return {
          success: true,
          sessionId: `web-session-${Date.now()}`,
          timestamp: new Date().toISOString()
        };
      },

      aiClearSession: async (sessionId) => {
        // Session clearing for browser mode
        return { success: true, cleared: true };
      },

      // Fact storage
      saveFact: async (factData) => {
        try {
          const facts = JSON.parse(localStorage.getItem(`${this.storagePrefix}facts`) || '[]');
          const newFact = {
            ...factData,
            id: factData.id || Date.now().toString(),
            timestamp: new Date().toISOString()
          };

          facts.push(newFact);
          localStorage.setItem(`${this.storagePrefix}facts`, JSON.stringify(facts));
          return { success: true, fact: newFact };
        } catch (error) {
          console.error('Failed to save fact:', error);
          return { success: false, error: error.message };
        }
      },

      // Document management (web-compatible)
      saveDocument: async (caseId, file) => {
        try {
          if (!(file instanceof File)) {
            throw new Error('Invalid file object');
          }

          // For web, we'll store document metadata only
          // Actual file content would require a proper backend
          const documents = JSON.parse(localStorage.getItem(`${this.storagePrefix}documents`) || '[]');
          const newDoc = {
            id: Date.now().toString(),
            caseId,
            name: file.name,
            size: file.size,
            type: file.type,
            uploaded: new Date().toISOString(),
            // In a real web deployment, you'd upload to a server here
            webNote: 'File metadata stored locally. Full file storage requires backend integration.'
          };

          documents.push(newDoc);
          localStorage.setItem(`${this.storagePrefix}documents`, JSON.stringify(documents));
          return { success: true, document: newDoc };
        } catch (error) {
          console.error('Failed to save document:', error);
          return { success: false, error: error.message };
        }
      },

      // File selection (web-compatible)
      selectFile: async () => {
        return new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png';

          input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
              resolve({ success: true, file });
            } else {
              resolve({ success: false, error: 'No file selected' });
            }
          };

          input.click();
        });
      },

      // Disclaimer management
      acceptDisclaimer: async () => {
        try {
          localStorage.setItem(`${this.storagePrefix}disclaimer_accepted`, 'true');
          localStorage.setItem(`${this.storagePrefix}disclaimer_date`, new Date().toISOString());
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      onShowDisclaimer: (callback) => {
        // Check if disclaimer was accepted
        const accepted = localStorage.getItem(`${this.storagePrefix}disclaimer_accepted`);
        if (!accepted) {
          setTimeout(callback, 100);
        }
      },

      // Memory management for web
      saveMemory: (data) => {
        try {
          localStorage.setItem(`${this.storagePrefix}memory`, JSON.stringify(data));
          return true;
        } catch (error) {
          console.error('Failed to save memory:', error);
          return false;
        }
      },

      loadMemory: () => {
        try {
          const data = localStorage.getItem(`${this.storagePrefix}memory`);
          return data ? JSON.parse(data) : null;
        } catch (error) {
          console.error('Failed to load memory:', error);
          return null;
        }
      },

      // Package info (web-compatible)
      getPackageInfo: async () => {
        return {
          name: 'justice-companion-web',
          version: '1.0.0-web',
          dependencies: {
            react: '^18.3.1',
            'web-compatible': '^1.0.0'
          }
        };
      },

      // AI Chat (enhanced for web with fallback)
      aiChat: async (input, sessionId, options = {}) => {
        const startTime = Date.now();
        try {
          // Try to dynamically import LMStudioClient
          const LMStudioModule = await import('./LMStudioClient.js');
          const LMStudioClient = LMStudioModule.default;
          const response = await LMStudioClient.generateResponse(input, options.context);
          return {
            success: true,
            response: response,
            model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
            processingTime: Date.now() - startTime,
            fallback: false,
            sessionId: sessionId
          };
        } catch (error) {
          console.warn('AI service unavailable, using fallback:', error.message);
          // Use enhanced fallback responses
          const fallbackResponse = this.getFallbackResponse(input);
          return {
            success: true,
            response: fallbackResponse,
            model: 'fallback',
            processingTime: Date.now() - startTime,
            fallback: true,
            sessionId: sessionId
          };
        }
      },



      // Test AI connection
      aiTestConnection: async () => {
        const health = await window.justiceAPI.aiHealth();
        return {
          success: health.status !== 'error',
          mode: health.mode,
          message: health.message
        };
      },

      // MCP Memory Integration - Fallback implementations
      // These provide fallback for when MCP server is not available
      ...this.setupMCPMemoryFallback()
    };

    console.log('✅ Web API Bridge: Browser compatibility layer active');
    console.log('📱 Environment: Web browser mode');
    console.log('💾 Storage: localStorage (client-side only)');
    console.log('🤖 AI: HTTP-based Ollama integration');
  }

  // Enhanced fallback responses when AI isn't available
  getFallbackResponse(userMessage) {
    const lowerInput = userMessage.toLowerCase();

    // Enhanced landlord responses
    if (lowerInput.includes('landlord') || lowerInput.includes('evict') || lowerInput.includes('deposit')) {
      return `**Housing and Tenancy Support** 🏠

I understand you're experiencing issues with your landlord. Here's important information about your rights:

**IMMEDIATE STEPS:**
1. **Document everything** - Keep records of all communications and issues
2. **Check deposit protection** - Your deposit must be protected in TDS, DPS, or MyDeposits within 30 days
3. **Verify any notices** - Section 21/8 notices must follow specific legal requirements

**YOUR TENANT RIGHTS:**
• **Proper notice periods** - Landlords must follow legal procedures
• **Deposit protection** - Unprotected deposits may lead to compensation
• **Protection from illegal eviction** - You cannot be forced out without proper court process
• **Right to quiet enjoyment** - 24 hours notice required for visits

**HOW I CAN HELP:**
→ Review your eviction notice for validity
→ Draft a formal response letter
→ Calculate potential deposit compensation

*This is legal information, not formal legal advice. Please consult a solicitor for specific legal counsel.*`;
    }

    // Enhanced consumer rights
    if (lowerInput.includes('refund') || lowerInput.includes('faulty') || lowerInput.includes('company')) {
      return `**Consumer Rights Information** 🛍️

I can help you understand your consumer rights and options:

**YOUR LEGAL PROTECTIONS:**
1. **Consumer Rights Act 2015** - 30-day right to reject faulty goods
2. **Section 75 Credit Protection** - Credit card company liability for purchases £100-£30,000
3. **Chargeback Rights** - Protection for debit card purchases

**RECOMMENDED APPROACH:**
📧 **Step 1:** Formal complaint (professional but threatening)
⏰ **Step 2:** 14 days to respond or we escalate
⚖️ **Step 3:** Small claims court (£35-£455 fee - claimable)
💰 **Step 4:** Collect compensation + costs

*Ready to draft a letter that'll make them nervous?*`;
    }

    // General support response
    return `**Justice Companion - Legal Information Service** ⚖️

I'm here to help you understand your legal situation and options.

**TO BETTER ASSIST YOU, PLEASE SHARE:**
• What type of legal issue are you facing? (housing, consumer, employment, etc.)
• What has happened so far?
• What outcome are you hoping to achieve?

**IMPORTANT TO KNOW:**
• You have rights that are protected by law
• There are often multiple ways to resolve legal issues
• Taking action early can improve outcomes

*The more information you provide, the better I can assist you with relevant legal information.*`;
  }

  getStoredErrors() {
    try {
      return JSON.parse(localStorage.getItem(`${this.storagePrefix}errors`) || '[]');
    } catch {
      return [];
    }
  }

  // Get web-specific system info
  getWebSystemInfo() {
    return {
      platform: 'web',
      userAgent: navigator.userAgent,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      storage: {
        localStorage: typeof Storage !== 'undefined',
        sessionStorage: typeof sessionStorage !== 'undefined'
      },
      apis: {
        fetch: typeof fetch !== 'undefined',
        fileReader: typeof FileReader !== 'undefined',
        notifications: 'Notification' in window
      }
    };
  }

  // Clear all stored data (for testing/development)
  clearAllData() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.storagePrefix)) {
        localStorage.removeItem(key);
      }
    });
    console.log('🧹 All Justice Companion data cleared from localStorage');
  }

  // Export data (useful for data portability)
  exportData() {
    const data = {};
    const keys = Object.keys(localStorage);

    keys.forEach(key => {
      if (key.startsWith(this.storagePrefix)) {
        const cleanKey = key.replace(this.storagePrefix, '');
        try {
          data[cleanKey] = JSON.parse(localStorage.getItem(key));
        } catch {
          data[cleanKey] = localStorage.getItem(key);
        }
      }
    });

    return data;
  }

  // Import data
  importData(data) {
    Object.entries(data).forEach(([key, value]) => {
      const storageKey = `${this.storagePrefix}${key}`;
      const storageValue = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(storageKey, storageValue);
    });

    console.log('📥 Data imported successfully');
  }

  // MCP Memory Fallback Implementation
  setupMCPMemoryFallback() {
    return {
      // MCP Memory function fallbacks for web environment
      mcp__memory__search_nodes: async (params) => {
        try {
          console.log('🔍 MCP Memory Search (Web Fallback):', params);
          const localMemory = this.loadMemoryFromStorage();

          if (!localMemory || !localMemory.nodes) {
            return { success: true, nodes: [] };
          }

          const { query, limit = 10 } = params;
          let filteredNodes = localMemory.nodes;

          if (query) {
            const searchTerm = query.toLowerCase();
            filteredNodes = localMemory.nodes.filter(node =>
              (node.content && node.content.toLowerCase().includes(searchTerm)) ||
              (node.name && node.name.toLowerCase().includes(searchTerm)) ||
              (node.entityType && node.entityType.toLowerCase().includes(searchTerm))
            );
          }

          return {
            success: true,
            nodes: filteredNodes.slice(0, limit)
          };
        } catch (error) {
          console.error('MCP Memory search fallback error:', error);
          return { success: false, error: error.message, nodes: [] };
        }
      },

      mcp__memory__create_entities: async (params) => {
        try {
          console.log('🆕 MCP Memory Create Entities (Web Fallback):', params);
          const localMemory = this.loadMemoryFromStorage() || { nodes: [], relations: [] };

          const { entities = [] } = params;
          const newNodes = entities.map(entity => ({
            id: entity.name || `entity-${Date.now()}-${Math.random()}`,
            name: entity.name,
            entityType: entity.entityType || 'general',
            content: entity.observations ? entity.observations.join('\n') : '',
            observations: entity.observations || [],
            created: new Date().toISOString(),
            ...entity
          }));

          localMemory.nodes = [...(localMemory.nodes || []), ...newNodes];
          this.saveMemoryToStorage(localMemory);

          return {
            success: true,
            entities: newNodes
          };
        } catch (error) {
          console.error('MCP Memory create entities fallback error:', error);
          return { success: false, error: error.message };
        }
      },

      mcp__memory__add_observations: async (params) => {
        try {
          console.log('📝 MCP Memory Add Observations (Web Fallback):', params);
          const localMemory = this.loadMemoryFromStorage() || { nodes: [], relations: [] };

          const { observations = [] } = params;
          const observationNodes = observations.map(obs => ({
            id: `observation-${Date.now()}-${Math.random()}`,
            entityType: 'observation',
            content: obs.content || obs,
            created: new Date().toISOString(),
            ...obs
          }));

          localMemory.nodes = [...(localMemory.nodes || []), ...observationNodes];
          this.saveMemoryToStorage(localMemory);

          return {
            success: true,
            observations: observationNodes
          };
        } catch (error) {
          console.error('MCP Memory add observations fallback error:', error);
          return { success: false, error: error.message };
        }
      },

      mcp__memory__create_relations: async (params) => {
        try {
          console.log('🔗 MCP Memory Create Relations (Web Fallback):', params);
          const localMemory = this.loadMemoryFromStorage() || { nodes: [], relations: [] };

          const { relations = [] } = params;
          const newRelations = relations.map(rel => ({
            id: `relation-${Date.now()}-${Math.random()}`,
            from: rel.from,
            to: rel.to,
            relationType: rel.relationType || 'related',
            created: new Date().toISOString(),
            ...rel
          }));

          localMemory.relations = [...(localMemory.relations || []), ...newRelations];
          this.saveMemoryToStorage(localMemory);

          return {
            success: true,
            relations: newRelations
          };
        } catch (error) {
          console.error('MCP Memory create relations fallback error:', error);
          return { success: false, error: error.message };
        }
      }
    };
  }

  // Memory storage helpers
  loadMemoryFromStorage() {
    try {
      const data = localStorage.getItem(`${this.storagePrefix}mcp_memory`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load memory from storage:', error);
      return null;
    }
  }

  saveMemoryToStorage(memoryData) {
    try {
      localStorage.setItem(`${this.storagePrefix}mcp_memory`, JSON.stringify(memoryData));
      return true;
    } catch (error) {
      console.error('Failed to save memory to storage:', error);
      return false;
    }
  }
}

// Create and export singleton instance
const webAPIBridge = new WebAPIBridge();

export default webAPIBridge;

// Auto-initialize if we're in a web environment
if (typeof window !== 'undefined') {
  console.log('🔧 WebAPIBridge: Auto-initialization checking environment...');

  // Initialize (will check for Electron internally)
  const initialized = webAPIBridge.init();

  if (initialized) {
    // Verify initialization worked
    if (window.justiceAPI) {
      console.log('✅ WebAPIBridge: Justice API successfully created');
    } else {
      console.error('❌ WebAPIBridge: Failed to create Justice API');
    }

    // Expose MCP Memory functions globally for compatibility
    const mcpFallback = webAPIBridge.setupMCPMemoryFallback();
    Object.keys(mcpFallback).forEach(key => {
      window[key] = mcpFallback[key];
    });

    // Also make utilities available globally for debugging
    window.justiceCompanionWeb = {
      bridge: webAPIBridge,
      clearData: () => webAPIBridge.clearAllData(),
      exportData: () => webAPIBridge.exportData(),
      importData: (data) => webAPIBridge.importData(data),
      getSystemInfo: () => webAPIBridge.getWebSystemInfo(),
      mcpMemory: mcpFallback
    };

    console.log('🌐 Justice Companion Web Mode Ready');
    console.log('🛠️ Debug utilities available at window.justiceCompanionWeb');
    console.log('📋 Available API methods:', window.justiceAPI ? Object.keys(window.justiceAPI) : 'None');
  }
} else {
  console.warn('⚠️ WebAPIBridge: Unknown environment state');
}