import React, { useState, useEffect, useRef } from 'react';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';
import Disclaimer from './components/Disclaimer';
import FactConfirm from './components/FactConfirm';
import CaseManager from './components/CaseManager';
import './App.css';

// The main battlefield - where justice meets reality
// Built from pain, powered by truth, destined for victory

const App = () => {
  // State management - the war room intelligence
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(true); // Assume accepted after first run
  const [currentCase, setCurrentCase] = useState(null);
  const [cases, setCases] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState('chat'); // chat, cases, documents, timeline
  const [pendingFact, setPendingFact] = useState(null);
  const [messages, setMessages] = useState([]);
  
  // References - direct lines to the battlefield
  const chatRef = useRef(null);

  // Boot sequence - loading the ammunition
  useEffect(() => {
    // Check disclaimer status
    window.justiceAPI.onShowDisclaimer(() => {
      setDisclaimerAccepted(false);
    });

    // Load cases from the vault
    loadCases();

    // Listen for facts found in documents
    window.justiceAPI.onFactFound((event, fact) => {
      setPendingFact(fact);
    });

    // Cleanup on unmount
    return () => {
      window.justiceAPI.removeAllListeners('show-disclaimer');
      window.justiceAPI.removeAllListeners('fact-found');
    };
  }, []);

  // Load all cases - gathering the war chest
  const loadCases = async () => {
    try {
      const loadedCases = await window.justiceAPI.getCases();
      setCases(loadedCases);
      
      // Auto-select first case if exists
      if (loadedCases.length > 0 && !currentCase) {
        setCurrentCase(loadedCases[0]);
      }
    } catch (error) {
      console.error('Failed to load cases:', error);
    }
  };

  // Accept the warrior's oath
  const handleAcceptDisclaimer = async () => {
    await window.justiceAPI.acceptDisclaimer();
    setDisclaimerAccepted(true);
  };

  // Create new case - birthing a new battle
  const createNewCase = async (caseData) => {
    const result = await window.justiceAPI.saveCase(caseData);
    if (result.success) {
      await loadCases();
      setCurrentCase(result.case);
      setActiveView('chat');
    }
    return result;
  };

  // Confirm a fact - adding truth to the arsenal
  const confirmFact = async (factData) => {
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
  };

  // The main render - where UI meets destiny
  return (
    <div className="app-container">
      {/* Disclaimer - The first gate */}
      {!disclaimerAccepted && (
        <Disclaimer onAccept={handleAcceptDisclaimer} />
      )}

      {/* Main battlefield */}
      {disclaimerAccepted && (
        <>
          {/* Sidebar - Command center navigation */}
          <Sidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            activeView={activeView}
            onViewChange={setActiveView}
            currentCase={currentCase}
            cases={cases}
          />

          {/* Main content area - Where battles are fought */}
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
              <div className="coming-soon">
                <h2>Document Vault</h2>
                <p>Under construction. Your evidence locker is being fortified.</p>
              </div>
            )}

            {activeView === 'timeline' && (
              <div className="coming-soon">
                <h2>Battle Timeline</h2>
                <p>Coming soon. Every moment of your fight, documented.</p>
              </div>
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
