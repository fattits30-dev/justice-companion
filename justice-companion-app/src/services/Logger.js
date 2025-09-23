/**
 * Centralized Logging Service
 * Provides structured logging with environment-aware configuration
 */

class Logger {
  constructor(module = 'app') {
    this.module = module;
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.isElectron = typeof window !== 'undefined' && window.process?.type;
    this.logs = [];
    this.maxLogs = 1000;
  }

  /**
   * Format log entry with metadata
   */
  formatLog(level, message, data) {
    return {
      timestamp: new Date().toISOString(),
      level,
      module: this.module,
      message,
      data,
      environment: this.isElectron ? 'electron' : 'web'
    };
  }

  /**
   * Store log in memory buffer
   */
  storeLog(logEntry) {
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }
  }

  /**
   * Output log based on environment
   */
  output(level, message, data) {
    const logEntry = this.formatLog(level, message, data);
    this.storeLog(logEntry);

    // Only output in development or for errors
    if (this.isDevelopment || level === 'error') {
      const timestamp = new Date().toLocaleTimeString();
      const prefix = `[${timestamp}] [${this.module}] ${level.toUpperCase()}:`;

      switch (level) {
        case 'error':
          console.error(prefix, message, data || '');
          break;
        case 'warn':
          console.warn(prefix, message, data || '');
          break;
        case 'info':
          if (this.isDevelopment) console.info(prefix, message, data || '');
          break;
        case 'debug':
          if (this.isDevelopment) console.log(prefix, message, data || '');
          break;
        default:
          if (this.isDevelopment) console.log(prefix, message, data || '');
      }
    }

    // Send to remote logging in production (placeholder)
    if (!this.isDevelopment && level === 'error') {
      this.sendToRemote(logEntry);
    }
  }

  /**
   * Send logs to remote service (implement as needed)
   */
  sendToRemote(logEntry) {
    // TODO: Implement remote logging service integration
    // For now, just store locally
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const errorLogs = JSON.parse(localStorage.getItem('justice_error_logs') || '[]');
        errorLogs.push(logEntry);
        // Keep only last 100 errors
        if (errorLogs.length > 100) {
          errorLogs.shift();
        }
        localStorage.setItem('justice_error_logs', JSON.stringify(errorLogs));
      } catch (e) {
        // Silently fail if localStorage is full
      }
    }
  }

  /**
   * Public logging methods
   */
  info(message, data) {
    this.output('info', message, data);
  }

  warn(message, data) {
    this.output('warn', message, data);
  }

  error(message, error) {
    const errorData = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error;
    this.output('error', message, errorData);
  }

  debug(message, data) {
    this.output('debug', message, data);
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count = 50) {
    return this.logs.slice(-count);
  }

  /**
   * Clear log buffer
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Export logs for debugging
   */
  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Create child logger with sub-module name
   */
  child(subModule) {
    return new Logger(`${this.module}:${subModule}`);
  }
}

// Create singleton instance for default export
const defaultLogger = new Logger('JusticeCompanion');

// Export both class and instance
module.exports = {
  Logger,
  logger: defaultLogger,

  // Convenience method to create module-specific loggers
  createLogger: (module) => new Logger(module)
};