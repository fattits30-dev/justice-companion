import React from 'react';
import './LoadingStates.css';

// Loading skeleton for chat messages
export const MessageSkeleton = ({ isAI = false }) => (
  <div className={`message-skeleton ${isAI ? 'ai' : 'user'}`} aria-label="Loading message">
    <div className="skeleton-content">
      <div className="skeleton-line long"></div>
      <div className="skeleton-line medium"></div>
      <div className="skeleton-line short"></div>
    </div>
    <div className="skeleton-footer">
      <div className="skeleton-time"></div>
      <div className="skeleton-badge"></div>
    </div>
  </div>
);

// Loading skeleton for case cards
export const CaseCardSkeleton = () => (
  <div className="case-card-skeleton" aria-label="Loading case information">
    <div className="skeleton-header">
      <div className="skeleton-icon"></div>
      <div className="skeleton-title"></div>
    </div>
    <div className="skeleton-meta">
      <div className="skeleton-type"></div>
      <div className="skeleton-opponent"></div>
    </div>
    <div className="skeleton-stats">
      <div className="skeleton-stat">
        <div className="skeleton-stat-value"></div>
        <div className="skeleton-stat-label"></div>
      </div>
      <div className="skeleton-stat">
        <div className="skeleton-stat-value"></div>
        <div className="skeleton-stat-label"></div>
      </div>
      <div className="skeleton-stat">
        <div className="skeleton-stat-value"></div>
        <div className="skeleton-stat-label"></div>
      </div>
    </div>
    <div className="skeleton-description">
      <div className="skeleton-line long"></div>
      <div className="skeleton-line medium"></div>
    </div>
    <div className="skeleton-actions">
      <div className="skeleton-button"></div>
    </div>
  </div>
);

// Legal document processing loader
export const DocumentLoader = ({ fileName, progress = 0 }) => (
  <div className="document-loader" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100">
    <div className="loader-header">
      <span className="loader-icon" aria-hidden="true">📄</span>
      <div className="loader-info">
        <h4 className="loader-title">Processing Legal Document</h4>
        <p className="loader-filename">{fileName}</p>
      </div>
    </div>
    <div className="progress-container">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progress}%` }}
          aria-label={`${progress}% complete`}
        ></div>
      </div>
      <span className="progress-text">{progress}%</span>
    </div>
    <div className="loader-steps">
      <div className={`step ${progress >= 25 ? 'complete' : 'active'}`}>
        <span className="step-icon">🔍</span>
        <span className="step-text">Scanning document</span>
      </div>
      <div className={`step ${progress >= 50 ? 'complete' : progress >= 25 ? 'active' : ''}`}>
        <span className="step-icon">📝</span>
        <span className="step-text">Extracting text</span>
      </div>
      <div className={`step ${progress >= 75 ? 'complete' : progress >= 50 ? 'active' : ''}`}>
        <span className="step-icon">⚖️</span>
        <span className="step-text">Analyzing legal content</span>
      </div>
      <div className={`step ${progress >= 100 ? 'complete' : progress >= 75 ? 'active' : ''}`}>
        <span className="step-icon">✅</span>
        <span className="step-text">Complete</span>
      </div>
    </div>
  </div>
);

// AI thinking indicator with legal context
export const AIThinkingIndicator = ({ stage = 'analyzing' }) => {
  const stages = {
    analyzing: {
      icon: '🔍',
      text: 'Analyzing your legal situation...',
      description: 'Understanding the context and key details'
    },
    researching: {
      icon: '📚',
      text: 'Researching relevant law...',
      description: 'Finding applicable legal principles and precedents'
    },
    drafting: {
      icon: '✍️',
      text: 'Preparing guidance...',
      description: 'Crafting clear, actionable information'
    },
    reviewing: {
      icon: '🔍',
      text: 'Reviewing for accuracy...',
      description: 'Ensuring information quality and completeness'
    }
  };

  const currentStage = stages[stage] || stages.analyzing;

  return (
    <div className="ai-thinking-indicator" role="status" aria-label={currentStage.text}>
      <div className="thinking-header">
        <span className="thinking-icon pulse" aria-hidden="true">
          {currentStage.icon}
        </span>
        <div className="thinking-content">
          <h4 className="thinking-title">{currentStage.text}</h4>
          <p className="thinking-description">{currentStage.description}</p>
        </div>
      </div>
      <div className="thinking-animation">
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>
    </div>
  );
};

// Form submission loader
export const FormSubmissionLoader = ({ action = 'Saving case information' }) => (
  <div className="form-submission-loader" role="status" aria-label={action}>
    <div className="submission-content">
      <div className="submission-spinner" aria-hidden="true"></div>
      <h4 className="submission-title">{action}...</h4>
      <p className="submission-subtitle">Please wait while we process your information</p>
    </div>
  </div>
);

// Error state with retry option
export const ErrorState = ({
  title = "Something went wrong",
  message = "We encountered an issue processing your request.",
  onRetry,
  showSupport = true
}) => (
  <div className="error-state" role="alert">
    <div className="error-content">
      <span className="error-icon" aria-hidden="true">⚠️</span>
      <h3 className="error-title">{title}</h3>
      <p className="error-message">{message}</p>

      <div className="error-actions">
        {onRetry && (
          <button
            onClick={onRetry}
            className="retry-button"
            aria-label="Try again"
          >
            <span className="button-icon" aria-hidden="true">🔄</span>
            <span className="button-text">Try Again</span>
          </button>
        )}

        {showSupport && (
          <div className="support-info">
            <p className="support-text">
              <strong>Need immediate help?</strong>
            </p>
            <div className="support-contacts">
              <p>• Citizens Advice: 0808 223 1133</p>
              <p>• Emergency: 999</p>
              <p>• National Domestic Violence: 0808 2000 247</p>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

// Legal disclaimer popup for first-time users
export const LegalDisclaimerModal = ({ isOpen, onAccept, onDecline }) => {
  if (!isOpen) return null;

  return (
    <div className="disclaimer-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="disclaimer-title">
      <div className="disclaimer-modal">
        <div className="modal-header">
          <h2 id="disclaimer-title">Important Legal Information</h2>
        </div>

        <div className="modal-content">
          <div className="disclaimer-icon" aria-hidden="true">⚖️</div>

          <div className="disclaimer-points">
            <h3>Before we begin:</h3>
            <ul>
              <li>This service provides legal information, not legal advice</li>
              <li>AI responses should not replace professional legal counsel</li>
              <li>Information is for general guidance in England and Wales</li>
              <li>Laws change frequently - always verify current law</li>
              <li>Seek qualified legal advice for specific situations</li>
            </ul>
          </div>

          <div className="emergency-info">
            <h4>🚨 In immediate danger?</h4>
            <p>Call 999 immediately. This service is not for emergencies.</p>
          </div>
        </div>

        <div className="modal-actions">
          <button
            onClick={onAccept}
            className="accept-button"
            aria-describedby="accept-description"
          >
            I Understand - Continue
          </button>
          <button
            onClick={onDecline}
            className="decline-button"
          >
            Cancel
          </button>
          <div id="accept-description" className="sr-only">
            Proceed with understanding that this provides information, not legal advice
          </div>
        </div>
      </div>
    </div>
  );
};

// Screen reader only utility
export const ScreenReaderOnly = ({ children }) => (
  <span className="sr-only">{children}</span>
);

export default {
  MessageSkeleton,
  CaseCardSkeleton,
  DocumentLoader,
  AIThinkingIndicator,
  FormSubmissionLoader,
  ErrorState,
  LegalDisclaimerModal,
  ScreenReaderOnly
};