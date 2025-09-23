const { Ollama } = require('ollama');
const EventEmitter = require('events');

/**
 * Enhanced Ollama Client for Legal AI Integration
 *
 * CRITICAL LEGAL SAFEGUARDS:
 * - Never provides actual legal advice, only information
 * - All responses include disclaimers
 * - Content filtering for harmful suggestions
 * - Context management for legal conversations
 */
class OllamaClient extends EventEmitter {
  constructor(configOverride = {}) {
    super();

    // Load centralized environment configuration
    const envConfig = require('../../config/environment');

    this.baseURL = configOverride.baseURL || envConfig.ollamaConfig.baseUrl;
    this.model = configOverride.model || envConfig.ollamaConfig.model;
    this.timeout = configOverride.timeout || envConfig.ollamaConfig.timeout || 120000; // Increased to 2 minutes for AI processing
    this.maxRetries = configOverride.maxRetries || envConfig.ollamaConfig.maxRetries || 3;
    this.retryDelay = configOverride.retryDelay || 1000;

    // Initialize Ollama client
    this.ollamaClient = new Ollama({ host: this.baseURL });

    // Circuit breaker configuration
    this.circuitBreaker = {
      failureThreshold: configOverride.failureThreshold || 5,
      recoveryTimeout: configOverride.recoveryTimeout || 60000,
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      failures: 0,
      lastFailureTime: null,
      nextAttempt: null
    };

    // Legal context management
    this.contextHistory = new Map();
    this.maxContextLength = configOverride.maxContextLength || envConfig.config.ai.maxContextLength || 10;

    // Telemetry data
    this.telemetry = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: null,
      uptime: Date.now()
    };

    // Initialize telemetry tracking for the official client

    // Legal prompt templates
    this.legalPrompts = this.initializeLegalPrompts();

    // Mock responses for testing
    this.mockMode = configOverride.mockMode || false;
    this.mockResponses = this.initializeMockResponses();

    this.emit('initialized', { config: configOverride, telemetry: this.telemetry });
  }

  /**
   * Track request telemetry manually since we're using the official client
   */
  trackRequestStart() {
    this.telemetry.totalRequests++;
    this.telemetry.lastRequestTime = Date.now();
    this.emit('request_start', { url: '/api/chat', method: 'POST' });
  }

  trackRequestSuccess(responseTime) {
    this.telemetry.successfulRequests++;
    this.updateAverageResponseTime(responseTime);
    this.resetCircuitBreaker();
    this.emit('request_success', { responseTime, status: 200 });
  }

  trackRequestFailure(error) {
    this.telemetry.failedRequests++;
    this.recordCircuitBreakerFailure();
    this.emit('request_failed', { error: error?.message || 'Unknown error' });
  }

  /**
   * Initialize legal-specific prompt templates
   */
  initializeLegalPrompts() {
    return {
      SYSTEM_PROMPT: `You are an AI assistant for Justice Companion, a legal aid application.

CRITICAL INSTRUCTIONS:
- You provide INFORMATION only, never legal advice
- Always distinguish between information and legal advice
- Include disclaimers in responses
- Encourage users to seek professional legal counsel for complex matters
- Never suggest illegal activities or harmful actions
- Focus on empowering users with knowledge of their rights

RESPONSE FORMAT:
- Clear, accessible language (avoid legal jargon)
- Structured information with actionable steps
- Include relevant disclaimers
- Suggest professional resources when appropriate

Remember: You're helping people understand their rights and options, not providing legal representation.`,

      LANDLORD_TENANT: `Legal Information Domain: UK Landlord-Tenant Rights

Key areas to address:
- Deposit protection requirements
- Notice periods and procedures
- Repair responsibilities
- Eviction procedures and tenant rights
- Housing standards and safety requirements

Always remind users this is general information and specific cases may have unique circumstances requiring professional legal advice.`,

      CONSUMER_RIGHTS: `Legal Information Domain: UK Consumer Rights

Key areas to address:
- Consumer Rights Act 2015
- Refund and replacement rights
- Faulty goods and services
- Distance selling regulations
- Credit card protections (Section 75)

Emphasize that consumer rights are statutory but enforcement may require legal action.`,

      EMPLOYMENT_RIGHTS: `Legal Information Domain: UK Employment Rights

Key areas to address:
- Unfair dismissal protections
- Workplace discrimination
- Health and safety rights
- Wage and hour protections
- Redundancy procedures

Note: Employment law is complex and individual circumstances vary significantly.`,

      DISCLAIMER: `⚠️ IMPORTANT LEGAL DISCLAIMER:
This information is for educational purposes only and does not constitute legal advice. Laws vary by jurisdiction and individual circumstances. For specific legal guidance, consult with a qualified solicitor or legal professional.`
    };
  }

  /**
   * Initialize mock responses for testing
   */
  initializeMockResponses() {
    return {
      landlord: {
        response: `**UK Landlord-Tenant Information**

Based on your situation, here's what you should know:

**Deposit Protection (Required by Law):**
- Landlords must protect deposits within 30 days
- Three schemes: TDS, DPS, MyDeposits
- Failure to protect = 1-3x deposit compensation

**Eviction Procedures:**
- Section 21 notices require 2 months notice
- Section 8 notices require grounds for eviction
- Invalid notices can be challenged

**Next Steps:**
1. Check if deposit is protected (free online searches)
2. Document all communications
3. Know your rights before responding

${this.legalPrompts.DISCLAIMER}

Would you like specific information about any of these areas?`,
        confidence: 0.95
      },

      consumer: {
        response: `**UK Consumer Rights Information**

**Consumer Rights Act 2015 Protections:**
- 30 days for full refund on faulty goods
- Right to repair or replacement
- Right to price reduction

**Credit Card Protection:**
- Section 75: Claims £100-£30,000
- Chargeback: Alternative for debit cards
- Bank liable for merchant failures

**Formal Complaint Process:**
1. Written complaint to company
2. 8-week response time required
3. Escalate to relevant ombudsman
4. Small claims court as last resort

${this.legalPrompts.DISCLAIMER}

What specific consumer issue are you facing?`,
        confidence: 0.93
      },

      general: {
        response: `I'm here to help you understand your legal rights and options.

**Common UK Legal Rights Areas:**
- Housing and tenant rights
- Consumer protection
- Employment rights
- Discrimination protection
- Small claims procedures

**Getting Started:**
1. Identify the specific legal area
2. Document your situation thoroughly
3. Understand your rights and options
4. Consider professional legal advice for complex matters

${this.legalPrompts.DISCLAIMER}

Tell me more about your specific situation so I can provide relevant information.`,
        confidence: 0.85
      }
    };
  }

  /**
   * Enhanced chat completion with circuit breaker and retry logic
   */
  async chat(messages, options = {}) {
    const startTime = Date.now();

    try {
      // Check circuit breaker
      if (!this.isCircuitBreakerClosed()) {
        throw new Error('Service temporarily unavailable - circuit breaker open');
      }

      // Return mock response in test mode
      if (this.mockMode) {
        // Emit events for testing compatibility
        this.emit('request_start', { url: '/api/generate', method: 'POST' });

        // Add small delay to ensure duration > 0 for tests
        await new Promise(resolve => setTimeout(resolve, 5));

        const mockResponse = this.getMockResponse(messages);

        // Update context if session provided
        if (options.sessionId) {
          this.updateContext(options.sessionId, messages[messages.length - 1], mockResponse);
        }

        this.emit('chat_completed', {
          sessionId: options.sessionId,
          duration: Date.now() - startTime,
          tokensUsed: 0
        });

        return mockResponse;
      }

      // Apply legal safety filters
      const filteredMessages = this.applyContentFilter(messages);

      // Add system prompt for legal context
      const messagesWithContext = this.addLegalContext(filteredMessages, options.domain);

      // Execute request with retry logic using official Ollama client
      this.trackRequestStart();
      const response = await this.executeWithRetry(async () => {
        return await this.ollamaClient.chat({
          model: this.model,
          messages: messagesWithContext,
          stream: options.stream || false,
          options: {
            temperature: options.temperature || 0.7,
            top_p: options.top_p || 0.9,
            num_predict: options.max_tokens || 2048,
            ...options.modelOptions
          }
        });
      });

      const responseTime = Date.now() - this.telemetry.lastRequestTime;
      this.trackRequestSuccess(responseTime);

      const result = this.processLegalResponse(response, filteredMessages);

      // Update context if session provided
      if (options.sessionId) {
        this.updateContext(options.sessionId, messages[messages.length - 1], result);
      }

      this.emit('chat_completed', {
        sessionId: options.sessionId,
        duration: Date.now() - startTime,
        tokensUsed: result.tokensUsed || 0
      });

      return result;

    } catch (error) {
      this.trackRequestFailure(error);
      this.emit('chat_failed', {
        error: error?.message || 'Unknown error',
        duration: Date.now() - startTime
      });

      throw this.createEnhancedError(error);
    }
  }

  /**
   * Streaming chat for real-time responses
   */
  async chatStream(messages, options = {}) {
    const startTime = Date.now();

    try {
      // Check circuit breaker
      if (!this.isCircuitBreakerClosed()) {
        throw new Error('Service temporarily unavailable - circuit breaker open');
      }

      // Apply legal safety filters
      const filteredMessages = this.applyContentFilter(messages);

      // Add system prompt for legal context
      const messagesWithContext = this.addLegalContext(filteredMessages, options.domain);

      // Execute streaming request
      this.trackRequestStart();
      const stream = await this.ollamaClient.chat({
        model: this.model,
        messages: messagesWithContext,
        stream: true,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9,
          num_predict: options.max_tokens || 2048,
          ...options.modelOptions
        }
      });

      return stream;

    } catch (error) {
      this.trackRequestFailure(error);
      this.emit('chat_failed', {
        error: error?.message || 'Unknown error',
        duration: Date.now() - startTime
      });

      throw this.createEnhancedError(error);
    }
  }

  /**
   * Execute request with exponential backoff retry logic
   */
  async executeWithRetry(operation) {
    let lastError;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === this.maxRetries || !this.isRetryableError(error)) {
          throw error;
        }

        const delay = this.calculateBackoffDelay(attempt);
        this.emit('retry_attempt', { attempt: attempt + 1, delay, error: error?.message || 'Unknown error' });

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  calculateBackoffDelay(attempt) {
    const baseDelay = this.retryDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * baseDelay;
    return Math.min(baseDelay + jitter, 30000); // Max 30 seconds
  }

  /**
   * Determine if error is retryable
   */
  isRetryableError(error) {
    if (!error) return false;

    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    const retryableErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'];

    return (
      retryableStatusCodes.includes(error.response?.status) ||
      retryableErrors.some(code => error.code === code) ||
      Boolean(error?.message && error.message.includes('timeout'))
    );
  }

  /**
   * Circuit breaker state management
   */
  isCircuitBreakerClosed() {
    const now = Date.now();

    switch (this.circuitBreaker.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        if (now >= this.circuitBreaker.nextAttempt) {
          this.circuitBreaker.state = 'HALF_OPEN';
          this.emit('circuit_breaker_state', { state: 'HALF_OPEN' });
          return true;
        }
        return false;

      case 'HALF_OPEN':
        return true;

      default:
        return false;
    }
  }

  recordCircuitBreakerFailure() {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.state === 'HALF_OPEN' ||
        this.circuitBreaker.failures >= this.circuitBreaker.failureThreshold) {
      this.circuitBreaker.state = 'OPEN';
      this.circuitBreaker.nextAttempt = Date.now() + this.circuitBreaker.recoveryTimeout;
      this.emit('circuit_breaker_state', { state: 'OPEN', failures: this.circuitBreaker.failures });
    }
  }

  resetCircuitBreaker() {
    this.circuitBreaker.state = 'CLOSED';
    this.circuitBreaker.failures = 0;
    this.emit('circuit_breaker_state', { state: 'CLOSED' });
  }

  /**
   * Apply enhanced content filtering for legal safety and ethical AI use
   */
  applyContentFilter(messages) {
    const advisoryPhrases = [
      'what should i do',
      'should i sue',
      'file a lawsuit',
      'take legal action',
      'am i liable',
      'can i be prosecuted',
      'is this legal',
      'will i win',
      'guarantee',
      'definitely sue'
    ];

    const harmfulContent = [
      'hide assets',
      'avoid paying',
      'illegal activity',
      'false testimony',
      'perjury',
      'lie in court',
      'destroy evidence',
      'intimidate witness',
      'fraudulent claim'
    ];

    const emergencyKeywords = [
      'suicide',
      'kill myself',
      'domestic violence',
      'being threatened',
      'immediate danger',
      'physical harm'
    ];

    return messages.map(message => {
      if (message.role === 'user') {
        const content = message.content.toLowerCase();

        // Check for emergency situations requiring immediate attention
        if (emergencyKeywords.some(keyword => content.includes(keyword))) {
          message._emergencyFlag = true;
          message._requiresEmergencyResponse = true;
        }

        // Check for potentially harmful requests
        if (harmfulContent.some(phrase => content.includes(phrase))) {
          message._harmfulContent = true;
          message._requiresEthicalGuidance = true;
        }

        // Check for requests that might be seeking legal advice
        if (advisoryPhrases.some(phrase => content.includes(phrase))) {
          message._requiresLegalDisclaimer = true;
          message._requiresInformationOnly = true;
        }

        // Flag complex legal areas requiring professional consultation
        const complexLegalAreas = [
          'criminal law', 'immigration', 'medical negligence',
          'serious injury', 'complex commercial', 'bankruptcy',
          'child custody', 'divorce', 'inheritance', 'tax law'
        ];

        if (complexLegalAreas.some(area => content.includes(area))) {
          message._complexLegalArea = true;
          message._requiresProfessionalAdvice = true;
        }
      }

      return message;
    });
  }

  /**
   * Add legal context and system prompts
   */
  addLegalContext(messages, domain = null) {
    const systemMessage = {
      role: 'system',
      content: this.legalPrompts.SYSTEM_PROMPT
    };

    // Add domain-specific context
    if (domain && this.legalPrompts[domain.toUpperCase()]) {
      systemMessage.content += '\n\n' + this.legalPrompts[domain.toUpperCase()];
    }

    return [systemMessage, ...messages];
  }

  /**
   * Convert messages array to single prompt string for generate API
   */
  convertMessagesToPrompt(messages) {
    return messages.map(msg => {
      if (msg.role === 'system') {
        return msg.content;
      } else if (msg.role === 'user') {
        return `User: ${msg.content}`;
      } else if (msg.role === 'assistant') {
        return `Assistant: ${msg.content}`;
      }
      return msg.content;
    }).join('\n\n');
  }

  /**
   * Process and enhance legal responses with safety checks
   */
  processLegalResponse(response, originalMessages = []) {
    // Official Ollama client uses response.message.content
    let content = response.message?.content || response.response || '';

    // Check if original message had special flags from content filtering
    const userMessage = originalMessages.find(msg => msg.role === 'user');
    const messageFlags = {
      emergency: userMessage?._emergencyFlag || false,
      harmful: userMessage?._harmfulContent || false,
      requiresDisclaimer: userMessage?._requiresLegalDisclaimer || false,
      complexArea: userMessage?._complexLegalArea || false,
      requiresProfessional: userMessage?._requiresProfessionalAdvice || false
    };

    // Handle emergency situations with immediate resources
    if (messageFlags.emergency) {
      content = this.createEmergencyResponse(content);
    }

    // Handle harmful content requests with ethical guidance
    if (messageFlags.harmful) {
      content = this.createEthicalGuidanceResponse();
    }

    // Enhance complex legal area responses
    if (messageFlags.complexArea || messageFlags.requiresProfessional) {
      content = this.enhanceComplexLegalResponse(content);
    }

    // Ensure legal disclaimer is present for advice-seeking queries
    if (messageFlags.requiresDisclaimer || !content.includes('legal advice') && !content.includes('DISCLAIMER')) {
      content += '\n\n' + this.legalPrompts.DISCLAIMER;
    }

    // Add risk assessment
    const riskLevel = this.assessResponseRisk(content, messageFlags);

    // Add legal safeguards summary
    const safeguards = this.getSafeguardsSummary(messageFlags);

    return {
      content,
      riskLevel,
      tokensUsed: response.eval_count || 0,
      model: response.model || this.model,
      timestamp: new Date().toISOString(),
      disclaimer: true, // Boolean flag as expected by tests
      safeguards,
      messageFlags
    };
  }

  /**
   * Create emergency response with immediate resources
   */
  createEmergencyResponse(originalContent) {
    return `🚨 **EMERGENCY RESOURCES** 🚨

If you are in immediate danger, please contact emergency services right away:

**IMMEDIATE HELP:**
• **Emergency Services**: 999 (Police, Fire, Ambulance)
• **National Domestic Violence Helpline**: 0808 2000 247 (24/7)
• **Samaritans** (Mental Health Crisis): 116 123 (24/7)
• **Crisis Support**: Text SHOUT to 85258

**ADDITIONAL SUPPORT:**
• **Women's Aid**: 1800 341 900
• **Men's Advice Line**: 0808 801 0327
• **LGBT+ Domestic Violence**: 0800 999 5428
• **GALOP** (LGBT+ helpline): 0800 999 5428

${originalContent}

**Important**: If you are in immediate physical danger, please contact emergency services (999) before seeking legal advice. Your safety is the priority.

${this.legalPrompts.DISCLAIMER}`;
  }

  /**
   * Create ethical guidance response for harmful requests
   */
  createEthicalGuidanceResponse() {
    return `**Ethical Legal Practice Guidelines**

I understand you may be facing a difficult situation, but I cannot provide guidance on activities that could be:

• **Illegal or potentially fraudulent**
• **Harmful to others or yourself**
• **Undermining of legal processes**
• **Deceptive or dishonest practices**

**Instead, I Can Help You With:**
✅ Understanding your legitimate legal rights
✅ Proper legal procedures and processes
✅ Finding qualified legal representation
✅ Resources for resolving disputes ethically
✅ Options for addressing grievances lawfully

**Recommended Actions:**
1. **Consult a qualified solicitor** about your situation
2. **Document facts objectively** without exaggeration
3. **Follow proper legal channels** for your concerns
4. **Consider mediation or arbitration** for disputes

**Professional Resources:**
• **Law Society**: Find qualified legal professionals
• **Citizens Advice**: Free legal guidance
• **Legal Aid**: Support for those who qualify
• **Ombudsman Services**: For specific sectors

**Remember**: The legal system works best when all parties act honestly and in good faith. There are ethical solutions to most legal problems.

${this.legalPrompts.DISCLAIMER}`;
  }

  /**
   * Enhance responses for complex legal areas
   */
  enhanceComplexLegalResponse(originalContent) {
    return `⚠️ **COMPLEX LEGAL AREA NOTICE** ⚠️

The area of law you're asking about is particularly complex and requires specialist expertise.

${originalContent}

**STRONGLY RECOMMENDED - SEEK PROFESSIONAL ADVICE:**
This area of law involves significant complexity that requires:
• ✅ **Specialist legal knowledge** beyond general guidance
• ✅ **Current case law understanding** specific to your situation
• ✅ **Strategic legal planning** for optimal outcomes
• ✅ **Professional representation** if court proceedings are involved

**How to Find the Right Legal Help:**
1. **Specialist Solicitors**: Use Law Society's "Find a Solicitor" tool
2. **Legal Aid**: Check eligibility at gov.uk/legal-aid
3. **Pro Bono Services**: Free legal help for qualifying cases
4. **University Law Clinics**: Student-supervised free advice
5. **Specialist Charities**: Many have legal advice services

**Important Timing**: Some legal matters have strict time limits. Don't delay seeking professional advice.

**Cost Considerations**: Many solicitors offer free initial consultations. Legal aid may be available for qualifying cases.

${this.legalPrompts.DISCLAIMER}

**This information cannot substitute for professional legal advice in complex matters.**`;
  }

  /**
   * Get safeguards summary based on message flags
   */
  getSafeguardsSummary(messageFlags) {
    const activeSafeguards = [];

    if (messageFlags.emergency) {
      activeSafeguards.push('Emergency resources provided');
    }
    if (messageFlags.harmful) {
      activeSafeguards.push('Ethical guidance enforced');
    }
    if (messageFlags.requiresDisclaimer) {
      activeSafeguards.push('Legal disclaimer added');
    }
    if (messageFlags.complexArea) {
      activeSafeguards.push('Complex area warning issued');
    }
    if (messageFlags.requiresProfessional) {
      activeSafeguards.push('Professional consultation recommended');
    }

    return activeSafeguards.length > 0 ? activeSafeguards : ['Standard legal information safeguards'];
  }

  /**
   * Enhanced risk assessment considering message context
   */
  assessResponseRisk(content, messageFlags = {}) {
    const highRiskTerms = ['definitely', 'certainly', 'you should', 'you must', 'guaranteed'];
    const mediumRiskTerms = ['probably', 'likely', 'consider', 'might'];

    const lowerContent = content.toLowerCase();

    // Automatically high risk for emergency or harmful content flags
    if (messageFlags.emergency || messageFlags.harmful) {
      return 'HIGH';
    }

    // High risk for complex legal areas without proper disclaimers
    if (messageFlags.complexArea && !content.includes('professional advice')) {
      return 'HIGH';
    }

    // Check for directive language
    if (highRiskTerms.some(term => lowerContent.includes(term))) {
      return 'HIGH';
    } else if (mediumRiskTerms.some(term => lowerContent.includes(term))) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  /**
   * Context management for conversations
   */
  updateContext(sessionId, userMessage, aiResponse) {
    if (!this.contextHistory.has(sessionId)) {
      this.contextHistory.set(sessionId, []);
    }

    const context = this.contextHistory.get(sessionId);
    context.push({ user: userMessage, ai: aiResponse, timestamp: Date.now() });

    // Maintain max context length
    if (context.length > this.maxContextLength) {
      context.splice(0, context.length - this.maxContextLength);
    }

    this.contextHistory.set(sessionId, context);
  }

  /**
   * Get mock response for testing
   */
  getMockResponse(messages) {
    const userMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';

    let mockResponse;
    if (userMessage.includes('landlord') || userMessage.includes('evict') || userMessage.includes('deposit')) {
      mockResponse = this.mockResponses.landlord;
    } else if (userMessage.includes('refund') || userMessage.includes('faulty') || userMessage.includes('consumer')) {
      mockResponse = this.mockResponses.consumer;
    } else {
      mockResponse = this.mockResponses.general;
    }

    return {
      content: mockResponse.response, // Extract response content to content field
      confidence: mockResponse.confidence,
      model: 'mock-model',
      timestamp: new Date().toISOString(),
      disclaimer: true, // Boolean flag as expected by tests
      riskLevel: 'LOW'
    };
  }

  /**
   * Create enhanced error with user-friendly legal explanations
   */
  createEnhancedError(error) {
    const enhancedError = new Error();

    if (error.code === 'ECONNREFUSED' || error?.message?.includes('connect')) {
      enhancedError.message = 'AI service is currently unavailable. Please ensure Ollama is running or try again later.';
      enhancedError.userMessage = 'The legal AI assistant is temporarily offline. You can still use other features of Justice Companion.';
      enhancedError.suggestion = 'Check if Ollama is installed and running, or contact support if the issue persists.';
    } else if (error.response?.status === 429) {
      enhancedError.message = 'Rate limit exceeded. Please wait before making another request.';
      enhancedError.userMessage = 'Too many requests in a short time. Please wait a moment before continuing.';
      enhancedError.suggestion = 'Wait 60 seconds before sending another message.';
    } else if (error.response?.status >= 500) {
      enhancedError.message = 'AI service is experiencing technical difficulties.';
      enhancedError.userMessage = 'The legal AI assistant is having technical issues. Please try again in a few minutes.';
      enhancedError.suggestion = 'If this persists, you can still document your case and seek traditional legal resources.';
    } else {
      enhancedError.message = error?.message || 'An unexpected error occurred.';
      enhancedError.userMessage = 'Something went wrong with the AI assistant. Please try again.';
      enhancedError.suggestion = 'Try rephrasing your question or contact support if the issue continues.';
    }

    enhancedError.originalError = error;
    enhancedError.timestamp = new Date().toISOString();

    return enhancedError;
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
   * Get health status and telemetry
   */
  getHealthStatus() {
    const now = Date.now();
    const uptime = now - this.telemetry.uptime;
    const successRate = this.telemetry.totalRequests > 0
      ? (this.telemetry.successfulRequests / this.telemetry.totalRequests) * 100
      : 0;

    return {
      status: this.circuitBreaker.state === 'CLOSED' ? 'healthy' : 'degraded',
      circuitBreaker: {
        state: this.circuitBreaker.state,
        failures: this.circuitBreaker.failures,
        nextAttempt: this.circuitBreaker.nextAttempt
      },
      telemetry: {
        ...this.telemetry,
        uptime,
        successRate: Math.round(successRate * 100) / 100
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Test connection to Ollama service
   */
  async testConnection() {
    try {
      const models = await this.ollamaClient.list();
      return {
        connected: true,
        models: models.models || [],
        version: 'unknown'
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Pull/download a model
   */
  async pullModel(modelName = null) {
    try {
      const model = modelName || this.model;
      await this.ollamaClient.pull({ model });
      return { success: true, model };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Show model information
   */
  async showModel(modelName = null) {
    try {
      const model = modelName || this.model;
      return await this.ollamaClient.show({ name: model });
    } catch (error) {
      return null;
    }
  }

  /**
   * Utility function for delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.contextHistory.clear();
    this.removeAllListeners();
    this.emit('destroyed');
  }
}

module.exports = OllamaClient;