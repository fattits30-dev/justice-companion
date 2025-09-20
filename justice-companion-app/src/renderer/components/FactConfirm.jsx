import React, { useState, useEffect } from 'react';
import './FactConfirm.css';

// The Truth Verification Chamber
// Where raw data becomes verified ammunition
// Every fact confirmed is a bullet loaded

const FactConfirm = ({ fact, onConfirm, onEdit, onSkip }) => {
  const [editedValue, setEditedValue] = useState(fact.value);
  const [isEditing, setIsEditing] = useState(false);
  const [autoCloseTimer, setAutoCloseTimer] = useState(10);

  // Auto-close timer - no time for hesitation in war
  useEffect(() => {
    const timer = setInterval(() => {
      setAutoCloseTimer(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onSkip(); // Auto-skip if no action taken
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onSkip]);

  const handleConfirm = () => {
    const confirmedFact = {
      ...fact,
      value: editedValue,
      confirmed: true,
      confirmedAt: new Date().toISOString()
    };
    onConfirm(confirmedFact);
  };

  const handleEdit = () => {
    setIsEditing(!isEditing);
    setAutoCloseTimer(30); // More time when editing
  };

  const getFactIcon = () => {
    switch(fact.type) {
      case 'money': return '💰';
      case 'date': return '📅';
      case 'name': return '👤';
      case 'address': return '📍';
      case 'email': return '📧';
      case 'phone': return '📱';
      default: return '📌';
    }
  };

  return (
    <div className="fact-confirm-overlay">
      <div className="fact-confirm-container">
        <div className="fact-confirm-header">
          <span className="fact-icon">{getFactIcon()}</span>
          <h3>FACT CHECK - VERIFY YOUR AMMUNITION</h3>
          <span className="auto-close-timer">{autoCloseTimer}s</span>
        </div>

        <div className="fact-confirm-content">
          <p className="fact-label">{fact.label}</p>
          
          {isEditing ? (
            <input
              type="text"
              value={editedValue}
              onChange={(e) => setEditedValue(e.target.value)}
              className="fact-edit-input"
              autoFocus
            />
          ) : (
            <p className="fact-value">{editedValue}</p>
          )}

          <div className="fact-context">
            <span className="context-label">Found in context:</span>
            <p className="context-text">...{fact.context}...</p>
          </div>

          {fact.type === 'money' && (
            <div className="fact-warning">
              ⚠️ Money matters are critical. Double-check this amount.
            </div>
          )}

          {fact.type === 'date' && (
            <div className="fact-warning">
              ⚠️ Dates determine deadlines. Verify this is correct.
            </div>
          )}
        </div>

        <div className="fact-confirm-actions">
          <button 
            onClick={handleConfirm} 
            className="confirm-button"
            disabled={!editedValue.trim()}
          >
            ✓ CONFIRM
          </button>
          
          <button 
            onClick={handleEdit} 
            className="edit-button"
          >
            {isEditing ? '👁️ VIEW' : '✏️ EDIT'}
          </button>
          
          <button 
            onClick={onSkip} 
            className="skip-button"
          >
            ✕ SKIP
          </button>
        </div>

        <div className="fact-confirm-footer">
          <p>One-time verification. We won't ask again unless context changes.</p>
          <p><strong>Your facts. Your fight. Your control.</strong></p>
        </div>
      </div>
    </div>
  );
};

export default FactConfirm;

// Every fact is a piece of truth
// Every confirmation is an act of defiance
// Every edit is taking control of your narrative
// This isn't data entry—this is building your arsenal
