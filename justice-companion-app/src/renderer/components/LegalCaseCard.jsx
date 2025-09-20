import React from 'react';
import './LegalCaseCard.css';

// Enhanced case card component - adapted from active-cases repo
// Perfect for Justice Companion's legal case management
// Built from pain, powered by truth

const LegalCaseCard = ({
  caseData,
  onStatusChange,
  onSelectCase
}) => {
  const {
    id,
    title,
    type,
    client, // Changed from 'patron' to 'client' for legal context
    opponent, // Changed from 'casino' to 'opponent'
    status,
    daysLeft,
    urgency,
    description
  } = caseData;

  const handleCaseClick = () => {
    onSelectCase(id, status, client, opponent);
  };

  const getUrgencyClass = (urgency) => {
    switch(urgency) {
      case 'high': return 'urgency-high';
      case 'medium': return 'urgency-medium';
      case 'low': return 'urgency-low';
      default: return 'urgency-medium';
    }
  };

  const getStatusClass = (status) => {
    const statusMap = {
      'waiting_on_client': 'status-waiting',
      'active': 'status-active',
      'under_review': 'status-review',
      'corrections_needed': 'status-corrections',
      'court_process': 'status-court',
      'awaiting_decision': 'status-decision',
      'closed': 'status-closed'
    };
    return statusMap[status] || 'status-default';
  };

  return (
    <div
      className={`legal-case-card ${getUrgencyClass(urgency)} ${getStatusClass(status)}`}
      onClick={handleCaseClick}
    >
      {/* Desktop Layout */}
      <div className="case-row desktop-view">
        <div className="case-field case-type">
          <span className="field-value">{type}</span>
        </div>
        <div className="case-field case-client">
          <span className="field-value">{client}</span>
        </div>
        <div className="case-field case-opponent">
          <span className="field-value">{opponent || 'N/A'}</span>
        </div>
        <div className="case-field case-status">
          <span className={`status-badge ${getStatusClass(status)}`}>
            {status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        <div className="case-field case-deadline">
          <span className="deadline-text">
            {daysLeft === "TBD" ? "TBD" : `${daysLeft + 1} days left`}
          </span>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="case-details mobile-view">
        <div className="case-title">
          <h4>{title}</h4>
        </div>

        <div className="mobile-field">
          <strong>Type:</strong> {type}
        </div>
        <div className="mobile-field">
          <strong>Client:</strong> {client}
        </div>
        {opponent && (
          <div className="mobile-field">
            <strong>Opponent:</strong> {opponent}
          </div>
        )}
        <div className="mobile-field">
          <strong>Status:</strong>
          <span className={`status-badge ${getStatusClass(status)}`}>
            {status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        <div className="mobile-field deadline-mobile">
          <strong>Deadline:</strong>
          {daysLeft === "TBD" ? "TBD" : `${daysLeft + 1} days remaining`}
        </div>

        {description && (
          <div className="case-description">
            <p>{description}</p>
          </div>
        )}
      </div>

      {/* Justice Companion Enhancement - Urgency Indicator */}
      <div className={`urgency-indicator ${getUrgencyClass(urgency)}`}>
        <span className="urgency-text">{urgency.toUpperCase()}</span>
      </div>
    </div>
  );
};

export default LegalCaseCard;