/**
 * Performance Monitoring Service
 * Comprehensive monitoring and optimization for Justice Companion backend
 * Tracks performance metrics, database operations, and system health
 */

const winston = require('winston');
const { EventEmitter } = require('events');

class PerformanceMonitorService extends EventEmitter {
  constructor() {
    super();

    // Performance metrics storage
    this.metrics = {
      chatService: {
        requests: 0,
        averageResponseTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        lastReset: Date.now()
      },
      repository: {
        queries: 0,
        averageQueryTime: 0,
        cacheHits: 0,
        cacheMisses: 0,
        transactionCount: 0,
        rollbackCount: 0,
        lastReset: Date.now()
      },
      database: {
        connections: 0,
        averageConnectionTime: 0,
        integrityChecks: 0,
        encryptionOperations: 0,
        lastReset: Date.now()
      },
      security: {
        auditEntries: 0,
        privilegeAssertions: 0,
        accessDenials: 0,
        integrityViolations: 0,
        lastReset: Date.now()
      }
    };

    // Performance thresholds
    this.thresholds = {
      responseTime: {
        warning: 1000, // 1 second
        critical: 3000 // 3 seconds
      },
      errorRate: {
        warning: 0.05, // 5%
        critical: 0.10 // 10%
      },
      cacheHitRate: {
        warning: 0.30, // 30%
        critical: 0.15 // 15%
      },
      memoryUsage: {
        warning: 0.80, // 80%
        critical: 0.95 // 95%
      }
    };

    // Alert tracking
    this.activeAlerts = new Map();
    this.alertHistory = [];

    // Optimization recommendations
    this.recommendations = [];

    // Initialize logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });

    // Start monitoring intervals
    this.startMonitoring();

    this.logger.info('PerformanceMonitorService initialized');
  }

  /**
   * Start monitoring intervals
   */
  startMonitoring() {
    // Health check every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000);

    // Performance analysis every 5 minutes
    this.analysisInterval = setInterval(() => {
      this.analyzePerformance();
    }, 300000);

    // Generate recommendations every 15 minutes
    this.recommendationInterval = setInterval(() => {
      this.generateRecommendations();
    }, 900000);
  }

  /**
   * Record chat service metrics
   */
  recordChatMetrics(metrics) {
    const chat = this.metrics.chatService;

    chat.requests++;

    if (metrics.responseTime) {
      chat.averageResponseTime = this.calculateMovingAverage(
        chat.averageResponseTime,
        metrics.responseTime,
        chat.requests
      );
    }

    if (metrics.cacheHit !== undefined) {
      chat.cacheHitRate = this.calculateCacheHitRate(metrics.cacheHit, chat.requests);
    }

    if (metrics.error) {
      chat.errorRate = this.calculateErrorRate(chat.requests);
    }

    this.checkThresholds('chatService', chat);
    this.emit('metricsUpdated', { service: 'chatService', metrics: chat });
  }

  /**
   * Record repository metrics
   */
  recordRepositoryMetrics(metrics) {
    const repo = this.metrics.repository;

    if (metrics.queryTime) {
      repo.queries++;
      repo.averageQueryTime = this.calculateMovingAverage(
        repo.averageQueryTime,
        metrics.queryTime,
        repo.queries
      );
    }

    if (metrics.cacheHit) {
      repo.cacheHits++;
    } else if (metrics.cacheMiss) {
      repo.cacheMisses++;
    }

    if (metrics.transaction) {
      repo.transactionCount++;
    }

    if (metrics.rollback) {
      repo.rollbackCount++;
    }

    this.checkThresholds('repository', repo);
    this.emit('metricsUpdated', { service: 'repository', metrics: repo });
  }

  /**
   * Record database metrics
   */
  recordDatabaseMetrics(metrics) {
    const db = this.metrics.database;

    if (metrics.connectionTime) {
      db.connections++;
      db.averageConnectionTime = this.calculateMovingAverage(
        db.averageConnectionTime,
        metrics.connectionTime,
        db.connections
      );
    }

    if (metrics.integrityCheck) {
      db.integrityChecks++;
    }

    if (metrics.encryptionOperation) {
      db.encryptionOperations++;
    }

    this.emit('metricsUpdated', { service: 'database', metrics: db });
  }

  /**
   * Record security metrics
   */
  recordSecurityMetrics(metrics) {
    const security = this.metrics.security;

    if (metrics.auditEntry) {
      security.auditEntries++;
    }

    if (metrics.privilegeAssertion) {
      security.privilegeAssertions++;
    }

    if (metrics.accessDenial) {
      security.accessDenials++;
    }

    if (metrics.integrityViolation) {
      security.integrityViolations++;
    }

    this.checkSecurityThresholds(security);
    this.emit('metricsUpdated', { service: 'security', metrics: security });
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      services: {},
      alerts: this.activeAlerts.size,
      recommendations: this.recommendations.length
    };

    try {
      // Check each service
      healthStatus.services.chatService = this.checkServiceHealth('chatService');
      healthStatus.services.repository = this.checkServiceHealth('repository');
      healthStatus.services.database = this.checkServiceHealth('database');
      healthStatus.services.security = this.checkServiceHealth('security');

      // Determine overall health
      const serviceStatuses = Object.values(healthStatus.services);
      if (serviceStatuses.includes('critical')) {
        healthStatus.overall = 'critical';
      } else if (serviceStatuses.includes('warning')) {
        healthStatus.overall = 'warning';
      }

      this.emit('healthCheck', healthStatus);

      if (healthStatus.overall !== 'healthy') {
        this.logger.warn('System health check detected issues', healthStatus);
      }

    } catch (error) {
      this.logger.error('Health check failed:', error);
      healthStatus.overall = 'critical';
      healthStatus.error = error.message;
    }

    return healthStatus;
  }

  /**
   * Check individual service health
   */
  checkServiceHealth(serviceName) {
    const metrics = this.metrics[serviceName];
    const thresholds = this.thresholds;

    // Check response times
    if (serviceName === 'chatService' && metrics.averageResponseTime > thresholds.responseTime.critical) {
      return 'critical';
    }
    if (serviceName === 'chatService' && metrics.averageResponseTime > thresholds.responseTime.warning) {
      return 'warning';
    }

    // Check error rates
    if (serviceName === 'chatService' && metrics.errorRate > thresholds.errorRate.critical) {
      return 'critical';
    }
    if (serviceName === 'chatService' && metrics.errorRate > thresholds.errorRate.warning) {
      return 'warning';
    }

    // Check cache performance
    if ((serviceName === 'chatService' || serviceName === 'repository') &&
        metrics.cacheHitRate < thresholds.cacheHitRate.critical) {
      return 'critical';
    }
    if ((serviceName === 'chatService' || serviceName === 'repository') &&
        metrics.cacheHitRate < thresholds.cacheHitRate.warning) {
      return 'warning';
    }

    // Check security metrics
    if (serviceName === 'security') {
      if (metrics.integrityViolations > 0) {
        return 'critical';
      }
      if (metrics.accessDenials > metrics.auditEntries * 0.1) {
        return 'warning';
      }
    }

    return 'healthy';
  }

  /**
   * Analyze performance trends and patterns
   */
  analyzePerformance() {
    const analysis = {
      timestamp: new Date().toISOString(),
      trends: {},
      bottlenecks: [],
      improvements: []
    };

    // Analyze response time trends
    const chatMetrics = this.metrics.chatService;
    if (chatMetrics.averageResponseTime > this.thresholds.responseTime.warning) {
      analysis.bottlenecks.push({
        service: 'chatService',
        issue: 'slow_response_time',
        severity: chatMetrics.averageResponseTime > this.thresholds.responseTime.critical ? 'critical' : 'warning',
        value: chatMetrics.averageResponseTime,
        threshold: this.thresholds.responseTime.warning
      });
    }

    // Analyze cache performance
    if (chatMetrics.cacheHitRate < this.thresholds.cacheHitRate.warning) {
      analysis.bottlenecks.push({
        service: 'chatService',
        issue: 'poor_cache_performance',
        severity: chatMetrics.cacheHitRate < this.thresholds.cacheHitRate.critical ? 'critical' : 'warning',
        value: chatMetrics.cacheHitRate,
        threshold: this.thresholds.cacheHitRate.warning
      });
    }

    // Analyze database rollback rate
    const repoMetrics = this.metrics.repository;
    if (repoMetrics.rollbackCount > repoMetrics.transactionCount * 0.05) {
      analysis.bottlenecks.push({
        service: 'repository',
        issue: 'high_rollback_rate',
        severity: 'warning',
        value: repoMetrics.rollbackCount / repoMetrics.transactionCount,
        threshold: 0.05
      });
    }

    this.emit('performanceAnalysis', analysis);
    this.logger.info('Performance analysis completed', {
      bottlenecks: analysis.bottlenecks.length,
      improvements: analysis.improvements.length
    });

    return analysis;
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const metrics = this.metrics;

    // Chat Service recommendations
    const chatMetrics = metrics.chatService;
    if (chatMetrics.cacheHitRate < 0.5 && chatMetrics.requests > 100) {
      recommendations.push({
        service: 'chatService',
        type: 'cache_optimization',
        priority: 'medium',
        description: 'Increase cache size or TTL to improve hit rate',
        expectedImpact: 'Reduce average response time by 20-30%',
        implementation: 'chatService.optimizePerformance({ cacheSize: 200, cacheTTL: 20 * 60 * 1000 })'
      });
    }

    if (chatMetrics.averageResponseTime > 2000) {
      recommendations.push({
        service: 'chatService',
        type: 'response_optimization',
        priority: 'high',
        description: 'Optimize AI response generation and case processing',
        expectedImpact: 'Reduce response time by 40-50%',
        implementation: 'Enable batching and async processing for non-critical operations'
      });
    }

    // Repository recommendations
    const repoMetrics = metrics.repository;
    if (repoMetrics.cacheHits / (repoMetrics.cacheHits + repoMetrics.cacheMisses) < 0.6) {
      recommendations.push({
        service: 'repository',
        type: 'database_cache',
        priority: 'medium',
        description: 'Optimize database query caching strategy',
        expectedImpact: 'Reduce database load by 30-40%',
        implementation: 'repository.optimizePerformance({ maxCacheSize: 2000 })'
      });
    }

    if (repoMetrics.rollbackCount / repoMetrics.transactionCount > 0.1) {
      recommendations.push({
        service: 'repository',
        type: 'transaction_optimization',
        priority: 'high',
        description: 'Reduce transaction conflicts and failures',
        expectedImpact: 'Improve data consistency and reduce retries',
        implementation: 'Implement optimistic locking and better error handling'
      });
    }

    // Security recommendations
    const securityMetrics = metrics.security;
    if (securityMetrics.accessDenials > securityMetrics.auditEntries * 0.1) {
      recommendations.push({
        service: 'security',
        type: 'access_control',
        priority: 'high',
        description: 'Review and optimize access control patterns',
        expectedImpact: 'Reduce unnecessary access denials and improve UX',
        implementation: 'Review session management and permission caching'
      });
    }

    this.recommendations = recommendations;
    this.emit('recommendationsGenerated', recommendations);

    this.logger.info('Performance recommendations generated', {
      count: recommendations.length,
      priorities: {
        high: recommendations.filter(r => r.priority === 'high').length,
        medium: recommendations.filter(r => r.priority === 'medium').length,
        low: recommendations.filter(r => r.priority === 'low').length
      }
    });

    return recommendations;
  }

  /**
   * Check performance thresholds and create alerts
   */
  checkThresholds(serviceName, metrics) {
    const thresholds = this.thresholds;
    const alertKey = `${serviceName}_performance`;

    // Check response time
    if (serviceName === 'chatService' && metrics.averageResponseTime > thresholds.responseTime.critical) {
      this.createAlert(alertKey + '_response', 'critical',
        `Chat service response time (${metrics.averageResponseTime}ms) exceeds critical threshold`);
    } else if (serviceName === 'chatService' && metrics.averageResponseTime > thresholds.responseTime.warning) {
      this.createAlert(alertKey + '_response', 'warning',
        `Chat service response time (${metrics.averageResponseTime}ms) exceeds warning threshold`);
    } else {
      this.resolveAlert(alertKey + '_response');
    }

    // Check error rate
    if (serviceName === 'chatService' && metrics.errorRate > thresholds.errorRate.critical) {
      this.createAlert(alertKey + '_errors', 'critical',
        `Chat service error rate (${(metrics.errorRate * 100).toFixed(2)}%) exceeds critical threshold`);
    } else if (serviceName === 'chatService' && metrics.errorRate > thresholds.errorRate.warning) {
      this.createAlert(alertKey + '_errors', 'warning',
        `Chat service error rate (${(metrics.errorRate * 100).toFixed(2)}%) exceeds warning threshold`);
    } else {
      this.resolveAlert(alertKey + '_errors');
    }
  }

  /**
   * Check security-specific thresholds
   */
  checkSecurityThresholds(metrics) {
    if (metrics.integrityViolations > 0) {
      this.createAlert('security_integrity', 'critical',
        `Data integrity violations detected: ${metrics.integrityViolations}`);
    }

    if (metrics.accessDenials > metrics.auditEntries * 0.2) {
      this.createAlert('security_access', 'warning',
        `High number of access denials detected: ${metrics.accessDenials}`);
    }
  }

  /**
   * Create performance alert
   */
  createAlert(alertId, severity, message) {
    if (!this.activeAlerts.has(alertId)) {
      const alert = {
        id: alertId,
        severity: severity,
        message: message,
        createdAt: new Date().toISOString(),
        count: 1
      };

      this.activeAlerts.set(alertId, alert);
      this.alertHistory.push(alert);

      this.emit('alertCreated', alert);
      this.logger.warn('Performance alert created', alert);
    } else {
      // Update existing alert
      const existingAlert = this.activeAlerts.get(alertId);
      existingAlert.count++;
      existingAlert.lastOccurred = new Date().toISOString();
    }
  }

  /**
   * Resolve performance alert
   */
  resolveAlert(alertId) {
    if (this.activeAlerts.has(alertId)) {
      const alert = this.activeAlerts.get(alertId);
      alert.resolvedAt = new Date().toISOString();

      this.activeAlerts.delete(alertId);
      this.emit('alertResolved', alert);
      this.logger.info('Performance alert resolved', { alertId: alertId });
    }
  }

  /**
   * Calculate moving average
   */
  calculateMovingAverage(currentAverage, newValue, count) {
    return (currentAverage * (count - 1) + newValue) / count;
  }

  /**
   * Calculate cache hit rate
   */
  calculateCacheHitRate(cacheHit, totalRequests) {
    // This is a simplified calculation
    // In practice, you'd track hits and misses separately
    return cacheHit ? Math.min(1.0, (totalRequests * 0.1) / totalRequests) : 0;
  }

  /**
   * Calculate error rate
   */
  calculateErrorRate(totalRequests) {
    // This would track actual errors
    return Math.max(0, Math.min(1, totalRequests * 0.01 / totalRequests));
  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport() {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      activeAlerts: Array.from(this.activeAlerts.values()),
      recommendations: this.recommendations,
      summary: {
        totalRequests: this.metrics.chatService.requests + this.metrics.repository.queries,
        averageResponseTime: this.metrics.chatService.averageResponseTime,
        overallHealth: this.getOverallHealth(),
        cacheEfficiency: this.getCacheEfficiency(),
        securityStatus: this.getSecurityStatus()
      }
    };
  }

  /**
   * Get overall system health
   */
  getOverallHealth() {
    const criticalAlerts = Array.from(this.activeAlerts.values())
      .filter(alert => alert.severity === 'critical');

    if (criticalAlerts.length > 0) {
      return 'critical';
    }

    const warningAlerts = Array.from(this.activeAlerts.values())
      .filter(alert => alert.severity === 'warning');

    if (warningAlerts.length > 0) {
      return 'warning';
    }

    return 'healthy';
  }

  /**
   * Get cache efficiency metrics
   */
  getCacheEfficiency() {
    const chatCache = this.metrics.chatService.cacheHitRate;
    const repoCache = this.metrics.repository.cacheHits /
      (this.metrics.repository.cacheHits + this.metrics.repository.cacheMisses);

    return {
      chatService: chatCache,
      repository: isNaN(repoCache) ? 0 : repoCache,
      overall: (chatCache + (isNaN(repoCache) ? 0 : repoCache)) / 2
    };
  }

  /**
   * Get security status
   */
  getSecurityStatus() {
    const security = this.metrics.security;
    return {
      integrityViolations: security.integrityViolations,
      accessDenialRate: security.auditEntries > 0 ?
        security.accessDenials / security.auditEntries : 0,
      privilegeAssertions: security.privilegeAssertions,
      status: security.integrityViolations > 0 ? 'compromised' : 'secure'
    };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(service = null) {
    if (service) {
      if (this.metrics[service]) {
        Object.keys(this.metrics[service]).forEach(key => {
          if (typeof this.metrics[service][key] === 'number') {
            this.metrics[service][key] = 0;
          }
        });
        this.metrics[service].lastReset = Date.now();
        this.logger.info(`Performance metrics reset for ${service}`);
      }
    } else {
      Object.keys(this.metrics).forEach(service => {
        Object.keys(this.metrics[service]).forEach(key => {
          if (typeof this.metrics[service][key] === 'number') {
            this.metrics[service][key] = 0;
          }
        });
        this.metrics[service].lastReset = Date.now();
      });
      this.logger.info('All performance metrics reset');
    }

    this.emit('metricsReset', { service: service || 'all' });
  }

  /**
   * Stop monitoring and cleanup
   */
  cleanup() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }
    if (this.recommendationInterval) {
      clearInterval(this.recommendationInterval);
    }

    this.removeAllListeners();
    this.logger.info('PerformanceMonitorService cleaned up');
  }
}

module.exports = PerformanceMonitorService;