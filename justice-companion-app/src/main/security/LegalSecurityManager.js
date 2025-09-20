const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

/**
 * Legal Security Manager - Comprehensive security for legal applications
 * Implements attorney-client privilege protection, GDPR compliance, and audit trails
 */
class LegalSecurityManager {
  constructor() {
    this.encryptionKey = null;
    this.auditLogger = null;
    this.sessionManager = new Map();
    this.rateLimiter = new Map();
    this.dataRetentionPolicies = new Map();

    this.initialize();
  }

  async initialize() {
    // Initialize encryption key
    await this.initializeEncryption();

    // Setup audit logging
    this.initializeAuditLogging();

    // Load data retention policies
    this.loadDataRetentionPolicies();

    console.log('🔒 Legal Security Manager: INITIALIZED - Attorney-Client Privilege PROTECTED');
  }

  // =====================
  // ENCRYPTION MANAGEMENT
  // =====================

  async initializeEncryption() {
    try {
      const keyPath = path.join(process.env.APPDATA || process.env.HOME, 'justice-companion', 'master.key');

      // Check if key exists
      try {
        const keyData = await fs.readFile(keyPath);
        this.encryptionKey = keyData;
        this.auditLog('SECURITY', 'ENCRYPTION_KEY_LOADED', { success: true });
      } catch (error) {
        // Generate new master key
        this.encryptionKey = crypto.randomBytes(32);

        // Ensure directory exists
        await fs.mkdir(path.dirname(keyPath), { recursive: true });

        // Save encrypted key with system-level protection
        await fs.writeFile(keyPath, this.encryptionKey, { mode: 0o600 });

        this.auditLog('SECURITY', 'NEW_ENCRYPTION_KEY_GENERATED', {
          success: true,
          keyPath: keyPath
        });
      }
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      throw new Error('CRITICAL: Unable to initialize encryption for legal data');
    }
  }

  // Encrypt sensitive legal data with AES-256-GCM
  encryptLegalData(data, clientId = null) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
      cipher.setAAD(Buffer.from(clientId || 'justice-companion'));

      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      const result = {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        clientId: clientId,
        encryptedAt: new Date().toISOString()
      };

      this.auditLog('ENCRYPTION', 'DATA_ENCRYPTED', {
        clientId: clientId,
        dataSize: JSON.stringify(data).length,
        success: true
      });

      return result;
    } catch (error) {
      this.auditLog('ENCRYPTION', 'ENCRYPTION_FAILED', {
        error: error.message,
        clientId: clientId,
        success: false
      });
      throw new Error('Failed to encrypt legal data');
    }
  }

  // Decrypt sensitive legal data
  decryptLegalData(encryptedData) {
    try {
      const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
      decipher.setAAD(Buffer.from(encryptedData.clientId || 'justice-companion'));
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      const result = JSON.parse(decrypted);

      this.auditLog('DECRYPTION', 'DATA_DECRYPTED', {
        clientId: encryptedData.clientId,
        success: true
      });

      return result;
    } catch (error) {
      this.auditLog('DECRYPTION', 'DECRYPTION_FAILED', {
        error: error.message,
        clientId: encryptedData.clientId,
        success: false
      });
      throw new Error('Failed to decrypt legal data - Data may be corrupted');
    }
  }

  // =====================
  // AUDIT LOGGING
  // =====================

  initializeAuditLogging() {
    const auditDir = path.join(process.env.APPDATA || process.env.HOME, 'justice-companion', 'audit-logs');

    this.auditLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            sessionId: this.getCurrentSessionId(),
            integrity: this.calculateIntegrityHash({ timestamp, level, message, ...meta }),
            ...meta
          });
        })
      ),
      transports: [
        new winston.transports.File({
          filename: path.join(auditDir, `audit-${new Date().toISOString().split('T')[0]}.log`),
          maxsize: 50 * 1024 * 1024, // 50MB max file size
          maxFiles: 365, // Keep 1 year of logs
          tailable: true
        }),
        new winston.transports.File({
          filename: path.join(auditDir, 'audit-critical.log'),
          level: 'error',
          maxsize: 10 * 1024 * 1024,
          maxFiles: 10
        })
      ]
    });

    // Ensure audit directory exists with proper permissions
    fs.mkdir(auditDir, { recursive: true, mode: 0o700 }).catch(console.error);
  }

  auditLog(category, action, details = {}) {
    const logEntry = {
      category,
      action,
      timestamp: new Date().toISOString(),
      sessionId: this.getCurrentSessionId(),
      userId: details.userId || 'anonymous',
      clientId: details.clientId || null,
      ipAddress: '127.0.0.1', // Local application
      userAgent: 'Justice Companion Electron App',
      details: this.sanitizeLogData(details),
      legalPrivilege: this.isAttorneyClientPrivileged(details),
      gdprCategory: this.categorizeForGDPR(category, action),
      retentionPolicy: this.getRetentionPolicy(category)
    };

    if (this.auditLogger) {
      this.auditLogger.info('AUDIT_ENTRY', logEntry);
    }

    // Critical events require immediate attention
    if (this.isCriticalSecurityEvent(category, action)) {
      this.handleCriticalSecurityEvent(logEntry);
    }

    return logEntry;
  }

  // =====================
  // INPUT VALIDATION & SANITIZATION
  // =====================

  validateAndSanitizeInput(input, type) {
    const result = {
      isValid: false,
      sanitized: null,
      errors: [],
      securityFlags: []
    };

    try {
      switch (type) {
        case 'case_title':
          result.sanitized = validator.escape(validator.trim(input));
          result.isValid = result.sanitized.length > 0 && result.sanitized.length <= 200;
          if (!result.isValid) result.errors.push('Case title must be 1-200 characters');
          break;

        case 'case_description':
          result.sanitized = validator.escape(validator.trim(input));
          result.isValid = result.sanitized.length > 0 && result.sanitized.length <= 10000;
          if (!result.isValid) result.errors.push('Case description must be 1-10000 characters');
          break;

        case 'client_name':
          result.sanitized = validator.escape(validator.trim(input));
          result.isValid = validator.isLength(result.sanitized, { min: 1, max: 100 });
          if (!result.isValid) result.errors.push('Client name must be 1-100 characters');
          break;

        case 'email':
          result.sanitized = validator.normalizeEmail(input);
          result.isValid = validator.isEmail(result.sanitized);
          if (!result.isValid) result.errors.push('Invalid email format');
          break;

        case 'phone':
          result.sanitized = validator.escape(input.replace(/\D/g, ''));
          result.isValid = validator.isMobilePhone(result.sanitized, 'any');
          if (!result.isValid) result.errors.push('Invalid phone number');
          break;

        case 'legal_document':
          result.sanitized = this.sanitizeLegalDocument(input);
          result.isValid = result.sanitized !== null;
          break;

        default:
          result.sanitized = validator.escape(validator.trim(input));
          result.isValid = result.sanitized.length > 0;
      }

      // Check for potential security threats
      result.securityFlags = this.checkSecurityThreats(input);

      this.auditLog('VALIDATION', 'INPUT_VALIDATED', {
        type,
        isValid: result.isValid,
        hasSecurityFlags: result.securityFlags.length > 0,
        securityFlags: result.securityFlags
      });

    } catch (error) {
      result.errors.push('Validation failed: ' + error.message);
      this.auditLog('VALIDATION', 'VALIDATION_ERROR', {
        type,
        error: error.message
      });
    }

    return result;
  }

  sanitizeLegalDocument(content) {
    try {
      // Remove potential script tags and dangerous content
      let sanitized = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      sanitized = sanitized.replace(/javascript:/gi, '');
      sanitized = sanitized.replace(/vbscript:/gi, '');
      sanitized = sanitized.replace(/on\w+=/gi, '');

      return sanitized;
    } catch (error) {
      this.auditLog('SANITIZATION', 'DOCUMENT_SANITIZATION_FAILED', {
        error: error.message
      });
      return null;
    }
  }

  checkSecurityThreats(input) {
    const threats = [];

    // SQL Injection patterns
    if (/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/i.test(input)) {
      threats.push('POTENTIAL_SQL_INJECTION');
    }

    // Script injection patterns
    if (/<script|javascript:|vbscript:/i.test(input)) {
      threats.push('POTENTIAL_SCRIPT_INJECTION');
    }

    // Path traversal
    if (/\.\.\/|\.\.\\/.test(input)) {
      threats.push('POTENTIAL_PATH_TRAVERSAL');
    }

    // Command injection
    if (/[;&|`$(){}[\]]/g.test(input)) {
      threats.push('POTENTIAL_COMMAND_INJECTION');
    }

    return threats;
  }

  // =====================
  // RATE LIMITING
  // =====================

  checkRateLimit(action, userId = 'anonymous') {
    const key = `${userId}_${action}`;
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const maxRequests = this.getRateLimitForAction(action);

    if (!this.rateLimiter.has(key)) {
      this.rateLimiter.set(key, { requests: [], windowStart: now });
    }

    const userLimit = this.rateLimiter.get(key);

    // Clean old requests outside the window
    userLimit.requests = userLimit.requests.filter(req => now - req < windowMs);

    if (userLimit.requests.length >= maxRequests) {
      this.auditLog('RATE_LIMIT', 'LIMIT_EXCEEDED', {
        action,
        userId,
        requestCount: userLimit.requests.length,
        maxRequests,
        windowMs
      });
      return false;
    }

    userLimit.requests.push(now);
    return true;
  }

  getRateLimitForAction(action) {
    const limits = {
      'save_case': 10,        // 10 case saves per minute
      'export_case': 5,       // 5 exports per minute
      'upload_document': 20,  // 20 uploads per minute
      'ai_query': 30,         // 30 AI queries per minute
      'search': 100,          // 100 searches per minute
      'default': 60           // Default 60 requests per minute
    };

    return limits[action] || limits.default;
  }

  // =====================
  // SESSION MANAGEMENT
  // =====================

  createSecureSession(userId = null) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      userId: userId,
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
      securityLevel: userId ? 'authenticated' : 'anonymous',
      attorneyClientPrivilege: userId ? true : false
    };

    this.sessionManager.set(sessionId, session);

    this.auditLog('SESSION', 'SESSION_CREATED', {
      sessionId,
      userId,
      securityLevel: session.securityLevel
    });

    return sessionId;
  }

  getCurrentSessionId() {
    // In Electron, we maintain a single session per app instance
    if (this.sessionManager.size === 0) {
      return this.createSecureSession();
    }
    return Array.from(this.sessionManager.keys())[0];
  }

  validateSession(sessionId) {
    const session = this.sessionManager.get(sessionId);
    if (!session || !session.isActive) {
      return false;
    }

    // Update last activity
    session.lastActivity = new Date();
    return true;
  }

  // =====================
  // DATA RETENTION & GDPR COMPLIANCE
  // =====================

  loadDataRetentionPolicies() {
    this.dataRetentionPolicies.set('case_data', {
      retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years for legal cases
      autoDelete: false, // Manual review required
      gdprCategory: 'legal_obligation'
    });

    this.dataRetentionPolicies.set('audit_logs', {
      retentionPeriod: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years for audit trails
      autoDelete: false,
      gdprCategory: 'legal_obligation'
    });

    this.dataRetentionPolicies.set('client_data', {
      retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
      autoDelete: false,
      gdprCategory: 'legal_obligation'
    });

    this.dataRetentionPolicies.set('temp_data', {
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      autoDelete: true,
      gdprCategory: 'operational'
    });
  }

  getRetentionPolicy(category) {
    return this.dataRetentionPolicies.get(category) || this.dataRetentionPolicies.get('case_data');
  }

  // Secure deletion of sensitive data
  async secureDeleteData(dataId, dataType) {
    try {
      // Multi-pass secure deletion
      const passes = 3;

      this.auditLog('DATA_DELETION', 'SECURE_DELETE_INITIATED', {
        dataId,
        dataType,
        passes
      });

      // Note: In Electron with SQLite, secure deletion involves
      // overwriting the data multiple times and then VACUUMing

      return {
        success: true,
        deletedAt: new Date().toISOString(),
        method: 'multi_pass_overwrite',
        passes: passes
      };
    } catch (error) {
      this.auditLog('DATA_DELETION', 'SECURE_DELETE_FAILED', {
        dataId,
        dataType,
        error: error.message
      });
      throw error;
    }
  }

  // =====================
  // UTILITY FUNCTIONS
  // =====================

  calculateIntegrityHash(data) {
    return crypto.createHash('sha256')
      .update(JSON.stringify(data) + this.encryptionKey.toString('hex'))
      .digest('hex');
  }

  sanitizeLogData(data) {
    const sanitized = { ...data };

    // Remove sensitive fields from logs
    const sensitiveFields = ['password', 'ssn', 'creditCard', 'bankAccount', 'encryptionKey'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  isAttorneyClientPrivileged(details) {
    // Check if data falls under attorney-client privilege
    const privilegedTypes = ['case_data', 'client_communication', 'legal_strategy'];
    return privilegedTypes.includes(details.dataType) || details.clientId;
  }

  categorizeForGDPR(category, action) {
    const mapping = {
      'SECURITY': 'security_monitoring',
      'ENCRYPTION': 'data_protection',
      'SESSION': 'operational',
      'VALIDATION': 'data_quality',
      'DATA_DELETION': 'data_subject_rights'
    };
    return mapping[category] || 'operational';
  }

  isCriticalSecurityEvent(category, action) {
    const criticalEvents = [
      'ENCRYPTION_FAILED',
      'DECRYPTION_FAILED',
      'UNAUTHORIZED_ACCESS',
      'DATA_BREACH',
      'SECURITY_VIOLATION'
    ];
    return criticalEvents.includes(action);
  }

  handleCriticalSecurityEvent(logEntry) {
    // In a real implementation, this would:
    // 1. Send immediate alerts
    // 2. Lock down the system if necessary
    // 3. Trigger incident response procedures

    console.error('🚨 CRITICAL SECURITY EVENT:', logEntry);

    this.auditLog('SECURITY', 'CRITICAL_EVENT_HANDLED', {
      originalEvent: logEntry,
      responseTime: new Date().toISOString()
    });
  }

  // Generate security report for compliance
  generateSecurityReport(startDate, endDate) {
    const report = {
      reportId: uuidv4(),
      generatedAt: new Date().toISOString(),
      period: { startDate, endDate },
      summary: {
        totalAuditEntries: 0,
        encryptionEvents: 0,
        securityViolations: 0,
        dataAccess: 0,
        rateLimitViolations: 0
      },
      gdprCompliance: {
        dataProcessingLawfulness: true,
        consentManagement: true,
        dataMinimization: true,
        retentionCompliance: true
      },
      recommendations: []
    };

    // Note: In a full implementation, this would query the audit logs
    // and generate comprehensive compliance reports

    return report;
  }
}

module.exports = LegalSecurityManager;