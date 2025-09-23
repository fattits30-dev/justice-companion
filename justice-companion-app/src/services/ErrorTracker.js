/**
 * Error Tracking Service
 * Captures, categorizes, and reports errors for Justice Companion
 */

const { logger } = require('./Logger');

class ErrorTracker {
  constructor() {
    this.errors = [];
    this.maxErrors = 100;
    this.errorHandlers = new Map();
    this.initialized = false;
    this.metadata = {
      version: '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      platform: typeof window !== 'undefined' ? 'web' : 'node'
    };
  }

  /**
   * Initialize error tracking
   */
  initialize() {
    if (this.initialized) return;

    // Global error handlers
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.captureError(event.error || new Error(event.message), {
          type: 'window.error',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.captureError(new Error(event.reason), {
          type: 'unhandledRejection',
          promise: event.promise
        });
      });
    } else if (typeof process !== 'undefined') {
      process.on('uncaughtException', (error) => {
        this.captureError(error, { type: 'uncaughtException' });
      });

      process.on('unhandledRejection', (reason, promise) => {
        this.captureError(new Error(String(reason)), {
          type: 'unhandledRejection',
          promise
        });
      });
    }

    this.initialized = true;
    logger.info('Error tracker initialized');
  }

  /**
   * Categorize error by type
   */
  categorizeError(error) {
    const message = error.message || '';
    const stack = error.stack || '';

    if (message.includes('Network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('Permission') || message.includes('Access')) {
      return 'security';
    }
    if (message.includes('Database') || message.includes('SQL')) {
      return 'database';
    }
    if (message.includes('Legal') || message.includes('Case')) {
      return 'legal';
    }
    if (stack.includes('React')) {
      return 'react';
    }
    if (stack.includes('Electron')) {
      return 'electron';
    }
    return 'general';
  }

  /**
   * Get error severity
   */
  getSeverity(error, context = {}) {
    const category = this.categorizeError(error);

    // Critical errors
    if (category === 'security' || category === 'database') {
      return 'critical';
    }

    // High priority errors
    if (category === 'legal' || context.type === 'uncaughtException') {
      return 'high';
    }

    // Medium priority
    if (category === 'network' || category === 'react') {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Capture and process error
   */
  captureError(error, context = {}) {
    const errorRecord = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      category: this.categorizeError(error),
      severity: this.getSeverity(error, context),
      context,
      metadata: { ...this.metadata },
      handled: false
    };

    // Store error
    this.errors.push(errorRecord);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log error
    logger.error(`Error captured: ${error.message}`, errorRecord);

    // Execute custom handlers
    const handler = this.errorHandlers.get(errorRecord.category);
    if (handler) {
      try {
        errorRecord.handled = handler(errorRecord);
      } catch (handlerError) {
        logger.error('Error handler failed', handlerError);
      }
    }

    // Send critical errors to remote service
    if (errorRecord.severity === 'critical' && process.env.NODE_ENV === 'production') {
      this.reportToRemote(errorRecord);
    }

    return errorRecord;
  }

  /**
   * Register custom error handler for category
   */
  registerHandler(category, handler) {
    this.errorHandlers.set(category, handler);
  }

  /**
   * Report error to remote service (placeholder)
   */
  reportToRemote(errorRecord) {
    // TODO: Implement remote error reporting service
    // For now, store in localStorage for later retrieval
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const criticalErrors = JSON.parse(
          localStorage.getItem('justice_critical_errors') || '[]'
        );
        criticalErrors.push({
          ...errorRecord,
          reported: false
        });
        // Keep only last 20 critical errors
        if (criticalErrors.length > 20) {
          criticalErrors.shift();
        }
        localStorage.setItem('justice_critical_errors', JSON.stringify(criticalErrors));
      } catch (e) {
        // Silently fail
      }
    }
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count = 10, category = null, severity = null) {
    let filtered = [...this.errors];

    if (category) {
      filtered = filtered.filter(e => e.category === category);
    }

    if (severity) {
      filtered = filtered.filter(e => e.severity === severity);
    }

    return filtered.slice(-count);
  }

  /**
   * Get error statistics
   */
  getStatistics() {
    const stats = {
      total: this.errors.length,
      byCategory: {},
      bySeverity: {},
      recentRate: 0
    };

    // Count by category and severity
    this.errors.forEach(error => {
      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
    });

    // Calculate recent error rate (last 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentErrors = this.errors.filter(
      e => new Date(e.timestamp).getTime() > fiveMinutesAgo
    );
    stats.recentRate = recentErrors.length;

    return stats;
  }

  /**
   * Clear error history
   */
  clearErrors(category = null) {
    if (category) {
      this.errors = this.errors.filter(e => e.category !== category);
    } else {
      this.errors = [];
    }
  }

  /**
   * Generate unique error ID
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export errors for debugging
   */
  exportErrors() {
    return JSON.stringify({
      metadata: this.metadata,
      statistics: this.getStatistics(),
      errors: this.errors
    }, null, 2);
  }

  /**
   * Helper method to wrap async functions with error tracking
   */
  wrapAsync(fn, context = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.captureError(error, {
          ...context,
          function: fn.name,
          arguments: args
        });
        throw error;
      }
    };
  }

  /**
   * React Error Boundary helper
   */
  createErrorBoundary() {
    const tracker = this;

    return class ErrorBoundary extends (require('react').Component) {
      constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
      }

      static getDerivedStateFromError(error) {
        return { hasError: true, error };
      }

      componentDidCatch(error, errorInfo) {
        tracker.captureError(error, {
          type: 'react-error-boundary',
          componentStack: errorInfo.componentStack
        });
      }

      render() {
        if (this.state.hasError) {
          return this.props.fallback || (
            require('react').createElement('div', {
              style: {
                padding: '20px',
                background: '#fee',
                border: '1px solid #fcc',
                borderRadius: '4px'
              }
            }, [
              require('react').createElement('h2', null, 'Something went wrong'),
              require('react').createElement('p', null, this.state.error?.message),
              require('react').createElement('button', {
                onClick: () => this.setState({ hasError: false, error: null })
              }, 'Try again')
            ])
          );
        }

        return this.props.children;
      }
    };
  }
}

// Create singleton instance
const errorTracker = new ErrorTracker();

module.exports = {
  ErrorTracker,
  errorTracker,

  // Convenience methods
  captureError: (error, context) => errorTracker.captureError(error, context),
  wrapAsync: (fn, context) => errorTracker.wrapAsync(fn, context),
  getStatistics: () => errorTracker.getStatistics()
};