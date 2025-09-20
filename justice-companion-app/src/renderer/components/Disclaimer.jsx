import React from 'react';
import './Disclaimer.css';

// Disclaimer Component
// Important legal information for users

const Disclaimer = ({ onAccept }) => {
  return (
    <div className="disclaimer-overlay">
      <div className="disclaimer-container">
        <h1>⚖️ Justice Companion</h1>
        <h2>Important Legal Information</h2>
        
        <div className="disclaimer-content">
          <p className="disclaimer-intro">
            <strong>Welcome to Justice Companion.</strong> Before we begin,
            it's important that you understand the nature and limitations of this service.
          </p>

          <div className="disclaimer-section">
            <h3>Legal Information Disclaimer</h3>
            <p>
              Justice Companion is an informational tool designed to help you understand
              legal concepts and organize your documentation. This service does not provide
              legal advice or create an attorney-client relationship.
            </p>
            <p>
              All information, templates, and suggestions provided are for educational
              purposes only. For legal advice specific to your situation, please consult
              with a qualified attorney.
            </p>
          </div>

          <div className="disclaimer-section">
            <h3>How We Can Help</h3>
            <ul>
              <li>✓ Provide general information about legal rights and processes</li>
              <li>✓ Help organize and manage your documents</li>
              <li>✓ Offer templates and examples for common legal documents</li>
              <li>✓ Suggest relevant resources and information</li>
              <li>✓ Provide this service free of charge</li>
            </ul>
          </div>

          <div className="disclaimer-section">
            <h3>Your Responsibility</h3>
            <p>
              Legal matters can be complex and outcomes are never guaranteed.
              While we strive to provide accurate and helpful information, you are
              responsible for verifying all information and making your own decisions.
            </p>
            <p>
              <strong>By proceeding, you acknowledge that:</strong> You understand this
              service provides information only, not legal advice. You accept responsibility
              for how you use this information.
            </p>
          </div>

          <div className="disclaimer-dedication">
            <p className="dedication">
              Built for Fendi 🐕<br />
              Who deserved better from those sworn to "do no harm"<br />
              <br />
              For everyone told "no" when they needed help<br />
              For everyone priced out of justice<br />
              For everyone who refuses to be silenced<br />
              <br />
              This is our answer.
            </p>
          </div>
        </div>

        <div className="disclaimer-actions">
          <button onClick={onAccept} className="accept-button">
            I Understand and Accept
          </button>
          <p className="disclaimer-footer">
            Your privacy is protected. No cookies. No tracking.<br />
            Your information remains confidential.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;

// Legal disclaimer component
// Ensures users understand the service limitations
