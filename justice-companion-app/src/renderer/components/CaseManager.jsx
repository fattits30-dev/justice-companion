import React, { useState } from 'react';
import './CaseManager.css';

// Case Management Component
// Organize and track legal matters
// Secure document and case management system

const CaseManager = ({ cases, currentCase, onSelectCase, onNewCase, onRefresh }) => {
  const [showNewCase, setShowNewCase] = useState(false);
  const [newCaseData, setNewCaseData] = useState({
    title: '',
    type: 'tenancy',
    description: '',
    opponent: '',
    urgency: 'medium'
  });

  const handleCreateCase = async () => {
    if (!newCaseData.title.trim()) return;
    
    const result = await onNewCase({
      ...newCaseData,
      status: 'active',
      createdAt: new Date().toISOString(),
      facts: [],
      documents: [],
      timeline: []
    });

    if (result.success) {
      setShowNewCase(false);
      setNewCaseData({
        title: '',
        type: 'tenancy',
        description: '',
        opponent: '',
        urgency: 'medium'
      });
    }
  };

  // Enhanced case status with accessibility
  const getCaseStatusIcon = (caseItem) => {
    const statusMap = {
      won: { icon: '🏆', label: 'Case won', color: '#28a745' },
      lost: { icon: '💔', label: 'Case closed - unfavorable outcome', color: '#dc3545' },
      settled: { icon: '🤝', label: 'Case settled', color: '#17a2b8' },
      active: {
        critical: { icon: '🚨', label: 'Critical - immediate action required', color: '#dc3545' },
        high: { icon: '⚠️', label: 'High priority', color: '#fd7e14' },
        medium: { icon: '📋', label: 'Medium priority', color: '#ffc107' },
        low: { icon: '📝', label: 'Low priority', color: '#6c757d' }
      }
    };

    if (caseItem.status === 'won' || caseItem.status === 'lost' || caseItem.status === 'settled') {
      return statusMap[caseItem.status];
    }

    return statusMap.active[caseItem.urgency] || statusMap.active.medium;
  };

  const getUrgencyClass = (urgency) => {
    const urgencyClasses = {
      critical: 'urgency-critical',
      high: 'urgency-high',
      medium: 'urgency-medium',
      low: 'urgency-low'
    };
    return urgencyClasses[urgency] || 'urgency-medium';
  };

  const formatCaseAge = (createdAt) => {
    const days = Math.floor((new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''}`;
    if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''}`;
    return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''}`;
  };

  const getCaseTypeLabel = (type) => {
    const types = {
      'tenancy': 'Housing Matter',
      'consumer': 'Consumer Issue',
      'employment': 'Employment Case',
      'benefits': 'Benefits Appeal',
      'police': 'Civil Rights',
      'other': 'General Legal Matter'
    };
    return types[type] || 'Legal Matter';
  };

  return (
    <div className="case-manager" role="region" aria-label="Legal case management">
      <div className="case-manager-header">
        <h2 id="case-manager-title">Your Legal Cases</h2>
        <div className="header-summary">
          <p className="case-count" aria-live="polite">
            <span className="count-number">{cases.length}</span>
            <span className="count-label">
              {cases.length === 1 ? 'active case' : 'active cases'}
            </span>
          </p>
          {cases.length > 0 && (
            <div className="urgency-summary">
              <span className="urgency-indicator critical" title="Critical cases">
                {cases.filter(c => c.urgency === 'critical').length}
              </span>
              <span className="urgency-indicator high" title="High priority cases">
                {cases.filter(c => c.urgency === 'high').length}
              </span>
              <span className="urgency-indicator medium" title="Medium priority cases">
                {cases.filter(c => c.urgency === 'medium').length}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowNewCase(!showNewCase)}
          className="new-case-button"
          aria-expanded={showNewCase}
          aria-controls="new-case-form"
        >
          <span className="button-icon" aria-hidden="true">+</span>
          <span className="button-text">New Case</span>
        </button>
      </div>

      {showNewCase && (
        <div id="new-case-form" className="new-case-form" role="form" aria-labelledby="new-case-title">
          <h3 id="new-case-title">Start a New Legal Case</h3>
          
          <div className="form-group">
            <label htmlFor="case-title" className="form-label">
              Case Title <span className="required" aria-label="required">*</span>
            </label>
            <input
              id="case-title"
              type="text"
              value={newCaseData.title}
              onChange={(e) => setNewCaseData({...newCaseData, title: e.target.value})}
              placeholder="e.g., 'Illegal Eviction - Smith Properties'"
              className="form-input"
              required
              aria-describedby="case-title-help"
            />
            <div id="case-title-help" className="form-help">
              Provide a clear, descriptive name for your legal matter
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="case-type" className="form-label">Case Type</label>
            <select
              id="case-type"
              value={newCaseData.type}
              onChange={(e) => setNewCaseData({...newCaseData, type: e.target.value})}
              className="form-select"
              aria-describedby="case-type-help"
            >
              <option value="tenancy">Housing/Tenancy</option>
              <option value="consumer">Consumer Rights</option>
              <option value="employment">Employment</option>
              <option value="benefits">Benefits/Welfare</option>
              <option value="police">Police/Authority</option>
              <option value="family">Family Law</option>
              <option value="immigration">Immigration</option>
              <option value="debt">Debt/Finance</option>
              <option value="other">Other Legal Matter</option>
            </select>
            <div id="case-type-help" className="form-help">
              Select the category that best describes your legal issue
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="case-opponent" className="form-label">Other Party</label>
            <input
              id="case-opponent"
              type="text"
              value={newCaseData.opponent}
              onChange={(e) => setNewCaseData({...newCaseData, opponent: e.target.value})}
              placeholder="e.g., 'Property Management Company', 'Former Employer'"
              className="form-input"
              aria-describedby="case-opponent-help"
            />
            <div id="case-opponent-help" className="form-help">
              Name of the organization or person involved in the dispute (optional)
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="case-urgency" className="form-label">Priority Level</label>
            <select
              id="case-urgency"
              value={newCaseData.urgency}
              onChange={(e) => setNewCaseData({...newCaseData, urgency: e.target.value})}
              className="form-select"
              aria-describedby="case-urgency-help"
            >
              <option value="low">Low - No immediate deadlines</option>
              <option value="medium">Medium - Standard timeline</option>
              <option value="high">High - Urgent deadlines approaching</option>
              <option value="critical">Critical - Immediate action required</option>
            </select>
            <div id="case-urgency-help" className="form-help">
              How quickly do you need to take action on this matter?
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="case-description" className="form-label">Case Description</label>
            <textarea
              id="case-description"
              value={newCaseData.description}
              onChange={(e) => setNewCaseData({...newCaseData, description: e.target.value})}
              placeholder="Briefly describe your legal situation, including key dates, people involved, and what outcome you're seeking..."
              className="form-textarea"
              rows="4"
              aria-describedby="case-description-help"
            />
            <div id="case-description-help" className="form-help">
              Provide context about your situation. You can add more details later.
            </div>
          </div>

          <div className="form-actions">
            <button
              onClick={handleCreateCase}
              className="create-button"
              disabled={!newCaseData.title.trim()}
              aria-describedby="create-button-help"
            >
              <span className="button-icon" aria-hidden="true">📁</span>
              <span className="button-text">Create Case</span>
            </button>
            <button
              onClick={() => setShowNewCase(false)}
              className="cancel-button"
              type="button"
            >
              Cancel
            </button>
            <div id="create-button-help" className="sr-only">
              Create a new legal case to start tracking your situation
            </div>
          </div>
        </div>
      )}

      <div className="cases-list">
        {cases.length === 0 ? (
          <div className="no-cases" role="status" aria-label="No active cases">
            <div className="no-cases-icon" aria-hidden="true">📋</div>
            <h3 className="no-cases-title">No Active Cases</h3>
            <p className="no-cases-subtitle">
              When you have a legal issue, create a case here to organize your information,
              track important dates, and get AI-powered guidance.
            </p>
            <div className="getting-started">
              <h4>Getting Started:</h4>
              <ul>
                <li>Click "New Case" to begin</li>
                <li>Describe your legal situation</li>
                <li>Get organized assistance and information</li>
                <li>Track your progress</li>
              </ul>
            </div>
          </div>
        ) : (
          cases.map(caseItem => (
            <div
              key={caseItem.id}
              className={`case-card ${currentCase?.id === caseItem.id ? 'active' : ''} ${getUrgencyClass(caseItem.urgency)}`}
              onClick={() => onSelectCase(caseItem)}
              role="button"
              tabIndex="0"
              aria-label={`Open case: ${caseItem.title}. ${getCaseStatusIcon(caseItem).label}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectCase(caseItem);
                }
              }}
            >
              <div className="case-card-header">
                <div className="case-status">
                  <span
                    className="case-icon"
                    aria-label={getCaseStatusIcon(caseItem).label}
                    style={{ color: getCaseStatusIcon(caseItem).color }}
                  >
                    {getCaseStatusIcon(caseItem).icon}
                  </span>
                  <div className="urgency-indicator-small" aria-hidden="true"></div>
                </div>
                <h3 className="case-title">{caseItem.title}</h3>
                {currentCase?.id === caseItem.id && (
                  <span className="active-badge" aria-label="Currently selected case">Active</span>
                )}
              </div>
              
              <div className="case-meta">
                <span className="case-type">{getCaseTypeLabel(caseItem.type)}</span>
                {caseItem.opponent && (
                  <span className="case-opponent">vs. {caseItem.opponent}</span>
                )}
              </div>

              <div className="case-stats">
                <div className="case-stat" title={`${caseItem.facts?.length || 0} facts collected`}>
                  <span className="stat-icon" aria-hidden="true">📊</span>
                  <span className="stat-value">{caseItem.facts?.length || 0}</span>
                  <span className="stat-label">Facts</span>
                </div>
                <div className="case-stat" title={`${caseItem.documents?.length || 0} documents uploaded`}>
                  <span className="stat-icon" aria-hidden="true">📄</span>
                  <span className="stat-value">{caseItem.documents?.length || 0}</span>
                  <span className="stat-label">Documents</span>
                </div>
                <div className="case-stat" title={`Case opened ${formatCaseAge(caseItem.createdAt)} ago`}>
                  <span className="stat-icon" aria-hidden="true">📅</span>
                  <span className="stat-value">{formatCaseAge(caseItem.createdAt)}</span>
                  <span className="stat-label">Age</span>
                </div>
              </div>

              {caseItem.description && (
                <p className="case-description">
                  {caseItem.description.substring(0, 100)}
                  {caseItem.description.length > 100 && '...'}
                </p>
              )}

              <div className="case-actions">
                <button
                  className="action-button primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCase(caseItem);
                  }}
                  aria-label={`Open ${caseItem.title} case`}
                >
                  <span className="button-icon" aria-hidden="true">📂</span>
                  <span className="button-text">Open Case</span>
                </button>
                {caseItem.urgency === 'critical' && (
                  <span className="urgent-badge" aria-label="Requires immediate attention">
                    Urgent
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="case-manager-footer">
        <button
          onClick={onRefresh}
          className="refresh-button"
          aria-label="Refresh case list"
        >
          <span className="button-icon" aria-hidden="true">🔄</span>
          <span className="button-text">Refresh Cases</span>
        </button>
        <div className="footer-message">
          <p className="encouragement">
            <strong>Remember:</strong> Taking action on your legal issues is the first step toward resolution.
          </p>
          <p className="support-info">
            <span className="info-icon" aria-hidden="true">💡</span>
            Need help? Each case provides AI-powered guidance and document templates.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CaseManager;

// Case management system for legal documentation
// Helping users organize and track their legal matters
// Secure, private, and accessible
