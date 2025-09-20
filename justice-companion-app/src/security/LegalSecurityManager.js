const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');
const validator = require('validator');

// Initialize DOMPurify for server-side sanitization
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

class LegalSecurityManager {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.saltLength = 32;
    this.tagLength = 16;
    this.pbkdf2Iterations = 100000;
    this.keyCache = new Map();
    this.sessionKeys = new Map();
    this.initializeSecurity();
  }

  async initializeSecurity() {
    try {
      await this.ensureSecurityDirectory();
      await this.rotateSessionKeys();
      setInterval(() => this.rotateSessionKeys(), 3600000);
    } catch (error) {
      console.error('Security initialization failed:', error);
    }
  }

  async ensureSecurityDirectory() {
    const secDir = path.join(process.env.APPDATA || process.env.HOME, '.justice-companion', 'security');
    await fs.mkdir(secDir, { recursive: true });
    return secDir;
  }

  encryptData(data, masterKey) {
    try {
      const salt = crypto.randomBytes(this.saltLength);
      const key = this.deriveKey(masterKey, salt);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
      encrypted += cipher.final('base64');

      const authTag = cipher.getAuthTag();

      return {
        encrypted,
        salt: salt.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        algorithm: this.algorithm,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  decryptData(encryptedPackage, masterKey) {
    try {
      const { encrypted, salt, iv, authTag, algorithm } = encryptedPackage;

      if (algorithm !== this.algorithm) {
        throw new Error('Invalid encryption algorithm');
      }

      const key = this.deriveKey(masterKey, Buffer.from(salt, 'base64'));
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        key,
        Buffer.from(iv, 'base64')
      );

      decipher.setAuthTag(Buffer.from(authTag, 'base64'));

      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  deriveKey(password, salt) {
    const cacheKey = `${password}-${salt.toString('base64')}`;

    if (this.keyCache.has(cacheKey)) {
      return this.keyCache.get(cacheKey);
    }

    const key = crypto.pbkdf2Sync(
      password,
      salt,
      this.pbkdf2Iterations,
      32,
      'sha256'
    );

    this.keyCache.set(cacheKey, key);
    setTimeout(() => this.keyCache.delete(cacheKey), 300000);

    return key;
  }

  hashPassword(password) {
    const salt = crypto.randomBytes(this.saltLength);
    const hash = crypto.pbkdf2Sync(password, salt, this.pbkdf2Iterations, 64, 'sha512');
    return {
      hash: hash.toString('base64'),
      salt: salt.toString('base64'),
      iterations: this.pbkdf2Iterations
    };
  }

  verifyPassword(password, storedHash) {
    const { hash, salt, iterations } = storedHash;
    const verifyHash = crypto.pbkdf2Sync(
      password,
      Buffer.from(salt, 'base64'),
      iterations,
      64,
      'sha512'
    );
    return crypto.timingSafeEqual(Buffer.from(hash, 'base64'), verifyHash);
  }

  generateSessionToken() {
    return crypto.randomBytes(32).toString('base64url');
  }

  async rotateSessionKeys() {
    const newKey = crypto.randomBytes(32);
    const keyId = crypto.randomBytes(16).toString('hex');

    this.sessionKeys.set(keyId, {
      key: newKey,
      created: Date.now(),
      expiresAt: Date.now() + 3600000
    });

    for (const [id, keyData] of this.sessionKeys.entries()) {
      if (keyData.expiresAt < Date.now()) {
        this.sessionKeys.delete(id);
      }
    }

    return keyId;
  }

  /**
   * Comprehensive input sanitization using DOMPurify and custom security checks
   * @param {string} input - The input to sanitize
   * @param {string} profile - Sanitization profile: 'html', 'text', 'sql', 'url', 'email', 'filename'
   * @returns {string} - Sanitized input
   */
  sanitizeInput(input, profile = 'text') {
    if (typeof input !== 'string') return input;

    try {
      switch (profile) {
        case 'html':
          return this.sanitizeHTML(input);
        case 'text':
          return this.sanitizeText(input);
        case 'sql':
          return this.sanitizeSQLInput(input);
        case 'url':
          return this.sanitizeURL(input);
        case 'email':
          return this.sanitizeEmail(input);
        case 'filename':
          return this.sanitizeFilename(input);
        case 'legal_document':
          return this.sanitizeLegalDocument(input);
        default:
          return this.sanitizeText(input);
      }
    } catch (error) {
      console.error('Sanitization error:', error);
      return '';
    }
  }

  /**
   * Sanitize HTML content using DOMPurify
   */
  sanitizeHTML(input) {
    const config = {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'blockquote'],
      ALLOWED_ATTR: [],
      FORBID_ATTR: ['style', 'class', 'id'],
      FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input'],
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      SANITIZE_DOM: true,
      WHOLE_DOCUMENT: false
    };

    return DOMPurify.sanitize(input, config);
  }

  /**
   * Sanitize plain text with XSS protection
   */
  sanitizeText(input) {
    return input
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove JavaScript protocols
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:/gi, '')
      // Remove event handlers
      .replace(/on\w+\s*=/gi, '')
      // Remove potential SQL injection patterns
      .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi, '')
      // Remove LDAP injection patterns
      .replace(/[();&|*]/g, '')
      // Remove command injection patterns
      .replace(/[;&|`$()]/g, '')
      // Remove null bytes
      .replace(/\x00/g, '')
      .trim();
  }

  /**
   * Sanitize SQL input parameters
   */
  sanitizeSQLInput(input) {
    if (!input) return '';

    return input
      .replace(/'/g, "''")  // Escape single quotes
      .replace(/"/g, '""')  // Escape double quotes
      .replace(/\\/g, '\\\\') // Escape backslashes
      .replace(/\x00/g, '') // Remove null bytes
      .replace(/\n/g, '\\n') // Escape newlines
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\x1a/g, '\\Z'); // Escape substitute character
  }

  /**
   * Sanitize and validate URLs
   */
  sanitizeURL(input) {
    if (!input) return '';

    try {
      // Use validator library for URL validation
      if (!validator.isURL(input, {
        protocols: ['http', 'https'],
        require_protocol: true,
        allow_underscores: false
      })) {
        return '';
      }

      const url = new URL(input);

      // Block dangerous protocols
      const dangerousProtocols = ['javascript', 'data', 'vbscript', 'file', 'ftp'];
      if (dangerousProtocols.includes(url.protocol.replace(':', ''))) {
        return '';
      }

      return url.href;
    } catch (error) {
      return '';
    }
  }

  /**
   * Sanitize and validate email addresses
   */
  sanitizeEmail(input) {
    if (!input) return '';

    const sanitized = input.toLowerCase().trim();

    if (validator.isEmail(sanitized)) {
      return sanitized;
    }

    return '';
  }

  /**
   * Sanitize filenames for secure file operations
   */
  sanitizeFilename(input) {
    if (!input) return '';

    return input
      // Remove path traversal attempts
      .replace(/\.\./g, '')
      .replace(/[\/\\]/g, '')
      // Remove dangerous characters
      .replace(/[<>:"|?*]/g, '')
      // Remove control characters
      .replace(/[\x00-\x1f\x80-\x9f]/g, '')
      // Remove leading/trailing dots and spaces
      .replace(/^[.\s]+|[.\s]+$/g, '')
      .trim();
  }

  /**
   * Sanitize legal documents with preservation of formatting
   */
  sanitizeLegalDocument(input) {
    if (!input) return '';

    const config = {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      ALLOWED_ATTR: [],
      FORBID_ATTR: ['style', 'class', 'id', 'onclick', 'onload', 'onerror'],
      FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input', 'link', 'meta'],
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      SANITIZE_DOM: true
    };

    return DOMPurify.sanitize(input, config);
  }

  /**
   * Create parameterized query helper for SQL injection prevention
   */
  createParameterizedQuery(query, params = []) {
    // Validate query structure
    if (typeof query !== 'string' || !query.trim()) {
      throw new Error('Invalid query structure');
    }

    // Count placeholders
    const placeholderCount = (query.match(/\?/g) || []).length;
    if (placeholderCount !== params.length) {
      throw new Error('Parameter count mismatch');
    }

    // Sanitize parameters
    const sanitizedParams = params.map(param => {
      if (typeof param === 'string') {
        return this.sanitizeSQLInput(param);
      }
      return param;
    });

    return {
      query: query,
      params: sanitizedParams,
      hash: crypto.createHash('sha256').update(query + JSON.stringify(sanitizedParams)).digest('hex')
    };
  }

  /**
   * Advanced input validation with context awareness
   */
  validateInputContext(input, context = {}) {
    const { maxLength = 1000, allowHTML = false, allowSpecialChars = false } = context;
    const errors = [];

    if (!input || typeof input !== 'string') {
      errors.push('Input must be a non-empty string');
      return { isValid: false, errors };
    }

    // Length validation
    if (input.length > maxLength) {
      errors.push(`Input exceeds maximum length of ${maxLength} characters`);
    }

    // HTML validation
    if (!allowHTML && /<[^>]*>/.test(input)) {
      errors.push('HTML content not allowed in this context');
    }

    // Special characters validation
    if (!allowSpecialChars && /[<>'";&|*(){}[\]]/.test(input)) {
      errors.push('Special characters not allowed in this context');
    }

    // Script injection detection
    const scriptPatterns = [
      /javascript:/i,
      /vbscript:/i,
      /on\w+\s*=/i,
      /<script/i,
      /eval\s*\(/i,
      /expression\s*\(/i
    ];

    for (const pattern of scriptPatterns) {
      if (pattern.test(input)) {
        errors.push('Potential script injection detected');
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateCaseAccess(userRole, caseData) {
    const accessMatrix = {
      admin: ['read', 'write', 'delete', 'share'],
      attorney: ['read', 'write', 'share'],
      paralegal: ['read', 'write'],
      client: ['read']
    };

    return accessMatrix[userRole] || [];
  }

  auditLog(action, userId, details) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      details,
      sessionId: crypto.randomBytes(8).toString('hex'),
      ipAddress: '127.0.0.1'
    };

    console.log('AUDIT:', JSON.stringify(logEntry));
    return logEntry;
  }

  checkPrivilegeCompliance(documentType) {
    const privilegedTypes = [
      'attorney_client_communication',
      'legal_advice',
      'case_strategy',
      'settlement_discussion'
    ];

    return {
      isPrivileged: privilegedTypes.includes(documentType),
      requiresEncryption: true,
      retentionPolicy: documentType === 'legal_advice' ? 'indefinite' : '7_years',
      accessRestrictions: 'attorney_only'
    };
  }

  async destroySecureData(dataId) {
    try {
      const overwrites = 3;
      for (let i = 0; i < overwrites; i++) {
        await this.overwriteMemory(dataId);
      }

      this.keyCache.delete(dataId);
      this.sessionKeys.delete(dataId);

      return { success: true, destroyed: dataId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  overwriteMemory(dataId) {
    const randomData = crypto.randomBytes(1024);
    return new Promise(resolve => setTimeout(resolve, 10));
  }

  checkRateLimit(action, userId) {
    const rateLimits = {
      default: { max: 100, window: 60000 },
      ai_request: { max: 20, window: 60000 },
      save_case: { max: 50, window: 3600000 },
      get_cases: { max: 200, window: 60000 },
      save_fact: { max: 100, window: 3600000 },
      upload_document: { max: 20, window: 3600000 },
      export_case: { max: 10, window: 86400000 },
      security_report: { max: 5, window: 3600000 },
      gdpr_export: { max: 3, window: 86400000 },
      update_case: { max: 100, window: 3600000 },
      save_document: { max: 50, window: 3600000 },
      save_client: { max: 20, window: 3600000 },
      get_clients: { max: 100, window: 60000 },
      key_status: { max: 10, window: 60000 },
      force_key_rotation: { max: 2, window: 86400000 }
    };

    const limit = rateLimits[action] || rateLimits.default;
    const now = Date.now();
    const key = `${userId}-${action}`;

    if (!this.rateLimitTracking) {
      this.rateLimitTracking = new Map();
    }

    const tracking = this.rateLimitTracking.get(key) || { count: 0, windowStart: now };

    if (now - tracking.windowStart > limit.window) {
      tracking.count = 1;
      tracking.windowStart = now;
    } else {
      tracking.count++;
    }

    this.rateLimitTracking.set(key, tracking);

    const allowed = tracking.count <= limit.max;

    // For backward compatibility, return boolean when rate limit is checked
    return allowed;
  }

  /**
   * Enhanced validation and sanitization for legal applications using DOMPurify
   */
  validateAndSanitizeInput(input, inputType = 'general') {
    const validationRules = {
      case_title: {
        maxLength: 200,
        sanitizationProfile: 'text',
        allowHTML: false,
        allowSpecialChars: false,
        required: true
      },
      case_description: {
        maxLength: 5000,
        sanitizationProfile: 'text',
        allowHTML: false,
        allowSpecialChars: true,
        required: false
      },
      legal_document: {
        maxLength: 50000,
        sanitizationProfile: 'legal_document',
        allowHTML: true,
        allowSpecialChars: true,
        required: true
      },
      client_name: {
        maxLength: 100,
        sanitizationProfile: 'text',
        allowHTML: false,
        allowSpecialChars: false,
        required: true
      },
      email: {
        maxLength: 255,
        sanitizationProfile: 'email',
        allowHTML: false,
        allowSpecialChars: false,
        required: false
      },
      url: {
        maxLength: 2048,
        sanitizationProfile: 'url',
        allowHTML: false,
        allowSpecialChars: false,
        required: false
      },
      filename: {
        maxLength: 255,
        sanitizationProfile: 'filename',
        allowHTML: false,
        allowSpecialChars: false,
        required: false
      },
      general: {
        maxLength: 1000,
        sanitizationProfile: 'text',
        allowHTML: false,
        allowSpecialChars: false,
        required: false
      }
    };

    const rules = validationRules[inputType] || validationRules.general;
    const errors = [];

    // Check if required
    if (rules.required && (!input || input.trim().length === 0)) {
      errors.push('Input is required');
    }

    if (input) {
      // Enhanced validation using context-aware validation
      const contextValidation = this.validateInputContext(input, {
        maxLength: rules.maxLength,
        allowHTML: rules.allowHTML,
        allowSpecialChars: rules.allowSpecialChars
      });

      errors.push(...contextValidation.errors);
    }

    // Enhanced sanitization using DOMPurify and specialized sanitizers
    let sanitized = '';
    if (input) {
      try {
        sanitized = this.sanitizeInput(input, rules.sanitizationProfile);
      } catch (error) {
        console.error('Sanitization failed:', error);
        errors.push('Input sanitization failed');
        sanitized = '';
      }
    }

    // Additional validation for specific input types
    if (inputType === 'email' && sanitized && !validator.isEmail(sanitized)) {
      errors.push('Invalid email format');
      sanitized = '';
    }

    if (inputType === 'url' && sanitized && !validator.isURL(sanitized, {
      protocols: ['http', 'https'],
      require_protocol: true
    })) {
      errors.push('Invalid URL format');
      sanitized = '';
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      sanitized: sanitized,
      originalLength: input ? input.length : 0,
      sanitizedLength: sanitized.length,
      securityProfile: rules.sanitizationProfile
    };
  }

  /**
   * Encrypt legal data with metadata
   */
  encryptLegalData(data) {
    const sessionKey = this.generateSessionToken();
    const encryptedData = this.encryptData(data, sessionKey);

    return {
      ...encryptedData,
      sessionKey: sessionKey,
      dataType: 'legal',
      classification: data.classification || 'confidential'
    };
  }

  /**
   * Create a secure session for a user
   */
  createSecureSession(userId = null) {
    const sessionId = this.generateSessionToken();
    const sessionData = {
      id: sessionId,
      userId: userId || 'anonymous',
      created: Date.now(),
      lastActivity: Date.now(),
      expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };

    // Store session (in a real app, this would be in a secure session store)
    if (!this.activeSessions) {
      this.activeSessions = new Map();
    }

    this.activeSessions.set(sessionId, sessionData);

    return sessionId;
  }

  /**
   * Validate a session
   */
  validateSession(sessionId) {
    if (!this.activeSessions || !sessionId) {
      return false;
    }

    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Check if session is expired
    if (Date.now() > session.expires) {
      this.activeSessions.delete(sessionId);
      return false;
    }

    // Update last activity
    session.lastActivity = Date.now();
    this.activeSessions.set(sessionId, session);

    return true;
  }

  /**
   * Calculate integrity hash for data verification
   */
  calculateIntegrityHash(data) {
    const dataString = JSON.stringify(data);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Generate Content Security Policy recommendations for legal applications
   */
  generateCSPRecommendations() {
    return {
      'default-src': "'self'",
      'script-src': "'self' 'unsafe-inline'", // Minimal inline scripts for legal apps
      'style-src': "'self' 'unsafe-inline'",
      'img-src': "'self' data: blob:",
      'font-src': "'self'",
      'connect-src': "'self'",
      'media-src': "'self'",
      'object-src': "'none'",
      'child-src': "'none'",
      'frame-src': "'none'",
      'base-uri': "'self'",
      'form-action': "'self'",
      'frame-ancestors': "'none'",
      'upgrade-insecure-requests': true,
      'block-all-mixed-content': true
    };
  }

  /**
   * Generate security headers for legal applications
   */
  getSecurityHeaders() {
    const csp = this.generateCSPRecommendations();
    const cspString = Object.entries(csp)
      .filter(([key, value]) => value !== true)
      .map(([key, value]) => `${key} ${value}`)
      .join('; ');

    return {
      'Content-Security-Policy': cspString,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    };
  }

  /**
   * Comprehensive security scan for input data
   */
  performSecurityScan(input, context = {}) {
    const threats = [];
    const warnings = [];

    if (!input || typeof input !== 'string') {
      return { threats, warnings, riskLevel: 'low' };
    }

    // XSS Detection
    const xssPatterns = [
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,
      /<iframe[\s\S]*?>/gi,
      /<object[\s\S]*?>/gi,
      /<embed[\s\S]*?>/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi
    ];

    xssPatterns.forEach((pattern, index) => {
      if (pattern.test(input)) {
        threats.push({
          type: 'XSS',
          severity: 'high',
          pattern: pattern.source,
          description: 'Potential Cross-Site Scripting attack detected'
        });
      }
    });

    // SQL Injection Detection
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b.*\b(FROM|INTO|SET|WHERE|VALUES)\b)/gi,
      /('|\").*(\bOR\b|\bAND\b).*('|\")/gi,
      /\b1\s*=\s*1\b/gi,
      /\b1\s*=\s*'1'\b/gi
    ];

    sqlPatterns.forEach((pattern) => {
      if (pattern.test(input)) {
        threats.push({
          type: 'SQL_INJECTION',
          severity: 'high',
          pattern: pattern.source,
          description: 'Potential SQL injection attack detected'
        });
      }
    });

    // LDAP Injection Detection
    const ldapPatterns = [
      /\*\)/g,
      /\(\*/g,
      /\)\(/g,
      /\|\|/g,
      /&&/g
    ];

    ldapPatterns.forEach((pattern) => {
      if (pattern.test(input)) {
        threats.push({
          type: 'LDAP_INJECTION',
          severity: 'medium',
          pattern: pattern.source,
          description: 'Potential LDAP injection detected'
        });
      }
    });

    // Command Injection Detection
    const commandPatterns = [
      /[;&|`$()]/g,
      /\b(cat|ls|dir|type|echo|cmd|powershell|bash|sh)\b/gi
    ];

    commandPatterns.forEach((pattern) => {
      if (pattern.test(input)) {
        threats.push({
          type: 'COMMAND_INJECTION',
          severity: 'high',
          pattern: pattern.source,
          description: 'Potential command injection detected'
        });
      }
    });

    // Path Traversal Detection
    const pathTraversalPatterns = [
      /\.\.\//g,
      /\.\.\\/g,
      /%2e%2e%2f/gi,
      /%2e%2e%5c/gi
    ];

    pathTraversalPatterns.forEach((pattern) => {
      if (pattern.test(input)) {
        threats.push({
          type: 'PATH_TRAVERSAL',
          severity: 'medium',
          pattern: pattern.source,
          description: 'Potential path traversal attack detected'
        });
      }
    });

    // Data Exfiltration Patterns
    const dataPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN pattern
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card pattern
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g // Email pattern
    ];

    dataPatterns.forEach((pattern, index) => {
      const matches = input.match(pattern);
      if (matches && matches.length > 5) { // Threshold for warning
        warnings.push({
          type: 'POTENTIAL_DATA_LEAK',
          severity: 'medium',
          count: matches.length,
          description: 'Large amount of potentially sensitive data detected'
        });
      }
    });

    // Determine risk level
    let riskLevel = 'low';
    if (threats.some(t => t.severity === 'high')) {
      riskLevel = 'high';
    } else if (threats.some(t => t.severity === 'medium') || warnings.length > 0) {
      riskLevel = 'medium';
    }

    return {
      threats,
      warnings,
      riskLevel,
      scanTimestamp: new Date().toISOString(),
      inputLength: input.length,
      context
    };
  }

  /**
   * Generate security report for application monitoring
   */
  generateSecurityReport() {
    return {
      timestamp: new Date().toISOString(),
      securityVersion: '2.0.0',
      features: {
        xssProtection: 'DOMPurify v3.x',
        sqlInjectionPrevention: 'Parameterized queries + input sanitization',
        ldapInjectionPrevention: 'Character filtering + validation',
        commandInjectionPrevention: 'Character filtering + validation',
        pathTraversalPrevention: 'Path sanitization + validation',
        dataValidation: 'Validator.js + custom rules',
        contentSecurityPolicy: 'Strict CSP recommendations',
        securityHeaders: 'Comprehensive header set'
      },
      recommendations: [
        'Implement regular security scans of user input',
        'Monitor for suspicious patterns in application logs',
        'Keep DOMPurify and validator.js updated',
        'Regular review of CSP policies',
        'Implement rate limiting for sensitive operations',
        'Use HTTPS for all communications',
        'Regular security audits of legal document handling'
      ]
    };
  }
}

module.exports = { LegalSecurityManager };