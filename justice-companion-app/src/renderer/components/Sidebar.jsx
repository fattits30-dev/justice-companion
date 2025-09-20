import React from 'react';
import './Sidebar.css';

// The Command Center Navigation
// Every general needs a war room map
// Every warrior needs to know their arsenal

const Sidebar = ({ isOpen, onToggle, activeView, onViewChange, currentCase, cases }) => {
  
  const menuItems = [
    { 
      id: 'chat', 
      icon: '⚔️', 
      label: 'Battle Chat',
      description: 'Your AI ally in the fight'
    },
    { 
      id: 'cases', 
      icon: '📂', 
      label: 'War Chest',
      description: `${cases.length} active battles`
    },
    { 
      id: 'documents', 
      icon: '📜', 
      label: 'Evidence Vault',
      description: 'Your proof arsenal'
    },
    { 
      id: 'timeline', 
      icon: '📅', 
      label: 'Battle Timeline',
      description: 'Every move documented'
    }
  ];

  return (
    <>
      {/* Toggle button - The gate control */}
      <button 
        className="sidebar-toggle" 
        onClick={onToggle}
        aria-label="Toggle sidebar"
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar panel - The command center */}
      <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>JUSTICE</h2>
          <h3>COMPANION</h3>
          {currentCase && (
            <div className="current-case-badge">
              <span className="case-indicator">🔥</span>
              <span className="case-name">{currentCase.title}</span>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`sidebar-item ${activeView === item.id ? 'active' : ''}`}
              onClick={() => {
                onViewChange(item.id);
                if (window.innerWidth < 768) onToggle(); // Auto-close on mobile
              }}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <div className="sidebar-item-content">
                <span className="sidebar-label">{item.label}</span>
                <span className="sidebar-description">{item.description}</span>
              </div>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="stats">
            <div className="stat">
              <span className="stat-value">{cases.length}</span>
              <span className="stat-label">Battles</span>
            </div>
            <div className="stat">
              <span className="stat-value">∞</span>
              <span className="stat-label">Resolve</span>
            </div>
          </div>
          
          <div className="sidebar-tagline">
            <p>No lawyers needed.</p>
            <p>No fees required.</p>
            <p><strong>Just justice.</strong></p>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={onToggle}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default Sidebar;

// Navigation isn't about knowing where you're going
// It's about remembering why you started
// Every click here is a step toward victory
