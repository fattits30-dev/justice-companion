import React from 'react';
import './Disclaimer.css';

const Disclaimer = ({ onAccept }) => {
  return (
    <div className="disclaimer-overlay">
      <div className="disclaimer-container">
        <div className="disclaimer-welcome">
          <h1>Welcome to Justice Companion</h1>
          <p className="subtitle">Here to help you understand your legal situation</p>
        </div>

        <div className="disclaimer-guidance">
          <h3>📋 How We Can Help</h3>
          <p>
            Justice Companion helps you:
          </p>
          <ul>
            <li>Understand which laws apply to your situation</li>
            <li>Identify your legal rights and options</li>
            <li>Prepare for professional legal consultations</li>
            <li>Organize your case information effectively</li>
          </ul>
        </div>

        <div className="disclaimer-recommendation">
          <h3>💡 Our Recommendations</h3>
          <ol>
            <li>
              <strong>First priority:</strong> Seek professional legal counsel for your specific situation
            </li>
            <li>
              <strong>Use this app to:</strong> Better understand your position and prepare for legal consultations
            </li>
          </ol>
        </div>

        <div className="disclaimer-important">
          <h3>Important to Understand</h3>
          <p>
            Justice Companion provides legal information, not legal advice.
            While we help you navigate the legal landscape, only a qualified solicitor
            can provide advice specific to your case.
          </p>
          <p>
            <strong>Self-Representation:</strong> You have the right to represent yourself in legal matters.
            However, any information from this app is used at your own risk. Complex cases
            often benefit from professional legal representation.
          </p>
          <p className="disclaimer-terms">
            No attorney-client relationship is created. This app cannot be held liable for any outcomes.
            Users assume full responsibility for how they use this information.
          </p>
          <div className="disclaimer-requirements-notice">
            <p><strong>⚠️ Age Requirement:</strong> You must be 18 years or older to use this service.</p>
            <p><strong>⚠️ Jurisdiction:</strong> This service provides UK legal information only.</p>
          </div>
        </div>

        <div className="disclaimer-privacy">
          <span className="privacy-icon">🔒</span>
          <span>Your information is safe - everything runs privately on your device</span>
        </div>

        <div className="disclaimer-actions">
          <button onClick={onAccept} className="accept-button">
            I Understand - Let's Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;