import React, { useState, useEffect, useRef } from 'react';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';
import Disclaimer from './components/Disclaimer';
import FactConfirm from './components/FactConfirm';
import CaseManager from './components/CaseManager';
import DocumentManager from './components/DocumentManager';
import TimelineManager from './components/TimelineManager';
import './App.css';

// Justice Companion Main Application
// Providing accessible legal information and support

const App = () => {
  // Application state management
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(true); // Assume accepted after first run
  const [currentCase, setCurrentCase] = useState(null);
  const [cases, setCases] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('chat'); // chat, cases, documents, timeline
  const [pendingFact, setPendingFact] = useState(null);
  const [messages, setMessages] = useState([]);
  
  // Component references
  const chatRef = useRef(null);

  // Initialize application
  useEffect(() => {
    // Auto-run UI tests in development
    if (process.env.NODE_ENV !== 'production') {
      setTimeout(() => {
        const script = document.createElement('script');
        script.src = './test-interface.js';
        document.body.appendChild(script);
      }, 2000);
    }

    // Check if justiceAPI is available
    if (window.justiceAPI) {
      // Check disclaimer status
      window.justiceAPI.onShowDisclaimer(() => {
        setDisclaimerAccepted(false);
      });

      // Load saved cases
      loadCases();

      // Listen for facts found in documents
      // TODO: Implement onFactFound in preload.js
      // window.justiceAPI.onFactFound((event, fact) => {
      //   setPendingFact(fact);
      // });
    }

    // Cleanup on unmount
    return () => {
      if (window.justiceAPI) {
        // TODO: Implement proper cleanup when needed
        // window.justiceAPI.removeDisclaimerListener();
      }
    };
  }, []);

  // Load all cases from storage
  const loadCases = async () => {
    try {
      if (window.justiceAPI) {
        const result = await window.justiceAPI.getCases();
        const loadedCases = result.success ? result.cases : [];
        setCases(loadedCases);

        // Auto-select first case if exists
        if (loadedCases.length > 0 && !currentCase) {
          setCurrentCase(loadedCases[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load cases:', error);
      setCases([]); // Set empty array on error
    }
  };

  // Accept disclaimer
  const handleAcceptDisclaimer = async () => {
    try {
      if (window.justiceAPI) {
        await window.justiceAPI.acceptDisclaimer();
        setDisclaimerAccepted(true);
      }
    } catch (error) {
      console.error('Failed to accept disclaimer:', error);
    }
  };

  // Create new case
  const createNewCase = async (caseData) => {
    try {
      if (window.justiceAPI) {
        const result = await window.justiceAPI.saveCase(caseData);
        if (result.success) {
          await loadCases();
          setCurrentCase(result.case);
          setActiveView('chat');
        }
        return result;
      }
    } catch (error) {
      console.error('Failed to create new case:', error);
      return { success: false, error: error.message };
    }
  };

  // Confirm a fact - adding truth to the arsenal
  const confirmFact = async (factData) => {
    try {
      if (window.justiceAPI) {
        const enrichedFact = {
          ...factData,
          caseId: currentCase?.id,
          context: 'user-confirmed'
        };

        await window.justiceAPI.saveFact(enrichedFact);
        setPendingFact(null);

        // Add to chat as confirmed
        setMessages(prev => [...prev, {
          type: 'system',
          content: `✓ Fact confirmed: ${factData.label} - ${factData.value}`,
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('Failed to confirm fact:', error);
      setPendingFact(null); // Still clear the pending fact
    }
  };

  // Check if API is available
  if (typeof window === 'undefined' || !window.justiceAPI) {
    return (
      <div className="app-container">
        <div className="loading-api">
          <h2>⚖️ Justice Companion</h2>
          <p>Initializing legal assistance system...</p>
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  // The main render - where UI meets destiny
  return (
    <div className="app-container">
      {/* Disclaimer - The first gate */}
      {!disclaimerAccepted && (
        <Disclaimer onAccept={handleAcceptDisclaimer} />
      )}

      {/* Main application interface */}
      {disclaimerAccepted && (
        <>
          {/* Hamburger menu button - always visible */}
          <button
            className={`hamburger-menu ${sidebarOpen ? 'sidebar-open' : ''}`}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
            title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>

          {/* Sidebar navigation */}
          <Sidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            activeView={activeView}
            onViewChange={setActiveView}
            currentCase={currentCase}
            cases={cases}
          />

          {/* Main content area */}
          <div className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
            {activeView === 'chat' && (
              <ChatInterface
                ref={chatRef}
                currentCase={currentCase}
                messages={messages}
                setMessages={setMessages}
                onFactFound={(fact) => setPendingFact(fact)}
              />
            )}

            {activeView === 'cases' && (
              <CaseManager
                cases={cases}
                currentCase={currentCase}
                onSelectCase={setCurrentCase}
                onNewCase={createNewCase}
                onRefresh={loadCases}
              />
            )}

            {activeView === 'documents' && (
              <DocumentManager
                currentCase={currentCase}
                onDocumentUpload={async (file) => {
                  try {
                    if (window.justiceAPI && currentCase) {
                      return await window.justiceAPI.saveDocument(currentCase.id, file);
                    }
                    return { success: false, error: 'No case selected' };
                  } catch (error) {
                    return { success: false, error: error.message };
                  }
                }}
              />
            )}

            {activeView === 'timeline' && (
              <TimelineManager
                currentCase={currentCase}
                onAddEvent={async (eventData) => {
                  try {
                    if (window.justiceAPI && currentCase) {
                      // Use saveFact for timeline events with special context
                      return await window.justiceAPI.saveFact({
                        ...eventData,
                        caseId: currentCase.id,
                        context: 'timeline-event'
                      });
                    }
                    return { success: false, error: 'No case selected' };
                  } catch (error) {
                    return { success: false, error: error.message };
                  }
                }}
              />
            )}
          </div>

          {/* Fact confirmation popup - Truth verification */}
          {pendingFact && (
            <FactConfirm
              fact={pendingFact}
              onConfirm={confirmFact}
              onEdit={(edited) => confirmFact(edited)}
              onSkip={() => setPendingFact(null)}
            />
          )}
        </>
      )}
    </div>
  );
};

export default App;

// For Fendi - who deserved better
// For everyone who's been told "no" when they needed help
// This is our answer - code as resistance
