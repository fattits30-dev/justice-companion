import React, { useState, useEffect } from 'react';
import './ConsentManager.css';

/**
 * Consent Manager Component
 * GDPR-compliant consent and privacy management interface
 * Provides users with full control over their data and consent
 */
const ConsentManager = () => {
  const [consentStatus, setConsentStatus] = useState(null);
  const [consentReport, setConsentReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load consent status on component mount
  useEffect(() => {
    loadConsentStatus();
  }, []);

  // Load current consent status
  const loadConsentStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      if (window.justiceAPI) {
        const result = await window.justiceAPI.getConsentStatus();

        if (result.success) {
          setConsentStatus(result.consentStatus);
          console.log('🔍 Consent status loaded:', result.consentStatus);
        } else {
          setError('Failed to load consent status: ' + result.error);
        }
      } else {
        setError('Justice API not available');
      }
    } catch (error) {
      console.error('Error loading consent status:', error);
      setError('Error loading consent status: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate consent report
  const generateConsentReport = async () => {
    try {
      setLoading(true);
      setError(null);

      if (window.justiceAPI) {
        const result = await window.justiceAPI.getConsentReport();

        if (result.success) {
          setConsentReport(result.report);
          console.log('📊 Consent report generated:', result.report);
        } else {
          setError('Failed to generate consent report: ' + result.error);
        }
      }
    } catch (error) {
      console.error('Error generating consent report:', error);
      setError('Error generating consent report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Withdraw consent
  const handleWithdrawConsent = async () => {
    const confirmWithdrawal = window.confirm(
      'Are you sure you want to withdraw your consent?\n\n' +
      'This will:\n' +
      '• Stop all data processing\n' +
      '• Require you to re-accept terms to continue\n' +
      '• Maintain legal records as required by law\n' +
      '• Respect your right to data control\n\n' +
      'This action complies with GDPR Article 7(3) - Right to withdraw consent.'
    );

    if (!confirmWithdrawal) return;

    try {
      setLoading(true);
      setError(null);

      if (window.justiceAPI && consentStatus?.disclaimerAcceptanceId) {
        const withdrawalData = {
          acceptanceId: consentStatus.disclaimerAcceptanceId,
          reason: 'user_request_privacy_manager',
          withdrawalTime: new Date().toISOString(),
          withdrawalMethod: 'consent_manager_interface'
        };

        const result = await window.justiceAPI.withdrawConsent(withdrawalData);

        if (result.success) {
          console.log('✅ Consent withdrawn via Privacy Manager');
          console.log(`   Withdrawal ID: ${result.withdrawalId}`);

          // Refresh consent status
          await loadConsentStatus();

          alert('Your consent has been successfully withdrawn. All data processing has ceased in compliance with GDPR.');

          // Trigger app restart or redirect to disclaimer
          window.location.reload();
        } else {
          setError('Failed to withdraw consent: ' + result.error);
        }
      } else {
        setError('No valid consent record found to withdraw');
      }
    } catch (error) {
      console.error('Error withdrawing consent:', error);
      setError('Error withdrawing consent: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Export consent data (GDPR Article 20 - Right to data portability)
  const handleExportConsentData = () => {
    if (!consentStatus) return;

    const exportData = {
      exportType: 'GDPR_CONSENT_DATA_EXPORT',
      exportedAt: new Date().toISOString(),
      legalBasis: 'GDPR Article 20 - Right to data portability',
      consentRecord: {
        acceptanceId: consentStatus.disclaimerAcceptanceId,
        acceptedAt: consentStatus.disclaimerAcceptedAt,
        disclaimerVersion: consentStatus.disclaimerVersion,
        consentWithdrawn: consentStatus.consentWithdrawn,
        consentWithdrawnAt: consentStatus.consentWithdrawnAt,
        sessionId: consentStatus.sessionId
      },
      privacyNotice: {
        version: consentStatus.disclaimerVersion,
        language: 'en',
        scope: 'local_legal_assistance_tool'
      },
      dataProcessingDetails: {
        purpose: 'Legal assistance and document organization',
        legalBasis: 'Consent (GDPR Art. 6(1)(a))',
        dataTypes: ['Case information', 'Legal documents', 'User interactions'],
        retentionPeriod: '7 years (legal requirement)',
        processingLocation: 'Local device only'
      }
    };

    // Create downloadable JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `consent-data-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('📥 Consent data exported for user');
  };

  if (loading) {
    return (
      <div className="consent-manager">
        <div className="loading-state">
          <h2>🔒 Privacy & Consent Management</h2>
          <p>Loading consent status...</p>
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="consent-manager">
      <header className="consent-manager-header">
        <h2>🔒 Privacy & Consent Management</h2>
        <p>Manage your data consent and privacy preferences in compliance with GDPR</p>
        <button onClick={loadConsentStatus} className="refresh-button" title="Refresh status">
          🔄 Refresh Status
        </button>
      </header>

      {error && (
        <div className="error-message">
          <h3>⚠️ Error</h3>
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {consentStatus && (
        <div className="consent-status-section">
          <h3>📊 Current Consent Status</h3>

          <div className="status-cards">
            <div className={`status-card ${consentStatus.hasValidConsent ? 'valid' : 'invalid'}`}>
              <h4>Consent Status</h4>
              <div className="status-value">
                {consentStatus.hasValidConsent ? '✅ Valid Consent' : '❌ No Valid Consent'}
              </div>
              <div className="status-details">
                {consentStatus.disclaimerAcceptedAt && (
                  <p>Accepted: {new Date(consentStatus.disclaimerAcceptedAt).toLocaleString()}</p>
                )}
                {consentStatus.disclaimerVersion && (
                  <p>Version: {consentStatus.disclaimerVersion}</p>
                )}
                {consentStatus.consentWithdrawn && (
                  <p>⚠️ Consent Withdrawn: {new Date(consentStatus.consentWithdrawnAt).toLocaleString()}</p>
                )}
              </div>
            </div>

            <div className="status-card">
              <h4>Data Processing</h4>
              <div className="status-value">
                {consentStatus.hasValidConsent && !consentStatus.consentWithdrawn ?
                  '✅ Active' : '🛑 Stopped'}
              </div>
              <div className="status-details">
                <p>Scope: Local device only</p>
                <p>Purpose: Legal assistance</p>
                <p>Legal Basis: Consent (GDPR Art. 6(1)(a))</p>
              </div>
            </div>

            <div className="status-card">
              <h4>Session Information</h4>
              <div className="status-value">
                {consentStatus.sessionId ? '🔐 Secure Session' : '❓ No Session'}
              </div>
              <div className="status-details">
                {consentStatus.sessionId && (
                  <p>Session ID: {consentStatus.sessionId.substring(0, 8)}...</p>
                )}
                <p>User ID: {consentStatus.userId || 'Anonymous'}</p>
                <p>Updated: {new Date(consentStatus.complianceTimestamp).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="actions-section">
        <h3>🛠️ Privacy Actions</h3>

        <div className="action-buttons">
          <button
            onClick={handleExportConsentData}
            className="export-button"
            disabled={!consentStatus}
            title="Export your consent data (GDPR Article 20)"
          >
            📥 Export My Consent Data
          </button>

          <button
            onClick={generateConsentReport}
            className="report-button"
            title="Generate detailed consent report"
          >
            📊 Generate Consent Report
          </button>

          <button
            onClick={handleWithdrawConsent}
            className="withdraw-button danger"
            disabled={!consentStatus?.hasValidConsent || consentStatus?.consentWithdrawn}
            title="Withdraw consent (GDPR Article 7(3))"
          >
            🚫 Withdraw Consent
          </button>
        </div>
      </div>

      {consentReport && (
        <div className="consent-report-section">
          <h3>📋 Consent Management Report</h3>

          <div className="report-summary">
            <h4>Report Summary</h4>
            <p><strong>Report ID:</strong> {consentReport.reportId}</p>
            <p><strong>Generated:</strong> {new Date(consentReport.generatedAt).toLocaleString()}</p>
            <p><strong>Type:</strong> {consentReport.reportType}</p>
          </div>

          <div className="gdpr-compliance">
            <h4>GDPR Compliance Status</h4>
            <div className="compliance-grid">
              <div className="compliance-item">
                <span className="compliance-label">Explicit Consent:</span>
                <span className="compliance-status">
                  {consentReport.gdprCompliance.consentLawfulness.explicitConsent ? '✅' : '❌'}
                </span>
              </div>
              <div className="compliance-item">
                <span className="compliance-label">Informed Consent:</span>
                <span className="compliance-status">
                  {consentReport.gdprCompliance.consentLawfulness.informedConsent ? '✅' : '❌'}
                </span>
              </div>
              <div className="compliance-item">
                <span className="compliance-label">Right to Withdraw:</span>
                <span className="compliance-status">
                  {consentReport.gdprCompliance.dataSubjectRights.rightToWithdraw ? '✅' : '❌'}
                </span>
              </div>
              <div className="compliance-item">
                <span className="compliance-label">Data Portability:</span>
                <span className="compliance-status">
                  {consentReport.gdprCompliance.dataSubjectRights.rightToPortability ? '✅' : '❌'}
                </span>
              </div>
              <div className="compliance-item">
                <span className="compliance-label">Audit Trail:</span>
                <span className="compliance-status">
                  {consentReport.gdprCompliance.auditTrail.allInteractionsLogged ? '✅' : '❌'}
                </span>
              </div>
            </div>
          </div>

          <div className="report-recommendations">
            <h4>Recommendations</h4>
            <ul>
              {consentReport.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="privacy-info">
        <h3>ℹ️ Privacy Information</h3>
        <div className="privacy-details">
          <p><strong>Data Controller:</strong> Justice Companion (Local Application)</p>
          <p><strong>Data Processing:</strong> All data is processed locally on your device</p>
          <p><strong>Data Sharing:</strong> No data is shared with third parties</p>
          <p><strong>Data Retention:</strong> 7 years for legal compliance, or until consent is withdrawn</p>
          <p><strong>Your Rights:</strong> Right to access, rectify, erase, port, and withdraw consent</p>
          <p><strong>Legal Basis:</strong> GDPR Article 6(1)(a) - Consent for data processing</p>
        </div>
      </div>

      <div className="compliance-footer">
        <p>This consent management system complies with:</p>
        <ul>
          <li>• GDPR (General Data Protection Regulation)</li>
          <li>• CCPA (California Consumer Privacy Act)</li>
          <li>• Legal professional confidentiality requirements</li>
          <li>• Attorney-client privilege protections</li>
        </ul>
      </div>
    </div>
  );
};

export default ConsentManager;