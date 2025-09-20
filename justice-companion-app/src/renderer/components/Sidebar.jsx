import React, { useState } from 'react';
import './Sidebar.css';

// ChatGPT-Style Sidebar Navigation Component
// Clean, minimal design for legal assistant interface

const Sidebar = ({ isOpen, onToggle, activeView, onViewChange, currentCase, cases = [] }) => {
  const [collapsed, setCollapsed] = useState(false);

  // Ensure cases is always an array to prevent slice errors
  const safeCases = Array.isArray(cases) ? cases : [];

  const menuItems = [
    {
      id: 'chat',
      icon: '💬',
      label: 'Chat',
      description: 'Legal consultation'
    },
    {
      id: 'cases',
      icon: '📁',
      label: 'Cases',
      description: `${safeCases.length} active`
    },
    {
      id: 'documents',
      icon: '📄',
      label: 'Documents',
      description: 'Manage files'
    },
    {
      id: 'timeline',
      icon: '📅',
      label: 'Timeline',
      description: 'Case history'
    }
  ];

  const recentCases = safeCases.slice(0, 5);

  const handleToggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  return (
    <>
      {/* Sidebar panel with navigation */}
      <div className={`sidebar ${isOpen ? 'open' : 'closed'} ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="sidebar-logo-icon">⚖️</span>
            <span className="sidebar-logo-text">Legal Assistant</span>
          </div>
          <button
            className="sidebar-toggle"
            onClick={handleToggleCollapse}
            aria-label="Toggle sidebar collapse"
            title="Toggle sidebar"
          >
            <span className="sidebar-toggle-icon">‹</span>
          </button>
        </div>

        {/* Current case indicator */}
        {currentCase && !collapsed && (
          <div className="current-case-badge">
            <span className="case-indicator">📁</span>
            <span className="case-name">{currentCase.title}</span>
          </div>
        )}

        {/* New conversation button */}
        <button className="new-conversation-btn">
          <span>+</span>
          <span>New Chat</span>
        </button>

        {/* Main navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section">
            {!collapsed && <div className="nav-section-title">Main</div>}
            {menuItems.map(item => (
              <button
                key={item.id}
                className={`sidebar-item ${activeView === item.id ? 'active' : ''}`}
                onClick={() => {
                  onViewChange(item.id);
                  if (typeof window !== 'undefined' && window.innerWidth < 768) onToggle();
                }}
                title={item.label}
              >
                <span className="sidebar-icon">{item.icon}</span>
                <div className="sidebar-item-content">
                  <span className="sidebar-label">{item.label}</span>
                  <span className="sidebar-description">{item.description}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Recent cases */}
          {!collapsed && recentCases.length > 0 && (
            <div className="nav-section">
              <div className="nav-section-title">Recent Cases</div>
              <div className="cases-list">
                {recentCases.map((caseItem, index) => (
                  <div
                    key={caseItem.id || index}
                    className={`case-item ${currentCase?.id === caseItem.id ? 'active' : ''}`}
                    onClick={() => {
                      // Handle case selection
                      onViewChange('chat');
                    }}
                  >
                    <div className="case-title">{caseItem.title}</div>
                    <div className="case-date">
                      {new Date(caseItem.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Sidebar footer */}
        <div className="sidebar-footer">
          {!collapsed && (
            <div className="stats">
              <div className="stat">
                <span className="stat-value">{safeCases.length}</span>
                <span className="stat-label">Cases</span>
              </div>
              <div className="stat">
                <span className="stat-value">24</span>
                <span className="stat-label">Files</span>
              </div>
              <div className="stat">
                <span className="stat-value">7</span>
                <span className="stat-label">Active</span>
              </div>
            </div>
          )}

          <div className="user-section">
            <div className="user-avatar">U</div>
            <div className="user-info">
              <div className="user-name">User</div>
              <div className="user-role">Free Plan</div>
            </div>
          </div>

          <button className="settings-btn">
            <span>⚙️</span>
            <span>Settings</span>
          </button>

          {!collapsed && (
            <div className="sidebar-tagline">
              <p>Legal information service</p>
              <p><strong>Supporting your legal journey</strong></p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile toggle button */}
      {typeof window !== 'undefined' && window.innerWidth < 768 && (
        <button
          className="sidebar-toggle mobile-toggle"
          onClick={onToggle}
          aria-label="Toggle sidebar"
          style={{
            position: 'fixed',
            top: '1rem',
            left: '1rem',
            zIndex: 1000,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-md)',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          {isOpen ? '✕' : '☰'}
        </button>
      )}

      {/* Overlay for mobile */}
      {isOpen && typeof window !== 'undefined' && window.innerWidth < 768 && (
        <div
          className="sidebar-overlay active"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default Sidebar;