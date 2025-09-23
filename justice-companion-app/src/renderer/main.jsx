import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './lib/WebAPIBridge.js'; // Initialize web compatibility layer
import './main.css';

// Entry point for Justice Companion React renderer
// ULTRA-THINK mode: This is where justice begins

/**
 * Enhanced error reporting function based on context7 best practices
 * Logs errors with comprehensive details for debugging and improvement
 */
const reportCaughtError = (error, errorInfo) => {
  // Filter out known/benign errors to reduce noise
  if (error.message === "Known error" ||
      error.message.includes("ResizeObserver loop") ||
      error.message.includes("Non-Error promise rejection")) {
    return; // Skip reporting these
  }

  // Create comprehensive error report
  const errorReport = {
    timestamp: new Date().toISOString(),
    type: 'CAUGHT_ERROR',
    error: {
      message: error.message,
      name: error.name,
      stack: error.stack
    },
    componentStack: errorInfo.componentStack,
    environment: {
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: Date.now()
    },
    context: {
      appName: 'Justice Companion',
      version: '1.0.0',
      buildMode: process.env.NODE_ENV || 'development'
    }
  };

  // Log to console for development
  console.error('🚨 React Caught Error:', errorReport);

  // Store error locally via secure API
  if (window.justiceAPI?.storeError) {
    window.justiceAPI.storeError(errorReport).catch(storeErr => {
      console.error('Failed to store caught error:', storeErr);
    });
  }

  // In production, could also send to monitoring service
  // Example: Sentry, LogRocket, or custom telemetry endpoint
};

/**
 * Handle uncaught errors that escape React's error boundaries
 */
const reportUncaughtError = (error, errorInfo) => {
  // Create critical error report for uncaught errors
  const criticalReport = {
    timestamp: new Date().toISOString(),
    type: 'UNCAUGHT_ERROR',
    severity: 'CRITICAL',
    error: {
      message: error.message,
      name: error.name,
      stack: error.stack
    },
    componentStack: errorInfo.componentStack,
    environment: {
      userAgent: navigator.userAgent,
      url: window.location.href,
      memoryUsage: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : null
    },
    context: {
      appName: 'Justice Companion',
      version: '1.0.0',
      emergencyMode: true
    }
  };

  // Log critical error prominently
  console.error('🔥 CRITICAL: React Uncaught Error:', criticalReport);

  // Store critical error
  if (window.justiceAPI?.storeError) {
    window.justiceAPI.storeError(criticalReport).catch(storeErr => {
      console.error('CRITICAL: Failed to store uncaught error:', storeErr);
    });
  }

  // Show user notification for critical errors
  if (typeof window !== 'undefined' && window.Notification && Notification.permission === 'granted') {
    new Notification('Justice Companion - Critical Error', {
      body: 'A critical error occurred. The app may need to restart.',
      icon: '/icon.png'
    });
  }
};

// Create React root with enhanced error handling (Context7 best practices)
const container = document.getElementById('root');
const root = ReactDOM.createRoot(container, {
  // Context7 React 19 best practice: Custom error handlers
  onCaughtError: (error, errorInfo) => {
    reportCaughtError(error, errorInfo);
  },
  onUncaughtError: (error, errorInfo) => {
    reportUncaughtError(error, errorInfo);
  }
});

// Render with comprehensive error protection
root.render(
  <React.StrictMode>
    <ErrorBoundary autoReport={true}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Additional global error handlers for non-React errors
window.addEventListener('error', (event) => {
  console.error('🌐 Global JavaScript Error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🔄 Unhandled Promise Rejection:', {
    reason: event.reason,
    promise: event.promise
  });

  // Prevent default browser error handling
  event.preventDefault();
});

// Log successful initialization
console.log('⚖️ Justice Companion: Enhanced React runtime initialized');
console.log('✅ Error boundaries: Active');
console.log('✅ createRoot error handlers: Configured');
console.log('✅ Global error capture: Enabled');