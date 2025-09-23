// Legal Document Generator - Transform pain into power
// Built from rage, refined by justice  
// Author: The People

import React, { useState, useEffect } from 'react';

// Legal document templates that actually work
const DOCUMENT_TEMPLATES = {
  'mandatory-reconsideration': {
    title: 'Mandatory Reconsideration Request',
    description: 'Fight back against benefits decisions',
    structure: `Dear Sir/Madam,

Re: Request for Mandatory Reconsideration
National Insurance Number: {ni_number}
Date of Decision: {decision_date}

I am writing to request a mandatory reconsideration of your decision dated {decision_date} regarding my {benefit_type} claim.

GROUNDS FOR RECONSIDERATION:
{grounds_section}

MEDICAL EVIDENCE:
{medical_section}

IMPACT ON DAILY LIFE:
{impact_section}

I believe the original decision failed to properly consider:
{failures_section}

REQUESTED OUTCOME:
{outcome_section}

I request that you reconsider this decision urgently as the current situation is causing {hardship_description}.

I am attaching the following evidence:
{evidence_list}

Please acknowledge receipt of this request within 5 working days as required by law.

Yours faithfully,
{name}
{date}`,
    fields: [
      { name: 'ni_number', label: 'NI Number', type: 'text' },
      { name: 'decision_date', label: 'Decision Date', type: 'date' },
      { name: 'benefit_type', label: 'Benefit Type (PIP/ESA/UC)', type: 'text' },
      { name: 'grounds_section', label: 'Grounds for Reconsideration', type: 'textarea' },
      { name: 'medical_section', label: 'Medical Evidence', type: 'textarea' },
      { name: 'impact_section', label: 'Impact on Daily Life', type: 'textarea' },
      { name: 'failures_section', label: 'What They Failed to Consider', type: 'textarea' },
      { name: 'outcome_section', label: 'What You Want', type: 'textarea' },
      { name: 'hardship_description', label: 'Hardship Caused', type: 'text' },
      { name: 'evidence_list', label: 'Evidence You Have', type: 'textarea' },
      { name: 'name', label: 'Your Name', type: 'text' }
    ]
  },
  
  'landlord-repair': {
    title: 'Notice to Landlord - Repair Request',
    description: 'Force your landlord to act',
    structure: `{landlord_name}
{landlord_address}

{date}

Dear {landlord_name},

Re: URGENT REPAIR REQUEST - {property_address}
FORMAL NOTICE UNDER SECTION 11 OF THE LANDLORD AND TENANT ACT 1985

I am writing to formally notify you of serious disrepair at the above property which requires immediate attention.

DEFECTS REQUIRING REPAIR:
{defects_list}

IMPACT ON HABITABILITY:
These defects are causing:
{impact_description}

TIMELINE OF PREVIOUS REQUESTS:
{previous_requests}

LEGAL OBLIGATIONS:
Under Section 11 of the Landlord and Tenant Act 1985, you are legally obligated to:
- Keep the structure and exterior in repair
- Keep installations for water, gas, electricity, and sanitation in repair
- Keep installations for space heating and water heating in repair

REQUIRED ACTION:
I require you to:
1. Inspect the property within 7 days
2. Provide a written schedule of repairs within 14 days
3. Complete all necessary repairs within 28 days

If repairs are not commenced within this timeframe, I will:
- Report the property to the local authority's Environmental Health Department
- Seek a rent reduction through the First-tier Tribunal
- Instruct solicitors to pursue a claim for damages and compensation

I am documenting all defects with photographs and keeping records of all associated costs.

I await your urgent response.

Yours sincerely,
{tenant_name}
Tenant

CC: {council_housing_dept}`,
    fields: [
      { name: 'landlord_name', label: 'Landlord Name', type: 'text' },
      { name: 'landlord_address', label: 'Landlord Address', type: 'textarea' },
      { name: 'property_address', label: 'Property Address', type: 'text' },
      { name: 'defects_list', label: 'List All Defects', type: 'textarea' },
      { name: 'impact_description', label: 'How It Affects You', type: 'textarea' },
      { name: 'previous_requests', label: 'Previous Requests Made', type: 'textarea' },
      { name: 'tenant_name', label: 'Your Name', type: 'text' },
      { name: 'council_housing_dept', label: 'Council Housing Dept (optional)', type: 'text' }
    ]
  }
};

const LegalDocumentGenerator = () => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [generatedDocument, setGeneratedDocument] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const selectTemplate = (templateKey) => {
    const template = DOCUMENT_TEMPLATES[templateKey];
    const initialData = { date: new Date().toLocaleDateString('en-GB') };
    template.fields.forEach(field => {
      initialData[field.name] = '';
    });
    setFormData(initialData);
    setSelectedTemplate(templateKey);
    setGeneratedDocument('');
    setShowPreview(false);
  };

  const updateField = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const generateDocument = () => {
    const template = DOCUMENT_TEMPLATES[selectedTemplate];
    let document = template.structure;

    // Replace all placeholders
    Object.keys(formData).forEach(field => {
      const regex = new RegExp(`{${field}}`, 'g');
      document = document.replace(regex, formData[field] || '[REQUIRED]');
    });

    // Add header
    const header = `===========================================
DOCUMENT GENERATED BY JUSTICE COMPANION
${new Date().toLocaleString('en-GB')}
Free legal aid for those who can't afford justice
Built from pain, powered by truth
===========================================

`;

    setGeneratedDocument(header + document);
    setShowPreview(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedDocument);
    alert('Document copied! Paste it into your email or word processor.');
  };

  const downloadDocument = () => {
    const blob = new Blob([generatedDocument], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${DOCUMENT_TEMPLATES[selectedTemplate].title}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!selectedTemplate) {
    return (
      <div className="legal-doc-generator">
        <h2>Legal Document Generator</h2>
        <p className="subtitle">Choose the weapon you need for your fight</p>
        
        <div className="template-grid">
          {Object.entries(DOCUMENT_TEMPLATES).map(([key, template]) => (
            <button
              key={key}
              className="template-card"
              onClick={() => selectTemplate(key)}
            >
              <h3>{template.title}</h3>
              <p>{template.description}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (showPreview) {
    return (
      <div className="legal-doc-generator">
        <h2>Generated Document</h2>
        
        <div className="preview-content">
          <pre>{generatedDocument}</pre>
        </div>
        
        <div className="preview-actions">
          <button onClick={copyToClipboard} className="btn-primary">
            📋 Copy to Clipboard
          </button>
          <button onClick={downloadDocument} className="btn-primary">
            💾 Download
          </button>
          <button onClick={() => setShowPreview(false)} className="btn-secondary">
            ← Back to Edit
          </button>
        </div>
      </div>
    );
  }

  const template = DOCUMENT_TEMPLATES[selectedTemplate];
  
  return (
    <div className="legal-doc-generator">
      <button 
        className="back-button"
        onClick={() => setSelectedTemplate(null)}
      >
        ← Back to templates
      </button>
      
      <h2>{template.title}</h2>
      
      <div className="form-fields">
        {template.fields.map(field => (
          <div key={field.name} className="form-group">
            <label htmlFor={field.name}>{field.label}:</label>
            
            {field.type === 'textarea' ? (
              <textarea
                id={field.name}
                value={formData[field.name] || ''}
                onChange={(e) => updateField(field.name, e.target.value)}
                rows={5}
                placeholder={`Enter ${field.label.toLowerCase()}`}
              />
            ) : (
              <input
                type={field.type}
                id={field.name}
                value={formData[field.name] || ''}
                onChange={(e) => updateField(field.name, e.target.value)}
                placeholder={`Enter ${field.label.toLowerCase()}`}
              />
            )}
          </div>
        ))}
      </div>
      
      <button 
        className="btn-primary generate-btn"
        onClick={generateDocument}
      >
        Generate Document
      </button>
    </div>
  );
};

export default LegalDocumentGenerator;

// This isn't just code. This is ammunition.
// Every document generated is a bullet fired at injustice.
// Built from pain, powered by truth, delivered with precision.