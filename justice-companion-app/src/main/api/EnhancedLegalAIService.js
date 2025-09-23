/**
 * Enhanced Legal AI Service for Justice Companion
 * Advanced AI orchestration with comprehensive legal safeguards, rate limiting, and fallback mechanisms
 */

const EventEmitter = require('events');
const EnhancedOllamaClient = require('./EnhancedOllamaClient');
const RateLimiter = require('./RateLimiter');
const CircuitBreaker = require('./CircuitBreaker');

class EnhancedLegalAIService extends EventEmitter {
  constructor(config = {}) {
    super();

    // Service configuration
    this.config = {
      ollamaURL: config.ollamaURL || 'http://localhost:11434',
      model: config.model || 'llama3.1:8b',
      timeout: config.timeout || 120000,
      cacheMaxSize: config.cacheMaxSize || 500,
      cacheMaxAge: config.cacheMaxAge || 900000, // 15 minutes
      mockMode: config.mockMode || false,
      enableAdvancedPrompts: config.enableAdvancedPrompts !== false,
      enableMultiModel: config.enableMultiModel !== false,
      enableFallbacks: config.enableFallbacks !== false
    };

    // Initialize enhanced Ollama client
    this.ollamaClient = new EnhancedOllamaClient({
      baseURL: this.config.ollamaURL,
      model: this.config.model,
      timeout: this.config.timeout,
      mockMode: this.config.mockMode
    });

    // Initialize rate limiter
    this.rateLimiter = new RateLimiter({
      perMinute: 40,
      perHour: 400,
      perDay: 2000,
      burstLimit: 8,
      maxConcurrentSessions: 100
    });

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 8,
      recoveryTimeout: 90000,
      successThreshold: 5,
      timeout: this.config.timeout
    });

    // Enhanced response cache with LRU eviction
    this.responseCache = new Map();
    this.cacheAccessOrder = new Map(); // For LRU tracking

    // Legal knowledge base and templates
    this.legalKnowledgeBase = this.initializeLegalKnowledgeBase();
    this.templateLibrary = this.initializeTemplateLibrary();
    this.emergencyResources = this.initializeEmergencyResources();

    // Session management
    this.activeSessions = new Map();
    this.sessionTimeouts = new Map();

    // AI model performance tracking
    this.modelPerformance = new Map();

    // Legal domain classification
    this.domainClassifier = this.initializeDomainClassifier();

    // Service metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cachedResponses: 0,
      templatedResponses: 0,
      fallbackResponses: 0,
      emergencyResponses: 0,
      averageResponseTime: 0,
      domainUsage: {},
      modelUsage: {},
      errorTypes: {},
      startTime: Date.now(),
      lastReset: Date.now()
    };

    // Setup event handlers
    this.setupEventHandlers();

    // Start monitoring and cleanup tasks
    this.startMonitoring();

    this.emit('enhanced_service_initialized', {
      config: this.config,
      capabilities: this.getServiceCapabilities(),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Initialize legal knowledge base
   */
  initializeLegalKnowledgeBase() {
    return {
      statutes: {
        'Housing Act 1988': {
          relevantSections: ['Section 8', 'Section 21', 'Schedule 2'],
          commonIssues: ['eviction procedures', 'assured tenancies', 'grounds for possession'],
          keyWords: ['landlord', 'tenant', 'eviction', 'notice', 'possession']
        },
        'Consumer Rights Act 2015': {
          relevantSections: ['Chapter 2', 'Chapter 3', 'Part 1'],
          commonIssues: ['faulty goods', 'refunds', 'repair or replace', 'digital content'],
          keyWords: ['consumer', 'refund', 'faulty', 'goods', 'services', 'digital']
        },
        'Employment Rights Act 1996': {
          relevantSections: ['Part X', 'Part XI', 'Part XII'],
          commonIssues: ['unfair dismissal', 'redundancy', 'working time', 'wages'],
          keyWords: ['employment', 'dismissal', 'redundancy', 'work', 'wages', 'discrimination']
        },
        'Equality Act 2010': {
          relevantSections: ['Part 5', 'Part 6', 'Part 13'],
          commonIssues: ['workplace discrimination', 'harassment', 'reasonable adjustments'],
          keyWords: ['discrimination', 'harassment', 'disability', 'equality', 'protected characteristics']
        }
      },
      procedures: {
        'Small Claims Court': {
          eligibility: 'Claims up to £10,000',
          process: ['Complete claim form', 'Pay court fee', 'Serve papers', 'Attend hearing'],
          timeframes: 'Usually 4-6 months from claim to hearing'
        },
        'Employment Tribunal': {
          eligibility: 'Employment disputes with qualifying service',
          process: ['ACAS early conciliation', 'Submit ET1 form', 'Response period', 'Hearing'],
          timeframes: '3 months minus 1 day from incident'
        },
        'Housing Tribunal': {
          eligibility: 'Tenancy deposit disputes and housing conditions',
          process: ['Online application', 'Evidence submission', 'Decision'],
          timeframes: '6-8 weeks for decision'
        }
      },
      emergencyContacts: {
        'Immediate Danger': {
          primary: { name: 'Emergency Services', number: '999', available: '24/7' },
          secondary: { name: 'Police Non-Emergency', number: '101', available: '24/7' }
        },
        'Domestic Violence': {
          primary: { name: 'National Domestic Violence Helpline', number: '0808 2000 247', available: '24/7' },
          secondary: { name: 'Women\'s Aid', number: '0808 2000 247', available: '24/7' }
        },
        'Mental Health Crisis': {
          primary: { name: 'Samaritans', number: '116 123', available: '24/7' },
          secondary: { name: 'Crisis Text Line', number: 'Text SHOUT to 85258', available: '24/7' }
        },
        'Housing Emergency': {
          primary: { name: 'Shelter Emergency Helpline', number: '0808 800 4444', available: '9am-5pm Mon-Fri' },
          secondary: { name: 'Local Council Housing', number: 'Contact local authority', available: 'Business hours' }
        }
      }
    };
  }

  /**
   * Initialize template library
   */
  initializeTemplateLibrary() {
    return {
      'complaint_letter_consumer': {
        title: 'Consumer Rights Complaint Letter',
        template: `Dear [COMPANY_NAME],

I am writing to formally request a full refund under the Consumer Rights Act 2015 for [PRODUCT/SERVICE] purchased on [DATE] for £[AMOUNT].

The issue: [DESCRIPTION_OF_PROBLEM]

Under the Consumer Rights Act 2015, I have the right to a full refund within 30 days if goods are faulty. As this issue occurred within the statutory period, I am entitled to reject the goods and receive a full refund.

I request that you:
1. Provide a full refund of £[AMOUNT]
2. Arrange collection of the faulty goods at no cost to me
3. Respond within 14 days of this letter

If you do not respond satisfactorily within 14 days, I will escalate this matter to the relevant ombudsman and consider small claims court action.

I look forward to your prompt response.

Yours faithfully,
[YOUR_NAME]
[DATE]

Legal basis: Consumer Rights Act 2015, Sections 20-24`,
        requiredFields: ['COMPANY_NAME', 'PRODUCT/SERVICE', 'DATE', 'AMOUNT', 'DESCRIPTION_OF_PROBLEM', 'YOUR_NAME'],
        legalReferences: ['Consumer Rights Act 2015'],
        domain: 'CONSUMER_RIGHTS'
      },

      'landlord_deposit_letter': {
        title: 'Tenancy Deposit Protection Demand Letter',
        template: `Dear [LANDLORD_NAME],

I am writing regarding the tenancy deposit of £[DEPOSIT_AMOUNT] paid for the property at [PROPERTY_ADDRESS] on [TENANCY_START_DATE].

I have checked the three government-approved deposit protection schemes (TDS, DPS, and MyDeposits) and cannot find any record of my deposit being protected.

Under the Housing Act 2004, you are legally required to protect tenancy deposits within 30 days of receipt. Failure to do so means I may be entitled to compensation of between one and three times the deposit amount.

I formally request that you:
1. Provide evidence of deposit protection within 7 days
2. Provide the prescribed information about the protection scheme
3. If not protected, immediately protect the deposit and pay compensation

If you cannot provide this evidence, I will assume the deposit is not protected and will consider taking action to recover compensation through the courts.

Yours sincerely,
[TENANT_NAME]
[DATE]

Legal basis: Housing Act 2004, Section 213; Localism Act 2011`,
        requiredFields: ['LANDLORD_NAME', 'DEPOSIT_AMOUNT', 'PROPERTY_ADDRESS', 'TENANCY_START_DATE', 'TENANT_NAME'],
        legalReferences: ['Housing Act 2004', 'Localism Act 2011'],
        domain: 'LANDLORD_TENANT'
      },

      'employment_grievance': {
        title: 'Formal Employment Grievance Letter',
        template: `Dear [MANAGER_NAME],

I am writing to raise a formal grievance under your grievance procedure regarding [ISSUE_SUMMARY].

Details of the grievance:
[DETAILED_DESCRIPTION]

This matter has affected me in the following ways:
[IMPACT_DESCRIPTION]

I believe this constitutes [LEGAL_ISSUE - e.g., discrimination, harassment, breach of contract] and may contravene [RELEVANT_LEGISLATION].

Previous attempts to resolve this informally:
[INFORMAL_RESOLUTION_ATTEMPTS]

I am seeking the following resolution:
[DESIRED_OUTCOME]

I would like to arrange a grievance meeting as soon as possible in accordance with the ACAS Code of Practice. I reserve the right to be accompanied by a trade union representative or colleague.

I expect to receive acknowledgment of this grievance within [COMPANY_POLICY_TIMEFRAME] working days and for the matter to be investigated thoroughly.

Yours sincerely,
[EMPLOYEE_NAME]
[DATE]

Copy to: HR Department`,
        requiredFields: ['MANAGER_NAME', 'ISSUE_SUMMARY', 'DETAILED_DESCRIPTION', 'IMPACT_DESCRIPTION', 'LEGAL_ISSUE', 'RELEVANT_LEGISLATION', 'EMPLOYEE_NAME'],
        legalReferences: ['Employment Rights Act 1996', 'ACAS Code of Practice'],
        domain: 'EMPLOYMENT_RIGHTS'
      }
    };
  }

  /**
   * Initialize emergency resources
   */
  initializeEmergencyResources() {
    return {
      'immediate_danger': {
        message: `🚨 **IMMEDIATE EMERGENCY DETECTED** 🚨

If you are in immediate physical danger, please:

**CALL 999 NOW** - Emergency Services

**OTHER EMERGENCY CONTACTS:**
• **Police (non-emergency):** 101
• **NHS 111:** For urgent medical advice
• **Crisis Support:** Contact your local crisis team

**SAFETY FIRST:** Your immediate safety is the priority. Legal matters can be addressed once you are safe.`,
        priority: 'CRITICAL',
        autoTrigger: ['danger', 'emergency', 'help me', 'call police', 'immediate']
      },

      'domestic_violence': {
        message: `**DOMESTIC VIOLENCE SUPPORT** 🆘

**24/7 CONFIDENTIAL HELPLINES:**
• **National Domestic Violence Helpline:** 0808 2000 247
• **Men's Advice Line:** 0808 801 0327
• **Respect Phoneline:** 0808 802 4040

**IMMEDIATE SAFETY:**
• Trust your instincts - if you feel unsafe, you probably are
• Have a safety plan ready
• Keep important documents accessible
• Emergency bag with essentials

**LEGAL PROTECTION:**
• Non-molestation orders available
• Occupation orders for housing protection
• Legal aid may be available
• Police can arrest for breaches

**REMEMBER:** This is not your fault. Help is available.`,
        priority: 'HIGH',
        autoTrigger: ['domestic violence', 'abuse', 'partner violence', 'controlling']
      },

      'mental_health_crisis': {
        message: `**MENTAL HEALTH CRISIS SUPPORT** 💚

**IMMEDIATE SUPPORT (24/7):**
• **Samaritans:** 116 123 (free from any phone)
• **Crisis Text Line:** Text SHOUT to 85258
• **NHS 111:** Select option 2 for mental health

**IF YOU'RE HAVING THOUGHTS OF SELF-HARM:**
• Call 999 or go to A&E immediately
• Contact your local crisis team
• Reach out to a trusted friend or family member

**ONGOING SUPPORT:**
• Contact your GP for urgent appointment
• Mind Information Line: 0300 123 3393
• Local crisis services available

You are not alone. Professional help is available.`,
        priority: 'HIGH',
        autoTrigger: ['suicide', 'self harm', 'kill myself', 'end it all', 'can\'t cope']
      }
    };
  }

  /**
   * Initialize domain classifier
   */
  initializeDomainClassifier() {
    return {
      'LANDLORD_TENANT': {
        keywords: [
          'landlord', 'tenant', 'rent', 'deposit', 'eviction', 'tenancy', 'housing',
          'repairs', 'section 21', 'section 8', 'notice', 'possession', 'assured',
          'shorthold', 'let', 'lease', 'property', 'renting'
        ],
        weight: 0.9,
        priority: true
      },
      'CONSUMER_RIGHTS': {
        keywords: [
          'refund', 'faulty', 'consumer', 'purchase', 'goods', 'services', 'warranty',
          'guarantee', 'return', 'exchange', 'credit card', 'chargeback', 'section 75',
          'company', 'retailer', 'online', 'delivery'
        ],
        weight: 0.8,
        priority: false
      },
      'EMPLOYMENT_RIGHTS': {
        keywords: [
          'employer', 'employee', 'job', 'work', 'dismissal', 'redundancy', 'discrimination',
          'harassment', 'wages', 'holiday', 'contract', 'tribunal', 'unfair', 'disciplinary',
          'grievance', 'maternity', 'paternity'
        ],
        weight: 0.8,
        priority: false
      },
      'FAMILY_LAW': {
        keywords: [
          'divorce', 'custody', 'child support', 'family', 'marriage', 'domestic violence',
          'separation', 'adoption', 'children', 'contact', 'maintenance', 'civil partnership',
          'financial settlement'
        ],
        weight: 0.9,
        priority: true
      },
      'DEBT_FINANCE': {
        keywords: [
          'debt', 'bailiff', 'bankruptcy', 'loan', 'mortgage', 'credit', 'overdraft',
          'payment', 'financial', 'money', 'ccj', 'county court', 'enforcement',
          'creditor', 'insolvency'
        ],
        weight: 0.7,
        priority: false
      }
    };
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    // Ollama client events
    this.ollamaClient.on('connection_established', (data) => {
      this.emit('ai_connection_established', data);
    });

    this.ollamaClient.on('connection_failed', (data) => {
      this.emit('ai_connection_failed', data);
    });

    this.ollamaClient.on('request_success', (data) => {
      this.emit('ai_request_success', data);
    });

    this.ollamaClient.on('request_failed', (data) => {
      this.emit('ai_request_failed', data);
    });

    // Circuit breaker events
    this.circuitBreaker.on('state_change', (data) => {
      this.emit('circuit_breaker_state_change', data);
    });

    // Rate limiter would emit events if it had them
    // We'll handle rate limiting responses directly
  }

  /**
   * Main processing method with enhanced features
   */
  async processLegalQuery(query, options = {}) {
    const startTime = Date.now();
    const sessionId = options.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.metrics.totalRequests++;

    try {
      // Step 1: Input validation and safety checks
      const validation = await this.validateAndClassifyQuery(query, options);
      if (!validation.isValid) {
        return this.createErrorResponse(validation.error, validation.suggestion);
      }

      // Step 2: Emergency detection and handling
      const emergencyCheck = this.detectEmergencyScenario(query);
      if (emergencyCheck.isEmergency) {
        this.metrics.emergencyResponses++;
        return this.createEmergencyResponse(emergencyCheck);
      }

      // Step 3: Rate limiting check
      const rateLimitCheck = this.rateLimiter.checkRateLimit(
        sessionId,
        validation.domain,
        { priority: validation.priority }
      );

      if (!rateLimitCheck.allowed) {
        return this.createRateLimitResponse(rateLimitCheck);
      }

      // Step 4: Check cache for existing response
      const cacheKey = this.generateCacheKey(query, validation.domain, options);
      const cachedResponse = this.getCachedResponse(cacheKey);
      if (cachedResponse) {
        this.metrics.cachedResponses++;
        return this.enhanceResponse(cachedResponse, { fromCache: true, sessionId });
      }

      // Step 5: Check for template matches
      const templateResponse = this.findTemplateMatch(query, validation.domain);
      if (templateResponse) {
        this.metrics.templatedResponses++;
        this.cacheResponse(cacheKey, templateResponse);
        return this.enhanceResponse(templateResponse, { isTemplate: true, sessionId });
      }

      // Step 6: Process with AI through circuit breaker
      const aiResponse = await this.circuitBreaker.execute(async () => {
        return await this.processWithAI(query, validation, options, sessionId);
      });

      // Step 7: Post-process and enhance response
      const enhancedResponse = await this.postProcessResponse(aiResponse, validation);

      // Step 8: Cache successful response
      this.cacheResponse(cacheKey, enhancedResponse);

      // Step 9: Update session and metrics
      this.updateSession(sessionId, query, enhancedResponse, validation.domain);
      this.updateMetrics(true, Date.now() - startTime, validation.domain);

      this.emit('legal_query_completed', {
        sessionId,
        domain: validation.domain,
        processingTime: Date.now() - startTime,
        source: 'ai',
        cached: false
      });

      return enhancedResponse;

    } catch (error) {
      this.updateMetrics(false, Date.now() - startTime);
      this.recordError(error, options.sessionId);

      // Return intelligent fallback response
      const fallbackResponse = await this.createIntelligentFallback(query, error, options);
      this.metrics.fallbackResponses++;

      this.emit('legal_query_failed', {
        sessionId,
        error: error.message,
        processingTime: Date.now() - startTime,
        fallbackProvided: true
      });

      return fallbackResponse;
    }
  }

  /**
   * Enhanced query validation and classification
   */
  async validateAndClassifyQuery(query, options) {
    // Basic validation
    if (!query || typeof query !== 'string') {
      return {
        isValid: false,
        error: 'Please provide a valid question about your legal situation.',
        suggestion: 'Describe your legal issue in detail so I can provide relevant information.'
      };
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 5) {
      return {
        isValid: false,
        error: 'Please provide more details about your legal situation.',
        suggestion: 'Questions should be at least 5 characters long to ensure I can provide helpful information.'
      };
    }

    if (trimmedQuery.length > 10000) {
      return {
        isValid: false,
        error: 'Please keep your question under 10,000 characters.',
        suggestion: 'Try breaking down your question into smaller, more specific parts.'
      };
    }

    // Content safety validation
    const safetyCheck = this.performContentSafetyCheck(query);
    if (!safetyCheck.isSafe) {
      return {
        isValid: false,
        error: safetyCheck.message,
        suggestion: safetyCheck.suggestion
      };
    }

    // Domain classification
    const domain = this.classifyLegalDomain(query);
    const priority = this.domainClassifier[domain]?.priority || false;

    return {
      isValid: true,
      domain,
      priority,
      safetyLevel: safetyCheck.level,
      complexity: this.assessQueryComplexity(query),
      queryType: this.identifyQueryType(query)
    };
  }

  /**
   * Content safety checking
   */
  performContentSafetyCheck(query) {
    const lowerQuery = query.toLowerCase();

    // Check for illegal activity requests
    const illegalPatterns = [
      /\b(fraud|fraudulent|fake|forge|forging)\b.*\b(document|signature|evidence)\b/i,
      /\b(lie|lying|false)\b.*\b(court|statement|testimony)\b/i,
      /\b(hide|hiding|conceal)\b.*\b(asset|money|income)\b/i,
      /\b(threaten|intimidate|harass)\b.*\b(witness|judge|jury)\b/i
    ];

    for (const pattern of illegalPatterns) {
      if (pattern.test(query)) {
        return {
          isSafe: false,
          level: 'ILLEGAL_ACTIVITY',
          message: 'I cannot provide guidance on potentially illegal activities.',
          suggestion: 'I can help you understand legal procedures and your rights within the law. Please rephrase your question to focus on legal options.'
        };
      }
    }

    // Check for harmful content
    const harmfulPatterns = [
      /\b(kill|murder|harm|attack|violence|assault)\b/i,
      /\b(bomb|explosive|weapon)\b/i,
      /\b(drug|illegal.substance)\b/i
    ];

    for (const pattern of harmfulPatterns) {
      if (pattern.test(query)) {
        return {
          isSafe: false,
          level: 'HARMFUL_CONTENT',
          message: 'For safety reasons, I cannot provide guidance on potentially harmful activities.',
          suggestion: 'If you are in immediate danger, please contact emergency services (999). For legal information, please rephrase your question.'
        };
      }
    }

    return {
      isSafe: true,
      level: 'SAFE'
    };
  }

  /**
   * Detect emergency scenarios
   */
  detectEmergencyScenario(query) {
    const lowerQuery = query.toLowerCase();

    for (const [emergencyType, config] of Object.entries(this.emergencyResources)) {
      for (const trigger of config.autoTrigger) {
        if (lowerQuery.includes(trigger)) {
          return {
            isEmergency: true,
            type: emergencyType,
            priority: config.priority,
            message: config.message
          };
        }
      }
    }

    return { isEmergency: false };
  }

  /**
   * Classify legal domain using enhanced algorithm
   */
  classifyLegalDomain(query) {
    const lowerQuery = query.toLowerCase();
    const domainScores = {};

    // Calculate scores for each domain
    for (const [domain, config] of Object.entries(this.domainClassifier)) {
      let score = 0;
      let matchCount = 0;

      for (const keyword of config.keywords) {
        if (lowerQuery.includes(keyword)) {
          score += config.weight;
          matchCount++;
        }
      }

      // Normalize score by keyword count and length
      if (matchCount > 0) {
        domainScores[domain] = (score * matchCount) / config.keywords.length;
      }
    }

    // Return domain with highest score, or GENERAL if none match
    const sortedDomains = Object.entries(domainScores)
      .sort(([,a], [,b]) => b - a);

    return sortedDomains.length > 0 ? sortedDomains[0][0] : 'GENERAL';
  }

  /**
   * Assess query complexity
   */
  assessQueryComplexity(query) {
    const factors = {
      length: query.length > 500 ? 'high' : query.length > 200 ? 'medium' : 'low',
      legalTerms: (query.match(/\b(section|act|regulation|tribunal|court|claim|legal|law)\b/gi) || []).length,
      questions: (query.match(/\?/g) || []).length,
      entities: (query.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g) || []).length // Names, organizations
    };

    const complexityScore =
      (factors.length === 'high' ? 3 : factors.length === 'medium' ? 2 : 1) +
      (factors.legalTerms > 3 ? 2 : factors.legalTerms > 1 ? 1 : 0) +
      (factors.questions > 2 ? 2 : factors.questions > 1 ? 1 : 0) +
      (factors.entities > 2 ? 1 : 0);

    return complexityScore > 6 ? 'high' : complexityScore > 3 ? 'medium' : 'low';
  }

  /**
   * Identify query type
   */
  identifyQueryType(query) {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('what are my rights') || lowerQuery.includes('am i entitled')) {
      return 'rights_inquiry';
    } else if (lowerQuery.includes('what should i do') || lowerQuery.includes('what can i do')) {
      return 'action_inquiry';
    } else if (lowerQuery.includes('how do i') || lowerQuery.includes('how to')) {
      return 'procedure_inquiry';
    } else if (lowerQuery.includes('is this legal') || lowerQuery.includes('is it legal')) {
      return 'legality_inquiry';
    } else if (lowerQuery.includes('template') || lowerQuery.includes('letter') || lowerQuery.includes('form')) {
      return 'document_request';
    } else if (lowerQuery.includes('explain') || lowerQuery.includes('what is') || lowerQuery.includes('what does')) {
      return 'explanation_request';
    } else {
      return 'general_inquiry';
    }
  }

  /**
   * Process with AI using enhanced model selection
   */
  async processWithAI(query, validation, options, sessionId) {
    const aiOptions = {
      sessionId,
      domain: validation.domain,
      complexity: validation.complexity,
      temperature: this.getOptimalTemperature(validation),
      model: this.selectOptimalModel(validation),
      context: this.buildEnhancedContext(sessionId, validation),
      ...options
    };

    return await this.ollamaClient.generateResponse(query, aiOptions);
  }

  /**
   * Get optimal temperature for domain/complexity
   */
  getOptimalTemperature(validation) {
    const baseTemperatures = {
      'LANDLORD_TENANT': 0.6,
      'CONSUMER_RIGHTS': 0.7,
      'EMPLOYMENT_RIGHTS': 0.6,
      'FAMILY_LAW': 0.5,
      'DEBT_FINANCE': 0.6,
      'GENERAL': 0.7
    };

    let temperature = baseTemperatures[validation.domain] || 0.7;

    // Adjust for complexity
    if (validation.complexity === 'high') {
      temperature -= 0.1; // More deterministic for complex queries
    } else if (validation.complexity === 'low') {
      temperature += 0.1; // More creative for simple queries
    }

    return Math.max(0.1, Math.min(0.9, temperature));
  }

  /**
   * Select optimal model for the query
   */
  selectOptimalModel(validation) {
    // Model selection based on domain and complexity
    const modelPreferences = {
      'FAMILY_LAW': ['llama3.1:70b', 'llama3.1:8b'],
      'EMPLOYMENT_RIGHTS': ['llama3.1:70b', 'llama3.1:8b'],
      'LANDLORD_TENANT': ['llama3.1:8b', 'llama3.1:70b'],
      'CONSUMER_RIGHTS': ['llama3.1:8b', 'mistral:7b'],
      'DEBT_FINANCE': ['llama3.1:8b', 'mistral:7b'],
      'GENERAL': ['llama3.1:8b', 'mistral:7b']
    };

    const preferences = modelPreferences[validation.domain] || modelPreferences['GENERAL'];

    // For high complexity, prefer larger models
    if (validation.complexity === 'high') {
      return preferences[0];
    }

    return preferences[1] || preferences[0];
  }

  /**
   * Build enhanced context for AI
   */
  buildEnhancedContext(sessionId, validation) {
    const session = this.activeSessions.get(sessionId);
    const context = {
      domain: validation.domain,
      complexity: validation.complexity,
      queryType: validation.queryType
    };

    if (session && session.history.length > 0) {
      // Add relevant session context
      const recentInteractions = session.history.slice(-3);
      context.previousInteractions = recentInteractions.map(interaction => ({
        query: interaction.query.substring(0, 100),
        domain: interaction.domain,
        outcome: interaction.outcome
      }));
    }

    return context;
  }

  /**
   * Post-process AI response with legal safeguards
   */
  async postProcessResponse(aiResponse, validation) {
    let content = aiResponse.content;

    // Ensure legal disclaimer is present and prominent
    if (!content.includes('⚠️') && !content.includes('Legal Disclaimer')) {
      content += '\n\n⚠️ **Legal Disclaimer:** This is general legal information, not legal advice. Laws and procedures can vary, and individual circumstances matter. Always consult with a qualified legal professional for advice specific to your situation.';
    }

    // Add domain-specific resources
    content += this.getLegalResourcesForDomain(validation.domain);

    // Add emergency contacts if relevant
    if (this.shouldIncludeEmergencyContacts(content, validation.domain)) {
      content += this.getEmergencyContactsForDomain(validation.domain);
    }

    // Calculate enhanced confidence score
    const confidence = this.calculateEnhancedConfidence(aiResponse, validation);

    // Assess response risk level
    const riskLevel = this.assessResponseRisk(content, validation);

    return {
      content,
      domain: validation.domain,
      confidence,
      riskLevel,
      model: aiResponse.model,
      timestamp: aiResponse.timestamp,
      responseTime: aiResponse.responseTime,
      sources: this.getLegalSourcesForDomain(validation.domain),
      safeguards: [
        'Legal information disclaimer included',
        'Professional consultation recommended',
        'UK law specific guidance',
        'Emergency resources provided where relevant'
      ],
      metadata: {
        ...aiResponse.metadata,
        validation,
        postProcessed: true,
        enhancedSafeguards: true
      }
    };
  }

  /**
   * Get legal resources for specific domain
   */
  getLegalResourcesForDomain(domain) {
    const resources = {
      'LANDLORD_TENANT': `

**📞 Housing Support Resources:**
• **Shelter Housing Helpline:** 0808 800 4444
• **Citizens Advice:** 0808 223 1133
• **Local Council Housing Department:** Contact your local authority
• **Tenancy Deposit Protection:** Check online for free at official schemes`,

      'CONSUMER_RIGHTS': `

**📞 Consumer Rights Resources:**
• **Citizens Advice Consumer Service:** 0808 223 1133
• **Financial Ombudsman Service:** 0800 023 4567
• **Trading Standards:** Contact your local authority
• **Resolver (Free Complaints):** www.resolver.co.uk`,

      'EMPLOYMENT_RIGHTS': `

**📞 Employment Support Resources:**
• **ACAS (Employment Advice):** 0300 123 1100
• **Equality and Human Rights Commission:** 0808 800 0082
• **Employment Tribunals:** www.gov.uk/employment-tribunals
• **Trade Union Support:** If you're a member`,

      'FAMILY_LAW': `

**📞 Family Law Support Resources:**
• **Family Lives:** 0808 800 2222
• **National Domestic Violence Helpline:** 0808 2000 247 (24/7)
• **Citizens Advice:** 0808 223 1133
• **Find a Family Solicitor:** www.familylaw.co.uk`,

      'DEBT_FINANCE': `

**📞 Debt and Finance Support:**
• **National Debtline:** 0808 808 4000
• **StepChange Debt Charity:** 0800 138 1111
• **Citizens Advice:** 0808 223 1133
• **Money Advice Service:** 0800 138 7777`
    };

    return resources[domain] || `

**📞 General Legal Resources:**
• **Citizens Advice:** 0808 223 1133
• **Law Society (Find a Solicitor):** www.lawsociety.org.uk
• **Gov.uk Legal Information:** www.gov.uk/browse/justice
• **Legal Aid:** www.gov.uk/legal-aid`;
  }

  /**
   * Enhanced caching with LRU eviction
   */
  cacheResponse(cacheKey, response) {
    // Remove oldest entry if cache is full
    if (this.responseCache.size >= this.config.cacheMaxSize) {
      const oldestKey = this.cacheAccessOrder.keys().next().value;
      this.responseCache.delete(oldestKey);
      this.cacheAccessOrder.delete(oldestKey);
    }

    // Add new response to cache
    this.responseCache.set(cacheKey, {
      response: { ...response, fromCache: false },
      timestamp: Date.now(),
      hits: 0
    });

    // Update access order for LRU
    this.cacheAccessOrder.set(cacheKey, Date.now());
  }

  /**
   * Get cached response with LRU update
   */
  getCachedResponse(cacheKey) {
    const cached = this.responseCache.get(cacheKey);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() - cached.timestamp > this.config.cacheMaxAge) {
      this.responseCache.delete(cacheKey);
      this.cacheAccessOrder.delete(cacheKey);
      return null;
    }

    // Update access order and hit count
    cached.hits++;
    this.cacheAccessOrder.delete(cacheKey);
    this.cacheAccessOrder.set(cacheKey, Date.now());

    return { ...cached.response, fromCache: true, cacheHits: cached.hits };
  }

  /**
   * Generate cache key
   */
  generateCacheKey(query, domain, options = {}) {
    const keyData = {
      query: query.toLowerCase().trim(),
      domain,
      model: options.model || 'default',
      temperature: options.temperature || 'default'
    };
    return Buffer.from(JSON.stringify(keyData)).toString('base64').substring(0, 32);
  }

  /**
   * Create intelligent fallback response
   */
  async createIntelligentFallback(query, error, options) {
    const domain = this.classifyLegalDomain(query);

    // Check if we have a template that might help
    const templateMatch = this.findTemplateMatch(query, domain);
    if (templateMatch) {
      return {
        ...templateMatch,
        fallback: true,
        fallbackReason: 'AI service unavailable - using template response'
      };
    }

    // Create domain-specific fallback
    const fallbackContent = this.generateDomainSpecificFallback(query, domain, error);

    return {
      content: fallbackContent,
      domain,
      confidence: 0.7,
      riskLevel: 'LOW',
      fallback: true,
      fallbackReason: error.message || 'AI service temporarily unavailable',
      timestamp: new Date().toISOString(),
      sources: this.getLegalSourcesForDomain(domain),
      safeguards: ['Fallback response with verified legal resources']
    };
  }

  /**
   * Update metrics
   */
  updateMetrics(success, responseTime, domain = 'GENERAL') {
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Update average response time
    if (this.metrics.averageResponseTime === 0) {
      this.metrics.averageResponseTime = responseTime;
    } else {
      this.metrics.averageResponseTime =
        (this.metrics.averageResponseTime + responseTime) / 2;
    }

    // Update domain usage
    this.metrics.domainUsage[domain] = (this.metrics.domainUsage[domain] || 0) + 1;
  }

  /**
   * Start monitoring and cleanup tasks
   */
  startMonitoring() {
    // Cache cleanup every 10 minutes
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 600000);

    // Session cleanup every 5 minutes
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 300000);

    // Metrics reset every hour
    setInterval(() => {
      this.resetHourlyMetrics();
    }, 3600000);
  }

  /**
   * Get service capabilities
   */
  getServiceCapabilities() {
    return {
      domains: Object.keys(this.domainClassifier),
      templates: Object.keys(this.templateLibrary),
      emergencyDetection: Object.keys(this.emergencyResources),
      rateLimiting: true,
      circuitBreaker: true,
      caching: true,
      fallbackResponses: true,
      multiModelSupport: this.config.enableMultiModel,
      enhancedPrompts: this.config.enableAdvancedPrompts
    };
  }

  /**
   * Get comprehensive health status
   */
  async getHealthStatus() {
    const ollamaHealth = await this.ollamaClient.getHealthStatus();
    const circuitBreakerStatus = this.circuitBreaker.getStatus();
    const rateLimiterStatus = this.rateLimiter.getStatusReport();

    return {
      overall: this.determineOverallHealth(ollamaHealth, circuitBreakerStatus),
      components: {
        ollama: ollamaHealth,
        circuitBreaker: circuitBreakerStatus,
        rateLimiter: rateLimiterStatus,
        cache: {
          size: this.responseCache.size,
          maxSize: this.config.cacheMaxSize,
          hitRate: this.calculateCacheHitRate(),
          oldestEntry: this.getOldestCacheEntry()
        },
        sessions: {
          active: this.activeSessions.size,
          total: this.activeSessions.size,
          oldestSession: this.getOldestSession()
        }
      },
      metrics: this.getMetricsSummary(),
      capabilities: this.getServiceCapabilities(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Clear all intervals
    clearInterval(this.cacheCleanupInterval);
    clearInterval(this.sessionCleanupInterval);
    clearInterval(this.metricsResetInterval);

    // Cleanup components
    this.ollamaClient.destroy();
    this.circuitBreaker.destroy();
    this.rateLimiter.destroy();

    // Clear caches and sessions
    this.responseCache.clear();
    this.cacheAccessOrder.clear();
    this.activeSessions.clear();

    this.removeAllListeners();
  }

  // Additional helper methods would continue here...
  // (Due to length constraints, I'm including the main structure and key methods)
}

module.exports = EnhancedLegalAIService;