import React, { useState, useEffect } from 'react';

/**
 * AI Status Indicator Component
 * Shows the health and connection status of the AI service
 */
const AIStatusIndicator = ({ isVisible = true, onConnectionTest }) => {
  const [healthStatus, setHealthStatus] = useState({
    status: 'unknown',
    loading: true,
    lastCheck: null
  });
  const [showDetails, setShowDetails] = useState(false);
  const [connectionTest, setConnectionTest] = useState(null);

  // Check AI health on component mount and periodically
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await window.justiceAPI.aiHealth();
        if (health.success) {
          setHealthStatus({
            status: health.health.overall,
            loading: false,
            lastCheck: new Date(),
            details: health.health
          });
        } else {
          setHealthStatus({
            status: 'error',
            loading: false,
            lastCheck: new Date(),
            error: health.error
          });
        }
      } catch (error) {
        setHealthStatus({
          status: 'error',
          loading: false,
          lastCheck: new Date(),
          error: error.message
        });
      }
    };

    // Initial check
    checkHealth();

    // Periodic health checks every 30 seconds
    const healthInterval = setInterval(checkHealth, 30000);

    return () => clearInterval(healthInterval);
  }, []);

  // Test Ollama connection
  const testConnection = async () => {
    setConnectionTest({ loading: true });

    try {
      const result = await window.justiceAPI.aiTestConnection();
      setConnectionTest(result);

      if (onConnectionTest) {
        onConnectionTest(result);
      }
    } catch (error) {
      setConnectionTest({
        success: false,
        error: error.message,
        loading: false
      });
    }
  };

  // Get status indicator colors and icons
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'healthy':
        return { color: '#10b981', icon: '🟢', text: 'AI Ready' };
      case 'degraded':
        return { color: '#f59e0b', icon: '🟡', text: 'AI Limited' };
      case 'error':
        return { color: '#ef4444', icon: '🔴', text: 'AI Offline' };
      default:
        return { color: '#6b7280', icon: '⚪', text: 'AI Unknown' };
    }
  };

  const statusDisplay = getStatusDisplay(healthStatus.status);

  if (!isVisible) return null;

  return (
    <div className="ai-status-indicator">
      {/* Main status indicator */}
      <div
        className="status-badge"
        onClick={() => setShowDetails(!showDetails)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          color: statusDisplay.color,
          border: `1px solid ${statusDisplay.color}40`,
          transition: 'all 0.2s ease'
        }}
        title={`AI Status: ${statusDisplay.text} - Click for details`}
      >
        <span aria-hidden="true">{statusDisplay.icon}</span>
        <span>{statusDisplay.text}</span>
        {healthStatus.loading && (
          <span className="loading-spinner" style={{ fontSize: '12px' }}>⏳</span>
        )}
      </div>

      {/* Detailed status panel */}
      {showDetails && (
        <div
          className="status-details"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            minWidth: '300px',
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            fontSize: '14px',
            color: '#e5e7eb'
          }}
        >
          <div className="status-header" style={{ marginBottom: '12px', borderBottom: '1px solid #374151', paddingBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
              {statusDisplay.icon} AI Service Status
            </h3>
            {healthStatus.lastCheck && (
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                Last checked: {healthStatus.lastCheck.toLocaleTimeString()}
              </p>
            )}
          </div>

          {/* Health details */}
          {healthStatus.details && (
            <div className="health-details" style={{ marginBottom: '16px' }}>
              <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>Overall Status:</span>
                <span style={{ color: statusDisplay.color, fontWeight: '600' }}>
                  {healthStatus.details.overall}
                </span>
              </div>

              {healthStatus.details.components?.ollama && (
                <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                  <span>Ollama Connection:</span>
                  <span style={{
                    color: healthStatus.details.components.ollama.connected ? '#10b981' : '#ef4444',
                    fontWeight: '600'
                  }}>
                    {healthStatus.details.components.ollama.connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              )}

              {healthStatus.details.telemetry && (
                <div className="telemetry" style={{ marginTop: '8px', fontSize: '12px' }}>
                  <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                    <span>Total Requests:</span>
                    <span>{healthStatus.details.telemetry.totalRequests || 0}</span>
                  </div>
                  <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                    <span>Success Rate:</span>
                    <span>{healthStatus.details.telemetry.successRate?.toFixed(1) || 0}%</span>
                  </div>
                  <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                    <span>Avg Response:</span>
                    <span>{Math.round(healthStatus.details.telemetry.averageResponseTime || 0)}ms</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error information */}
          {healthStatus.error && (
            <div className="error-info" style={{ marginBottom: '16px', padding: '8px', backgroundColor: '#7f1d1d', borderRadius: '4px' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#fca5a5' }}>
                <strong>Error:</strong> {healthStatus.error}
              </p>
            </div>
          )}

          {/* Connection test section */}
          <div className="connection-test" style={{ borderTop: '1px solid #374151', paddingTop: '12px' }}>
            <button
              onClick={testConnection}
              disabled={connectionTest?.loading}
              style={{
                width: '100%',
                padding: '8px 16px',
                backgroundColor: connectionTest?.loading ? '#6b7280' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: connectionTest?.loading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'background-color 0.2s ease'
              }}
            >
              {connectionTest?.loading ? 'Testing...' : 'Test Ollama Connection'}
            </button>

            {/* Connection test results */}
            {connectionTest && !connectionTest.loading && (
              <div className="test-results" style={{ marginTop: '8px', fontSize: '12px' }}>
                {connectionTest.success ? (
                  <div style={{ color: '#10b981' }}>
                    <p style={{ margin: '2px 0' }}>✅ Connection successful!</p>
                    {connectionTest.connection?.models && (
                      <p style={{ margin: '2px 0', color: '#9ca3af' }}>
                        Models available: {connectionTest.connection.models.length}
                      </p>
                    )}
                  </div>
                ) : (
                  <div style={{ color: '#ef4444' }}>
                    <p style={{ margin: '2px 0' }}>❌ Connection failed</p>
                    <p style={{ margin: '2px 0', color: '#fca5a5' }}>
                      {connectionTest.error || 'Unknown error'}
                    </p>
                    {connectionTest.suggestion && (
                      <p style={{ margin: '4px 0', color: '#9ca3af', fontSize: '11px' }}>
                        💡 {connectionTest.suggestion}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ollama installation help */}
          {healthStatus.status === 'error' && (
            <div className="installation-help" style={{
              marginTop: '12px',
              padding: '8px',
              backgroundColor: '#1e40af20',
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#93c5fd' }}>
                🔧 Need Ollama?
              </p>
              <p style={{ margin: '2px 0', color: '#bfdbfe' }}>
                Download from: <code style={{ backgroundColor: '#1f2937', padding: '2px 4px', borderRadius: '2px' }}>ollama.ai</code>
              </p>
              <p style={{ margin: '2px 0', color: '#bfdbfe' }}>
                After install, run: <code style={{ backgroundColor: '#1f2937', padding: '2px 4px', borderRadius: '2px' }}>ollama pull llama3.2</code>
              </p>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={() => setShowDetails(false)}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '4px'
            }}
            title="Close details"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default AIStatusIndicator;