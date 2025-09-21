import React, { useState, useRef } from 'react';
import './DocumentManager.css';

// Professional Document Management for Legal Cases
// Secure file handling with legal tech best practices

const DocumentManager = ({ currentCase, onDocumentUpload }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileSelect = async () => {
    try {
      if (window.justiceAPI) {
        const result = await window.justiceAPI.selectFile();
        if (result.success && result.filePath) {
          await uploadDocument(result);
        }
      }
    } catch (error) {
      console.error('File selection error:', error);
    }
  };

  // Upload document with progress tracking
  const uploadDocument = async (fileData) => {
    setUploading(true);
    try {
      const result = await onDocumentUpload(fileData);
      if (result.success) {
        setDocuments(prev => [...prev, result.document]);
        // Show success feedback
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // Handle dropped files
      const file = e.dataTransfer.files[0];
      uploadDocument({ file });
    }
  };

  if (!currentCase) {
    return (
      <div className="document-manager no-case">
        <div className="no-case-message">
          <div className="icon">📁</div>
          <h2>Select a Case First</h2>
          <p>Choose a case from the sidebar to manage its documents.</p>
          <button
            className="create-case-btn"
            onClick={() => window.location.hash = '#cases'}
          >
            Go to Cases
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="document-manager">
      {/* Header */}
      <div className="document-header">
        <div className="header-info">
          <h2>Document Vault</h2>
          <p className="case-context">Managing documents for: <strong>{currentCase.title}</strong></p>
        </div>
        <div className="header-stats">
          <div className="stat">
            <span className="stat-number">{documents.length}</span>
            <span className="stat-label">Documents</span>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div
        className={`upload-zone ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        role="button"
        tabIndex="0"
        aria-label="Upload documents"
      >
        <div className="upload-content">
          {uploading ? (
            <>
              <div className="upload-spinner">📤</div>
              <h3>Uploading Document...</h3>
              <p>Please wait while we securely store your document.</p>
            </>
          ) : (
            <>
              <div className="upload-icon">📄</div>
              <h3>Add Legal Documents</h3>
              <p>Drag & drop files here, or click to select</p>
              <button
                className="upload-btn"
                onClick={handleFileSelect}
                disabled={uploading}
              >
                Select Files
              </button>
            </>
          )}
        </div>

        <div className="supported-formats">
          <p><strong>Supported:</strong> PDF, DOC, DOCX, TXT, JPG, PNG (Max 10MB)</p>
        </div>
      </div>

      {/* Document Categories */}
      <div className="document-categories">
        <div className="category-tabs">
          <button className="tab active">All Documents</button>
          <button className="tab">Evidence</button>
          <button className="tab">Correspondence</button>
          <button className="tab">Legal Forms</button>
          <button className="tab">Court Papers</button>
        </div>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="no-documents">
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No Documents Yet</h3>
            <p>Upload your first document to start building your case file.</p>
            <div className="suggestions">
              <h4>Document Types to Consider:</h4>
              <ul>
                <li>Contracts and agreements</li>
                <li>Correspondence and emails</li>
                <li>Photos of evidence</li>
                <li>Court papers and forms</li>
                <li>Financial records</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="documents-grid">
          {documents.map((doc, index) => (
            <div key={doc.id || index} className="document-card">
              <div className="doc-icon">
                {doc.type === 'pdf' ? '📄' : doc.type === 'image' ? '🖼️' : '📝'}
              </div>
              <div className="doc-info">
                <h4 className="doc-name">{doc.name}</h4>
                <p className="doc-meta">{doc.size} • {doc.uploadDate}</p>
              </div>
              <div className="doc-actions">
                <button className="action-btn view" title="View document">👁️</button>
                <button className="action-btn download" title="Download">⬇️</button>
                <button className="action-btn delete" title="Delete">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="document-footer">
        <div className="security-notice">
          <span className="security-icon">🔒</span>
          <p>All documents are encrypted and stored securely on your device.</p>
        </div>
      </div>
    </div>
  );
};

export default DocumentManager;