const http = require('http');
const EventEmitter = require('events');

class APIIntegration extends EventEmitter {
  constructor() {
    super();
    this.ollamaEndpoint = 'http://localhost:11434';
    this.startTime = Date.now();
    this.circuitBreaker = {
      failures: 0,
      threshold: 5,
      timeout: 120000,
      state: 'closed',
      nextAttempt: null,
      lastStateChange: Date.now()
    };
    this.requestQueue = [];
    this.processing = false;
    this.rateLimiter = {
      requests: 0,
      windowStart: Date.now(),
      maxRequests: 100,
      windowMs: 60000
    };
  }

  async checkOllamaStatus() {
    try {
      const response = await this.makeRequest('/api/tags', 'GET');
      return {
        available: true,
        models: response.models || [],
        version: response.version || 'unknown'
      };
    } catch (error) {
      console.error('Ollama status check failed:', error.message);
      return {
        available: false,
        error: error.message,
        fallbackMode: true
      };
    }
  }

  async generateLegalResponse(prompt, context = {}) {
    try {
      if (!await this.checkRateLimit()) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: this.getRetryAfter()
        };
      }

      if (this.circuitBreaker.state === 'open') {
        if (Date.now() < this.circuitBreaker.nextAttempt) {
          return this.getFallbackResponse(prompt, context);
        }
        this.circuitBreaker.state = 'half-open';
      }

      const sanitizedPrompt = this.sanitizeLegalPrompt(prompt);
      const enhancedPrompt = this.addLegalContext(sanitizedPrompt, context);

      const requestBody = {
        model: context.model || 'llama2',
        prompt: enhancedPrompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          max_tokens: 2000,
          stop: ['User:', 'Human:', '\n\n\n']
        }
      };

      const response = await this.makeRequest('/api/generate', 'POST', requestBody);

      if (response.response) {
        this.recordSuccess();
        const validated = this.validateLegalResponse(response.response);

        return {
          success: true,
          response: validated,
          model: requestBody.model,
          processingTime: response.total_duration || 0,
          tokenCount: response.eval_count || 0
        };
      }

      throw new Error('Invalid response from Ollama');
    } catch (error) {
      this.recordFailure();
      console.error('Legal response generation failed:', error);
      return this.getFallbackResponse(prompt, context);
    }
  }

  async processDocumentAnalysis(documentText, analysisType) {
    try {
      const chunks = this.chunkDocument(documentText);
      const analyses = [];

      for (const chunk of chunks) {
        const prompt = this.buildAnalysisPrompt(chunk, analysisType);
        const result = await this.generateLegalResponse(prompt, {
          type: 'document_analysis',
          analysisType
        });

        if (result.success) {
          analyses.push(result.response);
        }
      }

      return {
        success: true,
        analysis: this.mergeAnalyses(analyses),
        chunks: chunks.length,
        type: analysisType
      };
    } catch (error) {
      console.error('Document analysis failed:', error);
      return {
        success: false,
        error: error.message,
        fallback: this.getBasicDocumentAnalysis(documentText, analysisType)
      };
    }
  }

  makeRequest(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 11434,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 120000
      };

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const parsed = JSON.parse(data);
              resolve(parsed);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  sanitizeLegalPrompt(prompt) {
    const sensitivePatterns = [
      /ssn:\s*\d{3}-\d{2}-\d{4}/gi,
      /credit\s*card:\s*\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/gi,
      /password:\s*\S+/gi,
      /api[_\s-]?key:\s*\S+/gi
    ];

    let sanitized = prompt;
    for (const pattern of sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    return sanitized.substring(0, 5000);
  }

  addLegalContext(prompt, context) {
    const legalPreamble = `You are a legal assistant AI. Provide accurate, helpful legal information while noting that this is not formal legal advice.
Consider jurisdiction, applicable laws, and ethical guidelines. Be precise and cite legal principles where relevant.

Context: ${context.caseType || 'General legal inquiry'}
Jurisdiction: ${context.jurisdiction || 'United States'}

`;

    const ethicalReminder = `

Remember: This information is for educational purposes. Users should consult qualified attorneys for legal advice specific to their situation.`;

    return legalPreamble + prompt + ethicalReminder;
  }

  validateLegalResponse(response) {
    const disclaimers = [
      'This is not legal advice',
      'Consult an attorney',
      'Legal information only'
    ];

    const hasDisclaimer = disclaimers.some(d =>
      response.toLowerCase().includes(d.toLowerCase())
    );

    if (!hasDisclaimer) {
      response += '\n\nNote: This information is provided for educational purposes only and should not be considered legal advice. Please consult with a qualified attorney for advice specific to your situation.';
    }

    const prohibitedTerms = [
      'guarantee',
      'definitely will win',
      '100% success rate'
    ];

    for (const term of prohibitedTerms) {
      const pattern = new RegExp(term, 'gi');
      response = response.replace(pattern, '[term removed for accuracy]');
    }

    return response;
  }

  getFallbackResponse(prompt, context) {
    const fallbackTemplates = {
      case_evaluation: 'Based on the information provided, this case appears to involve [general area of law]. Key considerations include: 1) Gathering all relevant documentation, 2) Understanding applicable statutes of limitations, 3) Evaluating potential claims and defenses. Please consult with an attorney for specific legal advice.',

      legal_research: 'For legal research on this topic, consider reviewing: 1) Relevant state and federal statutes, 2) Case law precedents, 3) Administrative regulations. Legal databases like Westlaw or LexisNexis may provide comprehensive resources. An attorney can provide specific guidance.',

      document_review: 'When reviewing legal documents, pay attention to: 1) Defined terms and their usage, 2) Rights and obligations of parties, 3) Deadlines and important dates, 4) Dispute resolution procedures. Have an attorney review important documents before signing.',

      general: 'I understand you have a legal question. While I cannot provide specific legal advice, I recommend: 1) Documenting all relevant information, 2) Researching applicable laws in your jurisdiction, 3) Consulting with a qualified attorney for personalized guidance.'
    };

    const type = context.type || 'general';
    return {
      success: true,
      response: fallbackTemplates[type] || fallbackTemplates.general,
      fallback: true,
      reason: 'AI service temporarily unavailable'
    };
  }

  async checkRateLimit() {
    const now = Date.now();

    if (now - this.rateLimiter.windowStart > this.rateLimiter.windowMs) {
      this.rateLimiter.requests = 0;
      this.rateLimiter.windowStart = now;
    }

    if (this.rateLimiter.requests >= this.rateLimiter.maxRequests) {
      return false;
    }

    this.rateLimiter.requests++;
    return true;
  }

  getRetryAfter() {
    const windowEnd = this.rateLimiter.windowStart + this.rateLimiter.windowMs;
    return Math.max(0, windowEnd - Date.now());
  }

  recordSuccess() {
    if (this.circuitBreaker.state === 'half-open') {
      this.circuitBreaker.state = 'closed';
      this.circuitBreaker.lastStateChange = Date.now();

      this.emit('circuit_breaker_state', {
        state: 'closed',
        failures: 0
      });
    }
    this.circuitBreaker.failures = 0;
  }

  recordFailure() {
    this.circuitBreaker.failures++;

    if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
      this.circuitBreaker.state = 'open';
      this.circuitBreaker.nextAttempt = Date.now() + this.circuitBreaker.timeout;
      this.circuitBreaker.lastStateChange = Date.now();

      this.emit('circuit_breaker_state', {
        state: 'open',
        failures: this.circuitBreaker.failures,
        nextAttempt: new Date(this.circuitBreaker.nextAttempt)
      });

      // Keep backward compatibility
      this.emit('circuitOpen', {
        failures: this.circuitBreaker.failures,
        nextAttempt: new Date(this.circuitBreaker.nextAttempt)
      });
    }
  }

  chunkDocument(text, maxChunkSize = 2000) {
    const chunks = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          chunks.push(sentence.substring(0, maxChunkSize));
          currentChunk = sentence.substring(maxChunkSize);
        }
      } else {
        currentChunk += ' ' + sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  buildAnalysisPrompt(text, analysisType) {
    const prompts = {
      contract: `Analyze this contract excerpt for key terms, obligations, and potential issues:\n\n${text}`,
      case_law: `Summarize the legal principles and precedents in this case excerpt:\n\n${text}`,
      statute: `Explain the requirements and implications of this statutory text:\n\n${text}`,
      discovery: `Identify relevant information and potential evidence in this document:\n\n${text}`
    };

    return prompts[analysisType] || `Provide legal analysis of this text:\n\n${text}`;
  }

  mergeAnalyses(analyses) {
    if (analyses.length === 0) return 'No analysis available';
    if (analyses.length === 1) return analyses[0];

    const merged = ['Combined Analysis:', ''];

    analyses.forEach((analysis, index) => {
      merged.push(`Section ${index + 1}:`);
      merged.push(analysis);
      merged.push('');
    });

    merged.push('Note: This analysis covers multiple sections of the document.');

    return merged.join('\n');
  }

  getBasicDocumentAnalysis(text, type) {
    const wordCount = String(text || '').split(/\s+/).length;
    const hasLegalTerms = /agreement|contract|party|liability|damages|court/i.test(text);

    return {
      type,
      wordCount,
      appearsLegal: hasLegalTerms,
      summary: 'Document requires manual review. AI analysis temporarily unavailable.',
      recommendations: [
        'Review document carefully',
        'Identify key terms and obligations',
        'Note important dates and deadlines',
        'Consult attorney for professional analysis'
      ]
    };
  }

  async queueRequest(request) {
    this.requestQueue.push(request);
    if (!this.processing) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.requestQueue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const request = this.requestQueue.shift();

    try {
      const result = await this.generateLegalResponse(request.prompt, request.context);
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    }

    setTimeout(() => this.processQueue(), 100);
  }

  // Clean up resources and event listeners
  destroy() {
    try {
      // Clear any pending timeouts
      this.processing = false;

      // Clear request queue
      this.requestQueue = [];

      // Reset circuit breaker
      this.circuitBreaker = {
        failures: 0,
        threshold: 5,
        timeout: 120000,
        state: 'closed',
        nextAttempt: null,
        lastStateChange: Date.now()
      };

      // Reset rate limiter
      this.rateLimiter = {
        requests: 0,
        windowStart: Date.now(),
        maxRequests: 100,
        windowMs: 60000
      };

      // Remove all event listeners
      this.removeAllListeners();

      console.log('✅ APIIntegration: Successfully destroyed');
    } catch (error) {
      console.error('❌ APIIntegration destroy error:', error);
    }
  }
}

module.exports = { APIIntegration };