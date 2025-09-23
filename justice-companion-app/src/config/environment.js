/**
 * Justice Companion Environment Configuration
 * Centralized configuration management with validation
 * Implements 12-Factor App Configuration (Factor III)
 * PHASE 1.4: Enhanced with startup environment validation
 */

const fs = require('fs');
const path = require('path');
const EnvironmentValidator = require('./EnvironmentValidator');
const ServiceConfiguration = require('./ServiceConfiguration');

class EnvironmentConfig {
  constructor() {
    this.config = {};
    this.validator = new EnvironmentValidator();
    this.validationResults = null;
    this.serviceConfig = null;
    this.loadEnvironment();
    this.validateConfiguration();
    this.initializeServiceConfiguration();
  }

  loadEnvironment() {
    // Load .env file if it exists
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      require('dotenv').config({ path: envPath });
    }

    this.config = {
      // Core Application Settings
      app: {
        name: process.env.APP_NAME || 'Justice Companion',
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },

      // AI Service Configuration
      ai: {
        ollama: {
          baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
          model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
          timeout: parseInt(process.env.OLLAMA_TIMEOUT) || 30000,
          maxRetries: parseInt(process.env.OLLAMA_MAX_RETRIES) || 3
        },
        maxContextLength: parseInt(process.env.AI_MAX_CONTEXT_LENGTH) || 4096,
        temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7,
        maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 1024
      },

      // Database Configuration
      database: {
        path: process.env.DB_PATH || './data/justice-companion.db',
        encryptionKey: process.env.DB_ENCRYPTION_KEY,
        connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000,
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 10
      },

      // Development Server Settings
      server: {
        vite: {
          port: parseInt(process.env.VITE_DEV_PORT) || 5174,
          host: process.env.VITE_DEV_HOST || 'localhost'
        },
        electron: {
          windowWidth: parseInt(process.env.ELECTRON_WINDOW_WIDTH) || 1200,
          windowHeight: parseInt(process.env.ELECTRON_WINDOW_HEIGHT) || 800
        }
      },

      // Security Configuration
      security: {
        session: {
          secret: process.env.SESSION_SECRET,
          timeout: parseInt(process.env.SESSION_TIMEOUT) || 3600000
        },
        encryption: {
          algorithm: process.env.ENCRYPTION_ALGORITHM || 'AES-256-GCM',
          keyRotationDays: parseInt(process.env.ENCRYPTION_KEY_ROTATION_DAYS) || 90
        }
      },

      // Legal Compliance Settings
      legal: {
        retention: {
          caseDataDays: parseInt(process.env.CASE_DATA_RETENTION_DAYS) || 2555,
          clientDataDays: parseInt(process.env.CLIENT_DATA_RETENTION_DAYS) || 2555,
          auditTrailDays: parseInt(process.env.AUDIT_TRAIL_RETENTION_DAYS) || 3650
        },
        gdpr: {
          enabled: process.env.GDPR_ENABLED === 'true',
          auditLogging: process.env.AUDIT_LOGGING_ENABLED === 'true'
        },
        categories: (process.env.LEGAL_CATEGORIES || 'housing,employment,consumer,council,insurance,debt,benefits').split(','),
        jurisdiction: process.env.DEFAULT_JURISDICTION || 'UK',
        legalSystem: process.env.DEFAULT_LEGAL_SYSTEM || 'English'
      },

      // Logging Configuration
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'json',
        filePath: process.env.LOG_FILE_PATH || './logs/justice-companion.log',
        maxSize: process.env.LOG_MAX_SIZE || '50MB',
        maxFiles: parseInt(process.env.LOG_MAX_FILES) || 10
      },

      // Network Configuration
      network: {
        allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5174,http://localhost:3000').split(','),
        rateLimit: {
          windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW) || 900000,
          maxRequests: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS) || 100
        }
      },

      // Feature Flags
      features: {
        documentGeneration: process.env.FEATURE_DOCUMENT_GENERATION === 'true',
        caseManagement: process.env.FEATURE_CASE_MANAGEMENT !== 'false',
        aiAnalysis: process.env.FEATURE_AI_ANALYSIS !== 'false',
        clientPortal: process.env.FEATURE_CLIENT_PORTAL === 'true'
      },

      // Cloud Deployment Settings
      cloud: {
        serviceDiscoveryUrl: process.env.SERVICE_DISCOVERY_URL,
        healthCheckEndpoint: process.env.HEALTH_CHECK_ENDPOINT || '/health',
        metricsEndpoint: process.env.METRICS_ENDPOINT || '/metrics',
        container: {
          port: parseInt(process.env.CONTAINER_PORT) || 3000,
          host: process.env.CONTAINER_HOST || '0.0.0.0'
        }
      },

      // Backup and Recovery
      backup: {
        enabled: process.env.BACKUP_ENABLED === 'true',
        intervalHours: parseInt(process.env.BACKUP_INTERVAL_HOURS) || 24,
        retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
        path: process.env.BACKUP_PATH || './backups'
      }
    };
  }

  validateConfiguration() {
    const errors = [];

    // Validate required security settings in production
    if (this.config.app.environment === 'production') {
      if (!this.config.database.encryptionKey) {
        errors.push('DB_ENCRYPTION_KEY is required in production');
      }
      if (!this.config.security.session.secret) {
        errors.push('SESSION_SECRET is required in production');
      }
    }

    // Validate AI service configuration
    if (!this.isValidUrl(this.config.ai.ollama.baseUrl)) {
      errors.push('OLLAMA_BASE_URL must be a valid URL');
    }

    // Validate legal categories
    const validCategories = ['housing', 'employment', 'consumer', 'council', 'insurance', 'debt', 'benefits'];
    const invalidCategories = this.config.legal.categories.filter(cat => !validCategories.includes(cat.trim()));
    if (invalidCategories.length > 0) {
      errors.push(`Invalid legal categories: ${invalidCategories.join(', ')}`);
    }

    // Validate numeric ranges
    if (this.config.ai.temperature < 0 || this.config.ai.temperature > 2) {
      errors.push('AI_TEMPERATURE must be between 0 and 2');
    }

    if (this.config.server.vite.port < 1024 || this.config.server.vite.port > 65535) {
      errors.push('VITE_DEV_PORT must be between 1024 and 65535');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * PHASE 1.4: Comprehensive environment validation at startup
   */
  async validateEnvironmentAtStartup() {
    console.log('🚀 Justice Companion: Starting comprehensive environment validation...');

    try {
      this.validationResults = await this.validator.validateEnvironment();

      if (!this.validationResults.isValid) {
        console.error('\n🚨 CRITICAL: Environment validation failed!');
        console.error('Justice Companion cannot start with invalid configuration.');
        console.error('\nPlease resolve the following errors:');

        this.validationResults.errors.forEach(error => {
          console.error(`❌ ${error.code}: ${error.message}`);
        });

        throw new Error('Environment validation failed - application cannot start');
      }

      if (this.validationResults.warnings.length > 0) {
        console.warn('\n⚠️ Environment validation completed with warnings:');
        this.validationResults.warnings.forEach(warning => {
          console.warn(`⚠️ ${warning.code}: ${warning.message}`);
        });
      }

      console.log('\n✅ Environment validation completed successfully!');
      console.log('⚖️ Justice Companion is ready for legal assistance operations');

      return this.validationResults;

    } catch (error) {
      console.error('\n🚨 FATAL: Environment validation process failed:', error.message);
      throw error;
    }
  }

  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  // Getter methods for easy access
  get isDevelopment() {
    return this.config.app.environment === 'development';
  }

  get isProduction() {
    return this.config.app.environment === 'production';
  }

  get ollamaConfig() {
    return this.config.ai.ollama;
  }

  get databaseConfig() {
    return this.config.database;
  }

  get securityConfig() {
    return this.config.security;
  }

  get legalConfig() {
    return this.config.legal;
  }

  get loggingConfig() {
    return this.config.logging;
  }

  get serverConfig() {
    return this.config.server;
  }

  // Method to get configuration with environment variable fallback
  get(path, defaultValue = null) {
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  // Method to safely log configuration (without secrets)
  getSafeConfig() {
    const safeConfig = JSON.parse(JSON.stringify(this.config));

    // Remove sensitive information
    if (safeConfig.database?.encryptionKey) {
      safeConfig.database.encryptionKey = '[REDACTED]';
    }
    if (safeConfig.security?.session?.secret) {
      safeConfig.security.session.secret = '[REDACTED]';
    }

    return safeConfig;
  }

  /**
   * Get validation results from environment validation
   */
  getValidationResults() {
    return this.validationResults;
  }

  /**
   * Check if environment validation passed
   */
  isEnvironmentValid() {
    return this.validationResults ? this.validationResults.isValid : false;
  }

  /**
   * PHASE 1.5: Initialize local-first service configuration
   */
  initializeServiceConfiguration() {
    this.serviceConfig = new ServiceConfiguration(this);
  }

  /**
   * Get service configuration (local-first architecture)
   */
  getServiceConfig() {
    return this.serviceConfig;
  }

  /**
   * Get privacy-first service summary
   */
  getPrivacySummary() {
    return this.serviceConfig ? this.serviceConfig.getPrivacySummary() : {
      dataPrivacy: 'complete',
      localServices: 0,
      externalServices: 0,
      dataSharing: 'none'
    };
  }

  /**
   * Get comprehensive configuration including validation status
   */
  getComprehensiveConfig() {
    const privacySummary = this.getPrivacySummary();

    return {
      ...this.config,
      validation: {
        isValid: this.isEnvironmentValid(),
        errors: this.validationResults?.errors || [],
        warnings: this.validationResults?.warnings || [],
        validatedAt: this.validationResults?.validatedAt
      },
      services: {
        architecture: 'local-first',
        privacy: privacySummary,
        configuration: this.serviceConfig?.generateConfigurationReport() || {}
      }
    };
  }
}

// Export singleton instance
const environmentConfig = new EnvironmentConfig();

module.exports = environmentConfig;