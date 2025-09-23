import React, { useState, useEffect, useRef } from 'react';
import MinimalInterface from './components/MinimalInterface';
import EnhancedChatInterface from './components/EnhancedChatInterface';
import LegalAssistanceResponse from './components/LegalAssistanceResponse';
import Sidebar from './components/Sidebar';
import Disclaimer from './components/Disclaimer';
import FactConfirm from './components/FactConfirm';
import CaseManager from './components/CaseManager';
import DocumentManager from './components/DocumentManager';
import TimelineManager from './components/TimelineManager';
import ConsentManager from './components/ConsentManager';
import LegalAssistantEngine from './lib/LegalAssistantEngine';
import { EnhancedCaseManager } from './lib/EnhancedCaseManager';
import CaseManagementBridge from './lib/CaseManagementBridge';
import './App.css';

// Justice Companion Main Application
// Providing accessible legal information and support

const App = () => {
  // Application state management
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(true); // Assume accepted after first run
  const [currentCase, setCurrentCase] = useState(null);
  const [cases, setCases] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState('chat'); // Go straight to chat after disclaimer
  const [pendingFact, setPendingFact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showMinimal, setShowMinimal] = useState(false); // Skip minimal, go straight to chat
  const [legalAssistanceResponse, setLegalAssistanceResponse] = useState(null);

  // Component references
  const chatRef = useRef(null);
  const legalEngine = useRef(new LegalAssistantEngine());
  const enhancedCaseManager = useRef(new EnhancedCaseManager());
  const caseManagementBridge = useRef(null);

  // Initialize application
  useEffect(() => {
    // Initialize case management bridge
    if (!caseManagementBridge.current) {
      caseManagementBridge.current = new CaseManagementBridge({
        setCases,
        setCurrentCase,
        setActiveView
      });

      // Connect enhanced case manager to bridge
      caseManagementBridge.current.setEnhancedCaseManager(enhancedCaseManager.current);

      console.log('✅ Case Management Bridge initialized');
    }

    // Load existing cases
    loadCases();

    // Handle window resize for responsive sidebar
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth < 768) {
          // Mobile: close sidebar by default
          setSidebarOpen(false);
          setSidebarCollapsed(false);
        } else if (window.innerWidth < 1024) {
          // Tablet: collapse sidebar
          setSidebarCollapsed(true);
        } else {
          // Desktop: full sidebar
          setSidebarCollapsed(false);
        }
      }
    };

    // Set initial responsive state
    handleResize();

    // Add resize listener
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
    }

    // Auto-run UI tests in development (web-compatible check)
    if (import.meta.env && import.meta.env.DEV) {
      setTimeout(() => {
        const script = document.createElement('script');
        script.src = '/test-interface.js';
        document.body.appendChild(script);
      }, 2000);
    }

    // Cleanup
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  // Load all cases from storage
  const loadCases = async () => {
    try {
      let loadedCases = [];

      // Try bridge first
      if (caseManagementBridge.current) {
        loadedCases = await caseManagementBridge.current.getAllCasesForApp();
        console.log(`🔄 Bridge returned ${loadedCases.length} cases`);

        // Bridge already calls setCases internally, but let's be explicit
        if (loadedCases.length > 0) {
          setCases(loadedCases);
        }
      }

      // Fallback to original API
      if (loadedCases.length === 0 && window.justiceAPI) {
        console.log('🔄 Falling back to original API for cases');
        const result = await window.justiceAPI.getCases();
        loadedCases = result.success ? result.cases : [];
        setCases(loadedCases);
      }

      // Auto-select first case if exists
      if (loadedCases.length > 0 && !currentCase) {
        setCurrentCase(loadedCases[0]);
      }

      console.log(`📁 Loaded ${loadedCases.length} cases into App state`);
    } catch (error) {
      console.error('Failed to load cases:', error);
      setCases([]); // Set empty array on error
    }
  };

  // Handle case creation from chat interface
  const handleCaseCreated = async (caseResult) => {
    console.log('🎉 App: Case created via chat interface', {
      caseId: caseResult.case?.id,
      type: caseResult.analysis?.detection?.detectedType
    });

    // Update sidebar case count (cases should already be updated by bridge)
    await loadCases();

    // Show success notification
    setTimeout(() => {
      console.log(`✅ Case "${caseResult.case?.title}" ready for monitoring in Cases view`);
    }, 1000);
  };

  // Accept disclaimer with comprehensive compliance logging
  const handleAcceptDisclaimer = async () => {
    try {
      if (window.justiceAPI) {
        // Gather acceptance context for compliance logging
        const acceptanceData = {
          userAgent: navigator.userAgent,
          screenResolution: `${screen.width}x${screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language || 'en',
          acceptanceTime: new Date().toISOString(),
          acceptanceMethod: 'button_click',
          pageUrl: window.location.href,
          referrer: document.referrer || 'direct'
        };

        console.log('📋 Submitting disclaimer acceptance with compliance data...');
        const result = await window.justiceAPI.acceptDisclaimer(acceptanceData);

        if (result.success) {
          console.log('✅ Disclaimer accepted with compliance tracking:');
          console.log(`   Acceptance ID: ${result.acceptanceId}`);
          console.log(`   Timestamp: ${result.acceptedAt}`);
          console.log(`   Version: ${result.disclaimerVersion}`);
          console.log(`   Compliance Status: ${result.complianceStatus}`);

          setDisclaimerAccepted(true);
        } else {
          console.error('❌ Disclaimer acceptance failed:', result.error);
          // Still allow continued use but log the issue
          if (result.requiresRetry) {
            alert('There was an issue logging your acceptance. Please try again.');
          } else {
            setDisclaimerAccepted(true); // Allow continuation but with logged error
          }
        }
      }
    } catch (error) {
      console.error('Failed to accept disclaimer:', error);
      // Allow continuation but log the error
      setDisclaimerAccepted(true);
    }
  };

  // Check current consent status
  const checkConsentStatus = async () => {
    try {
      if (window.justiceAPI) {
        const result = await window.justiceAPI.getConsentStatus();
        if (result.success) {
          setConsentStatus(result.consentStatus);
          setDisclaimerAccepted(result.consentStatus.hasValidConsent && !result.consentStatus.consentWithdrawn);

          console.log('🔍 Consent Status Check:');
          console.log(`   Has Valid Consent: ${result.consentStatus.hasValidConsent}`);
          console.log(`   Consent Required: ${result.consentStatus.consentRequired}`);
          console.log(`   Disclaimer Version: ${result.consentStatus.disclaimerVersion || 'None'}`);
          console.log(`   Consent Withdrawn: ${result.consentStatus.consentWithdrawn || false}`);
        }
        return result;
      }
    } catch (error) {
      console.error('Failed to check consent status:', error);
      return { success: false, error: error.message };
    }
  };

  // Handle consent withdrawal (GDPR compliance)
  const handleWithdrawConsent = async () => {
    try {
      if (window.justiceAPI && consentStatus?.disclaimerAcceptanceId) {
        const confirmWithdrawal = window.confirm(
          'Are you sure you want to withdraw your consent? This will stop all data processing and you will need to re-accept the terms to continue using the service.'
        );

        if (confirmWithdrawal) {
          const withdrawalData = {
            acceptanceId: consentStatus.disclaimerAcceptanceId,
            reason: 'user_request',
            withdrawalTime: new Date().toISOString()
          };

          const result = await window.justiceAPI.withdrawConsent(withdrawalData);

          if (result.success) {
            console.log('✅ Consent withdrawn successfully');
            console.log(`   Withdrawal ID: ${result.withdrawalId}`);
            console.log(`   Withdrawn at: ${result.withdrawnAt}`);

            // Update UI to show consent is required again
            setDisclaimerAccepted(false);
            setConsentStatus(null);

            alert('Your consent has been withdrawn. All data processing has ceased. You will need to re-accept the terms to continue.');
          } else {
            console.error('❌ Consent withdrawal failed:', result.error);
            alert('There was an error withdrawing your consent. Please try again.');
          }
        }
      }
    } catch (error) {
      console.error('Failed to withdraw consent:', error);
      alert('There was an error withdrawing your consent. Please try again.');
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

  // State to track API initialization and consent status
  const [apiReady, setApiReady] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [consentStatus, setConsentStatus] = useState(null);

  // Check for API availability with proper async handling
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10;

    const checkAPI = () => {
      attempts++;
      console.log(`🔍 API check attempt ${attempts}/${maxAttempts}`);

      if (window.justiceAPI) {
        console.log('✅ Justice API ready on attempt', attempts);
        setApiReady(true);
        return;
      }

      if (attempts < maxAttempts) {
        // Try again with increasing delay
        const delay = Math.min(100 * attempts, 1000);
        console.log(`⏳ Retrying API check in ${delay}ms...`);
        setTimeout(checkAPI, delay);
      } else {
        console.error('❌ Justice API failed to initialize after', maxAttempts, 'attempts');
        setApiError('API initialization failed. Please refresh the page.');
      }
    };

    // Start checking immediately, then with delays
    checkAPI();
  }, []);

  // Initialize app once API is ready
  useEffect(() => {
    if (!apiReady) return;

    // Check if justiceAPI is available
    if (window.justiceAPI) {
      // Check current consent status first
      checkConsentStatus().then((statusResult) => {
        if (statusResult?.success) {
          // Only proceed if consent is valid
          if (statusResult.consentStatus.hasValidConsent && !statusResult.consentStatus.consentWithdrawn) {
            // Load saved cases
            loadCases();
          }
        }
      });

      // Check disclaimer status (legacy support)
      window.justiceAPI.onShowDisclaimer(() => {
        setDisclaimerAccepted(false);
      });

      // Listen for facts found in documents
      if (window.justiceAPI.onFactFound) {
        window.justiceAPI.onFactFound((event, fact) => {
          setPendingFact(fact);
        });
      }
    }

    // Cleanup on unmount
    return () => {
      if (window.justiceAPI) {
        // Cleanup listeners if available
        if (window.justiceAPI.removeAllListeners) {
          window.justiceAPI.removeAllListeners();
        }
      }
    };
  }, [apiReady]);

  // Show loading screen while API initializes
  if (!apiReady && !apiError) {
    return (
      <div className="app-container">
        <div className="loading-api">
          <h2>⚖️ Justice Companion</h2>
          <p>Initializing legal assistance system...</p>
          <p className="loading-detail">Preparing web environment...</p>
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  // Show error if API failed to load
  if (apiError) {
    return (
      <div className="app-container">
        <div className="loading-api">
          <h2>⚖️ Justice Companion</h2>
          <p style={{ color: '#ef4444' }}>Error: {apiError}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  // Removed minimal interface handler - going straight to chat

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
          {/* Hamburger menu button */}
          <button
            className={`hamburger-menu ${
              sidebarOpen
                ? sidebarCollapsed
                  ? 'sidebar-collapsed'
                  : 'sidebar-open'
                : ''
            }`}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            <div className="hamburger-line"></div>
            <div className="hamburger-line"></div>
            <div className="hamburger-line"></div>
          </button>

          {/* Sidebar navigation */}
          <Sidebar
            isOpen={sidebarOpen}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            onCollapsedChange={setSidebarCollapsed}
            activeView={activeView}
            onViewChange={setActiveView}
            currentCase={currentCase}
            cases={cases}
          />

          {/* Main content area */}
          <div className={`main-content ${
            sidebarOpen
              ? sidebarCollapsed
                ? 'sidebar-collapsed'
                : 'sidebar-open'
              : ''
          }`}>
                {activeView === 'legal-assistance' && legalAssistanceResponse && (
                  <LegalAssistanceResponse
                    response={legalAssistanceResponse}
                    onQuestionSubmit={(questions) => {
                      // Handle question submission workflow
                      const questionnaireResponse = {
                        timestamp: new Date().toISOString(),
                        questions: questions,
                        caseId: currentCase?.id
                      };
                      setCases(prevCases => {
                        const updatedCases = [...prevCases];
                        if (currentCase) {
                          const caseIndex = updatedCases.findIndex(c => c.id === currentCase.id);
                          if (caseIndex !== -1) {
                            updatedCases[caseIndex] = {
                              ...updatedCases[caseIndex],
                              questionnaires: [...(updatedCases[caseIndex].questionnaires || []), questionnaireResponse]
                            };
                          }
                        }
                        return updatedCases;
                      });
                    }}
                    onDocumentRequest={(documentType) => {
                      // Generate document template
                      const documentTemplate = {
                        type: documentType,
                        createdAt: new Date().toISOString(),
                        caseId: currentCase?.id,
                        status: 'draft'
                      };

                      // Add to current case documents
                      if (currentCase) {
                        setCases(prevCases => {
                          const updatedCases = [...prevCases];
                          const caseIndex = updatedCases.findIndex(c => c.id === currentCase.id);
                          if (caseIndex !== -1) {
                            updatedCases[caseIndex] = {
                              ...updatedCases[caseIndex],
                              documents: [...(updatedCases[caseIndex].documents || []), documentTemplate]
                            };
                          }
                          return updatedCases;
                        });

                        // Navigate to document view
                        setActiveView('documents');
                      }
                    }}
                  />
                )}

                {activeView === 'chat' && (
                  <EnhancedChatInterface
                    ref={chatRef}
                    currentCase={currentCase}
                    messages={messages}
                    setMessages={setMessages}
                    onFactFound={(fact) => setPendingFact(fact)}
                    caseManagementBridge={caseManagementBridge.current}
                    onCaseCreated={handleCaseCreated}
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

                {activeView === 'consent' && (
                  <ConsentManager />
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
