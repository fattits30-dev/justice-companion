import React, { useState } from 'react';
import './LegalAssistanceResponse.css';

// Legal Assistance Response Component
// Displays structured legal guidance with compliance disclaimers

const LegalAssistanceResponse = ({ response, onQuestionSubmit, onDocumentRequest }) => {
  const [expandedSections, setExpandedSections] = useState({
    guidance: true,
    questions: false,
    documents: false,
    timeline: false,
    resources: false
  });

  const [hasError, setHasError] = useState(false);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Normalize response to handle various data structures
  const normalizeResponse = (response) => {
    // Handle null/undefined response
    if (!response) {
      return {
        category: 'General Legal Information',
        subcategory: null,
        immediateGuidance: 'Please provide more details about your legal issue for specific guidance.',
        questions: [],
        documents: [],
        timeline: [],
        resources: []
      };
    }

    // If response is a string, treat it as immediate guidance
    if (typeof response === 'string') {
      return {
        category: 'Legal Information',
        subcategory: null,
        immediateGuidance: response,
        questions: [],
        documents: [],
        timeline: [],
        resources: []
      };
    }

    // If response is not an object, convert to string and treat as guidance
    if (typeof response !== 'object') {
      return {
        category: 'Legal Information',
        subcategory: null,
        immediateGuidance: String(response),
        questions: [],
        documents: [],
        timeline: [],
        resources: []
      };
    }

    // If response has a content property, extract it
    if (response.content) {
      const content = typeof response.content === 'string' ? response.content :
                     response.content.text || response.content.message || 'Processing response...';
      return {
        category: response.category || 'Legal Information',
        subcategory: response.subcategory || null,
        immediateGuidance: content,
        questions: response.questions || [],
        documents: response.documents || [],
        timeline: response.timeline || [],
        resources: response.resources || []
      };
    }

    // Helper function to safely convert to array
    const safeArray = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') return [value];
      if (typeof value === 'object' && value.length !== undefined) {
        return Array.from(value);
      }
      return [];
    };

    // Return normalized response with defaults
    return {
      category: response.category || response.type || 'Legal Information',
      subcategory: response.subcategory || response.subtype || null,
      immediateGuidance: response.immediateGuidance || response.guidance ||
                        response.text || response.message || response.answer ||
                        response.reply || 'Processing your request...',
      questions: safeArray(response.questions || response.followUp || response.clarifications),
      documents: safeArray(response.documents || response.templates || response.forms),
      timeline: safeArray(response.timeline || response.deadlines || response.schedule),
      resources: safeArray(response.resources || response.links || response.references)
    };
  };

  const formatText = (text) => {
    // Handle various input types
    if (!text) return <p className="response-text">No content available</p>;

    // If it's an object with content property
    if (typeof text === 'object' && text.content) {
      text = text.content;
    }

    // If it's still not a string, handle gracefully
    if (typeof text !== 'string') {
      console.warn('formatText received non-string value:', text);
      // Try to convert to string
      try {
        text = typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text);
      } catch (e) {
        return <p className="response-text">Processing response...</p>;
      }
    }

    // Convert markdown-style formatting to JSX
    return text.split('\n').map((line, index) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <h3 key={index} className="response-subheading">{line.slice(2, -2)}</h3>;
      }
      if (line.startsWith('• ')) {
        return <li key={index} className="response-bullet">{line.slice(2)}</li>;
      }
      if (line.trim() === '') {
        return <br key={index} />;
      }
      return <p key={index} className="response-text">{line}</p>;
    });
  };

  // Normalize the response data with error handling
  let normalizedResponse;
  try {
    normalizedResponse = normalizeResponse(response);
  } catch (error) {
    console.error('Error normalizing response:', error);
    setHasError(true);
    normalizedResponse = {
      category: 'Error Processing Response',
      subcategory: null,
      immediateGuidance: 'There was an issue processing your response. Please try again.',
      questions: [],
      documents: [],
      timeline: [],
      resources: []
    };
  }

  // If there's an error state, show simplified error view
  if (hasError) {
    return (
      <div className="legal-assistance-response">
        <div className="legal-disclaimer">
          <div className="disclaimer-icon">⚖️</div>
          <div className="disclaimer-text">
            <strong>LEGAL INFORMATION NOTICE:</strong> This is general legal information, not legal advice.
            Consult a qualified solicitor for specific legal guidance about your situation.
          </div>
        </div>
        <div className="issue-category">
          <h2 className="category-title">Response Error</h2>
        </div>
        <div className="response-section">
          <div className="section-content guidance-content">
            <p className="response-text">
              We encountered an issue processing your response. Please try asking your question again or contact support if the problem persists.
            </p>
          </div>
        </div>
        <div className="next-steps">
          <h3>What would you like to do next?</h3>
          <div className="action-buttons">
            <button className="action-button primary" onClick={() => setHasError(false)}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="legal-assistance-response">
      {/* Legal Disclaimer - Always Prominent */}
      <div className="legal-disclaimer">
        <div className="disclaimer-icon">⚖️</div>
        <div className="disclaimer-text">
          <strong>LEGAL INFORMATION NOTICE:</strong> This is general legal information, not legal advice. 
          Consult a qualified solicitor for specific legal guidance about your situation.
        </div>
      </div>

      {/* Issue Category */}
      <div className="issue-category">
        <h2 className="category-title">{normalizedResponse.category}</h2>
        {normalizedResponse.subcategory && (
          <span className="subcategory-badge">{normalizedResponse.subcategory.replace('_', ' ')}</span>
        )}
      </div>

      {/* Immediate Guidance */}
      {normalizedResponse.immediateGuidance && (
        <div className="response-section">
          <div
            className="section-header"
            onClick={() => toggleSection('guidance')}
          >
            <h3>🎯 Immediate Guidance</h3>
            <span className={`expand-icon ${expandedSections.guidance ? 'expanded' : ''}`}>▼</span>
          </div>
          {expandedSections.guidance && (
            <div className="section-content guidance-content">
              {formatText(normalizedResponse.immediateGuidance)}
            </div>
          )}
        </div>
      )}

      {/* Questions for More Information */}
      {normalizedResponse.questions && normalizedResponse.questions.length > 0 && (
        <div className="response-section">
          <div
            className="section-header"
            onClick={() => toggleSection('questions')}
          >
            <h3>❓ Information Needed</h3>
            <span className={`expand-icon ${expandedSections.questions ? 'expanded' : ''}`}>▼</span>
          </div>
          {expandedSections.questions && (
            <div className="section-content">
              <p className="section-intro">To provide more specific information, please answer:</p>
              <ul className="questions-list">
                {normalizedResponse.questions.map((question, index) => (
                  <li key={index} className="question-item">
                    <span className="question-number">{index + 1}.</span>
                    <span className="question-text">
                      {typeof question === 'string' ? question :
                       question.text || question.question || String(question)}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                className="action-button primary"
                onClick={() => onQuestionSubmit && onQuestionSubmit(normalizedResponse.questions)}
              >
                Answer These Questions
              </button>
            </div>
          )}
        </div>
      )}

      {/* Document Templates */}
      {normalizedResponse.documents && normalizedResponse.documents.length > 0 && (
        <div className="response-section">
          <div
            className="section-header"
            onClick={() => toggleSection('documents')}
          >
            <h3>📄 Available Documents</h3>
            <span className={`expand-icon ${expandedSections.documents ? 'expanded' : ''}`}>▼</span>
          </div>
          {expandedSections.documents && (
            <div className="section-content">
              <p className="section-intro">Document templates you can generate:</p>
              <div className="documents-grid">
                {normalizedResponse.documents.map((document, index) => (
                  <div key={index} className="document-card">
                    <div className="document-icon">📑</div>
                    <div className="document-name">
                      {typeof document === 'string' ? document :
                       document.name || document.title || String(document)}
                    </div>
                    <button
                      className="document-button"
                      onClick={() => onDocumentRequest && onDocumentRequest(document)}
                    >
                      Generate
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      {normalizedResponse.timeline && normalizedResponse.timeline.length > 0 && (
        <div className="response-section">
          <div
            className="section-header"
            onClick={() => toggleSection('timeline')}
          >
            <h3>⏰ Important Deadlines</h3>
            <span className={`expand-icon ${expandedSections.timeline ? 'expanded' : ''}`}>▼</span>
          </div>
          {expandedSections.timeline && (
            <div className="section-content">
              <div className="timeline-container">
                {normalizedResponse.timeline.map((item, index) => (
                  <div key={index} className="timeline-item">
                    <div className="timeline-deadline">{item.deadline || 'TBD'}</div>
                    <div className="timeline-task">{item.task || item}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resources */}
      {normalizedResponse.resources && normalizedResponse.resources.length > 0 && (
        <div className="response-section">
          <div
            className="section-header"
            onClick={() => toggleSection('resources')}
          >
            <h3>🔗 Helpful Resources</h3>
            <span className={`expand-icon ${expandedSections.resources ? 'expanded' : ''}`}>▼</span>
          </div>
          {expandedSections.resources && (
            <div className="section-content">
              <div className="resources-grid">
                {normalizedResponse.resources.map((resource, index) => (
                  <div key={index} className="resource-card">
                    <div className="resource-name">{typeof resource === 'string' ? resource : resource.name || 'Resource'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Next Steps */}
      <div className="next-steps">
        <h3>What would you like to do next?</h3>
        <div className="action-buttons">
          <button className="action-button secondary">Ask Another Question</button>
          <button className="action-button secondary">Get Local Legal Aid</button>
          <button className="action-button primary">Continue This Case</button>
        </div>
      </div>
    </div>
  );
};

export default LegalAssistanceResponse;