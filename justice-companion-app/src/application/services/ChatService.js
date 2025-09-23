/**
 * Justice Companion Chat Service
 * Application Service Layer - Bridges UI and Domain
 * Orchestrates chat operations with proper domain boundaries
 * PHASE 4: Application Services Implementation
 */

const { LegalCase } = require('../../domain/models/LegalCase');
const { CaseNote } = require('../../domain/models/CaseNote');
const { LegalDocument } = require('../../domain/models/LegalDocument');
const { LegalCaseService } = require('../../domain/services/LegalCaseService');
const { CaseAnalysisService } = require('../../domain/services/CaseAnalysisService');
const { DocumentGenerationService } = require('../../domain/services/DocumentGenerationService');
const SQLiteCaseRepository = require('../../infrastructure/repositories/sqlite/SQLiteCaseRepository');
const OllamaClient = require('../../main/api/OllamaClient');
const LegalSecurityManager = require('../../main/security/LegalSecurityManager');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

class ChatService {
  constructor() {
    this.repository = null;
    this.caseService = null;
    this.analysisService = null;
    this.documentService = null;
    this.ollamaClient = null;
    this.securityManager = null;
    this.currentCase = null;
    this.currentSession = null;
    this.logger = null;

    // Performance optimizations
    this.responseCache = new Map();
    this.cacheSize = 100; // Limit cache size
    this.cacheTTL = 15 * 60 * 1000; // 15 minutes
    this.performanceMetrics = {
      avgResponseTime: 0,
      totalRequests: 0,
      cacheHits: 0,
      errors: 0
    };

    // Transaction support
    this.activeTransaction = null;
    this.transactionQueue = [];

    // Batch operations support
    this.batchQueue = new Map();
    this.batchTimeout = null;
    this.batchDelayMs = 100;

    this.initialize();
  }

  async initialize() {
    try {
      // Initialize logger
      this.logger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.simple()
            )
          })
        ]
      });

      // Initialize repository with mock database for now
      // In production, this would be injected via dependency injection
      const mockDatabase = {
        executeQuery: async () => [],
        initialize: async () => true
      };
      const mockSecurityManager = {
        encryptData: (data) => ({ encrypted: JSON.stringify(data) }),
        decryptData: (data) => JSON.parse(data.encrypted || '{}'),
        validateAccess: () => true
      };
      this.repository = new SQLiteCaseRepository(mockDatabase, mockSecurityManager);

      // Initialize domain services
      this.caseService = new LegalCaseService(this.repository);
      this.analysisService = new CaseAnalysisService();
      this.documentService = new DocumentGenerationService();

      // Initialize infrastructure services
      this.ollamaClient = new OllamaClient();
      this.securityManager = new LegalSecurityManager();

      // Initialize session
      this.currentSession = {
        id: uuidv4(),
        userId: 'user-' + Date.now(),
        role: 'client',
        permissions: ['read_own_cases', 'create_cases', 'chat'],
        isActive: true,
        startedAt: new Date()
      };

      this.logger.info('ChatService initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize ChatService:', error);
      throw error;
    }
  }

  /**
   * Process a user message and generate AI response
   * This is the main entry point for chat interactions
   * Optimized with caching, performance monitoring, and error handling
   */
  async processMessage(message, context = {}) {
    const startTime = Date.now();
    const messageHash = this._generateMessageHash(message, context);

    try {
      this.logger.info('Processing message', {
        messageLength: message.length,
        messageHash: messageHash.substring(0, 8),
        cacheSize: this.responseCache.size
      });

      // Check cache first for performance
      const cachedResponse = this._getCachedResponse(messageHash);
      if (cachedResponse) {
        this.performanceMetrics.cacheHits++;
        this.logger.info('Cache hit for message', { messageHash: messageHash.substring(0, 8) });
        return cachedResponse;
      }

      // Validate access with enhanced error context
      const accessValidation = this.securityManager.validateAccess(this.currentSession, 'chat');
      if (!accessValidation) {
        this._recordError('ACCESS_DENIED', 'User lacks chat permissions');
        throw new Error('Access denied for chat operations');
      }

      // Detect case type and urgency
      const analysis = await this.analysisService.analyzeCaseFromText(message);

      // Create or update case if needed
      if (!this.currentCase && analysis.shouldCreateCase) {
        this.currentCase = await this.createCaseFromMessage(message, analysis);
      }

      // Add message to case history if we have a case
      if (this.currentCase) {
        const note = new CaseNote({
          id: uuidv4(),
          caseId: this.currentCase.id,
          content: message,
          author: this.currentSession.userId,
          type: 'client_message',
          isPrivileged: true
        });
        await this.repository.addCaseNote(this.currentCase.id, note);
      }

      // Generate AI response
      const aiResponse = await this.generateAIResponse(message, analysis, context);

      // Add AI response to case history
      if (this.currentCase) {
        const aiNote = new CaseNote({
          id: uuidv4(),
          caseId: this.currentCase.id,
          content: aiResponse.content,
          author: 'VETERAN_PARALEGAL',
          type: 'ai_response',
          metadata: {
            confidence: aiResponse.confidence,
            suggestions: aiResponse.suggestions,
            resources: aiResponse.resources
          }
        });
        await this.repository.addCaseNote(this.currentCase.id, aiNote);
      }

      // Log for audit trail
      this.securityManager.auditLog('CHAT', 'MESSAGE_PROCESSED', {
        sessionId: this.currentSession.id,
        caseId: this.currentCase?.id,
        messageLength: message.length,
        responseLength: aiResponse.content.length
      });

      const result = {
        success: true,
        response: aiResponse,
        case: this.currentCase ? this.sanitizeCaseForClient(this.currentCase) : null,
        analysis: analysis,
        performance: {
          responseTime: Date.now() - startTime,
          cached: false,
          processingSteps: ['analysis', 'ai_generation', 'case_update']
        }
      };

      // Cache the response for future use
      this._cacheResponse(messageHash, result);

      // Update performance metrics
      this._updatePerformanceMetrics(Date.now() - startTime, true);

      return result;

    } catch (error) {
      this.logger.error('Error processing message:', error);

      // Enhanced error handling with categorization
      const errorCategory = this._categorizeError(error);
      this._recordError(errorCategory, error.message);

      // Update performance metrics
      this._updatePerformanceMetrics(Date.now() - startTime, false);

      // Log security-relevant errors with more context
      if (error.message.includes('Access denied')) {
        this.securityManager.auditLog('SECURITY', 'ACCESS_DENIED', {
          sessionId: this.currentSession?.id,
          operation: 'chat',
          messageHash: messageHash.substring(0, 8),
          timestamp: new Date().toISOString()
        });
      }

      // Rollback any active transaction
      if (this.activeTransaction) {
        await this._rollbackTransaction().catch(rollbackError => {
          this.logger.error('Transaction rollback failed:', rollbackError);
        });
      }

      return {
        success: false,
        error: this._getUserFriendlyError(errorCategory),
        errorCode: errorCategory,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        performance: {
          responseTime: Date.now() - startTime,
          cached: false,
          failed: true
        }
      };
    }
  }

  /**
   * Generate AI response using Ollama
   */
  async generateAIResponse(message, analysis, context) {
    try {
      // Check if Ollama is available
      const isAvailable = await this.ollamaClient.checkAvailability();

      if (!isAvailable) {
        // Fallback to template-based response
        return this.generateTemplateResponse(message, analysis);
      }

      // Prepare prompt with legal context
      const systemPrompt = this.buildSystemPrompt(analysis);
      const userPrompt = this.buildUserPrompt(message, context);

      // Generate response using Ollama
      const response = await this.ollamaClient.generateResponse(
        userPrompt,
        systemPrompt,
        {
          temperature: 0.7,
          max_tokens: 1024,
          stream: false
        }
      );

      // Parse and enhance response
      const enhancedResponse = this.enhanceAIResponse(response, analysis);

      return enhancedResponse;

    } catch (error) {
      this.logger.error('Error generating AI response:', error);
      // Fallback to template response
      return this.generateTemplateResponse(message, analysis);
    }
  }

  /**
   * Build system prompt for legal AI assistant
   */
  buildSystemPrompt(analysis) {
    const basePrompt = `You are VETERAN PARALEGAL, an experienced legal assistant helping with ${analysis.category || 'general legal'} matters in the UK.

Your role is to:
1. Provide practical, actionable legal information (NOT legal advice)
2. Help users understand their rights and options
3. Suggest appropriate next steps and resources
4. Identify urgent situations requiring immediate action
5. Use clear, simple language avoiding legal jargon

Important guidelines:
- Always clarify you provide information, not legal advice
- Recommend consulting a solicitor for complex matters
- Highlight time-sensitive issues (limitation periods, deadlines)
- Be empathetic and supportive
- Focus on UK law unless specified otherwise
- Protect attorney-client privilege when discussing sensitive matters`;

    // Add case-specific context
    if (analysis.category) {
      const categoryContext = this.getCategorySpecificContext(analysis.category);
      return `${basePrompt}\n\nSpecific expertise: ${categoryContext}`;
    }

    return basePrompt;
  }

  /**
   * Build user prompt with context
   */
  buildUserPrompt(message, context) {
    let prompt = message;

    // Add case history if available
    if (this.currentCase && context.includeHistory) {
      const history = this.getCaseHistorySummary();
      prompt = `Previous context: ${history}\n\nCurrent message: ${message}`;
    }

    // Add specific questions to address
    if (context.specificQuestions) {
      prompt += `\n\nPlease specifically address: ${context.specificQuestions.join(', ')}`;
    }

    return prompt;
  }

  /**
   * Generate template-based response when AI is unavailable
   */
  generateTemplateResponse(message, analysis) {
    const templates = {
      housing: {
        content: `I understand you're facing a housing issue. Based on what you've described, here are some general points:

**Your Rights:**
- You have the right to proper notice before eviction (usually 2 months for Section 21)
- Your landlord must follow proper legal procedures
- Illegal eviction is a criminal offense

**Immediate Actions:**
1. Document everything (photos, emails, texts)
2. Check if your deposit was properly protected
3. Review your tenancy agreement

**Resources:**
- Shelter: 0808 800 4444 (free housing advice)
- Citizens Advice: for local support
- Council housing team: for homelessness prevention

**Important:** This is general information only. Please consult a housing solicitor for advice specific to your situation.`,
        confidence: 0.7,
        suggestions: [
          'Document all communications with your landlord',
          'Check deposit protection status',
          'Contact Shelter for specialist advice'
        ],
        resources: [
          { name: 'Shelter', url: 'https://shelter.org.uk', type: 'charity' },
          { name: 'Citizens Advice', url: 'https://citizensadvice.org.uk', type: 'advisory' }
        ]
      },
      employment: {
        content: `I understand you're dealing with an employment matter. Here's some general information:

**Your Rights:**
- Protection from unfair dismissal (after 2 years service usually)
- Right to written terms of employment
- Protection from discrimination

**Key Steps:**
1. Review your employment contract
2. Check company grievance procedures
3. Keep records of all incidents

**Time Limits:**
- Employment tribunal claims: usually 3 months less 1 day
- ACAS early conciliation required first

**Resources:**
- ACAS: 0300 123 1100 (free conciliation service)
- Citizens Advice: employment rights information

**Note:** Employment law is complex. Consider consulting an employment solicitor, especially if time limits are approaching.`,
        confidence: 0.7,
        suggestions: [
          'Document all workplace incidents',
          'Contact ACAS for early conciliation',
          'Check time limits for tribunal claims'
        ],
        resources: [
          { name: 'ACAS', url: 'https://acas.org.uk', type: 'government' },
          { name: 'Employment Tribunals', url: 'https://gov.uk/employment-tribunals', type: 'government' }
        ]
      },
      default: {
        content: `I understand you need legal information. While I cannot provide specific legal advice, here's some general guidance:

**General Steps:**
1. Document everything related to your issue
2. Gather relevant paperwork and evidence
3. Note important dates and deadlines
4. Consider your desired outcome

**Getting Help:**
- Citizens Advice: Free, confidential advice
- Legal Aid: Check if you qualify for free legal help
- Solicitors: Many offer free initial consultations

**Important Deadlines:**
Many legal issues have strict time limits. Don't delay in seeking help if you're unsure.

**Disclaimer:** This is general legal information only. For advice specific to your situation, please consult a qualified solicitor.

Would you like to provide more details about your situation?`,
        confidence: 0.5,
        suggestions: [
          'Provide more specific details about your situation',
          'Check Citizens Advice for general guidance',
          'Consider consulting a solicitor'
        ],
        resources: [
          { name: 'Citizens Advice', url: 'https://citizensadvice.org.uk', type: 'advisory' },
          { name: 'Legal Aid', url: 'https://gov.uk/legal-aid', type: 'government' }
        ]
      }
    };

    const category = analysis.category || 'default';
    const template = templates[category] || templates.default;

    return template;
  }

  /**
   * Enhance AI response with structured data
   */
  enhanceAIResponse(rawResponse, analysis) {
    // Extract key information from response
    const suggestions = this.extractSuggestions(rawResponse);
    const resources = this.extractResources(rawResponse, analysis.category);
    const urgentActions = this.extractUrgentActions(rawResponse);

    return {
      content: rawResponse,
      confidence: 0.8, // Base confidence for AI responses
      suggestions: suggestions,
      resources: resources,
      urgentActions: urgentActions,
      category: analysis.category,
      metadata: {
        generatedAt: new Date(),
        model: 'ollama',
        analysisScore: analysis.confidence
      }
    };
  }

  /**
   * Create a new case from user message
   */
  async createCaseFromMessage(message, analysis) {
    try {
      const caseData = {
        clientId: this.currentSession.userId,
        title: this.generateCaseTitle(message, analysis),
        description: message,
        category: analysis.category || 'general',
        status: 'intake',
        urgencyLevel: analysis.urgency || 'normal',
        metadata: {
          source: 'chat',
          sessionId: this.currentSession.id,
          initialAnalysis: analysis
        }
      };

      const newCase = await this.caseService.createCase(caseData);

      this.logger.info('Case created from chat', {
        caseId: newCase.id,
        category: newCase.category
      });

      return newCase;

    } catch (error) {
      this.logger.error('Error creating case:', error);
      throw error;
    }
  }

  /**
   * Generate case title from message
   */
  generateCaseTitle(message, analysis) {
    // Take first 50 chars of message or use category
    const prefix = analysis.category ?
      `${analysis.category.charAt(0).toUpperCase() + analysis.category.slice(1)} Issue: ` :
      'Legal Matter: ';

    const snippet = message.substring(0, 50).replace(/\n/g, ' ');
    const suffix = message.length > 50 ? '...' : '';

    return prefix + snippet + suffix;
  }

  /**
   * Get case history summary for context
   */
  getCaseHistorySummary() {
    if (!this.currentCase || !this.currentCase.notes || this.currentCase.notes.length === 0) {
      return 'No previous conversation history.';
    }

    // Get last 3 exchanges
    const recentNotes = this.currentCase.notes.slice(-6);
    const summary = recentNotes
      .map(note => `${note.type === 'client_message' ? 'Client' : 'Assistant'}: ${note.content.substring(0, 100)}...`)
      .join('\n');

    return summary;
  }

  /**
   * Extract suggestions from AI response
   */
  extractSuggestions(response) {
    const suggestions = [];

    // Look for numbered lists or bullet points
    const patterns = [
      /^\d+\.\s+(.+)$/gm,
      /^[-•]\s+(.+)$/gm,
      /^[A-Z][a-z]+:\s+(.+)$/gm
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        if (match[1].length < 200) { // Reasonable suggestion length
          suggestions.push(match[1].trim());
        }
      }
    });

    // Limit to top 5 suggestions
    return suggestions.slice(0, 5);
  }

  /**
   * Extract resources from response based on category
   */
  extractResources(response, category) {
    const resources = [];

    // Category-specific resources
    const categoryResources = {
      housing: [
        { name: 'Shelter', url: 'https://shelter.org.uk', type: 'charity' },
        { name: 'Housing Ombudsman', url: 'https://housing-ombudsman.org.uk', type: 'ombudsman' }
      ],
      employment: [
        { name: 'ACAS', url: 'https://acas.org.uk', type: 'government' },
        { name: 'Employment Tribunals', url: 'https://gov.uk/employment-tribunals', type: 'government' }
      ],
      consumer: [
        { name: 'Trading Standards', url: 'https://tradingstandards.uk', type: 'government' },
        { name: 'Financial Ombudsman', url: 'https://financial-ombudsman.org.uk', type: 'ombudsman' }
      ]
    };

    // Add category-specific resources if mentioned in response
    if (categoryResources[category]) {
      categoryResources[category].forEach(resource => {
        if (response.toLowerCase().includes(resource.name.toLowerCase())) {
          resources.push(resource);
        }
      });
    }

    // Always include Citizens Advice
    resources.push({
      name: 'Citizens Advice',
      url: 'https://citizensadvice.org.uk',
      type: 'advisory'
    });

    return resources;
  }

  /**
   * Extract urgent actions from response
   */
  extractUrgentActions(response) {
    const urgentActions = [];

    // Keywords indicating urgency
    const urgentKeywords = [
      'immediately',
      'urgent',
      'as soon as possible',
      'deadline',
      'time limit',
      'within.*days',
      'before.*expires'
    ];

    // Find sentences with urgent keywords
    const sentences = response.split(/[.!?]+/);
    sentences.forEach(sentence => {
      urgentKeywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'i');
        if (regex.test(sentence)) {
          urgentActions.push(sentence.trim());
        }
      });
    });

    return urgentActions.slice(0, 3); // Limit to top 3 urgent actions
  }

  /**
   * Get category-specific context for prompts
   */
  getCategorySpecificContext(category) {
    const contexts = {
      housing: 'UK housing law, tenancy rights, eviction procedures, deposit protection, repairs and maintenance obligations, council housing, homelessness prevention',
      employment: 'UK employment rights, unfair dismissal, discrimination, redundancy, TUPE, wages and deductions, contracts, grievance procedures',
      consumer: 'Consumer rights, faulty goods, services complaints, contracts, distance selling, refunds and returns',
      council: 'Council tax, planning permission, parking fines, social services, housing benefit, council complaints',
      insurance: 'Insurance claims, policy disputes, unfair rejection, claim delays, premium disputes',
      debt: 'Debt management, creditor harassment, CCJs, bankruptcy, IVAs, statute-barred debts',
      benefits: 'Universal Credit, PIP, ESA, housing benefit, benefit appeals, sanctions'
    };

    return contexts[category] || 'general UK legal matters';
  }

  /**
   * Sanitize case data for client viewing
   */
  sanitizeCaseForClient(caseData) {
    // Remove sensitive internal metadata
    const sanitized = { ...caseData };
    delete sanitized.internalNotes;
    delete sanitized.securityMetadata;
    delete sanitized.auditTrail;

    return sanitized;
  }

  /**
   * Start a new conversation/case
   */
  async startNewConversation() {
    this.currentCase = null;
    this.currentSession.conversationId = uuidv4();

    this.logger.info('Started new conversation', {
      sessionId: this.currentSession.id,
      conversationId: this.currentSession.conversationId
    });

    return {
      success: true,
      conversationId: this.currentSession.conversationId
    };
  }

  /**
   * Load existing case for continuation
   */
  async loadCase(caseId) {
    try {
      const caseData = await this.repository.findById(caseId);

      if (!caseData) {
        throw new Error('Case not found');
      }

      // Verify access
      if (caseData.clientId !== this.currentSession.userId) {
        throw new Error('Access denied to this case');
      }

      this.currentCase = caseData;

      return {
        success: true,
        case: this.sanitizeCaseForClient(caseData)
      };

    } catch (error) {
      this.logger.error('Error loading case:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(limit = 20) {
    if (!this.currentCase) {
      return [];
    }

    const notes = this.currentCase.notes || [];
    return notes
      .filter(note => ['client_message', 'ai_response'].includes(note.type))
      .slice(-limit)
      .map(note => ({
        id: note.id,
        type: note.type === 'client_message' ? 'user' : 'assistant',
        content: note.content,
        timestamp: note.createdAt
      }));
  }

  /**
   * Generate document from conversation
   */
  async generateDocument(documentType) {
    if (!this.currentCase) {
      throw new Error('No active case for document generation');
    }

    try {
      const document = await this.documentService.generateFromCase(
        this.currentCase,
        documentType
      );

      // Save document to case
      await this.repository.addDocument(this.currentCase.id, document);

      return {
        success: true,
        document: document
      };

    } catch (error) {
      this.logger.error('Error generating document:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // =====================
  // PERFORMANCE OPTIMIZATION METHODS
  // =====================

  /**
   * Generate hash for message caching
   */
  _generateMessageHash(message, context) {
    const crypto = require('crypto');
    const hashInput = JSON.stringify({ message, context, sessionId: this.currentSession?.id });
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * Check cache for existing response
   */
  _getCachedResponse(messageHash) {
    const cached = this.responseCache.get(messageHash);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
      // Mark as cached response
      const response = { ...cached.response };
      response.performance.cached = true;
      response.performance.cacheAge = Date.now() - cached.timestamp;
      return response;
    }

    // Remove expired cache entry
    if (cached) {
      this.responseCache.delete(messageHash);
    }

    return null;
  }

  /**
   * Cache response for future use
   */
  _cacheResponse(messageHash, response) {
    // Implement LRU cache behavior
    if (this.responseCache.size >= this.cacheSize) {
      const oldestKey = this.responseCache.keys().next().value;
      this.responseCache.delete(oldestKey);
    }

    this.responseCache.set(messageHash, {
      response: { ...response },
      timestamp: Date.now()
    });
  }

  /**
   * Update performance metrics
   */
  _updatePerformanceMetrics(responseTime, success) {
    this.performanceMetrics.totalRequests++;

    if (success) {
      // Update average response time
      this.performanceMetrics.avgResponseTime =
        (this.performanceMetrics.avgResponseTime * (this.performanceMetrics.totalRequests - 1) + responseTime) /
        this.performanceMetrics.totalRequests;
    } else {
      this.performanceMetrics.errors++;
    }
  }

  /**
   * Categorize errors for better handling
   */
  _categorizeError(error) {
    if (error.message.includes('Access denied')) return 'ACCESS_DENIED';
    if (error.message.includes('Database')) return 'DATABASE_ERROR';
    if (error.message.includes('Network') || error.message.includes('connection')) return 'NETWORK_ERROR';
    if (error.message.includes('Validation')) return 'VALIDATION_ERROR';
    if (error.message.includes('timeout')) return 'TIMEOUT_ERROR';
    if (error.message.includes('rate limit')) return 'RATE_LIMIT_ERROR';
    return 'UNKNOWN_ERROR';
  }

  /**
   * Record error for monitoring
   */
  _recordError(category, message) {
    this.performanceMetrics.errors++;
    this.logger.error('Categorized error', {
      category: category,
      message: message,
      timestamp: new Date().toISOString(),
      sessionId: this.currentSession?.id
    });
  }

  /**
   * Get user-friendly error message
   */
  _getUserFriendlyError(errorCategory) {
    const errorMessages = {
      'ACCESS_DENIED': 'You do not have permission to perform this action. Please check your session.',
      'DATABASE_ERROR': 'There was an issue accessing your case data. Please try again.',
      'NETWORK_ERROR': 'Connection issue detected. Please check your internet connection.',
      'VALIDATION_ERROR': 'The information provided is not valid. Please check and try again.',
      'TIMEOUT_ERROR': 'The request took too long to process. Please try again.',
      'RATE_LIMIT_ERROR': 'Too many requests. Please wait a moment before trying again.',
      'UNKNOWN_ERROR': 'An unexpected error occurred. Please try again or contact support.'
    };

    return errorMessages[errorCategory] || errorMessages['UNKNOWN_ERROR'];
  }

  // =====================
  // TRANSACTION SUPPORT METHODS
  // =====================

  /**
   * Begin database transaction
   */
  async beginTransaction() {
    try {
      if (this.activeTransaction) {
        throw new Error('Transaction already active');
      }

      await this.repository.beginTransaction();
      this.activeTransaction = {
        id: require('uuid').v4(),
        startTime: Date.now(),
        operations: []
      };

      this.logger.info('Transaction started', {
        transactionId: this.activeTransaction.id
      });

      return this.activeTransaction.id;
    } catch (error) {
      this.logger.error('Failed to begin transaction:', error);
      throw error;
    }
  }

  /**
   * Commit active transaction
   */
  async commitTransaction() {
    try {
      if (!this.activeTransaction) {
        throw new Error('No active transaction to commit');
      }

      await this.repository.commitTransaction();

      this.logger.info('Transaction committed', {
        transactionId: this.activeTransaction.id,
        duration: Date.now() - this.activeTransaction.startTime,
        operations: this.activeTransaction.operations.length
      });

      this.activeTransaction = null;
      return true;
    } catch (error) {
      this.logger.error('Failed to commit transaction:', error);
      await this._rollbackTransaction();
      throw error;
    }
  }

  /**
   * Rollback active transaction
   */
  async _rollbackTransaction() {
    try {
      if (!this.activeTransaction) {
        return;
      }

      await this.repository.rollbackTransaction();

      this.logger.warn('Transaction rolled back', {
        transactionId: this.activeTransaction.id,
        duration: Date.now() - this.activeTransaction.startTime,
        operations: this.activeTransaction.operations.length
      });

      this.activeTransaction = null;
    } catch (error) {
      this.logger.error('Failed to rollback transaction:', error);
      this.activeTransaction = null; // Clear even if rollback failed
    }
  }

  /**
   * Execute operations in transaction
   */
  async executeInTransaction(operations) {
    const transactionId = await this.beginTransaction();

    try {
      const results = [];

      for (const operation of operations) {
        const result = await operation();
        results.push(result);

        this.activeTransaction.operations.push({
          operation: operation.name || 'anonymous',
          timestamp: Date.now(),
          success: true
        });
      }

      await this.commitTransaction();
      return results;

    } catch (error) {
      await this._rollbackTransaction();
      throw error;
    }
  }

  // =====================
  // BATCH OPERATIONS SUPPORT
  // =====================

  /**
   * Add operation to batch queue
   */
  addToBatch(operation, priority = 'normal') {
    const batchId = operation.batchId || require('uuid').v4();

    if (!this.batchQueue.has(batchId)) {
      this.batchQueue.set(batchId, {
        operations: [],
        priority: priority,
        createdAt: Date.now()
      });
    }

    this.batchQueue.get(batchId).operations.push(operation);

    // Schedule batch processing
    this._scheduleBatchProcessing();

    return batchId;
  }

  /**
   * Schedule batch processing
   */
  _scheduleBatchProcessing() {
    if (this.batchTimeout) {
      return; // Already scheduled
    }

    this.batchTimeout = setTimeout(async () => {
      await this._processBatches();
      this.batchTimeout = null;
    }, this.batchDelayMs);
  }

  /**
   * Process all queued batches
   */
  async _processBatches() {
    const batches = Array.from(this.batchQueue.entries())
      .sort(([, a], [, b]) => {
        // Sort by priority then by age
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        const aPriority = priorityOrder[a.priority] || 2;
        const bPriority = priorityOrder[b.priority] || 2;

        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }

        return a.createdAt - b.createdAt;
      });

    for (const [batchId, batch] of batches) {
      try {
        await this._processBatch(batchId, batch);
        this.batchQueue.delete(batchId);
      } catch (error) {
        this.logger.error('Batch processing failed', {
          batchId: batchId,
          operationCount: batch.operations.length,
          error: error.message
        });
      }
    }
  }

  /**
   * Process individual batch
   */
  async _processBatch(batchId, batch) {
    this.logger.info('Processing batch', {
      batchId: batchId,
      operationCount: batch.operations.length,
      priority: batch.priority
    });

    const transactionId = await this.beginTransaction();

    try {
      const results = [];

      for (const operation of batch.operations) {
        const result = await operation.execute();
        results.push(result);
      }

      await this.commitTransaction();

      this.logger.info('Batch processed successfully', {
        batchId: batchId,
        resultCount: results.length
      });

      return results;

    } catch (error) {
      await this._rollbackTransaction();
      throw error;
    }
  }

  // =====================
  // MONITORING AND DIAGNOSTICS
  // =====================

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheStats: {
        size: this.responseCache.size,
        hitRate: this.performanceMetrics.totalRequests > 0 ?
          (this.performanceMetrics.cacheHits / this.performanceMetrics.totalRequests * 100).toFixed(2) + '%' : '0%',
        maxSize: this.cacheSize
      },
      errorRate: this.performanceMetrics.totalRequests > 0 ?
        (this.performanceMetrics.errors / this.performanceMetrics.totalRequests * 100).toFixed(2) + '%' : '0%',
      averageResponseTime: Math.round(this.performanceMetrics.avgResponseTime) + 'ms',
      activeBatches: this.batchQueue.size,
      hasActiveTransaction: !!this.activeTransaction
    };
  }

  /**
   * Clear performance cache
   */
  clearCache() {
    this.responseCache.clear();
    this.logger.info('Response cache cleared');
  }

  /**
   * Optimize performance settings
   */
  optimizePerformance(settings = {}) {
    this.cacheSize = settings.cacheSize || this.cacheSize;
    this.cacheTTL = settings.cacheTTL || this.cacheTTL;
    this.batchDelayMs = settings.batchDelayMs || this.batchDelayMs;

    this.logger.info('Performance settings updated', {
      cacheSize: this.cacheSize,
      cacheTTL: this.cacheTTL,
      batchDelayMs: this.batchDelayMs
    });
  }

  /**
   * Health check for service
   */
  async healthCheck() {
    const healthStatus = {
      service: 'ChatService',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {}
    };

    try {
      // Check repository connection
      healthStatus.checks.repository = await this.repository.exists('health-check') ? 'healthy' : 'healthy';

      // Check security manager
      healthStatus.checks.security = this.securityManager ? 'healthy' : 'unhealthy';

      // Check Ollama client
      healthStatus.checks.ollama = await this.ollamaClient?.checkAvailability() ? 'healthy' : 'degraded';

      // Check cache performance
      const cacheHitRate = this.performanceMetrics.totalRequests > 0 ?
        (this.performanceMetrics.cacheHits / this.performanceMetrics.totalRequests) : 0;
      healthStatus.checks.cache = cacheHitRate > 0.3 ? 'healthy' : 'degraded';

      // Check error rate
      const errorRate = this.performanceMetrics.totalRequests > 0 ?
        (this.performanceMetrics.errors / this.performanceMetrics.totalRequests) : 0;
      healthStatus.checks.errorRate = errorRate < 0.05 ? 'healthy' : 'degraded';

      // Overall status
      const checkStatuses = Object.values(healthStatus.checks);
      if (checkStatuses.includes('unhealthy')) {
        healthStatus.status = 'unhealthy';
      } else if (checkStatuses.includes('degraded')) {
        healthStatus.status = 'degraded';
      }

      healthStatus.metrics = this.getPerformanceMetrics();

    } catch (error) {
      healthStatus.status = 'unhealthy';
      healthStatus.error = error.message;
    }

    return healthStatus;
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    try {
      // Process any remaining batches
      if (this.batchQueue.size > 0) {
        await this._processBatches();
      }

      // Clear batch timeout
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
        this.batchTimeout = null;
      }

      // Rollback any active transaction
      if (this.activeTransaction) {
        await this._rollbackTransaction();
      }

      // Clear cache
      this.responseCache.clear();

      this.logger.info('ChatService cleaned up successfully');
    } catch (error) {
      this.logger.error('Error during ChatService cleanup:', error);
    }
  }
}

module.exports = ChatService;