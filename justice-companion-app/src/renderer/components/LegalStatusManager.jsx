import React, { useState } from 'react';
import './LegalStatusManager.css';

// Enhanced status management component
// Specialized for legal case workflows
// Helping users track case progress

const LegalStatusManager = ({
  currentStatus,
  caseType,
  onStatusUpdate,
  onCancel
}) => {
  // Legal case progression stages - adapted for Justice Companion
  const legalCaseProgress = {
    'tenancy': [
      'initial_consultation',
      'gathering_evidence',
      'letter_before_action',
      'awaiting_response',
      'mediation',
      'court_preparation',
      'court_hearing',
      'awaiting_judgment',
      'case_closed'
    ],
    'benefits': [
      'initial_assessment',
      'application_review',
      'evidence_gathering',
      'mandatory_reconsideration',
      'appeal_preparation',
      'tribunal_hearing',
      'awaiting_decision',
      'case_resolved'
    ],
    'employment': [
      'consultation',
      'grievance_procedure',
      'acas_conciliation',
      'tribunal_claim',
      'case_management',
      'hearing_preparation',
      'tribunal_hearing',
      'judgment_received'
    ],
    'immigration': [
      'initial_consultation',
      'document_preparation',
      'application_submitted',
      'biometrics_appointment',
      'awaiting_decision',
      'appeal_process',
      'case_resolution'
    ],
    'debt': [
      'debt_analysis',
      'creditor_contact',
      'payment_plan',
      'negotiation',
      'legal_action_defense',
      'court_hearing',
      'settlement'
    ],
    'general': [
      'consultation',
      'case_analysis',
      'action_planning',
      'implementation',
      'monitoring',
      'resolution'
    ]
  };

  const [newStatus, setNewStatus] = useState(currentStatus);

  const getProgressSteps = () => {
    return legalCaseProgress[caseType] || legalCaseProgress['general'];
  };

  const handleStatusChange = (event) => {
    setNewStatus(event.target.value);
  };

  const handleSubmit = () => {
    if (newStatus && newStatus !== currentStatus) {
      onStatusUpdate(newStatus);
    }
  };

  const renderStatusOptions = () => {
    const progressSteps = getProgressSteps();

    return progressSteps.map((step, index) => (
      <option key={index} value={step}>
        {step.replace(/_/g, ' ').toUpperCase()}
      </option>
    ));
  };

  const getStatusDescription = (status) => {
    const descriptions = {
      'initial_consultation': 'First meeting with client to assess case',
      'gathering_evidence': 'Collecting documents and evidence',
      'letter_before_action': 'Formal warning letter sent',
      'awaiting_response': 'Waiting for opposing party response',
      'mediation': 'Attempting resolution through mediation',
      'court_preparation': 'Preparing legal documents for court',
      'court_hearing': 'Case being heard in court',
      'awaiting_judgment': 'Waiting for court decision',
      'case_closed': 'Case completed and closed',
      'initial_assessment': 'Reviewing client eligibility and case merit',
      'application_review': 'Examining submitted applications',
      'mandatory_reconsideration': 'Requesting decision review',
      'appeal_preparation': 'Preparing appeal documentation',
      'tribunal_hearing': 'Presenting case at tribunal',
      'case_resolved': 'Final resolution achieved',
      'consultation': 'Initial client meeting and case evaluation',
      'grievance_procedure': 'Following internal company procedures',
      'acas_conciliation': 'Early conciliation through ACAS',
      'tribunal_claim': 'Formal employment tribunal claim submitted',
      'case_management': 'Managing ongoing case requirements',
      'hearing_preparation': 'Preparing for tribunal hearing',
      'judgment_received': 'Tribunal decision received',
      'document_preparation': 'Preparing immigration documents',
      'application_submitted': 'Application sent to Home Office',
      'biometrics_appointment': 'Biometric data collection scheduled',
      'appeal_process': 'Immigration appeal in progress',
      'debt_analysis': 'Analyzing debt situation and options',
      'creditor_contact': 'Communicating with creditors',
      'payment_plan': 'Negotiating payment arrangements',
      'negotiation': 'Ongoing debt negotiations',
      'legal_action_defense': 'Defending against creditor action',
      'settlement': 'Final debt settlement reached'
    };

    return descriptions[status] || 'Status update in progress';
  };

  return (
    <div className="legal-status-manager">
      <div className="status-header">
        <h3>Update Case Status</h3>
        <p className="case-type-label">Case Type: <strong>{caseType?.toUpperCase()}</strong></p>
      </div>

      <div className="current-status">
        <label>Current Status:</label>
        <div className="status-display">
          {currentStatus?.replace(/_/g, ' ').toUpperCase() || 'Not Set'}
        </div>
      </div>

      <div className="new-status-selection">
        <label htmlFor="status-select">New Status:</label>
        <select
          id="status-select"
          value={newStatus}
          onChange={handleStatusChange}
          className="status-dropdown"
        >
          <option value="" disabled>Select new status...</option>
          {renderStatusOptions()}
        </select>
      </div>

      {newStatus && (
        <div className="status-description">
          <p><strong>Description:</strong> {getStatusDescription(newStatus)}</p>
        </div>
      )}

      <div className="action-buttons">
        <button
          className="btn btn-success update-btn"
          onClick={handleSubmit}
          disabled={!newStatus || newStatus === currentStatus}
        >
          Update Status
        </button>
        <button
          className="btn btn-secondary cancel-btn"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>

      {/* Progress Indicator */}
      <div className="progress-indicator">
        <h4>Case Progress Flow ({caseType}):</h4>
        <div className="progress-steps">
          {getProgressSteps().map((step, index) => (
            <div
              key={index}
              className={`progress-step ${
                step === currentStatus ? 'current' :
                step === newStatus ? 'selected' : ''
              }`}
            >
              <span className="step-number">{index + 1}</span>
              <span className="step-name">{step.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LegalStatusManager;