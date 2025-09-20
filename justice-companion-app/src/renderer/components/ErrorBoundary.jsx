import React from 'react';
import './ErrorBoundary.css';

// The Safety Net - Where crashes become intelligence
// Error boundary component for graceful error handling
// Captures and displays errors in a user-friendly way

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      reportSent: false,
      userMessage: ''
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so next render shows fallback UI
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { 
      hasError: true,
      errorId 
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log to console for immediate visibility
    console.error('🔥 JUSTICE COMPANION CRASH DETECTED:', error, errorInfo);
    
    // Capture the error details
    this.setState({
      error,
      errorInfo
    });

    // Build the intelligence report
    const crashReport = this.buildCrashReport(error, errorInfo);
    
    // Store locally first - always
    this.storeErrorLocally(crashReport);
    
    // Attempt to phone home if user consents
    if (this.props.autoReport) {
      this.reportToClaude(crashReport);
    }
  }

  buildCrashReport = (error, errorInfo) => {
    const report = {
      id: this.state.errorId,
      timestamp: new Date().toISOString(),
      error: {
        message: error.toString(),
        stack: error.stack,
        name: error.name
      },
      component: errorInfo.componentStack,
      environment: {
        platform: window.systemInfo?.platform || 'unknown',
        electronVersion: window.systemInfo?.version || 'unknown',
        nodeVersion: window.systemInfo?.nodeVersion || 'unknown',
        appVersion: '0.1.0'
      },
      context: {
        currentCase: this.props.currentCase?.title || 'none',
        activeView: this.props.activeView || 'unknown',
        messageCount: this.props.messages?.length || 0
      },
      breadcrumbs: this.getBreadcrumbs(),
      memory: this.getMemorySnapshot()
    };
    
    return report;
  };

  getBreadcrumbs = () => {
    // Pull from our memory system if available
    if (window.justiceMemory) {
      return window.justiceMemory.getBreadcrumbs();
    }
    return [];
  };

  getMemorySnapshot = () => {
    // Capture current memory state
    if (window.justiceMemory) {
      return window.justiceMemory.getSnapshot();
    }
    return null;
  };

  storeErrorLocally = async (report) => {
    try {
      // Store in electron-store for persistence
      await window.justiceAPI.storeError(report);
      console.log('📝 Error stored locally:', report.id);
    } catch (e) {
      console.error('Failed to store error locally:', e);
    }
  };

  reportToClaude = async (report) => {
    try {
      // This webhook would go to a service that forwards to Claude
      // For now, we'll store it and display for manual reporting
      console.log('📡 CRASH REPORT FOR CLAUDE:', report);
      
      // In production, this would be:
      // await fetch('https://justice-companion-telemetry.endpoint/crash', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(report)
      // });
      
      this.setState({ reportSent: true });
    } catch (e) {
      console.error('Failed to send crash report:', e);
    }
  };

  handleRestart = () => {
    // Clear error state and try again
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      reportSent: false
    });
    
    // Reload the app if critical
    if (this.props.critical) {
      window.location.reload();
    }
  };

  handleReport = () => {
    const report = this.buildCrashReport(this.state.error, this.state.errorInfo);
    report.userMessage = this.state.userMessage;
    
    // Copy to clipboard for manual reporting
    const reportText = `
JUSTICE COMPANION CRASH REPORT
===============================
ID: ${report.id}
Time: ${report.timestamp}

ERROR: ${report.error.message}
Stack: ${report.error.stack}

User Message: ${report.userMessage || 'None'}

Context: ${JSON.stringify(report.context, null, 2)}
Environment: ${JSON.stringify(report.environment, null, 2)}

INSTRUCTIONS FOR USER:
1. Copy this entire report
2. Send to Claude in your next conversation
3. Claude will analyze and fix the issue
`;
    
    navigator.clipboard.writeText(reportText);
    alert('Crash report copied to clipboard! Paste it in your next Claude conversation.');
    this.setState({ reportSent: true });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-container">
          <div className="error-content">
            <h1>⚔️ TACTICAL RETREAT REQUIRED ⚔️</h1>
            <h2>The app hit a landmine, but we're not giving up</h2>
            
            <div className="error-details">
              <p className="error-id">Error ID: {this.state.errorId}</p>
              <p className="error-message">
                {this.state.error?.toString() || 'Unknown error occurred'}
              </p>
              
              <details className="error-stack">
                <summary>Technical Details (for developers)</summary>
                <pre>{this.state.error?.stack}</pre>
              </details>
            </div>

            <div className="error-report">
              <h3>Help us improve the application:</h3>
              <textarea
                placeholder="What were you doing when this happened? Every detail helps..."
                value={this.state.userMessage}
                onChange={(e) => this.setState({ userMessage: e.target.value })}
                rows="4"
                className="error-report-input"
              />
            </div>

            <div className="error-actions">
              <button onClick={this.handleRestart} className="restart-button">
                🔄 RETRY MISSION
              </button>
              
              <button 
                onClick={this.handleReport} 
                className="report-button"
                disabled={this.state.reportSent}
              >
                {this.state.reportSent ? '✓ REPORT SENT' : '📡 SEND TO CLAUDE'}
              </button>
            </div>

            <div className="error-footer">
              <p>
                <strong>Remember:</strong> Every crash makes us stronger. 
                Every bug fixed is another barrier broken.
              </p>
              <p className="dedication">
                Making legal assistance accessible to everyone.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// This component isn't about preventing failure
// It's about learning from it
// Error tracking for continuous improvement
// Every error report is ammunition for improvement
