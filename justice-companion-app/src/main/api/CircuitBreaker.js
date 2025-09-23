/**
 * Circuit Breaker for Justice Companion API Integration
 * Provides intelligent failure handling and recovery for AI services
 */

const EventEmitter = require('events');

class CircuitBreaker extends EventEmitter {
  constructor(config = {}) {
    super();

    // Circuit breaker configuration
    this.config = {
      failureThreshold: config.failureThreshold || 5,     // Number of failures before opening
      recoveryTimeout: config.recoveryTimeout || 60000,   // Time before attempting recovery (1 minute)
      successThreshold: config.successThreshold || 3,     // Successes needed to close circuit
      timeout: config.timeout || 30000,                   // Request timeout (30 seconds)
      monitoringPeriod: config.monitoringPeriod || 60000  // Period for failure rate calculation
    };

    // Circuit states: CLOSED, OPEN, HALF_OPEN
    this.state = 'CLOSED';

    // Failure tracking
    this.failures = [];
    this.consecutiveFailures = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;

    // Success tracking for recovery
    this.consecutiveSuccesses = 0;
    this.lastStateChange = Date.now();

    // Metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeouts: 0,
      circuitOpenings: 0,
      circuitClosings: 0,
      averageResponseTime: 0,
      lastResponseTime: 0,
      uptime: Date.now(),
      stateHistory: []
    };

    // Legal-specific failure patterns
    this.legalServicePatterns = {
      'OLLAMA_CONNECTION': {
        pattern: /connection|network|unreachable|timeout/i,
        severity: 'HIGH',
        recoveryTime: 30000,
        maxRetries: 3
      },
      'MODEL_LOADING': {
        pattern: /model|loading|not found|download/i,
        severity: 'MEDIUM',
        recoveryTime: 120000,
        maxRetries: 2
      },
      'RATE_LIMIT': {
        pattern: /rate.?limit|too many requests|quota/i,
        severity: 'LOW',
        recoveryTime: 60000,
        maxRetries: 5
      },
      'GENERATION_ERROR': {
        pattern: /generation|completion|prompt/i,
        severity: 'MEDIUM',
        recoveryTime: 45000,
        maxRetries: 3
      },
      'SYSTEM_OVERLOAD': {
        pattern: /overload|busy|resource|memory/i,
        severity: 'HIGH',
        recoveryTime: 90000,
        maxRetries: 2
      }
    };

    // Start monitoring
    this.startMonitoring();

    this.emit('circuit_breaker_initialized', {
      state: this.state,
      config: this.config,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Execute a protected function through the circuit breaker
   */
  async execute(protectedFunction, context = {}) {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    // Check circuit state
    if (this.state === 'OPEN') {
      if (this.shouldAttemptRecovery()) {
        this.setState('HALF_OPEN');
      } else {
        const error = new Error('Circuit breaker is OPEN - service temporarily unavailable');
        error.circuitBreakerOpen = true;
        error.nextAttempt = this.getNextAttemptTime();
        error.userMessage = 'The AI service is temporarily unavailable. Please try again in a moment.';
        this.recordFailure(error, context);
        throw error;
      }
    }

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(protectedFunction, context);
      const responseTime = Date.now() - startTime;

      // Record success
      this.recordSuccess(responseTime, context);

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordFailure(error, context, responseTime);
      throw error;
    }
  }

  /**
   * Execute function with timeout
   */
  async executeWithTimeout(protectedFunction, context) {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.metrics.timeouts++;
        const timeoutError = new Error(`Request timeout after ${this.config.timeout}ms`);
        timeoutError.isTimeout = true;
        timeoutError.userMessage = 'The request took too long to complete. Please try again.';
        reject(timeoutError);
      }, this.config.timeout);

      try {
        const result = await protectedFunction(context);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Record successful execution
   */
  recordSuccess(responseTime, context) {
    this.metrics.successfulRequests++;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses++;
    this.lastSuccessTime = Date.now();
    this.metrics.lastResponseTime = responseTime;

    // Update average response time
    if (this.metrics.averageResponseTime === 0) {
      this.metrics.averageResponseTime = responseTime;
    } else {
      this.metrics.averageResponseTime =
        (this.metrics.averageResponseTime + responseTime) / 2;
    }

    // Check if we should close the circuit
    if (this.state === 'HALF_OPEN' &&
        this.consecutiveSuccesses >= this.config.successThreshold) {
      this.setState('CLOSED');
    }

    this.emit('request_success', {
      state: this.state,
      responseTime,
      consecutiveSuccesses: this.consecutiveSuccesses,
      context
    });
  }

  /**
   * Record failed execution
   */
  recordFailure(error, context, responseTime = 0) {
    this.metrics.failedRequests++;
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = Date.now();

    // Classify the failure
    const failureType = this.classifyFailure(error);

    // Add to failure history
    this.failures.push({
      timestamp: Date.now(),
      error: error.message,
      type: failureType.type,
      severity: failureType.severity,
      context,
      responseTime
    });

    // Keep only recent failures
    const cutoff = Date.now() - this.config.monitoringPeriod;
    this.failures = this.failures.filter(f => f.timestamp > cutoff);

    // Check if we should open the circuit
    if (this.shouldOpenCircuit(failureType)) {
      this.setState('OPEN');
    }

    this.emit('request_failed', {
      state: this.state,
      error: error.message,
      failureType,
      consecutiveFailures: this.consecutiveFailures,
      context
    });
  }

  /**
   * Classify failure type based on error message
   */
  classifyFailure(error) {
    const errorMessage = error.message || '';

    for (const [type, pattern] of Object.entries(this.legalServicePatterns)) {
      if (pattern.pattern.test(errorMessage)) {
        return {
          type,
          severity: pattern.severity,
          pattern: pattern.pattern,
          recoveryTime: pattern.recoveryTime,
          maxRetries: pattern.maxRetries
        };
      }
    }

    // Default classification
    return {
      type: 'UNKNOWN',
      severity: 'MEDIUM',
      recoveryTime: this.config.recoveryTimeout,
      maxRetries: 3
    };
  }

  /**
   * Determine if circuit should be opened
   */
  shouldOpenCircuit(failureType) {
    if (this.state === 'OPEN') {
      return false;
    }

    // Check consecutive failures
    if (this.consecutiveFailures >= this.config.failureThreshold) {
      return true;
    }

    // Check failure rate in recent period
    const recentFailures = this.failures.filter(f =>
      Date.now() - f.timestamp < this.config.monitoringPeriod
    );

    if (recentFailures.length >= this.config.failureThreshold) {
      const highSeverityFailures = recentFailures.filter(f =>
        f.severity === 'HIGH'
      ).length;

      // Open immediately for multiple high-severity failures
      if (highSeverityFailures >= 2) {
        return true;
      }

      // Calculate failure rate
      const totalRequests = this.metrics.totalRequests;
      if (totalRequests > 0) {
        const failureRate = recentFailures.length / Math.min(totalRequests, 10);
        return failureRate > 0.5; // 50% failure rate
      }
    }

    return false;
  }

  /**
   * Check if we should attempt recovery
   */
  shouldAttemptRecovery() {
    if (!this.lastFailureTime) {
      return true;
    }

    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    const lastFailure = this.failures[this.failures.length - 1];

    if (lastFailure && lastFailure.type !== 'UNKNOWN') {
      const pattern = this.legalServicePatterns[lastFailure.type];
      return timeSinceLastFailure >= pattern.recoveryTime;
    }

    return timeSinceLastFailure >= this.config.recoveryTimeout;
  }

  /**
   * Set circuit breaker state
   */
  setState(newState) {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    // Update metrics
    if (newState === 'OPEN') {
      this.metrics.circuitOpenings++;
    } else if (newState === 'CLOSED' && oldState !== 'CLOSED') {
      this.metrics.circuitClosings++;
    }

    // Record state change
    this.metrics.stateHistory.push({
      from: oldState,
      to: newState,
      timestamp: Date.now(),
      reason: this.getStateChangeReason(oldState, newState)
    });

    // Keep only recent state history
    if (this.metrics.stateHistory.length > 50) {
      this.metrics.stateHistory = this.metrics.stateHistory.slice(-50);
    }

    this.emit('state_change', {
      from: oldState,
      to: newState,
      timestamp: new Date().toISOString(),
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses
    });
  }

  /**
   * Get reason for state change
   */
  getStateChangeReason(oldState, newState) {
    if (newState === 'OPEN') {
      return `Failure threshold exceeded (${this.consecutiveFailures} consecutive failures)`;
    } else if (newState === 'CLOSED') {
      return `Recovery successful (${this.consecutiveSuccesses} consecutive successes)`;
    } else if (newState === 'HALF_OPEN') {
      return 'Attempting recovery after timeout period';
    }
    return 'State change';
  }

  /**
   * Get next attempt time for OPEN circuit
   */
  getNextAttemptTime() {
    if (!this.lastFailureTime) {
      return Date.now();
    }

    const lastFailure = this.failures[this.failures.length - 1];
    let recoveryTime = this.config.recoveryTimeout;

    if (lastFailure && lastFailure.type !== 'UNKNOWN') {
      const pattern = this.legalServicePatterns[lastFailure.type];
      recoveryTime = pattern.recoveryTime;
    }

    return this.lastFailureTime + recoveryTime;
  }

  /**
   * Get current status
   */
  getStatus() {
    const now = Date.now();
    const recentFailures = this.failures.filter(f =>
      now - f.timestamp < this.config.monitoringPeriod
    );

    return {
      state: this.state,
      isHealthy: this.state === 'CLOSED',
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.state === 'OPEN' ? this.getNextAttemptTime() : null,
      timeSinceLastStateChange: now - this.lastStateChange,
      recentFailures: recentFailures.length,
      metrics: {
        ...this.metrics,
        uptime: now - this.metrics.uptime,
        failureRate: this.metrics.totalRequests > 0
          ? (this.metrics.failedRequests / this.metrics.totalRequests * 100).toFixed(2) + '%'
          : '0%'
      },
      config: this.config
    };
  }

  /**
   * Get failure analysis
   */
  getFailureAnalysis() {
    const now = Date.now();
    const recentFailures = this.failures.filter(f =>
      now - f.timestamp < this.config.monitoringPeriod
    );

    // Group failures by type
    const failuresByType = recentFailures.reduce((acc, failure) => {
      acc[failure.type] = (acc[failure.type] || 0) + 1;
      return acc;
    }, {});

    // Group failures by severity
    const failuresBySeverity = recentFailures.reduce((acc, failure) => {
      acc[failure.severity] = (acc[failure.severity] || 0) + 1;
      return acc;
    }, {});

    return {
      recentFailures: recentFailures.length,
      failuresByType,
      failuresBySeverity,
      mostCommonFailure: Object.entries(failuresByType).sort((a, b) => b[1] - a[1])[0],
      recommendedAction: this.getRecommendedAction(failuresByType, failuresBySeverity),
      lastFailures: recentFailures.slice(-5).map(f => ({
        timestamp: new Date(f.timestamp).toISOString(),
        type: f.type,
        severity: f.severity,
        message: f.error
      }))
    };
  }

  /**
   * Get recommended action based on failure patterns
   */
  getRecommendedAction(failuresByType, failuresBySeverity) {
    const totalFailures = Object.values(failuresByType).reduce((sum, count) => sum + count, 0);

    if (totalFailures === 0) {
      return 'System is operating normally';
    }

    const mostCommonType = Object.entries(failuresByType).sort((a, b) => b[1] - a[1])[0];

    if (!mostCommonType) {
      return 'Monitor system performance';
    }

    const [type, count] = mostCommonType;
    const recommendations = {
      'OLLAMA_CONNECTION': 'Check Ollama service status and network connectivity',
      'MODEL_LOADING': 'Verify model availability and download status',
      'RATE_LIMIT': 'Implement request throttling and retry logic',
      'GENERATION_ERROR': 'Review prompt formatting and model parameters',
      'SYSTEM_OVERLOAD': 'Scale resources or implement load balancing',
      'UNKNOWN': 'Investigate error logs for root cause analysis'
    };

    return recommendations[type] || 'Review system configuration and error logs';
  }

  /**
   * Force circuit state (for testing/admin)
   */
  forceState(state, reason = 'Manual override') {
    if (['CLOSED', 'OPEN', 'HALF_OPEN'].includes(state)) {
      const oldState = this.state;
      this.state = state;
      this.lastStateChange = Date.now();

      this.metrics.stateHistory.push({
        from: oldState,
        to: state,
        timestamp: Date.now(),
        reason: `Manual: ${reason}`
      });

      this.emit('state_change', {
        from: oldState,
        to: state,
        timestamp: new Date().toISOString(),
        reason,
        manual: true
      });

      return true;
    }
    return false;
  }

  /**
   * Reset circuit breaker
   */
  reset() {
    this.setState('CLOSED');
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.failures = [];
    this.lastFailureTime = null;

    this.emit('circuit_reset', {
      timestamp: new Date().toISOString(),
      previousMetrics: { ...this.metrics }
    });

    // Reset some metrics but keep historical data
    this.metrics.circuitOpenings = 0;
    this.metrics.circuitClosings = 0;
  }

  /**
   * Start monitoring intervals
   */
  startMonitoring() {
    // Clean up old failures every minute
    this.monitoringInterval = setInterval(() => {
      const cutoff = Date.now() - this.config.monitoringPeriod;
      this.failures = this.failures.filter(f => f.timestamp > cutoff);
    }, 60000);

    // Emit status every 30 seconds
    this.statusInterval = setInterval(() => {
      this.emit('status_update', this.getStatus());
    }, 30000);
  }

  /**
   * Stop monitoring and cleanup
   */
  destroy() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }

    this.removeAllListeners();
    this.failures = [];
  }
}

module.exports = CircuitBreaker;