const { ipcMain } = require('electron');
const LegalAIService = require('./LegalAIService');
const EventEmitter = require('events');
const envConfig = require('../../config/environment');
// PHASE 1.2: Structured Logging Integration
const { info, warn, error, debug, auditLog, setCorrelationId, setLegalContext } = require('../../logging/logger');

/**
 * API Integration Layer for Justice Companion
 * Handles all external API communications and AI service integration
 */
class APIIntegration extends EventEmitter {
  constructor(config = {}) {
    super();

    // Initialize Legal AI Service
    this.legalAI = new LegalAIService({
      ollamaURL: config.ollamaURL || envConfig.ollamaConfig.baseUrl,
      model: config.model || envConfig.ollamaConfig.model,
      timeout: config.timeout || envConfig.ollamaConfig.timeout,
      cacheMaxSize: config.cacheMaxSize || 100,
      cacheMaxAge: config.cacheMaxAge || 300000, // 5 minutes
      mockMode: true // TEMPORARY FIX: Enable mock mode to bypass Ollama timeout
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
    // Main AI chat interface - DISABLED: Using main.js handler to avoid conflicts
    /*
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
    */

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
  // Generate enhanced legal response with comprehensive safety checks
  async generateLegalResponse(query, options = {}) {
    try {
      // Enhanced input validation for legal safety
      const validationResult = this.validateLegalInput(query);
      if (!validationResult.isValid) {
        return {
          success: false,
          response: {
            content: validationResult.message,
            confidence: 0.95,
            riskLevel: 'HIGH',
            safeguards: ['Input validation enforced']
          },
          error: 'Input validation failed',
          validationFailure: true
        };
      }

      const response = await this.legalAI.processLegalQuery(query, options);

      // Enhanced success response with safety metadata
      return {
        success: true,
        response: response,
        metadata: {
          timestamp: new Date().toISOString(),
          sessionId: options.sessionId,
          safeguards: response.safeguards || ['Standard legal information safeguards'],
          riskLevel: response.riskLevel || 'LOW',
          disclaimerIncluded: response.disclaimer || true
        }
      };
    } catch (error) {
      error('Error generating legal response', error, {
        component: 'api-integration',
        operation: 'generateLegalResponse',
        sessionId: options.sessionId
      });

      warn('Falling back to enhanced safety response due to AI service error', {
        component: 'api-integration',
        operation: 'generateLegalResponse',
        sessionId: options.sessionId,
        fallback: true
      });

      return {
        success: false,
        response: this.createEnhancedFallbackResponse(query, error),
        error: error.message,
        fallback: true,
        metadata: {
          timestamp: new Date().toISOString(),
          sessionId: options.sessionId,
          safeguards: ['Enhanced fallback response', 'Error handling active']
        }
      };
    }
  }

  /**
   * Enhanced input validation for legal safety
   */
  validateLegalInput(query) {
    if (!query || typeof query !== 'string') {
      return {
        isValid: false,
        message: 'Please provide a valid question about your legal situation.'
      };
    }

    if (query.trim().length < 5) {
      return {
        isValid: false,
        message: 'Please provide more details about your legal situation (at least 5 characters).'
      };
    }

    if (query.length > 5000) {
      return {
        isValid: false,
        message: 'Please keep your question under 5000 characters for better processing.'
      };
    }

    // Check for emergency situations
    const emergencyKeywords = [
      'suicide', 'kill myself', 'domestic violence', 'being threatened',
      'immediate danger', 'physical harm', 'abuse', 'urgent help'
    ];

    const lowerQuery = query.toLowerCase();
    if (emergencyKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return {
        isValid: true,
        isEmergency: true,
        message: 'Emergency situation detected - providing immediate resources.'
      };
    }

    // Check for potentially harmful requests
    const harmfulContent = [
      'hide assets', 'avoid paying legally', 'false testimony', 'perjury',
      'lie in court', 'destroy evidence', 'intimidate', 'fraudulent'
    ];

    if (harmfulContent.some(phrase => lowerQuery.includes(phrase))) {
      return {
        isValid: false,
        message: this.createEthicalGuidanceMessage()
      };
    }

    return { isValid: true };
  }

  /**
   * Create ethical guidance message for inappropriate requests
   */
  createEthicalGuidanceMessage() {
    return `**Ethical Legal Practice Guidelines**

I understand you may be facing a difficult situation, but I cannot provide guidance on activities that could be illegal, harmful, or undermine legal processes.

**Instead, I can help you with:**
✅ Understanding your legitimate legal rights
✅ Proper legal procedures and processes
✅ Finding qualified legal representation
✅ Resources for resolving disputes ethically

**Professional Resources:**
• **Citizens Advice**: Free legal guidance (0808 223 1133)
• **Law Society**: Find qualified legal professionals
• **Legal Aid**: Support for those who qualify

Remember: The legal system works best when all parties act honestly and in good faith.

⚠️ **Legal Disclaimer**: This is general information only. For specific advice about your situation, please consult a qualified legal professional.`;
  }

  /**
   * Create enhanced fallback response with legal resources
   */
  createEnhancedFallbackResponse(query, error) {
    const lowerQuery = query.toLowerCase();
    let specificGuidance = '';

    // Provide domain-specific fallback guidance
    if (lowerQuery.includes('landlord') || lowerQuery.includes('tenant') || lowerQuery.includes('housing')) {
      specificGuidance = `
**Housing Law Resources:**
• Shelter Housing Helpline: 0808 800 4444
• Citizens Advice Housing: Free guidance
• Local Council Housing Department
• Gov.uk Housing Information`;
    } else if (lowerQuery.includes('employment') || lowerQuery.includes('work') || lowerQuery.includes('job')) {
      specificGuidance = `
**Employment Law Resources:**
• ACAS: 0300 123 1100 (Free employment advice)
• Citizens Advice Employment: Free guidance
• Equality and Human Rights Commission
• Trade Union support (if applicable)`;
    } else if (lowerQuery.includes('consumer') || lowerQuery.includes('refund') || lowerQuery.includes('faulty')) {
      specificGuidance = `
**Consumer Rights Resources:**
• Citizens Advice Consumer Service: 0808 223 1133
• Financial Ombudsman: 0800 023 4567
• Trading Standards: Contact local authority
• Resolver: Free complaint platform`;
    }

    return {
      content: `**Legal Information Service - Offline Mode**

I apologize, but the AI assistant is temporarily unavailable. However, I can still provide you with relevant legal resources and guidance.

${specificGuidance}

**General Legal Resources:**
• Citizens Advice: 0808 223 1133 (Free legal guidance)
• Law Society: Find a solicitor (lawsociety.org.uk)
• Gov.uk Legal Information: Official guidance
• Local Law Centres: Community legal support

**What You Can Do Right Now:**
1. **Document your situation** - Write down what happened, when, and who was involved
2. **Gather evidence** - Keep all relevant documents, emails, photos
3. **Know your deadlines** - Many legal actions have time limits
4. **Seek professional advice** - Contact appropriate legal professionals

**Emergency Contacts:**
• Emergency Services: 999 (immediate danger)
• National Domestic Violence Helpline: 0808 2000 247
• Samaritans: 116 123 (mental health crisis)

${error.userMessage || 'Please try again later or contact the resources above for immediate assistance.'}

⚠️ **Legal Disclaimer**: This is general information only. For specific advice about your situation, please consult a qualified legal professional.`,
      confidence: 0.8,
      riskLevel: 'LOW',
      disclaimer: true,
      safeguards: ['Enhanced fallback response', 'Professional resources provided', 'Emergency contacts included']
    };
  }

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
    const sections = String(content || '').split('\n\n');
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