/**
 * Enhanced Ollama Client for Justice Companion
 * Advanced AI integration with legal-specific optimizations
 */

const { Ollama } = require('ollama');
const EventEmitter = require('events');
const CircuitBreaker = require('./CircuitBreaker');
const RateLimiter = require('./RateLimiter');

class EnhancedOllamaClient extends EventEmitter {
  constructor(config = {}) {
    super();

    // Configuration
    this.config = {
      baseURL: config.baseURL || 'http://localhost:11434',
      defaultModel: config.model || 'llama3.1:8b',
      timeout: config.timeout || 120000,
      maxRetries: config.maxRetries || 3,
      temperature: config.temperature || 0.7,
      topP: config.topP || 0.9,
      maxTokens: config.maxTokens || 2048,
      contextWindow: config.contextWindow || 4096,
      mockMode: config.mockMode || false
    };

    // Initialize Ollama client
    this.client = new Ollama({ host: this.config.baseURL });

    // Initialize circuit breaker and rate limiter
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      recoveryTimeout: 60000,
      successThreshold: 3,
      timeout: this.config.timeout
    });

    this.rateLimiter = new RateLimiter({
      perMinute: 30,
      perHour: 300,
      perDay: 1000,
      burstLimit: 5
    });

    // Model capabilities and configurations
    this.models = {
      'llama3.1:8b': {
        name: 'Llama 3.1 8B',
        contextLength: 8192,
        capabilities: ['legal-reasoning', 'document-analysis', 'conversation'],
        temperature: 0.7,
        legalPromptOptimized: true,
        reliability: 0.9
      },
      'llama3.1:70b': {
        name: 'Llama 3.1 70B',
        contextLength: 8192,
        capabilities: ['advanced-legal-reasoning', 'complex-analysis', 'document-drafting'],
        temperature: 0.6,
        legalPromptOptimized: true,
        reliability: 0.95
      },
      'mistral:7b': {
        name: 'Mistral 7B',
        contextLength: 4096,
        capabilities: ['legal-reasoning', 'conversation'],
        temperature: 0.8,
        legalPromptOptimized: false,
        reliability: 0.8
      },
      'codellama:13b': {
        name: 'Code Llama 13B',
        contextLength: 16384,
        capabilities: ['document-analysis', 'template-generation'],
        temperature: 0.5,
        legalPromptOptimized: false,
        reliability: 0.85
      }
    };

    // Available models cache
    this.availableModels = [];
    this.modelLoadStatus = new Map();

    // Connection status
    this.isConnected = false;
    this.lastConnectionCheck = null;
    this.connectionRetries = 0;

    // Legal prompt templates
    this.promptTemplates = this.initializeLegalPromptTemplates();

    // Performance metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      modelUsage: {},
      promptTypes: {},
      errorTypes: {}
    };

    // Setup event handlers
    this.setupEventHandlers();

    // Initialize connection
    this.initializeConnection();
  }

  /**
   * Initialize legal prompt templates
   */
  initializeLegalPromptTemplates() {
    return {
      'system_base': `You are Justice Companion, an AI assistant providing legal information to individuals in the UK.

CRITICAL SAFETY PROTOCOLS:
- Provide INFORMATION only, never legal advice
- Always distinguish between information and legal advice
- Include appropriate disclaimers about consulting qualified professionals
- Never suggest illegal activities
- Encourage professional legal consultation for complex matters
- Focus on empowering users with knowledge of their rights

RESPONSE GUIDELINES:
- Use clear, accessible language avoiding unnecessary legal jargon
- Provide structured information with actionable steps
- Reference relevant UK laws and regulations when appropriate
- Be supportive and understanding while maintaining professionalism
- Always emphasize: "This is legal information, not formal legal advice"

EMERGENCY PROTOCOLS:
- If emergency (domestic violence, immediate danger): Provide crisis resources immediately
- If complex legal area: Strongly recommend professional consultation
- If illegal activity requests: Redirect to ethical legal channels`,

      'landlord_tenant': `LANDLORD-TENANT LAW SPECIALIST MODE:

You are expertly trained in UK housing law with deep knowledge of:
- Housing Act 1988 and Housing Act 2004
- Tenant Fees Act 2019
- Deregulation Act 2015 (Section 21 notices)
- Tenancy deposit protection schemes
- Right to Rent regulations
- Local Housing Allowance rules

Key areas of expertise:
- Deposit protection and disputes
- Eviction procedures (Section 8 & Section 21)
- Repair responsibilities and housing standards
- Rent increases and rent review procedures
- Tenancy agreement terms and unfair clauses
- Housing benefit and Universal Credit housing elements

For each response, consider:
1. The specific tenancy type (AST, periodic, etc.)
2. Relevant timescales and notice periods
3. Available remedies and next steps
4. Evidence requirements
5. Professional resources available

Always provide specific statutory references where applicable.`,

      'consumer_rights': `CONSUMER RIGHTS SPECIALIST MODE:

You are expertly trained in UK consumer protection law:
- Consumer Rights Act 2015
- Consumer Credit Act 1974
- Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013
- Consumer Protection from Unfair Trading Regulations 2008
- Distance Selling Regulations
- Section 75 Credit Card Protection

Key specializations:
- 30-day right to reject faulty goods
- Repair, replace, or refund remedies
- Digital content and services rights
- Credit agreements and finance protection
- Unfair contract terms
- Distance selling and online purchases
- Chargeback and Section 75 claims

For each response, consider:
1. Time limits for claims
2. Evidence requirements
3. Alternative dispute resolution options
4. Small claims procedures
5. Relevant ombudsman schemes

Provide clear action plans with timescales.`,

      'employment_rights': `EMPLOYMENT LAW SPECIALIST MODE:

You are expertly trained in UK employment law:
- Employment Rights Act 1996
- Equality Act 2010
- Working Time Regulations 1998
- Trade Union and Labour Relations Act 1992
- Employment Tribunals Act 1996
- ACAS Code of Practice

Key areas of expertise:
- Unfair dismissal and redundancy
- Discrimination and harassment
- Working time and holiday entitlements
- Wages and National Minimum Wage
- Disciplinary and grievance procedures
- Trade union rights
- TUPE transfers

For each response, consider:
1. Qualifying periods for rights
2. Time limits for tribunal claims
3. ACAS early conciliation requirements
4. Evidence and documentation needs
5. Potential remedies and compensation

Always mention ACAS resources and early conciliation.`,

      'family_law': `FAMILY LAW SPECIALIST MODE:

You are expertly trained in UK family law:
- Children Act 1989
- Matrimonial Causes Act 1973
- Civil Partnership Act 2004
- Domestic Violence, Crime and Victims Act 2004
- Family Law Act 1996
- Child Support Act 1991

Key areas of expertise:
- Divorce and civil partnership dissolution
- Child arrangements and custody
- Financial settlements and maintenance
- Domestic violence protection orders
- Adoption and parental responsibility
- Child support calculations

SPECIAL SENSITIVITY REQUIREMENTS:
- Prioritize safety in domestic violence situations
- Provide immediate crisis resources when needed
- Be especially supportive and non-judgmental
- Consider safeguarding issues involving children
- Emphasize confidentiality and safety planning

For each response, consider:
1. Immediate safety concerns
2. Court procedures and timescales
3. Legal aid eligibility
4. Mediation and alternative dispute resolution
5. Child welfare and best interests`,

      'debt_finance': `DEBT AND FINANCE SPECIALIST MODE:

You are expertly trained in UK debt and financial law:
- Consumer Credit Act 1974
- Insolvency Act 1986
- Financial Services and Markets Act 2000
- Consumer Credit (Disclosure of Information) Regulations
- Administration of Justice Act 1970
- Limitation Act 1980

Key areas of expertise:
- Debt collection procedures and rights
- Bailiff and enforcement agent powers
- Individual Voluntary Arrangements (IVAs)
- Bankruptcy procedures
- Debt Relief Orders (DROs)
- County Court Judgments (CCJs)
- Prescription and limitation periods

For each response, consider:
1. Urgency of debt enforcement action
2. Available debt solutions and eligibility
3. Priority and non-priority debts
4. Negotiation strategies with creditors
5. Protection from harassment

Always emphasize free debt advice services.`
    };
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    this.circuitBreaker.on('state_change', (data) => {
      this.emit('circuit_breaker_state', data);
    });

    this.circuitBreaker.on('request_failed', (data) => {
      this.emit('request_failed', data);
    });

    this.circuitBreaker.on('request_success', (data) => {
      this.emit('request_success', data);
    });
  }

  /**
   * Initialize connection and check available models
   */
  async initializeConnection() {
    try {
      await this.checkConnection();
      await this.loadAvailableModels();
      this.emit('initialization_complete', {
        connected: this.isConnected,
        availableModels: this.availableModels.length,
        defaultModel: this.config.defaultModel
      });
    } catch (error) {
      this.emit('initialization_failed', { error: error.message });
    }
  }

  /**
   * Check Ollama connection
   */
  async checkConnection() {
    try {
      if (this.config.mockMode) {
        this.isConnected = true;
        this.lastConnectionCheck = Date.now();
        return true;
      }

      const models = await this.client.list();
      this.isConnected = true;
      this.lastConnectionCheck = Date.now();
      this.connectionRetries = 0;

      this.emit('connection_established', {
        timestamp: new Date().toISOString(),
        availableModels: models.models?.length || 0
      });

      return true;
    } catch (error) {
      this.isConnected = false;
      this.connectionRetries++;

      this.emit('connection_failed', {
        error: error.message,
        retries: this.connectionRetries,
        timestamp: new Date().toISOString()
      });

      return false;
    }
  }

  /**
   * Load available models
   */
  async loadAvailableModels() {
    if (this.config.mockMode) {
      this.availableModels = Object.keys(this.models);
      return this.availableModels;
    }

    try {
      const response = await this.client.list();
      this.availableModels = response.models?.map(model => model.name) || [];

      // Update model load status
      for (const modelName of this.availableModels) {
        this.modelLoadStatus.set(modelName, 'available');
      }

      this.emit('models_loaded', {
        count: this.availableModels.length,
        models: this.availableModels
      });

      return this.availableModels;
    } catch (error) {
      this.emit('models_load_failed', { error: error.message });
      return [];
    }
  }

  /**
   * Select best model for the task
   */
  selectBestModel(domain, complexity = 'medium', preferredModel = null) {
    if (preferredModel && this.availableModels.includes(preferredModel)) {
      return preferredModel;
    }

    // If no models available, use default
    if (this.availableModels.length === 0) {
      return this.config.defaultModel;
    }

    // Model selection logic based on domain and complexity
    const domainModelPreferences = {
      'FAMILY_LAW': ['llama3.1:70b', 'llama3.1:8b', 'mistral:7b'],
      'LANDLORD_TENANT': ['llama3.1:8b', 'llama3.1:70b', 'mistral:7b'],
      'EMPLOYMENT_RIGHTS': ['llama3.1:70b', 'llama3.1:8b', 'mistral:7b'],
      'CONSUMER_RIGHTS': ['llama3.1:8b', 'mistral:7b', 'llama3.1:70b'],
      'DEBT_FINANCE': ['llama3.1:8b', 'mistral:7b', 'llama3.1:70b'],
      'DOCUMENT_ANALYSIS': ['codellama:13b', 'llama3.1:70b', 'llama3.1:8b'],
      'TEMPLATE_GENERATION': ['codellama:13b', 'llama3.1:70b'],
      'GENERAL': ['llama3.1:8b', 'mistral:7b', 'llama3.1:70b']
    };

    const preferences = domainModelPreferences[domain] || domainModelPreferences['GENERAL'];

    // Find first available model from preferences
    for (const modelName of preferences) {
      if (this.availableModels.includes(modelName)) {
        return modelName;
      }
    }

    // Fallback to any available model
    return this.availableModels[0] || this.config.defaultModel;
  }

  /**
   * Build legal prompt with domain-specific optimization
   */
  buildLegalPrompt(query, domain, context = {}) {
    const systemBase = this.promptTemplates.system_base;
    const domainSpecific = this.promptTemplates[domain.toLowerCase()] || '';

    const caseContext = context.caseType ? `\nCASE CONTEXT: ${context.caseType}` : '';
    const userContext = context.previousInteractions ?
      `\nPREVIOUS CONTEXT: ${context.previousInteractions}` : '';

    const fullSystemPrompt = `${systemBase}

${domainSpecific}${caseContext}${userContext}

Remember: Provide helpful legal information while maintaining appropriate boundaries between information and advice.`;

    return {
      system: fullSystemPrompt,
      user: query
    };
  }

  /**
   * Generate AI response with enhanced error handling
   */
  async generateResponse(query, options = {}) {
    const startTime = Date.now();
    const sessionId = options.sessionId || `session_${Date.now()}`;
    const domain = options.domain || 'GENERAL';

    this.metrics.totalRequests++;

    // Check rate limiting
    const rateLimitCheck = this.rateLimiter.checkRateLimit(sessionId, domain, options);
    if (!rateLimitCheck.allowed) {
      const error = new Error(`Rate limit exceeded. Please wait ${Math.ceil(rateLimitCheck.waitTime / 1000)} seconds.`);
      error.userMessage = `Too many requests. Please wait ${Math.ceil(rateLimitCheck.waitTime / 1000)} seconds before trying again.`;
      error.rateLimited = true;
      error.waitTime = rateLimitCheck.waitTime;
      throw error;
    }

    try {
      return await this.circuitBreaker.execute(async () => {
        return await this.executeAIRequest(query, options, domain, sessionId);
      }, { sessionId, domain, query: query.substring(0, 100) });

    } catch (error) {
      this.metrics.failedRequests++;
      this.recordError(error, domain);
      throw error;
    }
  }

  /**
   * Execute AI request with model optimization
   */
  async executeAIRequest(query, options, domain, sessionId) {
    // Select best model for the task
    const selectedModel = this.selectBestModel(domain, options.complexity, options.model);
    const modelConfig = this.models[selectedModel] || this.models[this.config.defaultModel];

    // Build optimized prompt
    const prompt = this.buildLegalPrompt(query, domain, options.context || {});

    // Prepare generation options
    const generationOptions = {
      model: selectedModel,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user }
      ],
      stream: false,
      options: {
        temperature: options.temperature || modelConfig.temperature || this.config.temperature,
        top_p: options.topP || this.config.topP,
        num_predict: options.maxTokens || this.config.maxTokens,
        num_ctx: modelConfig.contextLength || this.config.contextWindow
      }
    };

    if (this.config.mockMode) {
      return this.generateMockResponse(query, domain, selectedModel);
    }

    // Execute request
    const response = await this.client.chat(generationOptions);

    // Record success metrics
    const responseTime = Date.now() - Date.now();
    this.recordSuccess(selectedModel, domain, responseTime);

    return {
      content: response.message?.content || 'No response generated.',
      model: selectedModel,
      domain,
      sessionId,
      timestamp: new Date().toISOString(),
      responseTime,
      tokenUsage: {
        prompt: response.prompt_eval_count || 0,
        completion: response.eval_count || 0,
        total: (response.prompt_eval_count || 0) + (response.eval_count || 0)
      },
      confidence: this.calculateConfidence(response, modelConfig),
      metadata: {
        modelConfig,
        rateLimitInfo: this.rateLimiter.getCurrentLimits(),
        circuitBreakerState: this.circuitBreaker.getStatus().state
      }
    };
  }

  /**
   * Generate mock response for testing
   */
  generateMockResponse(query, domain, model) {
    const mockResponses = {
      'LANDLORD_TENANT': `**Housing Rights Information**

Based on your query about landlord-tenant issues, here's relevant legal information:

**Your Rights as a Tenant:**
• Right to live in a property that's fit for human habitation
• Protection from unfair eviction (landlord must follow proper procedures)
• Right to have your deposit protected in a government-approved scheme
• Right to request repairs for health and safety issues

**Next Steps:**
1. Document all communications with your landlord
2. Check if your deposit is protected (free online searches available)
3. Contact Shelter Housing Helpline: 0808 800 4444

⚠️ **Legal Disclaimer:** This is general legal information, not legal advice. For specific advice about your situation, please consult a qualified housing solicitor.

**Additional Resources:**
• Citizens Advice: 0808 223 1133
• Gov.uk Housing: www.gov.uk/housing
• Local Council Housing Department`,

      'CONSUMER_RIGHTS': `**Consumer Rights Information**

Based on your consumer rights query, here's relevant legal information:

**Your Consumer Rights (Consumer Rights Act 2015):**
• 30-day right to full refund for faulty goods
• Right to repair or replacement after 30 days
• Protection for digital content and services
• Section 75 credit card protection (£100-£30,000)

**Recommended Action Plan:**
1. Contact the company in writing
2. Reference specific consumer rights
3. Set reasonable deadline (usually 14 days)
4. Escalate to ombudsman if needed

⚠️ **Legal Disclaimer:** This is general legal information, not legal advice. Time limits and specific rights may vary.

**Useful Contacts:**
• Citizens Advice Consumer Service: 0808 223 1133
• Resolver (free complaints): www.resolver.co.uk`,

      'GENERAL': `**Legal Information Service**

Thank you for your query. I can provide general legal information to help you understand your situation and options.

**How I Can Help:**
• Explain your legal rights and protections
• Provide information about legal procedures
• Direct you to appropriate resources and support
• Help you understand next steps

**What You Should Know:**
• You have rights that are protected by law
• There are often multiple ways to resolve legal issues
• Taking action early can improve outcomes
• Professional legal advice may be beneficial for complex matters

⚠️ **Legal Disclaimer:** This is general legal information, not formal legal advice. For specific guidance about your situation, please consult a qualified legal professional.

**Professional Resources:**
• Citizens Advice: 0808 223 1133
• Law Society Find a Solicitor: www.lawsociety.org.uk
• Legal Aid: www.gov.uk/legal-aid`
    };

    return {
      content: mockResponses[domain] || mockResponses['GENERAL'],
      model: `${model} (mock)`,
      domain,
      timestamp: new Date().toISOString(),
      responseTime: Math.random() * 2000 + 500, // Mock response time
      confidence: 0.85,
      isMock: true,
      metadata: {
        mockMode: true
      }
    };
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(response, modelConfig) {
    let confidence = modelConfig.reliability || 0.8;

    // Adjust based on response characteristics
    if (response.message?.content) {
      const content = response.message.content;

      // Higher confidence for longer, detailed responses
      if (content.length > 500) confidence += 0.05;

      // Higher confidence for responses with legal references
      if (content.includes('Act') || content.includes('section') || content.includes('regulation')) {
        confidence += 0.1;
      }

      // Higher confidence if disclaimer included
      if (content.includes('Legal Disclaimer') || content.includes('legal advice')) {
        confidence += 0.05;
      }
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Record successful request
   */
  recordSuccess(model, domain, responseTime) {
    this.metrics.successfulRequests++;

    // Update model usage
    this.metrics.modelUsage[model] = (this.metrics.modelUsage[model] || 0) + 1;

    // Update domain usage
    this.metrics.promptTypes[domain] = (this.metrics.promptTypes[domain] || 0) + 1;

    // Update average response time
    if (this.metrics.averageResponseTime === 0) {
      this.metrics.averageResponseTime = responseTime;
    } else {
      this.metrics.averageResponseTime =
        (this.metrics.averageResponseTime + responseTime) / 2;
    }
  }

  /**
   * Record error for analysis
   */
  recordError(error, domain) {
    const errorType = this.classifyError(error);
    this.metrics.errorTypes[errorType] = (this.metrics.errorTypes[errorType] || 0) + 1;
  }

  /**
   * Classify error type
   */
  classifyError(error) {
    const message = error.message.toLowerCase();

    if (message.includes('connection') || message.includes('network')) {
      return 'CONNECTION_ERROR';
    } else if (message.includes('timeout')) {
      return 'TIMEOUT_ERROR';
    } else if (message.includes('rate limit')) {
      return 'RATE_LIMIT_ERROR';
    } else if (message.includes('model')) {
      return 'MODEL_ERROR';
    } else if (error.circuitBreakerOpen) {
      return 'CIRCUIT_BREAKER_ERROR';
    } else {
      return 'UNKNOWN_ERROR';
    }
  }

  /**
   * Get health status
   */
  async getHealthStatus() {
    const circuitBreakerStatus = this.circuitBreaker.getStatus();
    const rateLimiterStatus = this.rateLimiter.getStatusReport();

    return {
      connected: this.isConnected,
      lastCheck: this.lastConnectionCheck,
      circuitBreaker: circuitBreakerStatus,
      rateLimiter: rateLimiterStatus,
      availableModels: this.availableModels,
      defaultModel: this.config.defaultModel,
      metrics: this.metrics,
      configuration: this.config
    };
  }

  /**
   * Test connection with retry logic
   */
  async testConnection() {
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const connected = await this.checkConnection();
        if (connected) {
          return {
            connected: true,
            attempt,
            timestamp: new Date().toISOString()
          };
        }
      } catch (error) {
        if (attempt === this.config.maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    return {
      connected: false,
      attempts: this.config.maxRetries,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.circuitBreaker.destroy();
    this.rateLimiter.destroy();
    this.removeAllListeners();
  }
}

module.exports = EnhancedOllamaClient;