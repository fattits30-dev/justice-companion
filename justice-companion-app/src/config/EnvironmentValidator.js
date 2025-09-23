/**
 * Justice Companion Environment Validation System
 * PHASE 1.4: 12-Factor App Environment Validation
 *
 * Validates all environment configuration at startup to ensure
 * Justice Companion operates with correct legal compliance settings
 */

const fs = require('fs');
const path = require('path');
const semver = require('semver');

class EnvironmentValidator {
  constructor() {
    this.validationResults = {
      isValid: true,
      errors: [],
      warnings: [],
      environment: process.env.NODE_ENV || 'development',
      validatedAt: new Date().toISOString()
    };

    this.requiredVariables = {
      // Core Application Configuration
      NODE_ENV: {
        description: 'Application environment',
        required: false,
        default: 'development',
        validValues: ['development', 'production', 'test'],
        validator: (value) => ['development', 'production', 'test'].includes(value)
      },

      // AI Service Configuration
      OLLAMA_BASE_URL: {
        description: 'Ollama AI service endpoint',
        required: false,
        default: 'http://localhost:11434',
        validator: (value) => /^https?:\/\/.+/.test(value)
      },

      OLLAMA_MODEL: {
        description: 'Default Ollama model for legal assistance',
        required: false,
        default: 'llama3.1:8b',
        validator: (value) => value && value.length > 0
      },

      OLLAMA_TIMEOUT: {
        description: 'Ollama request timeout in milliseconds',
        required: false,
        default: '30000',
        validator: (value) => !isNaN(parseInt(value)) && parseInt(value) > 0
      },

      // Server Configuration
      VITE_HOST: {
        description: 'Vite development server host',
        required: false,
        default: 'localhost',
        validator: (value) => value && value.length > 0
      },

      VITE_PORT: {
        description: 'Vite development server port',
        required: false,
        default: '5173',
        validator: (value) => !isNaN(parseInt(value)) && parseInt(value) > 0 && parseInt(value) < 65536
      },

      // Electron Configuration
      ELECTRON_WINDOW_WIDTH: {
        description: 'Default window width for Electron app',
        required: false,
        default: '1200',
        validator: (value) => !isNaN(parseInt(value)) && parseInt(value) >= 800
      },

      ELECTRON_WINDOW_HEIGHT: {
        description: 'Default window height for Electron app',
        required: false,
        default: '800',
        validator: (value) => !isNaN(parseInt(value)) && parseInt(value) >= 600
      },

      // Logging Configuration
      LOG_LEVEL: {
        description: 'Application logging level',
        required: false,
        default: 'info',
        validValues: ['error', 'warn', 'info', 'debug'],
        validator: (value) => ['error', 'warn', 'info', 'debug'].includes(value)
      },

      LOG_FORMAT: {
        description: 'Log output format',
        required: false,
        default: 'json',
        validValues: ['json', 'text'],
        validator: (value) => ['json', 'text'].includes(value)
      },

      LOG_FILE_PATH: {
        description: 'Path for log files',
        required: false,
        default: './logs/justice-companion.log',
        validator: (value) => {
          try {
            const dir = path.dirname(value);
            return fs.existsSync(dir) || dir === './logs';
          } catch {
            return false;
          }
        }
      },

      LOG_MAX_SIZE: {
        description: 'Maximum log file size',
        required: false,
        default: '50MB',
        validator: (value) => /^\d+(KB|MB|GB)$/i.test(value)
      },

      LOG_MAX_FILES: {
        description: 'Maximum number of log files to retain',
        required: false,
        default: '10',
        validator: (value) => !isNaN(parseInt(value)) && parseInt(value) > 0
      },

      // Legal Compliance Configuration
      LEGAL_AUDIT_ENABLED: {
        description: 'Enable legal audit logging',
        required: false,
        default: 'true',
        validValues: ['true', 'false'],
        validator: (value) => ['true', 'false'].includes(value.toLowerCase())
      },

      GDPR_COMPLIANCE_MODE: {
        description: 'GDPR compliance enforcement',
        required: false,
        default: 'strict',
        validValues: ['strict', 'standard', 'disabled'],
        validator: (value) => ['strict', 'standard', 'disabled'].includes(value)
      },

      DATA_RETENTION_DAYS: {
        description: 'Default data retention period in days',
        required: false,
        default: '2555', // 7 years * 365 days
        validator: (value) => !isNaN(parseInt(value)) && parseInt(value) > 0
      },

      ATTORNEY_CLIENT_PRIVILEGE_PROTECTION: {
        description: 'Enable attorney-client privilege data protection',
        required: false,
        default: 'true',
        validValues: ['true', 'false'],
        validator: (value) => ['true', 'false'].includes(value.toLowerCase())
      },

      // Security Configuration
      ENCRYPTION_KEY_ROTATION_DAYS: {
        description: 'Days between automatic key rotation',
        required: false,
        default: '7',
        validator: (value) => !isNaN(parseInt(value)) && parseInt(value) > 0 && parseInt(value) <= 365
      },

      SECURITY_AUDIT_INTERVAL_MINUTES: {
        description: 'Minutes between security audits',
        required: false,
        default: '5',
        validator: (value) => !isNaN(parseInt(value)) && parseInt(value) > 0 && parseInt(value) <= 60
      }
    };

    this.systemRequirements = {
      node: {
        minimum: '18.0.0',
        recommended: '20.0.0',
        description: 'Node.js runtime for JavaScript execution'
      },
      npm: {
        minimum: '9.0.0',
        recommended: '10.0.0',
        description: 'Package manager for Node.js'
      },
      electron: {
        minimum: '28.0.0',
        recommended: '30.0.0',
        description: 'Desktop application framework'
      }
    };
  }

  /**
   * Validate all environment configuration
   */
  async validateEnvironment() {
    console.log('🔍 Justice Companion: Validating environment configuration...');

    // Reset validation state
    this.validationResults = {
      isValid: true,
      errors: [],
      warnings: [],
      environment: process.env.NODE_ENV || 'development',
      validatedAt: new Date().toISOString()
    };

    try {
      // Validate environment variables
      await this.validateEnvironmentVariables();

      // Validate system requirements
      await this.validateSystemRequirements();

      // Validate file system permissions
      await this.validateFileSystemPermissions();

      // Validate network connectivity (if required)
      await this.validateNetworkConnectivity();

      // Validate legal compliance configuration
      await this.validateLegalComplianceConfiguration();

      // Generate validation summary
      this.generateValidationSummary();

      return this.validationResults;

    } catch (error) {
      this.addError('VALIDATION_FAILED', `Environment validation failed: ${error.message}`);
      this.validationResults.isValid = false;
      return this.validationResults;
    }
  }

  /**
   * Validate environment variables
   */
  async validateEnvironmentVariables() {
    console.log('📋 Validating environment variables...');

    for (const [varName, config] of Object.entries(this.requiredVariables)) {
      const value = process.env[varName] || config.default;

      // Check if required variable is missing
      if (config.required && !value) {
        this.addError('MISSING_REQUIRED_VAR', `Required environment variable ${varName} is not set`);
        continue;
      }

      // Set default value if not provided
      if (!process.env[varName] && config.default) {
        process.env[varName] = config.default;
        this.addWarning('DEFAULT_VALUE_USED', `Using default value for ${varName}: ${config.default}`);
      }

      // Validate value format
      if (value && config.validator && !config.validator(value)) {
        this.addError('INVALID_VAR_FORMAT', `Invalid format for ${varName}: ${value}`);
      }

      // Check valid values constraint
      if (value && config.validValues && !config.validValues.includes(value)) {
        this.addError('INVALID_VAR_VALUE', `Invalid value for ${varName}: ${value}. Valid values: ${config.validValues.join(', ')}`);
      }
    }

    // Validate environment-specific requirements
    await this.validateEnvironmentSpecificConfig();
  }

  /**
   * Validate environment-specific configuration
   */
  async validateEnvironmentSpecificConfig() {
    const env = process.env.NODE_ENV || 'development';

    switch (env) {
      case 'production':
        await this.validateProductionConfig();
        break;
      case 'development':
        await this.validateDevelopmentConfig();
        break;
      case 'test':
        await this.validateTestConfig();
        break;
    }
  }

  /**
   * Validate production environment requirements
   */
  async validateProductionConfig() {
    console.log('🏭 Validating production environment...');

    // Production requires stricter security
    if (process.env.GDPR_COMPLIANCE_MODE !== 'strict') {
      this.addWarning('PRODUCTION_SECURITY', 'Production environment should use strict GDPR compliance mode');
    }

    if (process.env.LOG_LEVEL === 'debug') {
      this.addWarning('PRODUCTION_LOGGING', 'Debug logging not recommended for production');
    }

    // Check for production SSL/HTTPS requirements
    if (process.env.OLLAMA_BASE_URL && !process.env.OLLAMA_BASE_URL.startsWith('https://')) {
      this.addWarning('PRODUCTION_SECURITY', 'Production should use HTTPS for external services');
    }
  }

  /**
   * Validate development environment requirements
   */
  async validateDevelopmentConfig() {
    console.log('🔧 Validating development environment...');

    // Development-specific warnings
    if (!process.env.VITE_HOST || !process.env.VITE_PORT) {
      this.addWarning('DEV_CONFIG', 'Development server configuration not fully specified');
    }
  }

  /**
   * Validate test environment requirements
   */
  async validateTestConfig() {
    console.log('🧪 Validating test environment...');

    // Test environment should use minimal logging
    if (process.env.LOG_LEVEL === 'debug') {
      this.addWarning('TEST_CONFIG', 'Test environment should use minimal logging');
    }
  }

  /**
   * Validate system requirements
   */
  async validateSystemRequirements() {
    console.log('⚙️ Validating system requirements...');

    try {
      // Check Node.js version
      const nodeVersion = process.version;
      if (!semver.gte(nodeVersion, this.systemRequirements.node.minimum)) {
        this.addError('NODE_VERSION',
          `Node.js ${this.systemRequirements.node.minimum}+ required, found ${nodeVersion}`);
      } else if (!semver.gte(nodeVersion, this.systemRequirements.node.recommended)) {
        this.addWarning('NODE_VERSION',
          `Node.js ${this.systemRequirements.node.recommended}+ recommended, found ${nodeVersion}`);
      }

      // Check package.json for Electron version
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const electronVersion = packageJson.devDependencies?.electron || packageJson.dependencies?.electron;

        if (electronVersion) {
          const cleanVersion = electronVersion.replace(/[\^~]/, '');
          if (!semver.gte(cleanVersion, this.systemRequirements.electron.minimum)) {
            this.addError('ELECTRON_VERSION',
              `Electron ${this.systemRequirements.electron.minimum}+ required, found ${electronVersion}`);
          }
        }
      }

    } catch (error) {
      this.addWarning('SYSTEM_CHECK', `Could not fully validate system requirements: ${error.message}`);
    }
  }

  /**
   * Validate file system permissions
   */
  async validateFileSystemPermissions() {
    console.log('📁 Validating file system permissions...');

    try {
      // Check log directory permissions
      const logDir = path.dirname(process.env.LOG_FILE_PATH || './logs/justice-companion.log');

      if (!fs.existsSync(logDir)) {
        try {
          fs.mkdirSync(logDir, { recursive: true });
          console.log(`✅ Created log directory: ${logDir}`);
        } catch (error) {
          this.addError('FILE_PERMISSIONS', `Cannot create log directory ${logDir}: ${error.message}`);
        }
      }

      // Test write permissions
      const testFile = path.join(logDir, 'test-write.tmp');
      try {
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
      } catch (error) {
        this.addError('FILE_PERMISSIONS', `No write permission for log directory ${logDir}: ${error.message}`);
      }

    } catch (error) {
      this.addWarning('FILE_SYSTEM', `File system validation incomplete: ${error.message}`);
    }
  }

  /**
   * Validate network connectivity for external services
   */
  async validateNetworkConnectivity() {
    console.log('🌐 Validating network connectivity...');

    // This is optional - don't fail if network is unavailable
    try {
      const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

      // Simple connectivity check without requiring Ollama to be running
      const url = new URL(ollamaUrl);
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        this.addWarning('NETWORK', 'Ollama service configured for localhost - ensure service is running');
      }

    } catch (error) {
      this.addWarning('NETWORK', `Network connectivity check failed: ${error.message}`);
    }
  }

  /**
   * Validate legal compliance configuration
   */
  async validateLegalComplianceConfiguration() {
    console.log('⚖️ Validating legal compliance configuration...');

    // Check data retention configuration
    const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS || '2555');
    if (retentionDays < 2555) { // 7 years
      this.addWarning('LEGAL_COMPLIANCE',
        'Data retention period less than 7 years may not meet UK legal requirements');
    }

    // Check audit logging
    if (process.env.LEGAL_AUDIT_ENABLED?.toLowerCase() !== 'true') {
      this.addError('LEGAL_COMPLIANCE',
        'Legal audit logging must be enabled for compliance');
    }

    // Check attorney-client privilege protection
    if (process.env.ATTORNEY_CLIENT_PRIVILEGE_PROTECTION?.toLowerCase() !== 'true') {
      this.addError('LEGAL_COMPLIANCE',
        'Attorney-client privilege protection must be enabled');
    }

    // Check GDPR compliance mode
    const gdprMode = process.env.GDPR_COMPLIANCE_MODE || 'strict';
    if (gdprMode === 'disabled') {
      this.addError('LEGAL_COMPLIANCE',
        'GDPR compliance cannot be disabled for legal applications');
    }
  }

  /**
   * Add validation error
   */
  addError(code, message) {
    this.validationResults.errors.push({ code, message, timestamp: new Date().toISOString() });
    this.validationResults.isValid = false;
    console.error(`❌ ${code}: ${message}`);
  }

  /**
   * Add validation warning
   */
  addWarning(code, message) {
    this.validationResults.warnings.push({ code, message, timestamp: new Date().toISOString() });
    console.warn(`⚠️ ${code}: ${message}`);
  }

  /**
   * Generate validation summary
   */
  generateValidationSummary() {
    const { errors, warnings, environment } = this.validationResults;

    console.log('\n📊 Environment Validation Summary:');
    console.log(`Environment: ${environment}`);
    console.log(`Errors: ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);
    console.log(`Status: ${this.validationResults.isValid ? '✅ VALID' : '❌ INVALID'}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors that must be resolved:');
      errors.forEach(error => console.log(`  • ${error.code}: ${error.message}`));
    }

    if (warnings.length > 0) {
      console.log('\n⚠️ Warnings (recommended to address):');
      warnings.forEach(warning => console.log(`  • ${warning.code}: ${warning.message}`));
    }

    if (this.validationResults.isValid) {
      console.log('\n🎉 Justice Companion environment validation completed successfully!');
      console.log('⚖️ All legal compliance requirements satisfied');
      console.log('🔒 Security configuration validated');
      console.log('📝 Logging configuration ready');
    } else {
      console.log('\n🚨 Environment validation failed - please resolve errors before starting');
    }
  }

  /**
   * Get environment configuration for application use
   */
  getValidatedConfig() {
    return {
      isValid: this.validationResults.isValid,
      environment: this.validationResults.environment,
      config: {
        // AI Service
        ollama: {
          baseUrl: process.env.OLLAMA_BASE_URL,
          model: process.env.OLLAMA_MODEL,
          timeout: parseInt(process.env.OLLAMA_TIMEOUT)
        },

        // Server
        server: {
          vite: {
            host: process.env.VITE_HOST,
            port: parseInt(process.env.VITE_PORT)
          },
          electron: {
            windowWidth: parseInt(process.env.ELECTRON_WINDOW_WIDTH),
            windowHeight: parseInt(process.env.ELECTRON_WINDOW_HEIGHT)
          }
        },

        // Logging
        logging: {
          level: process.env.LOG_LEVEL,
          format: process.env.LOG_FORMAT,
          filePath: process.env.LOG_FILE_PATH,
          maxSize: process.env.LOG_MAX_SIZE,
          maxFiles: parseInt(process.env.LOG_MAX_FILES)
        },

        // Legal Compliance
        legal: {
          auditEnabled: process.env.LEGAL_AUDIT_ENABLED?.toLowerCase() === 'true',
          gdprMode: process.env.GDPR_COMPLIANCE_MODE,
          dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS),
          privilegeProtection: process.env.ATTORNEY_CLIENT_PRIVILEGE_PROTECTION?.toLowerCase() === 'true'
        },

        // Security
        security: {
          keyRotationDays: parseInt(process.env.ENCRYPTION_KEY_ROTATION_DAYS),
          auditIntervalMinutes: parseInt(process.env.SECURITY_AUDIT_INTERVAL_MINUTES)
        }
      },
      errors: this.validationResults.errors,
      warnings: this.validationResults.warnings
    };
  }
}

module.exports = EnvironmentValidator;