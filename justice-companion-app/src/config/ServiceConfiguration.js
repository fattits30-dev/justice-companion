/**
 * Justice Companion Service Configuration Abstraction
 * PHASE 1.5: Local-First Service URL Configuration
 *
 * Privacy-First Architecture:
 * - Local database only (no cloud data storage)
 * - User data stays on their device
 * - Optional external AI API for enhanced power (user choice)
 * - No telemetry or data collection
 */

class ServiceConfiguration {
  constructor(environmentConfig) {
    this.envConfig = environmentConfig;
    this.services = this.initializeServices();
  }

  initializeServices() {
    return {
      // ======================
      // LOCAL SERVICES ONLY
      // ======================

      // Local AI Service (Primary)
      localAI: {
        name: 'Ollama Local AI',
        type: 'local',
        baseUrl: this.envConfig.get('ai.ollama.baseUrl', 'http://localhost:11434'),
        model: this.envConfig.get('ai.ollama.model', 'llama3.1:8b'),
        timeout: this.envConfig.get('ai.ollama.timeout', 30000),
        privacy: 'complete', // Data never leaves device
        required: false, // Can run without AI if Ollama not available
        fallback: 'static_responses',
        healthCheck: '/api/tags',
        description: 'Local AI service running on user\'s machine'
      },

      // Local Database Service
      localDatabase: {
        name: 'Local SQLite Database',
        type: 'local',
        path: this.envConfig.get('database.path', './data/justice-companion.db'),
        encryption: true,
        privacy: 'complete', // All data stays local
        required: true,
        backup: {
          enabled: this.envConfig.get('backup.enabled', false),
          path: this.envConfig.get('backup.path', './backups'),
          retention: this.envConfig.get('backup.retentionDays', 30)
        },
        description: 'Encrypted local database for case and client data'
      },

      // Local File Storage
      localFileStorage: {
        name: 'Local File System',
        type: 'local',
        documentsPath: './data/documents',
        logsPath: this.envConfig.get('logging.filePath', './logs'),
        privacy: 'complete',
        required: true,
        encryption: true,
        description: 'Local file storage for documents and logs'
      },

      // ======================
      // OPTIONAL EXTERNAL SERVICES (USER CHOICE)
      // ======================

      // External AI Service (Optional Enhancement)
      externalAI: {
        name: 'External AI Service',
        type: 'external',
        enabled: this.envConfig.get('features.externalAI', false),
        baseUrl: this.envConfig.get('ai.external.baseUrl', null),
        apiKey: this.envConfig.get('ai.external.apiKey', null),
        privacy: 'user_consent_required',
        required: false,
        fallback: 'localAI',
        userConsent: {
          required: true,
          message: 'External AI services may process your queries on external servers. Your case data will NOT be sent.',
          dataShared: ['query_text_only'],
          dataNotShared: ['case_data', 'client_info', 'documents', 'personal_details']
        },
        description: 'Optional external AI for enhanced capabilities (requires user consent)'
      },

      // Legal Resources API (Read-only public data)
      legalResourcesAPI: {
        name: 'Legal Resources Directory',
        type: 'external',
        enabled: this.envConfig.get('features.legalResources', true),
        baseUrl: this.envConfig.get('legal.resourcesAPI', 'https://api.gov.uk/legal-aid'),
        privacy: 'no_personal_data', // Only fetches public legal resources
        required: false,
        fallback: 'static_resources',
        rateLimited: true,
        description: 'Public legal resources and contact information (no personal data sent)'
      },

      // ======================
      // DEVELOPMENT SERVICES
      // ======================

      // Development Server (Local Only)
      devServer: {
        name: 'Vite Development Server',
        type: 'development',
        enabled: this.envConfig.get('app.environment') === 'development',
        host: this.envConfig.get('server.vite.host', 'localhost'),
        port: this.envConfig.get('server.vite.port', 5173),
        privacy: 'local_only',
        required: false,
        description: 'Local development server for testing'
      }
    };
  }

  /**
   * Get service configuration by name
   */
  getService(serviceName) {
    return this.services[serviceName] || null;
  }

  /**
   * Get all local services (privacy-safe)
   */
  getLocalServices() {
    return Object.entries(this.services)
      .filter(([name, config]) => config.type === 'local')
      .reduce((acc, [name, config]) => ({ ...acc, [name]: config }), {});
  }

  /**
   * Get external services that require user consent
   */
  getExternalServices() {
    return Object.entries(this.services)
      .filter(([name, config]) => config.type === 'external')
      .reduce((acc, [name, config]) => ({ ...acc, [name]: config }), {});
  }

  /**
   * Check if a service is available and configured
   */
  isServiceAvailable(serviceName) {
    const service = this.getService(serviceName);
    if (!service) return false;

    switch (service.type) {
      case 'local':
        return this.checkLocalService(service);
      case 'external':
        return this.checkExternalService(service);
      case 'development':
        return service.enabled;
      default:
        return false;
    }
  }

  /**
   * Check local service availability
   */
  checkLocalService(service) {
    switch (service.name) {
      case 'Local SQLite Database':
        return true; // SQLite is always available
      case 'Local File System':
        return true; // File system is always available
      case 'Ollama Local AI':
        return this.checkOllamaAvailability(service);
      default:
        return true;
    }
  }

  /**
   * Check external service availability (with user consent)
   */
  checkExternalService(service) {
    if (!service.enabled) return false;
    if (service.userConsent?.required && !this.hasUserConsent(service.name)) {
      return false;
    }
    return service.baseUrl && service.baseUrl.length > 0;
  }

  /**
   * Check Ollama availability
   */
  async checkOllamaAvailability(service) {
    try {
      const response = await fetch(`${service.baseUrl}/api/tags`, {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get service URL with fallback handling
   */
  getServiceUrl(serviceName, endpoint = '') {
    const service = this.getService(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const baseUrl = service.baseUrl || service.path;
    return endpoint ? `${baseUrl}${endpoint}` : baseUrl;
  }

  /**
   * Get privacy-safe service summary for user display
   */
  getPrivacySummary() {
    const localServices = Object.values(this.getLocalServices()).length;
    const externalServices = Object.values(this.getExternalServices())
      .filter(service => service.enabled).length;

    return {
      dataPrivacy: 'complete', // All user data stays local
      localServices: localServices,
      externalServices: externalServices,
      dataSharing: 'none', // No personal data shared by default
      userControl: 'full', // User controls all external connections
      summary: `${localServices} local services, ${externalServices} optional external services (user controlled)`
    };
  }

  /**
   * Check if user has consented to external service
   */
  hasUserConsent(serviceName) {
    // This would check stored user preferences
    // For now, return false (require explicit consent)
    return false;
  }

  /**
   * Get service health status
   */
  async getServiceHealth() {
    const health = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      services: {}
    };

    for (const [name, service] of Object.entries(this.services)) {
      try {
        const available = await this.isServiceAvailable(name);
        health.services[name] = {
          status: available ? 'healthy' : 'unavailable',
          type: service.type,
          required: service.required,
          privacy: service.privacy
        };

        // If a required service is down, mark overall as degraded
        if (service.required && !available) {
          health.overall = 'degraded';
        }
      } catch (error) {
        health.services[name] = {
          status: 'error',
          error: error.message,
          type: service.type,
          required: service.required
        };

        if (service.required) {
          health.overall = 'unhealthy';
        }
      }
    }

    return health;
  }

  /**
   * Generate service configuration report
   */
  generateConfigurationReport() {
    const privacy = this.getPrivacySummary();
    const services = Object.entries(this.services).map(([name, config]) => ({
      name: config.name,
      type: config.type,
      privacy: config.privacy,
      required: config.required,
      enabled: config.enabled !== false,
      description: config.description
    }));

    return {
      privacyModel: 'local-first',
      dataLocation: 'user-device-only',
      privacySummary: privacy,
      services: services,
      externalConnections: services.filter(s => s.type === 'external' && s.enabled),
      userControlled: true,
      gdprCompliant: true,
      noTelemetry: true
    };
  }

  /**
   * Validate service configuration for legal compliance
   */
  validateLegalCompliance() {
    const issues = [];

    // Check that all user data stays local
    const dataLeavingDevice = Object.values(this.services)
      .filter(service =>
        service.type === 'external' &&
        service.enabled &&
        (service.privacy === 'user_data_shared' || service.privacy === 'partial')
      );

    if (dataLeavingDevice.length > 0) {
      issues.push({
        severity: 'error',
        message: 'External services configured to share user data',
        services: dataLeavingDevice.map(s => s.name)
      });
    }

    // Check that external services require consent
    const externalWithoutConsent = Object.values(this.services)
      .filter(service =>
        service.type === 'external' &&
        service.enabled &&
        !service.userConsent?.required
      );

    if (externalWithoutConsent.length > 0) {
      issues.push({
        severity: 'warning',
        message: 'External services without explicit user consent requirement',
        services: externalWithoutConsent.map(s => s.name)
      });
    }

    return {
      compliant: issues.filter(i => i.severity === 'error').length === 0,
      issues: issues,
      summary: issues.length === 0 ? 'Full legal compliance' : `${issues.length} compliance issues found`
    };
  }
}

module.exports = ServiceConfiguration;