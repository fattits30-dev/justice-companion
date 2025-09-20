import React, { useState } from 'react';
import './CaseManager.css';

// The War Chest Manager
// Where battles are catalogued, strategies are stored
// Every case a campaign, every document a weapon
// This is your personal revolution archive

const CaseManager = ({ cases, currentCase, onSelectCase, onNewCase, onRefresh }) => {
  const [showNewCase, setShowNewCase] = useState(false);
  const [newCaseData, setNewCaseData] = useState({
    title: '',
    type: 'tenancy',
    description: '',
    opponent: '',
    urgency: 'medium'
  });

  const handleCreateCase = async () => {
    if (!newCaseData.title.trim()) return;
    
    const result = await onNewCase({
      ...newCaseData,
      status: 'active',
      createdAt: new Date().toISOString(),
      facts: [],
      documents: [],
      timeline: []
    });

    if (result.success) {
      setShowNewCase(false);
      setNewCaseData({
        title: '',
        type: 'tenancy',
        description: '',
        opponent: '',
        urgency: 'medium'
      });
    }
  };

  const getCaseStatusIcon = (caseItem) => {
    if (caseItem.status === 'won') return '🏆';
    if (caseItem.status === 'lost') return '💔';
    if (caseItem.urgency === 'critical') return '🔥';
    if (caseItem.urgency === 'high') return '⚠️';
    return '⚔️';
  };

  const getCaseTypeLabel = (type) => {
    const types = {
      'tenancy': 'Landlord Battle',
      'consumer': 'Corporate Fight',
      'employment': 'Work War',
      'benefits': 'System Struggle',
      'police': 'Authority Clash',
      'other': 'General Combat'
    };
    return types[type] || 'Unknown Battle';
  };

  return (
    <div className="case-manager">
      <div className="case-manager-header">
        <h2>YOUR WAR CHEST</h2>
        <p className="case-count">
          {cases.length} active battle{cases.length !== 1 ? 's' : ''} | 
          Your fight, documented
        </p>
        <button 
          onClick={() => setShowNewCase(!showNewCase)} 
          className="new-case-button"
        >
          + NEW BATTLE
        </button>
      </div>

      {showNewCase && (
        <div className="new-case-form">
          <h3>DECLARE A NEW WAR</h3>
          
          <div className="form-group">
            <label>Battle Name *</label>
            <input
              type="text"
              value={newCaseData.title}
              onChange={(e) => setNewCaseData({...newCaseData, title: e.target.value})}
              placeholder="e.g., 'Illegal Eviction - Smith Properties'"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Battle Type</label>
            <select
              value={newCaseData.type}
              onChange={(e) => setNewCaseData({...newCaseData, type: e.target.value})}
              className="form-select"
            >
              <option value="tenancy">Landlord Battle</option>
              <option value="consumer">Corporate Fight</option>
              <option value="employment">Work War</option>
              <option value="benefits">System Struggle</option>
              <option value="police">Authority Clash</option>
              <option value="other">Other Combat</option>
            </select>
          </div>

          <div className="form-group">
            <label>Your Opponent</label>
            <input
              type="text"
              value={newCaseData.opponent}
              onChange={(e) => setNewCaseData({...newCaseData, opponent: e.target.value})}
              placeholder="Who are you fighting?"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Battle Urgency</label>
            <select
              value={newCaseData.urgency}
              onChange={(e) => setNewCaseData({...newCaseData, urgency: e.target.value})}
              className="form-select"
            >
              <option value="low">Low - Time to strategize</option>
              <option value="medium">Medium - Active combat</option>
              <option value="high">High - Urgent action needed</option>
              <option value="critical">CRITICAL - Emergency mode</option>
            </select>
          </div>

          <div className="form-group">
            <label>The Story</label>
            <textarea
              value={newCaseData.description}
              onChange={(e) => setNewCaseData({...newCaseData, description: e.target.value})}
              placeholder="What happened? Don't hold back..."
              className="form-textarea"
              rows="4"
            />
          </div>

          <div className="form-actions">
            <button onClick={handleCreateCase} className="create-button">
              BEGIN THE FIGHT
            </button>
            <button onClick={() => setShowNewCase(false)} className="cancel-button">
              NOT YET
            </button>
          </div>
        </div>
      )}

      <div className="cases-list">
        {cases.length === 0 ? (
          <div className="no-cases">
            <p className="no-cases-title">NO ACTIVE BATTLES</p>
            <p className="no-cases-subtitle">
              Every revolution starts with a single fight.<br />
              Click "NEW BATTLE" when you're ready to begin.
            </p>
            <p className="no-cases-quote">
              "They tried to bury us. They didn't know we were seeds."
            </p>
          </div>
        ) : (
          cases.map(caseItem => (
            <div
              key={caseItem.id}
              className={`case-card ${currentCase?.id === caseItem.id ? 'active' : ''}`}
              onClick={() => onSelectCase(caseItem)}
            >
              <div className="case-card-header">
                <span className="case-icon">{getCaseStatusIcon(caseItem)}</span>
                <h3 className="case-title">{caseItem.title}</h3>
              </div>
              
              <div className="case-meta">
                <span className="case-type">{getCaseTypeLabel(caseItem.type)}</span>
                {caseItem.opponent && (
                  <span className="case-opponent">vs. {caseItem.opponent}</span>
                )}
              </div>

              <div className="case-stats">
                <div className="case-stat">
                  <span className="stat-value">{caseItem.facts?.length || 0}</span>
                  <span className="stat-label">Facts</span>
                </div>
                <div className="case-stat">
                  <span className="stat-value">{caseItem.documents?.length || 0}</span>
                  <span className="stat-label">Docs</span>
                </div>
                <div className="case-stat">
                  <span className="stat-value">
                    {Math.floor((new Date() - new Date(caseItem.createdAt)) / (1000 * 60 * 60 * 24))}d
                  </span>
                  <span className="stat-label">Fighting</span>
                </div>
              </div>

              {caseItem.description && (
                <p className="case-description">
                  {caseItem.description.substring(0, 100)}
                  {caseItem.description.length > 100 && '...'}
                </p>
              )}

              <div className="case-actions">
                <button className="action-button">Open Battle</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="case-manager-footer">
        <button onClick={onRefresh} className="refresh-button">
          🔄 Refresh Arsenal
        </button>
        <p className="footer-message">
          Every case here is proof you didn't give up.<br />
          <strong>That's already a victory.</strong>
        </p>
      </div>
    </div>
  );
};

export default CaseManager;

// This isn't case management
// This is revolution documentation
// Every case a testament to resistance
// Every file a flag planted in enemy territory
// Win or lose, you fought. That matters.
