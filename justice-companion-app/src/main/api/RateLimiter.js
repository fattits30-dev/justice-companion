/**
 * Rate Limiter for Justice Companion API Integration
 * Provides intelligent rate limiting for AI service calls with legal-specific patterns
 */

class RateLimiter {
  constructor(config = {}) {
    // Rate limiting configuration
    this.limits = {
      perMinute: config.perMinute || 30,
      perHour: config.perHour || 300,
      perDay: config.perDay || 1000,
      burstLimit: config.burstLimit || 5
    };

    // Tracking windows
    this.windows = {
      minute: { requests: [], limit: this.limits.perMinute },
      hour: { requests: [], limit: this.limits.perHour },
      day: { requests: [], limit: this.limits.perDay },
      burst: { requests: [], limit: this.limits.burstLimit, duration: 5000 } // 5 seconds
    };

    // Session-based tracking
    this.sessionTracking = new Map();
    this.sessionLimits = {
      maxConcurrent: config.maxConcurrentSessions || 50,
      sessionTimeout: config.sessionTimeout || 3600000, // 1 hour
      maxRequestsPerSession: config.maxRequestsPerSession || 100
    };

    // Legal domain priority system
    this.domainPriority = {
      'EMERGENCY': { weight: 1.0, burstAllowed: true },
      'LANDLORD_TENANT': { weight: 0.9, burstAllowed: true },
      'FAMILY_LAW': { weight: 0.8, burstAllowed: true },
      'EMPLOYMENT_RIGHTS': { weight: 0.7, burstAllowed: false },
      'CONSUMER_RIGHTS': { weight: 0.6, burstAllowed: false },
      'DEBT_FINANCE': { weight: 0.5, burstAllowed: false },
      'GENERAL': { weight: 0.3, burstAllowed: false }
    };

    // Metrics tracking
    this.metrics = {
      totalRequests: 0,
      blockedRequests: 0,
      allowedRequests: 0,
      resetCounts: {
        minute: 0,
        hour: 0,
        day: 0
      },
      averageWaitTime: 0,
      peakUsage: {
        minute: 0,
        hour: 0,
        day: 0
      }
    };

    // Start cleanup intervals
    this.startCleanupIntervals();
  }

  /**
   * Check if request is allowed based on rate limits
   */
  checkRateLimit(sessionId, domain = 'GENERAL', options = {}) {
    const now = Date.now();
    const domainConfig = this.domainPriority[domain] || this.domainPriority['GENERAL'];

    // Update session tracking
    this.updateSessionTracking(sessionId, now);

    // Check all rate limit windows
    const checks = {
      burst: this.checkWindow('burst', now, domainConfig),
      minute: this.checkWindow('minute', now, domainConfig),
      hour: this.checkWindow('hour', now, domainConfig),
      day: this.checkWindow('day', now, domainConfig),
      session: this.checkSessionLimit(sessionId),
      concurrent: this.checkConcurrentSessions()
    };

    // Determine if request should be allowed
    const allowed = Object.values(checks).every(check => check.allowed);

    if (allowed) {
      // Record successful request
      this.recordRequest(sessionId, now, domain);
      this.metrics.allowedRequests++;
      this.metrics.totalRequests++;
    } else {
      // Record blocked request
      this.metrics.blockedRequests++;
      this.metrics.totalRequests++;
    }

    // Calculate suggested wait time if blocked
    const waitTime = allowed ? 0 : this.calculateWaitTime(checks, domainConfig);

    return {
      allowed,
      waitTime,
      domain,
      sessionId,
      limits: this.getCurrentLimits(),
      checks,
      retryAfter: waitTime,
      priority: domainConfig.weight,
      metrics: this.getMetricsSummary()
    };
  }

  /**
   * Check individual time window
   */
  checkWindow(windowType, now, domainConfig) {
    const window = this.windows[windowType];
    const duration = this.getWindowDuration(windowType);

    // Clean old requests
    window.requests = window.requests.filter(time => now - time < duration);

    // Calculate effective limit based on domain priority
    const effectiveLimit = Math.floor(window.limit * domainConfig.weight);
    const currentCount = window.requests.length;

    // Special handling for burst requests
    if (windowType === 'burst' && !domainConfig.burstAllowed) {
      return {
        allowed: currentCount < Math.floor(effectiveLimit * 0.5), // Reduced burst for non-priority domains
        current: currentCount,
        limit: effectiveLimit,
        remaining: Math.max(0, effectiveLimit - currentCount),
        resetTime: this.getNextResetTime(windowType, now)
      };
    }

    return {
      allowed: currentCount < effectiveLimit,
      current: currentCount,
      limit: effectiveLimit,
      remaining: Math.max(0, effectiveLimit - currentCount),
      resetTime: this.getNextResetTime(windowType, now)
    };
  }

  /**
   * Check session-specific limits
   */
  checkSessionLimit(sessionId) {
    const session = this.sessionTracking.get(sessionId);

    if (!session) {
      return {
        allowed: true,
        current: 0,
        limit: this.sessionLimits.maxRequestsPerSession,
        remaining: this.sessionLimits.maxRequestsPerSession
      };
    }

    const allowed = session.requestCount < this.sessionLimits.maxRequestsPerSession;

    return {
      allowed,
      current: session.requestCount,
      limit: this.sessionLimits.maxRequestsPerSession,
      remaining: Math.max(0, this.sessionLimits.maxRequestsPerSession - session.requestCount)
    };
  }

  /**
   * Check concurrent session limits
   */
  checkConcurrentSessions() {
    const activeSessions = this.getActiveSessions().length;
    const allowed = activeSessions < this.sessionLimits.maxConcurrent;

    return {
      allowed,
      current: activeSessions,
      limit: this.sessionLimits.maxConcurrent,
      remaining: Math.max(0, this.sessionLimits.maxConcurrent - activeSessions)
    };
  }

  /**
   * Record a successful request
   */
  recordRequest(sessionId, timestamp, domain) {
    // Add to all time windows
    Object.keys(this.windows).forEach(windowType => {
      this.windows[windowType].requests.push(timestamp);
    });

    // Update session tracking
    this.updateSessionRequestCount(sessionId);

    // Update peak usage metrics
    this.updatePeakUsage();
  }

  /**
   * Update session tracking
   */
  updateSessionTracking(sessionId, now) {
    if (!this.sessionTracking.has(sessionId)) {
      this.sessionTracking.set(sessionId, {
        firstRequest: now,
        lastRequest: now,
        requestCount: 0,
        domain: null
      });
    } else {
      const session = this.sessionTracking.get(sessionId);
      session.lastRequest = now;
      this.sessionTracking.set(sessionId, session);
    }
  }

  /**
   * Update session request count
   */
  updateSessionRequestCount(sessionId) {
    if (this.sessionTracking.has(sessionId)) {
      const session = this.sessionTracking.get(sessionId);
      session.requestCount++;
      this.sessionTracking.set(sessionId, session);
    }
  }

  /**
   * Calculate suggested wait time
   */
  calculateWaitTime(checks, domainConfig) {
    const blockedWindows = Object.entries(checks)
      .filter(([_, check]) => !check.allowed && check.resetTime)
      .map(([windowType, check]) => ({
        windowType,
        waitTime: check.resetTime - Date.now()
      }));

    if (blockedWindows.length === 0) {
      return 0;
    }

    // Find the shortest wait time, adjusted for domain priority
    const minWaitTime = Math.min(...blockedWindows.map(w => w.waitTime));
    const priorityAdjustment = 1 - (domainConfig.weight * 0.5); // Higher priority = shorter wait

    return Math.max(1000, Math.floor(minWaitTime * priorityAdjustment)); // Minimum 1 second
  }

  /**
   * Get window duration in milliseconds
   */
  getWindowDuration(windowType) {
    const durations = {
      burst: 5000,      // 5 seconds
      minute: 60000,    // 1 minute
      hour: 3600000,    // 1 hour
      day: 86400000     // 24 hours
    };
    return durations[windowType] || 60000;
  }

  /**
   * Get next reset time for window
   */
  getNextResetTime(windowType, now) {
    const duration = this.getWindowDuration(windowType);
    const window = this.windows[windowType];

    if (window.requests.length === 0) {
      return now + duration;
    }

    const oldestRequest = Math.min(...window.requests);
    return oldestRequest + duration;
  }

  /**
   * Get current limits for all windows
   */
  getCurrentLimits() {
    const now = Date.now();
    return Object.entries(this.windows).reduce((limits, [windowType, window]) => {
      const duration = this.getWindowDuration(windowType);
      const currentRequests = window.requests.filter(time => now - time < duration).length;

      limits[windowType] = {
        current: currentRequests,
        limit: window.limit,
        remaining: Math.max(0, window.limit - currentRequests),
        resetTime: this.getNextResetTime(windowType, now)
      };

      return limits;
    }, {});
  }

  /**
   * Get active sessions
   */
  getActiveSessions() {
    const now = Date.now();
    const activeThreshold = this.sessionLimits.sessionTimeout;

    return Array.from(this.sessionTracking.entries())
      .filter(([_, session]) => now - session.lastRequest < activeThreshold)
      .map(([sessionId, session]) => ({ sessionId, ...session }));
  }

  /**
   * Update peak usage metrics
   */
  updatePeakUsage() {
    const now = Date.now();
    Object.entries(this.windows).forEach(([windowType, window]) => {
      if (windowType === 'burst') return; // Skip burst for peak tracking

      const duration = this.getWindowDuration(windowType);
      const currentRequests = window.requests.filter(time => now - time < duration).length;

      if (currentRequests > this.metrics.peakUsage[windowType]) {
        this.metrics.peakUsage[windowType] = currentRequests;
      }
    });
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary() {
    return {
      total: this.metrics.totalRequests,
      allowed: this.metrics.allowedRequests,
      blocked: this.metrics.blockedRequests,
      blockRate: this.metrics.totalRequests > 0
        ? (this.metrics.blockedRequests / this.metrics.totalRequests * 100).toFixed(2) + '%'
        : '0%',
      activeSessions: this.getActiveSessions().length,
      peakUsage: this.metrics.peakUsage
    };
  }

  /**
   * Reset specific window
   */
  resetWindow(windowType) {
    if (this.windows[windowType]) {
      this.windows[windowType].requests = [];
      this.metrics.resetCounts[windowType]++;
    }
  }

  /**
   * Reset all limits (emergency use only)
   */
  resetAllLimits() {
    Object.keys(this.windows).forEach(windowType => {
      this.windows[windowType].requests = [];
    });
    this.sessionTracking.clear();

    // Reset metrics
    Object.keys(this.metrics.resetCounts).forEach(windowType => {
      this.metrics.resetCounts[windowType]++;
    });
  }

  /**
   * Cleanup expired sessions and old requests
   */
  cleanup() {
    const now = Date.now();

    // Clean up expired sessions
    const sessionTimeout = this.sessionLimits.sessionTimeout;
    const expiredSessions = [];

    for (const [sessionId, session] of this.sessionTracking.entries()) {
      if (now - session.lastRequest > sessionTimeout) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => {
      this.sessionTracking.delete(sessionId);
    });

    // Clean up old requests from all windows
    Object.entries(this.windows).forEach(([windowType, window]) => {
      const duration = this.getWindowDuration(windowType);
      window.requests = window.requests.filter(time => now - time < duration);
    });

    return {
      expiredSessions: expiredSessions.length,
      cleanupTime: new Date().toISOString()
    };
  }

  /**
   * Start cleanup intervals
   */
  startCleanupIntervals() {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 300000);

    // Reset hourly metrics every hour
    this.hourlyResetInterval = setInterval(() => {
      this.metrics.resetCounts.hour++;
    }, 3600000);

    // Reset daily metrics every day
    this.dailyResetInterval = setInterval(() => {
      this.metrics.resetCounts.day++;
    }, 86400000);
  }

  /**
   * Get comprehensive status report
   */
  getStatusReport() {
    const now = Date.now();
    const activeSessions = this.getActiveSessions();

    return {
      status: 'active',
      timestamp: new Date().toISOString(),
      limits: this.getCurrentLimits(),
      sessions: {
        active: activeSessions.length,
        total: this.sessionTracking.size,
        limit: this.sessionLimits.maxConcurrent,
        details: activeSessions.slice(0, 10) // First 10 for overview
      },
      metrics: this.getMetricsSummary(),
      configuration: {
        limits: this.limits,
        sessionLimits: this.sessionLimits,
        domainPriority: this.domainPriority
      },
      performance: {
        averageWaitTime: this.metrics.averageWaitTime,
        peakUsage: this.metrics.peakUsage,
        resetCounts: this.metrics.resetCounts
      }
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.hourlyResetInterval) {
      clearInterval(this.hourlyResetInterval);
    }
    if (this.dailyResetInterval) {
      clearInterval(this.dailyResetInterval);
    }

    this.sessionTracking.clear();
    Object.keys(this.windows).forEach(windowType => {
      this.windows[windowType].requests = [];
    });
  }
}

module.exports = RateLimiter;