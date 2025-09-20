const { ipcMain } = require('electron');
const LegalAIService = require('./LegalAIService');
const EventEmitter = require('events');

/**
 * API Integration Layer for Justice Companion
 * Handles all external API communications and AI service integration
 */
class APIIntegration extends EventEmitter {
  constructor(config = {}) {
    super();

    // Initialize Legal AI Service
    this.legalAI = new LegalAIService({
      ollamaURL: config.ollamaURL || process.env.OLLAMA_URL || 'http://localhost:11434',
      model: config.model || process.env.OLLAMA_MODEL || 'llama3.2',
      timeout: config.timeout || 30000,
      cacheMaxSize: config.cacheMaxSize || 100,
      cacheMaxAge: config.cacheMaxAge || 300000, // 5 minutes
      mockMode: config.mockMode || process.env.NODE_ENV === 'test'
    });

    // API health monitoring
    this.healthStatus = {
      ollama: { status: 'unknown', lastCheck: null },
      service: { status: 'healthy', startTime: Date.now() }
    };

    // Request telemetry
    this.telemetry = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: null
    };

    // Setup IPC handlers
    this.setupIPCHandlers();

    // Setup AI service event handlers
    this.setupAIEventHandlers();

    // Start health monitoring
    this.startHealthMonitoring();

    this.emit('api_integration_initialized', { config, telemetry: this.telemetry });
  }

  /**
   * Setup IPC handlers for frontend communication
   */
  setupIPCHandlers() {
    // Main AI chat interface
    ipcMain.handle('ai-chat', async (event, data) => {
      const startTime = Date.now();
      this.telemetry.totalRequests++;
      this.telemetry.lastRequestTime = startTime;

      try {
        const { query, sessionId, options = {} } = data;

        this.emit('ai_request_start', { sessionId, query: query.substring(0, 100) });

        const response = await this.legalAI.processLegalQuery(query, {
          sessionId,
          ...options
        });

        const responseTime = Date.now() - startTime;
        this.telemetry.successfulRequests++;
        this.updateAverageResponseTime(responseTime);

        this.emit('ai_request_success', { sessionId, responseTime, fromCache: response.fromCache });

        return {
          success: true,
          response,
          metadata: {
            responseTime,
            sessionId,
            timestamp: new Date().toISOString()
          }
        };

      } catch (error) {
        const responseTime = Date.now() - startTime;
        this.telemetry.failedRequests++;

        this.emit('ai_request_failed', { error: error.message, responseTime });

        // Return user-friendly error
        return {
          success: false,
          error: {
            message: error.userMessage || 'An error occurred while processing your request.',
            suggestion: error.suggestion || 'Please try again or contact support if the issue persists.',
            canRetry: this.isRetryableError(error),
            timestamp: new Date().toISOString()
          },
          metadata: {
            responseTime,
            timestamp: new Date().toISOString()
          }
        };
      }
    });

    // Health check endpoint
    ipcMain.handle('ai-health', async () => {
      try {
        const health = await this.getSystemHealth();
        return { success: true, health };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          health: { status: 'error' }
        };
      }
    });

    // Service metrics
    ipcMain.handle('ai-metrics', async () => {
      return {
        success: true,
        metrics: {
          ...this.telemetry,
          uptime: Date.now() - this.healthStatus.service.startTime,
          healthStatus: this.healthStatus
        }
      };
    });

    // Test Ollama connection
    ipcMain.handle('ai-test-connection', async () => {
      try {
        const connectionTest = await this.legalAI.ollamaClient.testConnection();
        return {
          success: true,
          connection: connectionTest,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          suggestion: 'Please ensure Ollama is installed and running on your system.',
          installInstructions: {
            windows: 'Download from ollama.ai and run the installer',
            mac: 'Download from ollama.ai or use: brew install ollama',
            linux: 'curl -fsSL https://ollama.ai/install.sh | sh'
          },
          timestamp: new Date().toISOString()
        };
      }
    });

    // Legal document analysis (future feature)
    ipcMain.handle('ai-analyze-document', async (event, data) => {
      try {
        const { documentText, documentType, analysisType } = data;

        // For now, return a structured analysis template
        return {
          success: true,
          analysis: await this.analyzeDocument(documentText, documentType, analysisType),
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    });

    // Legal template generation
    ipcMain.handle('ai-generate-template', async (event, data) => {
      try {
        const { templateType, formData } = data;
        const template = await this.generateLegalTemplate(templateType, formData);

        return {
          success: true,
          template,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    });

    // Clear AI session context
    ipcMain.handle('ai-clear-session', async (event, sessionId) => {
      try {
        if (this.legalAI.activeSessions.has(sessionId)) {
          this.legalAI.activeSessions.delete(sessionId);
        }
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
  }

  /**
   * Setup AI service event handlers
   */
  setupAIEventHandlers() {
    this.legalAI.on('legal_query_completed', (data) => {
      this.emit('legal_query_completed', data);
    });

    this.legalAI.on('legal_query_failed', (data) => {
      this.emit('legal_query_failed', data);
    });

    this.legalAI.on('circuit_breaker_state', (data) => {
      this.healthStatus.ollama.status = data.state === 'CLOSED' ? 'healthy' : 'degraded';
      this.emit('circuit_breaker_state', data);
    });

    this.legalAI.on('cache_hit', (data) => {
      this.emit('cache_hit', data);
    });

    this.legalAI.on('template_match', (data) => {
      this.emit('template_match', data);
    });
  }

  /**
   * Document analysis functionality
   */
  async analyzeDocument(documentText, documentType, analysisType) {
    const analysisPrompt = this.buildDocumentAnalysisPrompt(documentText, documentType, analysisType);

    const response = await this.legalAI.processLegalQuery(analysisPrompt, {
      sessionId: `doc_analysis_${Date.now()}`,
      domain: this.mapDocumentTypeToLegalDomain(documentType)
    });

    return {
      documentType,
      analysisType,
      findings: this.parseDocumentAnalysis(response.content),
      confidence: response.confidence,
      riskLevel: response.riskLevel,
      disclaimer: response.disclaimer
    };
  }

  /**
   * Build document analysis prompt
   */
  buildDocumentAnalysisPrompt(documentText, documentType, analysisType) {
    const prompts = {
      'tenancy_agreement': {
        'key_terms': `Please analyze this tenancy agreement and identify the key terms, potential issues, and tenant rights. Focus on:
1. Rent amount and payment terms
2. Deposit requirements and protection
3. Notice periods
4. Repair responsibilities
5. Any unusual or potentially unfair clauses

Document text: ${documentText.substring(0, 3000)}`,

        'red_flags': `Please review this tenancy agreement for potential red flags or unfair terms that tenants should be aware of:

Document text: ${documentText.substring(0, 3000)}`
      },

      'contract': {
        'key_terms': `Please analyze this contract and identify the key terms, obligations, and potential issues:

Document text: ${documentText.substring(0, 3000)}`,

        'consumer_rights': `Please review this contract from a consumer rights perspective and identify any terms that might be unfair under UK consumer law:

Document text: ${documentText.substring(0, 3000)}`
      },

      'legal_notice': {
        'validity': `Please analyze this legal notice for validity and completeness. Check if it meets legal requirements:

Document text: ${documentText.substring(0, 3000)}`,

        'response_options': `Please analyze this legal notice and suggest appropriate response options:

Document text: ${documentText.substring(0, 3000)}`
      }
    };

    return prompts[documentType]?.[analysisType] ||
           `Please analyze this legal document and provide relevant information:

Document text: ${documentText.substring(0, 3000)}`;
  }

  /**
   * Map document type to legal domain
   */
  mapDocumentTypeToLegalDomain(documentType) {
    const mapping = {
      'tenancy_agreement': 'LANDLORD_TENANT',
      'employment_contract': 'EMPLOYMENT_RIGHTS',
      'consumer_contract': 'CONSUMER_RIGHTS',
      'legal_notice': 'GENERAL',
      'debt_letter': 'DEBT_FINANCE'
    };

    return mapping[documentType] || 'GENERAL';
  }

  /**
   * Parse document analysis response
   */
  parseDocumentAnalysis(content) {
    const sections = content.split('\n\n');
    const findings = {
      summary: '',
      keyPoints: [],
      risks: [],
      recommendations: []
    };

    let currentSection = 'summary';

    for (const section of sections) {
      if (section.includes('Key Points') || section.includes('Key Terms')) {
        currentSection = 'keyPoints';
      } else if (section.includes('Risk') || section.includes('Issues')) {
        currentSection = 'risks';
      } else if (section.includes('Recommend') || section.includes('Next Steps')) {
        currentSection = 'recommendations';
      } else if (currentSection === 'summary' && !findings.summary) {
        findings.summary = section.trim();
      } else if (currentSection !== 'summary') {
        findings[currentSection].push(section.trim());
      }
    }

    return findings;
  }

  /**
   * Generate legal templates
   */
  async generateLegalTemplate(templateType, formData) {
    const templatePrompts = {
      'complaint_letter': `Generate a formal complaint letter with the following details:
${JSON.stringify(formData, null, 2)}

The letter should be professional, clear, and include relevant consumer rights references.`,

      'landlord_communication': `Generate a letter to a landlord with the following details:
${JSON.stringify(formData, null, 2)}

The letter should reference relevant tenancy rights and be appropriately formal.`,

      'employment_grievance': `Generate an employment grievance letter with the following details:
${JSON.stringify(formData, null, 2)}

The letter should follow proper grievance procedures and reference employment rights.`
    };

    const prompt = templatePrompts[templateType];
    if (!prompt) {
      throw new Error(`Template type '${templateType}' not supported`);
    }

    const response = await this.legalAI.processLegalQuery(prompt, {
      sessionId: `template_${templateType}_${Date.now()}`,
      domain: this.mapTemplateTypeToLegalDomain(templateType)
    });

    return {
      templateType,
      content: response.content,
      formData,
      generatedAt: new Date().toISOString(),
      disclaimer: response.disclaimer
    };
  }

  /**
   * Map template type to legal domain
   */
  mapTemplateTypeToLegalDomain(templateType) {
    const mapping = {
      'complaint_letter': 'CONSUMER_RIGHTS',
      'landlord_communication': 'LANDLORD_TENANT',
      'employment_grievance': 'EMPLOYMENT_RIGHTS',
      'debt_response': 'DEBT_FINANCE'
    };

    return mapping[templateType] || 'GENERAL';
  }

  /**
   * System health monitoring
   */
  async getSystemHealth() {
    const aiHealth = await this.legalAI.getHealthStatus();

    return {
      overall: aiHealth.status,
      components: {
        ai_service: {
          status: aiHealth.status,
          metrics: aiHealth.metrics,
          cache: aiHealth.cache,
          sessions: aiHealth.sessions
        },
        ollama: aiHealth.ollama,
        circuit_breaker: aiHealth.circuitBreaker
      },
      telemetry: this.telemetry,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Start periodic health monitoring
   */
  startHealthMonitoring() {
    // Check AI service health every 60 seconds
    setInterval(async () => {
      try {
        const health = await this.getSystemHealth();
        this.healthStatus.ollama = health.components.ollama;
        this.healthStatus.service.lastCheck = Date.now();

        this.emit('health_check', health);
      } catch (error) {
        this.healthStatus.ollama.status = 'error';
        this.emit('health_check_failed', { error: error.message });
      }
    }, 60000);
  }

  /**
   * Determine if error is retryable
   */
  isRetryableError(error) {
    const retryablePatterns = [
      'timeout',
      'network',
      'connection',
      'temporarily unavailable',
      'circuit breaker'
    ];

    const errorMessage = error.message.toLowerCase();
    return retryablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Update average response time
   */
  updateAverageResponseTime(responseTime) {
    if (this.telemetry.averageResponseTime === 0) {
      this.telemetry.averageResponseTime = responseTime;
    } else {
      this.telemetry.averageResponseTime =
        (this.telemetry.averageResponseTime + responseTime) / 2;
    }
  }

  /**
   * Cleanup API integration
   */
  destroy() {
    // Remove IPC handlers
    ipcMain.removeHandler('ai-chat');
    ipcMain.removeHandler('ai-health');
    ipcMain.removeHandler('ai-metrics');
    ipcMain.removeHandler('ai-test-connection');
    ipcMain.removeHandler('ai-analyze-document');
    ipcMain.removeHandler('ai-generate-template');
    ipcMain.removeHandler('ai-clear-session');

    // Cleanup AI service
    this.legalAI.destroy();

    // Clear health monitoring
    clearInterval(this.healthMonitoringInterval);

    this.removeAllListeners();
    this.emit('api_integration_destroyed');
  }
}

module.exports = APIIntegration;