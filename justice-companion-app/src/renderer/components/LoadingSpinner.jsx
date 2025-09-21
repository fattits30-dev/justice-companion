import React from 'react';
import './LoadingSpinner.css';

// Professional Loading Spinner for Legal Tech
// Provides user feedback during async operations

const LoadingSpinner = ({
  size = 'medium',
  message = 'Loading...',
  legal = false,
  inline = false
}) => {
  const getLegalMessage = () => {
    const messages = [
      'Analyzing your legal situation...',
      'Consulting legal databases...',
      'Preparing your guidance...',
      'Securing your information...',
      'Processing legal documents...'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const displayMessage = legal ? getLegalMessage() : message;

  return (
    <div className={`loading-spinner-container ${inline ? 'inline' : 'centered'} ${size}`}>
      <div className={`spinner ${size}`}>
        <div className="spinner-ring">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
      <div className="loading-message">
        <p className="message-text">{displayMessage}</p>
        {legal && (
          <p className="legal-notice">
            <span className="security-icon">🔒</span>
            Your information is being processed securely
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;