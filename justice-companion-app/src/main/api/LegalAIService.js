const OllamaClient = require('./OllamaClient');
const EventEmitter = require('events');

/**
 * Legal AI Service Layer
 * Orchestrates AI interactions with legal safeguards and caching
 */
class LegalAIService extends EventEmitter {
  constructor(config = {}) {
    super();

    // Initialize Ollama client
    this.ollamaClient = new OllamaClient({
      baseURL: config.ollamaURL || 'http://localhost:11434',
      model: config.model || 'llama2',
      timeout: config.timeout || 120000, // Increased to 2 minutes for AI processing
      maxRetries: 3,
      failureThreshold: 5,
      recoveryTimeout: 60000,
      mockMode: config.mockMode || false
    });

    // Legal response cache
    this.responseCache = new Map();
    this.cacheMaxSize = config.cacheMaxSize || 100;
    this.cacheMaxAge = config.cacheMaxAge || 300000; // 5 minutes

    // Legal template cache
    this.templateCache = this.initializeLegalTemplates();

    // Active sessions
    this.activeSessions = new Map();

    // Bind to Ollama client events
    this.setupEventHandlers();

    // Service metrics
    this.metrics = {
      totalRequests: 0,
      cachedResponses: 0,
      templatedResponses: 0,
      errorCount: 0,
      averageResponseTime: 0,
      startTime: Date.now()
    };

    this.emit('service_initialized', { config, metrics: this.metrics });
  }

  /**
   * Initialize legal template responses
   */
  initializeLegalTemplates() {
    return new Map([
      ['landlord_deposit_protection', {
        template: `**UK Deposit Protection Information**

Your landlord is legally required to protect your deposit within 30 days of receiving it using one of three government-approved schemes:

**1. Tenancy Deposit Scheme (TDS)**
- Website: www.tenancydepositscheme.com
- Phone: 0300 037 1000

**2. Deposit Protection Service (DPS)**
- Website: www.depositprotection.com
- Phone: 0330 303 0030

**3. MyDeposits**
- Website: www.mydeposits.co.uk
- Phone: 0333 321 9401

**Your Rights:**
- Free online check if deposit is protected
- Compensation of 1-3x deposit amount if not protected
- Right to challenge deductions at end of tenancy

**Next Steps:**
1. Check protection status online (free search)
2. Document all communications with landlord
3. Keep evidence of property condition

⚠️ **Legal Disclaimer:** This is general information about UK law. For specific advice about your situation, consult a qualified housing solicitor or contact Citizens Advice.

**Need Help?**
- Shelter Housing Advice: 0808 800 4444
- Citizens Advice: 0808 223 1133
- Gov.uk Tenancy Deposit Protection: www.gov.uk/tenancy-deposit-protection`,
        confidence: 0.98,
        sources: ['Housing Act 2004', 'Tenancy Deposit Regulations 2007']
      }],

      ['consumer_rights_refund', {
        template: `**UK Consumer Rights Information**

Under the Consumer Rights Act 2015, you have strong legal protections:

**30-Day Right to Refund:**
- Full refund for faulty goods within 30 days
- No need to accept repair or replacement
- Includes digital content and services

**After 30 Days:**
- Right to repair or replacement
- If repair/replacement fails, right to refund
- Price reduction for minor faults

**Credit Card Protection (Section 75):**
- Claims between £100-£30,000
- Credit card company equally liable
- Covers merchant failure or misrepresentation

**Debit Card Chargeback:**
- Alternative protection scheme
- Contact your bank directly
- Usually 120 days to claim

**Making a Complaint:**
1. Contact company in writing (email acceptable)
2. Give them reasonable time to respond (usually 8 weeks)
3. Escalate to relevant ombudsman if unsatisfied
4. Small claims court as last resort

⚠️ **Legal Disclaimer:** This is general information about UK consumer law. Time limits and specific rights may vary. Seek professional advice for complex situations.

**Useful Contacts:**
- Citizens Advice Consumer Service: 0808 223 1133
- Financial Ombudsman: 0800 023 4567
- Resolver (free complaint tool): www.resolver.co.uk`,
        confidence: 0.96,
        sources: ['Consumer Rights Act 2015', 'Consumer Credit Act 1974']
      }],

      ['employment_unfair_dismissal', {
        template: `**UK Employment Rights Information**

**Unfair Dismissal Protection:**
- Generally need 2 years continuous service
- Some protections from day one (discrimination, whistleblowing)
- Employers must follow fair procedure

**Automatically Unfair Reasons:**
- Pregnancy/maternity
- Trade union membership
- Whistleblowing
- Health and safety concerns
- Asserting statutory rights

**Fair Dismissal Procedures:**
1. Investigation of allegations
2. Formal meeting with right to be accompanied
3. Appeal process offered
4. Proper notice period given

**If Dismissed Unfairly:**
- Employment Tribunal claim within 3 months
- Possible reinstatement or compensation
- Basic award + compensatory award available

**Immediate Steps:**
1. Request written reasons for dismissal
2. Document all communications
3. Check your contract terms
4. Consider ACAS early conciliation (free)

⚠️ **Legal Disclaimer:** Employment law is complex and fact-specific. This is general information only. Seek advice from an employment law specialist for your specific situation.

**Getting Help:**
- ACAS Helpline: 0300 123 1100
- Employment Law Association: www.elaweb.org.uk
- Trade Union advice if you're a member`,
        confidence: 0.94,
        sources: ['Employment Rights Act 1996', 'Employment Tribunals Act 1996']
      }]
    ]);
  }

  /**
   * Setup event handlers for Ollama client
   */
  setupEventHandlers() {
    this.ollamaClient.on('request_start', (data) => {
      this.metrics.totalRequests++;
      this.emit('ai_request_start', data);
    });

    this.ollamaClient.on('request_success', (data) => {
      this.updateAverageResponseTime(data.responseTime);
      this.emit('ai_request_success', data);
    });

    this.ollamaClient.on('request_failed', (data) => {
      this.metrics.errorCount++;
      this.emit('ai_request_failed', data);
    });

    this.ollamaClient.on('circuit_breaker_state', (data) => {
      this.emit('circuit_breaker_state', data);
    });
  }

  /**
   * Main chat interface with legal safeguards
   */
  async processLegalQuery(query, options = {}) {
    const startTime = Date.now();
    const sessionId = options.sessionId || `session_${Date.now()}`;

    try {
      // Validate input
      const validation = this.validateLegalQuery(query);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(query, options);
      const cachedResponse = this.getCachedResponse(cacheKey);
      if (cachedResponse) {
        this.metrics.cachedResponses++;
        this.emit('cache_hit', { sessionId, cacheKey });
        return cachedResponse;
      }

      // Check for template match
      const templateResponse = this.getTemplateResponse(query);
      if (templateResponse) {
        this.metrics.templatedResponses++;
        this.cacheResponse(cacheKey, templateResponse);
        this.emit('template_match', { sessionId, template: templateResponse.template });
        return templateResponse;
      }

      // Prepare legal domain context
      const legalDomain = this.identifyLegalDomain(query);
      const messages = this.prepareLegalMessages(query, sessionId);

      // Process with Ollama
      const response = await this.ollamaClient.chat(messages, {
        sessionId,
        domain: legalDomain,
        temperature: 0.3, // Lower temperature for more consistent legal information
        max_tokens: 2048,
        ...options
      });

      // Post-process for legal compliance
      const processedResponse = this.postProcessLegalResponse(response, legalDomain);

      // Cache the response
      this.cacheResponse(cacheKey, processedResponse);

      // Update session
      this.updateSession(sessionId, query, processedResponse);

      this.emit('legal_query_completed', {
        sessionId,
        domain: legalDomain,
        processingTime: Date.now() - startTime,
        cached: false
      });

      return processedResponse;

    } catch (error) {
      this.emit('legal_query_failed', {
        sessionId,
        error: error.message,
        processingTime: Date.now() - startTime
      });

      // Return fallback response
      return this.getFallbackResponse(error);
    }
  }

  /**
   * Validate legal query for safety and appropriateness
   */
  validateLegalQuery(query) {
    if (!query || typeof query !== 'string') {
      return { isValid: false, error: 'Please provide a valid question about your legal situation.' };
    }

    if (query.trim().length < 10) {
      return { isValid: false, error: 'Please provide more details about your legal situation (at least 10 characters).' };
    }

    if (query.length > 5000) {
      return { isValid: false, error: 'Please keep your question under 5000 characters for better processing.' };
    }

    // Check for harmful content
    const harmfulPatterns = [
      /\b(kill|murder|harm|attack|violence|assault)\b/i,
      /\b(illegal|unlawful|criminal)\s+(activity|behavior|behaviour)\b/i,
      /\b(drugs|weapons|explosives)\b/i,
      /\b(suicide|self.harm)\b/i
    ];

    for (const pattern of harmfulPatterns) {
      if (pattern.test(query)) {
        return {
          isValid: false,
          error: 'For safety reasons, we cannot provide guidance on potentially harmful or illegal activities. If you are in immediate danger, please contact emergency services (999). For mental health support, contact Samaritans (116 123).'
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Identify legal domain for specialized handling
   */
  identifyLegalDomain(query) {
    const domains = {
      'LANDLORD_TENANT': [
        'landlord', 'tenant', 'rent', 'deposit', 'eviction', 'tenancy',
        'housing', 'repairs', 'section 21', 'section 8', 'notice'
      ],
      'CONSUMER_RIGHTS': [
        'refund', 'faulty', 'consumer', 'purchase', 'goods', 'services',
        'warranty', 'guarantee', 'return', 'exchange', 'credit card'
      ],
      'EMPLOYMENT_RIGHTS': [
        'employer', 'employee', 'job', 'work', 'dismissal', 'redundancy',
        'discrimination', 'harassment', 'wages', 'holiday', 'contract'
      ],
      'FAMILY_LAW': [
        'divorce', 'custody', 'child support', 'family', 'marriage',
        'domestic violence', 'separation', 'adoption'
      ],
      'DEBT_FINANCE': [
        'debt', 'bailiff', 'bankruptcy', 'loan', 'mortgage', 'credit',
        'overdraft', 'payment', 'financial', 'money'
      ]
    };

    const queryLower = query.toLowerCase();

    for (const [domain, keywords] of Object.entries(domains)) {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        return domain;
      }
    }

    return 'GENERAL';
  }

  /**
   * Prepare messages with legal context
   */
  prepareLegalMessages(query, sessionId) {
    const messages = [];

    // Add session context if available
    const session = this.activeSessions.get(sessionId);
    if (session && session.context.length > 0) {
      // Add summarized context from previous interactions
      const contextSummary = this.summarizeContext(session.context);
      messages.push({
        role: 'system',
        content: `Previous context: ${contextSummary}`
      });
    }

    // Add current user query
    messages.push({
      role: 'user',
      content: query
    });

    return messages;
  }

  /**
   * Post-process response for legal compliance
   */
  postProcessLegalResponse(response, domain) {
    let content = response.content;

    // Ensure legal disclaimer is prominent
    if (!content.includes('⚠️') && !content.includes('Legal Disclaimer')) {
      content += '\n\n⚠️ **Legal Disclaimer:** This is general legal information, not legal advice. Laws vary by jurisdiction and individual circumstances. Always consult with a qualified legal professional for advice specific to your situation.';
    }

    // Add domain-specific resources
    content += this.getLegalResources(domain);

    // Check response risk level
    const riskLevel = this.assessResponseRisk(content);
    if (riskLevel === 'HIGH') {
      content = this.moderateHighRiskResponse(content);
    }

    return {
      content,
      domain,
      riskLevel,
      timestamp: response.timestamp,
      model: response.model,
      disclaimer: true,
      sources: this.getLegalSources(domain),
      confidence: this.calculateConfidence(content, domain)
    };
  }

  /**
   * Get domain-specific legal resources
   */
  getLegalResources(domain) {
    const resources = {
      'LANDLORD_TENANT': `

**Additional Resources:**
- Shelter Housing Advice: 0808 800 4444
- Citizens Advice: 0808 223 1133
- Gov.uk Housing: www.gov.uk/housing
- Tenancy Deposit Protection: Check online for free`,

      'CONSUMER_RIGHTS': `

**Additional Resources:**
- Citizens Advice Consumer Service: 0808 223 1133
- Financial Ombudsman: 0800 023 4567
- Trading Standards: Contact your local authority
- Resolver (free complaints): www.resolver.co.uk`,

      'EMPLOYMENT_RIGHTS': `

**Additional Resources:**
- ACAS (free employment advice): 0300 123 1100
- Employment Tribunal Service: www.gov.uk/employment-tribunals
- Equality and Human Rights Commission: 0808 800 0082
- Trade Union support (if applicable)`,

      'FAMILY_LAW': `

**Additional Resources:**
- Family Lives: 0808 800 2222
- National Domestic Violence Helpline: 0808 2000 247
- Citizens Advice: 0808 223 1133
- Find a Family Law Solicitor: www.familylaw.co.uk`,

      'DEBT_FINANCE': `

**Additional Resources:**
- National Debtline: 0808 808 4000
- StepChange Debt Charity: 0800 138 1111
- Citizens Advice: 0808 223 1133
- Money Advice Service: 0800 138 7777`
    };

    return resources[domain] || `

**Additional Resources:**
- Citizens Advice: 0808 223 1133
- Law Society (Find a Solicitor): www.lawsociety.org.uk
- Gov.uk Legal Aid: www.gov.uk/legal-aid
- Free Legal Advice Clinics: Search locally`;
  }

  /**
   * Get legal sources for domain
   */
  getLegalSources(domain) {
    const sources = {
      'LANDLORD_TENANT': [
        'Housing Act 1988',
        'Housing Act 2004',
        'Tenant Fees Act 2019',
        'Deregulation Act 2015'
      ],
      'CONSUMER_RIGHTS': [
        'Consumer Rights Act 2015',
        'Consumer Credit Act 1974',
        'Consumer Contracts Regulations 2013'
      ],
      'EMPLOYMENT_RIGHTS': [
        'Employment Rights Act 1996',
        'Equality Act 2010',
        'Working Time Regulations 1998'
      ],
      'FAMILY_LAW': [
        'Children Act 1989',
        'Matrimonial Causes Act 1973',
        'Domestic Violence Act 2021'
      ],
      'DEBT_FINANCE': [
        'Consumer Credit Act 1974',
        'Insolvency Act 1986',
        'Financial Services Act 2012'
      ]
    };

    return sources[domain] || ['UK Legislation', 'Common Law Principles'];
  }

  /**
   * Calculate confidence score based on content and domain
   */
  calculateConfidence(content, domain) {
    let confidence = 0.7; // Base confidence

    // Increase confidence for template responses
    if (this.templateCache.has(domain.toLowerCase())) {
      confidence += 0.2;
    }

    // Increase confidence for responses with specific legal references
    if (content.includes('Act') || content.includes('section') || content.includes('regulation')) {
      confidence += 0.1;
    }

    // Decrease confidence for very general responses
    if (content.length < 500) {
      confidence -= 0.1;
    }

    return Math.min(Math.max(confidence, 0.1), 1.0);
  }

  /**
   * Moderate high-risk responses
   */
  moderateHighRiskResponse(content) {
    // Add additional disclaimers for high-risk content
    return `🚨 **IMPORTANT NOTICE:** This response contains information that may have significant legal implications.

${content}

**⚠️ STRONGLY RECOMMENDED:** Given the complexity and potential consequences of your situation, you should seek immediate advice from a qualified legal professional. This information should not be relied upon for making important legal decisions.

**Emergency Contacts:**
- Emergency Services: 999
- National Domestic Violence Helpline: 0808 2000 247
- Samaritans: 116 123`;
  }

  /**
   * Check for template responses
   */
  getTemplateResponse(query) {
    const queryLower = query.toLowerCase();

    for (const [templateKey, template] of this.templateCache) {
      const keywords = String(templateKey || '').split('_');
      if (keywords.every(keyword => queryLower.includes(keyword))) {
        return {
          content: template.template,
          confidence: template.confidence,
          sources: template.sources,
          isTemplate: true,
          riskLevel: 'LOW',
          timestamp: new Date().toISOString(),
          model: 'template_response'
        };
      }
    }

    return null;
  }

  /**
   * Cache management
   */
  generateCacheKey(query, options) {
    const keyData = {
      query: query.toLowerCase().trim(),
      domain: options.domain || 'general',
      model: options.model || this.ollamaClient.model
    };
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  getCachedResponse(cacheKey) {
    const cached = this.responseCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheMaxAge) {
      return { ...cached.response, fromCache: true };
    }
    if (cached) {
      this.responseCache.delete(cacheKey);
    }
    return null;
  }

  cacheResponse(cacheKey, response) {
    // Implement LRU eviction
    if (this.responseCache.size >= this.cacheMaxSize) {
      const firstKey = this.responseCache.keys().next().value;
      this.responseCache.delete(firstKey);
    }

    this.responseCache.set(cacheKey, {
      response: { ...response, fromCache: false },
      timestamp: Date.now()
    });
  }

  /**
   * Session management
   */
  updateSession(sessionId, query, response) {
    if (!this.activeSessions.has(sessionId)) {
      this.activeSessions.set(sessionId, {
        context: [],
        startTime: Date.now(),
        lastActivity: Date.now()
      });
    }

    const session = this.activeSessions.get(sessionId);
    session.context.push({ query, response, timestamp: Date.now() });
    session.lastActivity = Date.now();

    // Keep only last 10 interactions
    if (session.context.length > 10) {
      session.context = session.context.slice(-10);
    }

    this.activeSessions.set(sessionId, session);
  }

  summarizeContext(context) {
    const recentContext = context.slice(-3);
    return recentContext.map(item =>
      `Q: ${item.query.substring(0, 100)}... R: Legal domain identified: ${item.response.domain || 'General'}`
    ).join(' | ');
  }

  /**
   * Fallback response for errors
   */
  getFallbackResponse(error) {
    return {
      content: `I apologize, but I'm experiencing technical difficulties right now. ${error.userMessage || 'Please try again in a moment.'}

In the meantime, here are some immediate resources that might help:

**🔗 Immediate Legal Resources:**
- **Citizens Advice:** 0808 223 1133 (free legal guidance)
- **National Legal Aid Helpline:** 0345 345 4 345
- **Gov.uk Legal Information:** www.gov.uk/browse/justice

**📱 For Urgent Legal Issues:**
- **Emergency Services:** 999 (immediate danger)
- **Police Non-Emergency:** 101 (crime reporting)
- **National Domestic Violence Helpline:** 0808 2000 247

**💡 What You Can Do:**
1. Document your situation in writing
2. Keep all relevant papers and communications
3. Take photos of any evidence
4. Contact the appropriate helpline above

${error.suggestion || 'Please try your question again, or contact one of the resources above for immediate assistance.'}

⚠️ **Legal Disclaimer:** Always seek professional legal advice for specific legal matters. These resources provide general guidance only.`,
      riskLevel: 'LOW',
      timestamp: new Date().toISOString(),
      model: 'fallback_response',
      error: true,
      disclaimer: true
    };
  }

  /**
   * Update metrics
   */
  updateAverageResponseTime(responseTime) {
    if (this.metrics.averageResponseTime === 0) {
      this.metrics.averageResponseTime = responseTime;
    } else {
      this.metrics.averageResponseTime =
        (this.metrics.averageResponseTime + responseTime) / 2;
    }
  }

  /**
   * Health check for the service
   */
  async getHealthStatus() {
    const ollamaHealth = await this.ollamaClient.testConnection();
    const serviceHealth = {
      status: ollamaHealth.connected ? 'healthy' : 'degraded',
      ollama: ollamaHealth,
      cache: {
        size: this.responseCache.size,
        maxSize: this.cacheMaxSize,
        hitRate: this.metrics.totalRequests > 0
          ? (this.metrics.cachedResponses / this.metrics.totalRequests) * 100
          : 0
      },
      sessions: {
        active: this.activeSessions.size
      },
      metrics: {
        ...this.metrics,
        uptime: Date.now() - this.metrics.startTime
      }
    };

    this.emit('health_check', serviceHealth);
    return serviceHealth;
  }

  /**
   * Risk assessment for responses
   */
  assessResponseRisk(content) {
    const highRiskTerms = [
      'definitely', 'certainly', 'you should', 'you must', 'guaranteed',
      'always', 'never', 'without question', 'absolutely'
    ];
    const mediumRiskTerms = [
      'probably', 'likely', 'consider', 'might', 'could',
      'typically', 'usually', 'generally'
    ];

    const lowerContent = content.toLowerCase();

    const highRiskCount = highRiskTerms.filter(term => lowerContent.includes(term)).length;
    const mediumRiskCount = mediumRiskTerms.filter(term => lowerContent.includes(term)).length;

    if (highRiskCount >= 2 || lowerContent.includes('you should') || lowerContent.includes('you must')) {
      return 'HIGH';
    } else if (mediumRiskCount >= 3 || highRiskCount >= 1) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.responseCache.clear();
    this.activeSessions.clear();
    this.ollamaClient.destroy();
    this.removeAllListeners();
    this.emit('service_destroyed');
  }
}

module.exports = LegalAIService;