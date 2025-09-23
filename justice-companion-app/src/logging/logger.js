/**
 * Justice Companion Structured Logging System
 * Implements 12-Factor App Logging (Factor XI)
 * Provides legal audit trail and correlation tracking
 */

const winston = require('winston');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

class JusticeLogger {
  constructor() {
    this.config = this.loadConfiguration();
    this.correlationStore = new Map();
    this.legalAuditStore = new Map();
    
    // Ensure logs directory exists
    this.ensureLogDirectory();
    
    // Create Winston logger instance
    this.logger = this.createLogger();
    
    // Start audit cleanup timer
    this.startAuditCleanup();
  }

  loadConfiguration() {
    // Try to load environment config, fallback to process.env
    let envConfig;
    try {
      envConfig = require('../config/environment');
    } catch (error) {
      envConfig = null;
    }

    return {
      level: envConfig?.loggingConfig?.level || process.env.LOG_LEVEL || 'info',
      format: envConfig?.loggingConfig?.format || process.env.LOG_FORMAT || 'json',
      filePath: envConfig?.loggingConfig?.filePath || process.env.LOG_FILE_PATH || './logs/justice-companion.log',
      maxSize: envConfig?.loggingConfig?.maxSize || process.env.LOG_MAX_SIZE || '50MB',
      maxFiles: envConfig?.loggingConfig?.maxFiles || parseInt(process.env.LOG_MAX_FILES) || 10,
      auditEnabled: envConfig?.legal?.gdpr?.auditLogging !== false
    };
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.config.filePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  createLogger() {
    const formats = [];

    // Add timestamp
    formats.push(winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }));

    // Add correlation ID and legal context
    formats.push(winston.format.printf((info) => {
      const correlationId = this.getCurrentCorrelationId();
      const legalContext = this.getCurrentLegalContext();
      
      const logEntry = {
        timestamp: info.timestamp,
        level: info.level,
        message: info.message,
        correlationId: correlationId,
        service: 'justice-companion',
        component: info.component || 'unknown',
        userId: info.userId || 'anonymous',
        sessionId: info.sessionId,
        ...info.metadata,
        ...legalContext
      };

      // Remove undefined fields
      Object.keys(logEntry).forEach(key => {
        if (logEntry[key] === undefined) {
          delete logEntry[key];
        }
      });

      return this.config.format === 'json' 
        ? JSON.stringify(logEntry)
        : `${logEntry.timestamp} [${logEntry.level.toUpperCase()}] ${logEntry.correlationId} ${logEntry.message}`;
    }));

    // Create transports
    const transports = [
      // Console transport
      new winston.transports.Console({
        level: this.config.level,
        format: winston.format.combine(
          winston.format.colorize({ all: true }),
          ...formats
        )
      })
    ];

    // File transport (only in non-web environments)
    if (typeof window === 'undefined') {
      transports.push(
        new winston.transports.File({
          filename: this.config.filePath,
          level: this.config.level,
          maxsize: this.parseSize(this.config.maxSize),
          maxFiles: this.config.maxFiles,
          format: winston.format.combine(...formats)
        })
      );

      // Separate file for errors
      transports.push(
        new winston.transports.File({
          filename: this.config.filePath.replace('.log', '-errors.log'),
          level: 'error',
          maxsize: this.parseSize(this.config.maxSize),
          maxFiles: this.config.maxFiles,
          format: winston.format.combine(...formats)
        })
      );

      // Legal audit trail file (if audit enabled)
      if (this.config.auditEnabled) {
        transports.push(
          new winston.transports.File({
            filename: this.config.filePath.replace('.log', '-audit.log'),
            level: 'info',
            maxsize: this.parseSize(this.config.maxSize),
            maxFiles: this.config.maxFiles * 2, // Keep audit logs longer
            format: winston.format.combine(
              winston.format.printf((info) => {
                // Only log entries with legal context
                if (info.legalAction || info.caseId || info.clientId || info.privileged) {
                  return JSON.stringify({
                    timestamp: info.timestamp,
                    level: info.level,
                    message: info.message,
                    correlationId: info.correlationId,
                    userId: info.userId,
                    sessionId: info.sessionId,
                    legalAction: info.legalAction,
                    caseId: info.caseId,
                    clientId: info.clientId,
                    privileged: info.privileged,
                    integrityHash: this.calculateIntegrityHash(info)
                  });
                }
                return false; // Don't log non-legal entries to audit file
              })
            )
          })
        );
      }
    }

    return winston.createLogger({
      level: this.config.level,
      transports: transports,
      exitOnError: false,
      handleExceptions: true,
      handleRejections: true
    });
  }

  parseSize(sizeString) {
    const units = { KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
    const match = sizeString.match(/^(\d+)(KB|MB|GB)$/i);
    if (match) {
      return parseInt(match[1]) * units[match[2].toUpperCase()];
    }
    return 50 * 1024 * 1024; // Default 50MB
  }

  // Correlation ID management
  generateCorrelationId() {
    return crypto.randomBytes(8).toString('hex');
  }

  setCorrelationId(id) {
    if (typeof global !== 'undefined') {
      global.__justiceCorrelationId = id;
    }
  }

  getCurrentCorrelationId() {
    if (typeof global !== 'undefined' && global.__justiceCorrelationId) {
      return global.__justiceCorrelationId;
    }
    // Generate and set new correlation ID
    const newId = this.generateCorrelationId();
    this.setCorrelationId(newId);
    return newId;
  }

  // Legal context management
  setLegalContext(context) {
    const correlationId = this.getCurrentCorrelationId();
    this.legalAuditStore.set(correlationId, {
      ...context,
      setAt: Date.now()
    });
  }

  getCurrentLegalContext() {
    const correlationId = this.getCurrentCorrelationId();
    return this.legalAuditStore.get(correlationId) || {};
  }

  // Structured logging methods
  info(message, metadata = {}) {
    this.logger.info(message, { metadata });
  }

  warn(message, metadata = {}) {
    this.logger.warn(message, { metadata });
  }

  error(message, error = null, metadata = {}) {
    const errorMetadata = error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      }
    } : {};

    this.logger.error(message, { 
      metadata: { ...metadata, ...errorMetadata }
    });
  }

  debug(message, metadata = {}) {
    this.logger.debug(message, { metadata });
  }

  // Legal-specific logging methods
  auditLog(action, details = {}, options = {}) {
    if (!this.config.auditEnabled) return;

    const auditEntry = {
      legalAction: action,
      caseId: details.caseId,
      clientId: details.clientId,
      userId: details.userId || 'anonymous',
      sessionId: details.sessionId,
      privileged: options.privileged || false,
      dataClassification: options.classification || 'general',
      retentionRequired: options.retentionRequired !== false,
      ...details
    };

    this.logger.info(`Legal Audit: ${action}`, { 
      metadata: auditEntry,
      component: 'legal-audit'
    });
  }

  // Case-specific logging
  caseLog(caseId, action, details = {}) {
    this.setLegalContext({ 
      caseId: caseId, 
      legalAction: action,
      privileged: true 
    });

    this.auditLog(`CASE_${action.toUpperCase()}`, {
      caseId: caseId,
      ...details
    }, { 
      privileged: true,
      classification: 'case-data'
    });
  }

  // Client-specific logging
  clientLog(clientId, action, details = {}) {
    this.setLegalContext({ 
      clientId: clientId, 
      legalAction: action,
      privileged: true 
    });

    this.auditLog(`CLIENT_${action.toUpperCase()}`, {
      clientId: clientId,
      ...details
    }, { 
      privileged: true,
      classification: 'client-data'
    });
  }

  // AI interaction logging
  aiLog(query, response, metadata = {}) {
    const correlationId = this.getCurrentCorrelationId();
    
    this.auditLog('AI_INTERACTION', {
      correlationId: correlationId,
      queryLength: query?.length || 0,
      responseLength: response?.length || 0,
      model: metadata.model,
      processingTime: metadata.processingTime,
      fallback: metadata.fallback || false,
      ...metadata
    }, {
      classification: 'ai-data',
      retentionRequired: true
    });
  }

  // Security event logging
  securityLog(event, details = {}) {
    this.logger.warn(`Security Event: ${event}`, {
      metadata: {
        securityEvent: event,
        severity: details.severity || 'medium',
        remoteIP: details.remoteIP,
        userAgent: details.userAgent,
        ...details
      },
      component: 'security'
    });
  }

  // Performance logging
  performanceLog(operation, duration, metadata = {}) {
    const performanceData = {
      operation: operation,
      duration: duration,
      performanceCategory: metadata.category || 'general',
      ...metadata
    };

    if (duration > 1000) {
      this.warn(`Slow operation detected: ${operation} (${duration}ms)`, performanceData);
    } else {
      this.debug(`Performance: ${operation} (${duration}ms)`, performanceData);
    }
  }

  // Utility methods
  calculateIntegrityHash(data) {
    return crypto.createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 16);
  }

  // Middleware for request correlation
  correlationMiddleware() {
    return (req, res, next) => {
      const correlationId = req.headers['x-correlation-id'] || this.generateCorrelationId();
      this.setCorrelationId(correlationId);
      
      res.setHeader('X-Correlation-ID', correlationId);
      
      this.info('Request started', {
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        remoteIP: req.ip || req.connection.remoteAddress
      });

      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.info('Request completed', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: duration
        });
      });

      if (next) next();
    };
  }

  // Cleanup old correlation data
  startAuditCleanup() {
    setInterval(() => {
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const [id, context] of this.legalAuditStore.entries()) {
        if (now - context.setAt > maxAge) {
          this.legalAuditStore.delete(id);
        }
      }
    }, 60 * 60 * 1000); // Clean up every hour
  }

  // Get logger instance for external use
  getLogger() {
    return this.logger;
  }

  // Cleanup method
  destroy() {
    if (this.logger) {
      this.logger.end();
    }
    this.correlationStore.clear();
    this.legalAuditStore.clear();
  }
}

// Export singleton instance
const justiceLogger = new JusticeLogger();

// Export convenience methods
module.exports = {
  logger: justiceLogger,
  info: (message, metadata) => justiceLogger.info(message, metadata),
  warn: (message, metadata) => justiceLogger.warn(message, metadata),
  error: (message, error, metadata) => justiceLogger.error(message, error, metadata),
  debug: (message, metadata) => justiceLogger.debug(message, metadata),
  auditLog: (action, details, options) => justiceLogger.auditLog(action, details, options),
  caseLog: (caseId, action, details) => justiceLogger.caseLog(caseId, action, details),
  clientLog: (clientId, action, details) => justiceLogger.clientLog(clientId, action, details),
  aiLog: (query, response, metadata) => justiceLogger.aiLog(query, response, metadata),
  securityLog: (event, details) => justiceLogger.securityLog(event, details),
  performanceLog: (operation, duration, metadata) => justiceLogger.performanceLog(operation, duration, metadata),
  setCorrelationId: (id) => justiceLogger.setCorrelationId(id),
  setLegalContext: (context) => justiceLogger.setLegalContext(context),
  correlationMiddleware: () => justiceLogger.correlationMiddleware()
};