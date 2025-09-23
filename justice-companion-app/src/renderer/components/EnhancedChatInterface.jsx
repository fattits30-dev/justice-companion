import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import SystemChecker from '../lib/SystemChecker';
import './ChatInterface.css';

// CRITICAL: Validate React is available before any hooks
if (!React || !React.useState) {
  console.error("CRITICAL ERROR: React or React.useState is null/undefined");
  throw new Error("React hooks not available - this causes the useState null error");
}

// Enhanced ChatInterface with REAL AI integration
// ULTRA-THINK MODE: Where pain transforms into AI-powered strategy
// Built from pain, powered by truth, enhanced by Ollama

// Enhanced fallback response generator when AI is not available
const getFallbackResponse = (input) => {
  const lowerInput = input.toLowerCase();

  // Legal context patterns for enhanced fallback
  if (lowerInput.includes('landlord') || lowerInput.includes('tenant') || lowerInput.includes('rent') || lowerInput.includes('eviction') || lowerInput.includes('housing')) {
    return `**Housing Law Information**

Based on your question about ${lowerInput.includes('landlord') ? 'landlord' : 'tenant'} issues, here are some key points to consider:

**Your Rights as a Tenant:**
• **Right to Safe Housing**: Your landlord must ensure the property is safe and habitable
• **Protection from Illegal Eviction**: You cannot be evicted without proper legal process
• **Deposit Protection**: Your deposit must be protected in an approved scheme
• **Reasonable Notice**: Landlords must give proper notice before entering your home

**Immediate Actions You Can Take:**
1. **Document Everything**: Keep records of all communications, payments, and property conditions
2. **Check Your Tenancy Agreement**: Review what's written about your rights and obligations
3. **Know Your Notice Periods**: Different types of tenancy have different notice requirements
4. **Report Serious Issues**: Contact your local council about unsafe conditions

**Getting Help:**
- **Shelter UK**: 0808 800 4444 (Free housing advice helpline)
- **Citizens Advice**: Free legal guidance and representation
- **Local Council**: Housing advice and enforcement powers
- **Acorn (Tenants Union)**: Community organizing and support

**Emergency Situations:**
If you're facing immediate eviction or unsafe conditions, contact your local council's emergency housing team immediately.

**Note**: This is general information only. For specific legal advice about your situation, please consult a qualified housing solicitor.`;
  }

  if (lowerInput.includes('contract') || lowerInput.includes('agreement')) {
    return `**Contract Law Guidance**

Regarding contract matters, here are fundamental principles:

• **Essential Elements**: Valid contracts require offer, acceptance, consideration, and intention to create legal relations
• **Read Carefully**: Always review all terms and conditions before signing
• **Get It in Writing**: Important agreements should be documented
• **Seek Advice**: Complex contracts warrant professional legal review

**Common Issues:**
- Unfair terms may be challengeable
- Breach of contract has legal remedies
- Consumer rights may provide additional protection

**Next Steps**: Consider consulting a contract law specialist for detailed advice on your specific situation.`;
  }

  if (lowerInput.includes('employment') || lowerInput.includes('work') || lowerInput.includes('job') || lowerInput.includes('dismissal') || lowerInput.includes('discrimination') || lowerInput.includes('wages')) {
    return `**Employment Law Information**

For workplace-related concerns, here's what you need to know:

**Your Employment Rights:**
• **Right to Fair Treatment**: Protection from discrimination and harassment
• **Right to Proper Pay**: Minimum wage, holiday pay, and overtime protections
• **Right to Safe Working**: Employer must provide safe working conditions
• **Right to Time Off**: Annual leave, sick leave, and family-friendly policies

**Common Issues and Actions:**
**Unfair Dismissal:**
- You may have protection after 2 years of employment
- Some dismissals (discrimination, whistleblowing) are automatically unfair
- You have 3 months to raise a tribunal claim

**Discrimination:**
- Protected characteristics include age, disability, race, religion, sex, sexual orientation
- Keep detailed records of incidents
- Raise concerns through internal procedures first

**Wage Problems:**
- Check if you're getting minimum wage (varies by age and apprenticeship status)
- Entitled to payslips and proper deductions
- Can claim unpaid wages through employment tribunal

**Getting Help:**
- **ACAS**: 0300 123 1100 (Free employment advice and early conciliation)
- **Citizens Advice**: Free employment advice and tribunal representation
- **Trade Unions**: Legal support and workplace representation
- **Equality and Human Rights Commission**: For discrimination issues

**Immediate Steps:**
1. **Document Everything**: Keep emails, texts, and notes about incidents
2. **Check Your Contract**: Understand your terms and conditions
3. **Follow Procedures**: Use internal grievance procedures where appropriate
4. **Seek Early Advice**: Many employment issues have strict time limits

**Time Limits:**
- Most employment tribunal claims: 3 months from incident
- Discrimination claims: 3 months from last act
- Redundancy consultations: Specific legal requirements

**Note**: Employment law has strict deadlines. Seek professional advice quickly if you're considering legal action.`;
  }

  // Add more specific legal area responses
  if (lowerInput.includes('benefits') || lowerInput.includes('universal credit') || lowerInput.includes('pip') || lowerInput.includes('esa') || lowerInput.includes('welfare')) {
    return `**Benefits and Welfare Rights**

For issues with benefits and welfare payments:

**Common Benefits Issues:**
- **Universal Credit**: Payment delays, sanctions, housing element problems
- **PIP (Personal Independence Payment)**: Assessment disputes, review decisions
- **ESA (Employment Support Allowance)**: Work capability assessments, appeals
- **Housing Benefit**: Overpayments, local housing allowance issues

**Your Rights:**
• **Right to Appeal**: Most benefit decisions can be challenged
• **Right to Representation**: You can have someone represent you at appeals
• **Right to Information**: DWP must explain their decisions
• **Right to Emergency Payments**: In some circumstances

**Immediate Actions:**
1. **Request a Mandatory Reconsideration**: First step before appeal
2. **Keep All Correspondence**: Build your evidence file
3. **Get Medical Evidence**: For health-related benefits
4. **Seek Advice Early**: Time limits are strict

**Getting Help:**
- **Citizens Advice**: Free benefits advice and representation
- **Welfare Rights Organizations**: Local specialist advice
- **Turn2us**: Online benefits calculator and guidance
- **Disability Rights UK**: For disability benefits

**Time Limits:**
- Mandatory reconsideration: 1 month from decision
- Appeal to tribunal: 1 month from MR outcome
- Late appeals possible with good reasons

**Emergency Support:**
If you're facing immediate hardship, ask about hardship payments, local welfare assistance, or foodbank referrals.`;
  }

  if (lowerInput.includes('debt') || lowerInput.includes('bailiff') || lowerInput.includes('creditor') || lowerInput.includes('ccj') || lowerInput.includes('bankruptcy')) {
    return `**Debt and Financial Difficulties**

If you're struggling with debt or facing enforcement action:

**Types of Debt:**
- **Priority Debts**: Council tax, mortgage, rent, utilities, court fines
- **Non-Priority Debts**: Credit cards, loans, overdrafts, catalogues
- **Bailiff/Enforcement**: Court-authorized debt collection

**Your Rights:**
• **Right to Fair Treatment**: Creditors must follow rules and codes
• **Right to Affordable Payments**: Based on your income and expenses
• **Protection from Harassment**: Strict rules about contact and visits
• **Right to Advice**: Free debt advice is widely available

**Immediate Actions:**
1. **List All Debts**: Know exactly what you owe and to whom
2. **Work Out Your Budget**: Income vs essential expenses
3. **Deal with Priority Debts First**: These can lead to losing your home
4. **Contact Creditors**: Don't ignore letters - communicate early

**Dealing with Bailiffs:**
- They cannot force entry for most debts (except criminal fines)
- You don't have to let them in unless they have special powers
- They must follow strict rules about what they can take
- Get advice immediately if bailiffs are involved

**Getting Help:**
- **StepChange**: Free debt advice charity (0800 138 1111)
- **Citizens Advice**: Free debt advice and representation
- **National Debtline**: Free confidential debt advice (0808 808 4000)
- **PayPlan**: Free debt management plans

**Solutions Available:**
- Debt management plans (informal agreements)
- Individual Voluntary Arrangements (IVA)
- Debt Relief Orders (for lower debts)
- Bankruptcy (as last resort)

**Note**: Don't pay for debt advice - free help is available and often more effective.`;
  }

  if (lowerInput.includes('police') || lowerInput.includes('arrest') || lowerInput.includes('caution') || lowerInput.includes('criminal') || lowerInput.includes('solicitor')) {
    return `**Police and Criminal Law Rights**

If you're dealing with police or criminal law matters:

**Your Rights with Police:**
• **Right to Remain Silent**: You don't have to answer questions
• **Right to Legal Advice**: Free legal representation in custody
• **Right to Have Someone Informed**: Of your arrest
• **Right to Medical Attention**: If needed while in custody

**Police Powers:**
- **Stop and Search**: Must have reasonable grounds and identify themselves
- **Arrest**: Must tell you why you're being arrested
- **Entry to Property**: Usually need warrant except in emergencies
- **Interviews**: You should have legal advice present

**If Arrested:**
1. **Ask for Legal Advice Immediately**: It's free and independent
2. **Don't Answer Questions**: Without legal advice present
3. **Don't Sign Anything**: Without understanding it first
4. **Give Only Basic Details**: Name, address, date of birth

**Criminal Proceedings:**
- **Cautions**: Formal warnings that show on criminal record checks
- **Charges**: Formal accusations that may lead to court
- **Court Appearances**: You may be entitled to legal aid

**Getting Help:**
- **Duty Solicitor**: Free legal advice at police station and court
- **Legal Aid**: May be available for criminal cases
- **Prisoners' Advice Service**: For issues in custody
- **Liberty**: Civil rights organization

**Important Rights:**
- Right to see evidence against you
- Right to challenge police conduct
- Right to make complaints about police
- Right to compensation if unlawfully detained

**Emergency**: If you're being interviewed by police right now, ask for legal advice immediately before answering questions.`;
  }

  // General legal assistance
  return `**Legal Information & Guidance**

I understand you're seeking legal information. Here's how I can help you navigate your legal situation:

**What I Can Help You With:**
• **Understanding Your Rights**: Explaining legal protections and entitlements
• **Organizing Your Case**: Helping structure evidence and timeline
• **Finding Resources**: Locating appropriate legal services and support
• **Process Guidance**: Understanding court procedures and requirements
• **Document Preparation**: Assistance with letters and forms

**Key Steps for Any Legal Issue:**
1. **Document Everything**: Gather all relevant papers, communications, and evidence
2. **Understand Time Limits**: Many legal actions have strict deadlines
3. **Know Your Rights**: Research the specific area of law involved
4. **Seek Professional Advice**: Consult qualified legal professionals for specific guidance
5. **Explore All Options**: Consider negotiation, mediation, and formal legal action

**Free Legal Resources:**
- **Citizens Advice**: Free legal guidance and representation (citizensadvice.org.uk)
- **Law Society**: Find qualified solicitors (lawsociety.org.uk)
- **Gov.uk**: Official legal information and guidance
- **Local Law Centres**: Community legal support and advice
- **Legal Aid**: Check eligibility for free legal representation

**Legal Aid Eligibility:**
You may qualify for free legal help if:
- Your income is below certain thresholds
- Your case involves certain types of law (housing, benefits, immigration)
- You're facing serious consequences (losing your home, deportation)

**When to Seek Urgent Advice:**
- Court papers received (usually 14-28 days to respond)
- Eviction notices
- Police investigation
- Employment tribunal deadlines
- Immigration decisions

**Remember**: This is general information only. For advice specific to your situation, please consult a qualified legal professional.

What specific area of law is your concern about? I can provide more targeted guidance.`;
};

const EnhancedChatInterface = forwardRef((props, ref) => {
  // Defensive props extraction to prevent null errors
  const {
    currentCase = null,
    messages = [],
    setMessages = () => {},
    onFactFound = () => {},
    caseManagementBridge = null,
    onCaseCreated = () => {}
  } = props || {};

  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [extractingFacts, setExtractingFacts] = useState(false);
  const [aiStatus, setAiStatus] = useState('checking'); // checking, connected, fallback
  const [systemInfo, setSystemInfo] = useState(null);
  const [sessionId, setSessionId] = useState(null); // Session for AI requests
  const [formError, setFormError] = useState(''); // Form validation errors
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Ensure setMessages is a function to prevent runtime errors
  const safeSetMessages = typeof setMessages === "function" ? setMessages : () => {};

  // Expose methods to parent - command and control
  useImperativeHandle(ref, () => ({
    addMessage: (message) => {
      safeSetMessages(prev => [...prev, message]);
    },
    clearChat: () => {
      safeSetMessages([]);
      // Clear context through secure IPC if session exists
      if (sessionId && window.justiceAPI) {
        window.justiceAPI.aiClearSession(sessionId).catch(console.error);
      }
    },
    getSystemInfo: () => systemInfo
  }), [safeSetMessages, sessionId, systemInfo]);

  // System initialization - ULTRA-THINK startup sequence
  useEffect(() => {
    const initializeSystem = async () => {
      console.log('🤖 ULTRA-THINK: Initializing Justice Companion AI...');

      // Check system requirements
      const sysCheck = await SystemChecker.checkAll();
      setSystemInfo(sysCheck);

      // Initialize AI connection through secure IPC
      if (window.justiceAPI) {
        try {
          // Create secure session first
          const sessionResult = await window.justiceAPI.createSession();
          if (sessionResult.success) {
            setSessionId(sessionResult.sessionId);
            console.log("🔒 Secure session created:", sessionResult.sessionId);
          }

          // Check AI health with retries to allow Ollama time to connect
          let ollamaConnected = false;
          let attempts = 0;
          const maxAttempts = 5;

          while (!ollamaConnected && attempts < maxAttempts) {
            attempts++;
            const aiHealthResult = await window.justiceAPI.aiHealth();

            // Check if Ollama is connected
            ollamaConnected =
              aiHealthResult.mode === 'ollama' ||
              aiHealthResult.status === 'healthy' ||
              (aiHealthResult.health && aiHealthResult.health.available) ||
              (aiHealthResult.success && aiHealthResult.mode === 'ollama');

            if (!ollamaConnected && attempts < maxAttempts) {
              console.log(`🔄 Waiting for Ollama connection... (attempt ${attempts}/${maxAttempts})`);
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            }
          }

          setAiStatus(ollamaConnected ? "connected" : "fallback");

          console.log('🎯 ULTRA-THINK: System status:', {
            ai: ollamaConnected ? 'OLLAMA READY' : 'FALLBACK MODE',
            overall: sysCheck.status,
            sessionId: sessionResult.sessionId,
            attempts: attempts
          });
        } catch (error) {
          console.error("🔥 AI initialization failed:", error);
          setAiStatus("fallback");
        }
      } else {
        console.error("🚨 Justice API not available");
        setAiStatus("fallback");
      }
    };

    initializeSystem();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount for better UX
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Listen for reset chat events from sidebar
  useEffect(() => {
    const handleResetChat = () => {
      console.log('🔄 Resetting chat conversation...');
      safeSetMessages([]);
      setInputValue('');
      setIsTyping(false);
      setExtractingFacts(false);
      setFormError('');

      // Clear AI session if available
      if (sessionId && window.justiceAPI?.aiClearSession) {
        window.justiceAPI.aiClearSession(sessionId).catch(console.error);
      }

      // Focus input after reset
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    };

    window.addEventListener('resetChat', handleResetChat);
    return () => {
      window.removeEventListener('resetChat', handleResetChat);
    };
  }, [sessionId, safeSetMessages]);

  // Initial greeting when no messages exist or when AI status changes
  useEffect(() => {
    const greeting = {
      type: 'ai',
      content: `**Welcome to Justice Companion** ⚖️

${aiStatus === 'connected' ? '🤖 **AI Status**: Connected - Full assistance available' :
  aiStatus === 'checking' ? '🔍 **System Status**: Initializing AI connection...' :
  '⚠️ **Tactical Mode**: Using enhanced local capabilities'}

I'm here to help you understand your legal situation and explore your options. Whether you're facing housing issues, employment problems, consumer disputes, or other legal challenges, I'm here to provide guidance.

**What I can help you with:**
• **Housing Law** - Tenant rights, landlord disputes, eviction notices
• **Employment Issues** - Workplace rights, unfair dismissal, wage disputes
• **Consumer Rights** - Faulty goods, service complaints, contract issues
• **Benefits & Welfare** - Appeal processes, entitlement questions
• **Document Organization** - Helping you structure your evidence
• **Legal Process Guidance** - Understanding court procedures and deadlines
• **Resource Location** - Finding appropriate legal aid and support services

${currentCase ? `I see you're working on: **"${currentCase.title}"**.

**Quick Actions for Your Case:**
- Ask questions about your specific situation
- Upload and discuss relevant documents
- Get help preparing for legal meetings
- Review important deadlines and next steps

What would you like to focus on today?` : 'To get started, please describe your legal situation. Don\'t worry about using exact legal terms - just explain what\'s happening in your own words.'}

**Important Disclaimer:** This service provides legal information and guidance, not formal legal advice. While I can help you understand your rights and options, for matters requiring legal representation or formal advice, please consult with a qualified solicitor or legal aid service.

**Confidentiality Note:** Our conversation is private and secure. No personal information is shared with third parties.

How can I assist you with your legal matter today?`,
      timestamp: new Date().toISOString(),
      metadata: {
        aiMode: aiStatus,
        systemStatus: systemInfo?.status || 'checking'
      }
    };

    if (typeof safeSetMessages === 'function') {
      if (!messages || messages.length === 0) {
        // Create initial welcome message
        safeSetMessages([greeting]);
      } else if (messages.length > 0 && messages[0] && messages[0].type === 'ai' && messages[0].content && messages[0].content.includes('Welcome to Justice Companion')) {
        // Update existing welcome message with new AI status
        safeSetMessages(prev => [greeting, ...prev.slice(1)]);
      }
    }
  }, [currentCase, aiStatus, systemInfo]);

  // Process user input with enhanced AI capabilities
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear any previous errors
    setFormError('');

    // Form validation
    if (!inputValue.trim()) {
      setFormError('Please describe your legal situation to get started');
      return;
    }

    if (inputValue.trim().length < 10) {
      setFormError('Please provide more details about your situation');
      return;
    }

    const userMessage = {
      type: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    };

    safeSetMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    try {
      // Extract facts first
      await extractFacts(currentInput);

      // Process with AI (Ollama or enhanced fallback)
      await processWithEnhancedAI(currentInput);
    } catch (error) {
      console.error('🔥 Message processing failed:', error);
      safeSetMessages(prev => [...prev, {
        type: 'error',
        content: `An error occurred, but I'm still here to help. Error: ${error.message}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle keyboard events
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow Shift+Enter for new lines
        return;
      } else {
        // Submit on Enter
        e.preventDefault();
        handleSubmit(e);
      }
    }
  };

  // Get appropriate label for fact type
  const getFactLabel = (type, value) => {
    const labels = {
      money: 'Amount',
      date: 'Date',
      dates: 'Date',
      names: 'Person/Entity',
      addresses: 'Address',
      emails: 'Email',
      phones: 'Phone',
      postcodes: 'Postcode',
      legalRefs: 'Legal Reference'
    };
    return labels[type] || 'Information';
  };

  // Enhanced fact extraction with legal context
  const extractFacts = async (text) => {
    setExtractingFacts(true);

    // Enhanced patterns for UK legal context
    const patterns = {
      money: /£(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
      date: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/gi,
      names: /(?:landlord|tenant|company|officer|manager|owner|solicitor)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
      addresses: /\d+\s+[A-Z][a-z]+\s+(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Court|Ct)/gi,
      emails: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
      phones: /(?:0[1-9]|07)\d{9}|\+44\s?\d{10}/gi,
      postcodes: /[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/gi,
      legalRefs: /(?:Section|Sec\.?)\s*(\d+[A-Za-z]?)|(?:Schedule|Sch\.?)\s*(\d+)/gi
    };

    const foundFacts = [];

    // Extract all fact types
    Object.entries(patterns).forEach(([type, pattern]) => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        foundFacts.push({
          type: type,
          label: getFactLabel(type, match[0]),
          value: match[0],
          context: match.input.substring(Math.max(0, match.index - 30), match.index + match[0].length + 30)
        });
      }
    });

    // Trigger fact confirmation for found facts
    if (foundFacts.length > 0) {
      onFactFound(foundFacts[0]);

      safeSetMessages(prev => [...prev, {
        type: 'system',
        content: `🔍 **FACT EXTRACTION**: Found ${foundFacts.length} verifiable fact(s) - ${foundFacts.map(f => f.type).join(', ')}`,
        timestamp: new Date().toISOString()
      }]);
    }

    setExtractingFacts(false);
  };

  // Enhanced AI processing with Ollama integration
  const processWithEnhancedAI = async (input) => {
    try {
      let response;

      // Check AI availability directly instead of relying on state
      if (window.justiceAPI && sessionId) {
        console.log('🤖 Checking AI availability...');

        // Check current AI status dynamically
        const currentAIStatus = await window.justiceAPI.aiHealth();
        const isAIAvailable =
          currentAIStatus.mode === 'ollama' ||
          currentAIStatus.status === 'healthy';

        if (isAIAvailable) {
          console.log('🤖 Ollama is available, making AI request...');
          const aiResult = await window.justiceAPI.aiChat(input, sessionId, {
            temperature: 0.3,
            max_tokens: 2048,
            context: currentCase ? {
              caseId: currentCase.id,
              caseType: currentCase.type,
              caseTitle: currentCase.title
            } : null
          });

          if (aiResult.success) {
            response = aiResult.response;
            console.log('✅ AI response received via Ollama');

            safeSetMessages(prev => [...prev, {
              type: 'ai',
              content: response,
              timestamp: new Date().toISOString(),
              metadata: {
                mode: 'ollama',
                model: aiResult.model || 'llama3.1:8b',
                processingTime: aiResult.processingTime,
                fallback: false,
                sessionId: sessionId
              }
            }]);
            return; // Exit early on success
          } else {
            throw new Error(aiResult.error || 'AI request failed');
          }
        } else {
          console.log('⚠️ Ollama not available, using fallback');
        }
      }

      // Enhanced fallback responses when AI is not available
      response = getFallbackResponse(input);

      safeSetMessages(prev => [...prev, {
        type: 'ai',
        content: response,
        timestamp: new Date().toISOString(),
        metadata: {
          mode: 'fallback',
          enhanced: true
        }
      }]);

    } catch (error) {
      console.error('🔥 AI processing error:', error);

      // Emergency fallback
      safeSetMessages(prev => [...prev, {
        type: 'error',
        content: `The AI system encountered an issue, but I'm still available to assist. Please try again - how can I help you?`,
        timestamp: new Date().toISOString(),
        metadata: { error: error.message }
      }]);
    }
  };

  // Get status indicator color
  const getStatusColor = () => {
    switch (aiStatus) {
      case 'connected': return '#28a745';
      case 'fallback': return '#ffc107';
      default: return '#6c757d';
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (aiStatus) {
      case 'connected': return '🤖 AI Engine Online';
      case 'fallback': return '⚠️ Tactical Mode';
      default: return '🔍 System Check';
    }
  };

  return (
    <div className="chat-interface enhanced" role="main" aria-label="Legal assistance chat interface">
      {/* Enhanced Header with System Status */}
      <div className="chat-header enhanced">
        <div className="header-main">
          <h1 id="chat-title">{currentCase ? currentCase.title : 'Legal Assistance Chat'}</h1>
          <div className="status-indicators" role="status" aria-live="polite">
            <span
              className="ai-status"
              style={{ color: getStatusColor() }}
              title={`AI Status: ${aiStatus}`}
              aria-label={`AI assistance status: ${getStatusText()}`}
            >
              {getStatusText()}
            </span>
            {systemInfo && (
              <span
                className="system-status"
                title={`System: ${systemInfo.status}`}
                aria-label={`System status: ${systemInfo.status}`}
              >
                {systemInfo.status === 'ok' ? '🟢' : systemInfo.status === 'warning' ? '🟡' : '🔴'}
              </span>
            )}
          </div>
        </div>

        <div className="activity-indicators">
          {extractingFacts && (
            <span className="activity extracting">🔍 Scanning for facts...</span>
          )}
          {isTyping && (
            <span className="activity typing">
              📤 Processing
            </span>
          )}
        </div>
      </div>

      {/* Messages area - Enhanced with metadata display */}
      <div
        className="messages-container enhanced"
        role="log"
        aria-live="polite"
        aria-label="Chat conversation history"
      >
        {(messages || []).map((msg, idx) => (
          <div
            key={idx}
            className={`message ${msg.type} enhanced`}
            role="article"
            aria-label={`${msg?.type === 'user' ? 'Your message' : msg?.type === 'ai' ? 'AI response' : 'System message'} from ${new Date(msg?.timestamp).toLocaleTimeString()}`}
          >
            <div className="message-content">
              {(() => {
                try {
                  const safeContent = String(msg?.content || '');
                  if (!safeContent) return 'No content';
                  const lines = safeContent.split('\n');
                  return lines.map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      {i < lines.length - 1 && <br />}
                    </React.Fragment>
                  ));
                } catch (error) {
                  console.error('Error rendering enhanced message content:', error, msg);
                  return 'Error displaying message';
                }
              })()}
            </div>

            <div className="message-footer">
              <div className="message-time">
                {new Date(msg?.timestamp || Date.now()).toLocaleTimeString()}
              </div>
              {msg.metadata && (
                <div className="message-metadata">
                  {msg.metadata.mode && (
                    <span className={`mode-badge ${msg.metadata.mode}`}>
                      {msg.metadata.mode.toUpperCase()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="message ai typing enhanced">
            <div className="typing-indicator enhanced">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div className="typing-text">
              {aiStatus === 'connected' ? 'AI analyzing your case...' : 'Building tactical response...'}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Input area */}
      <form onSubmit={handleSubmit} className="input-area enhanced">
        <div className="input-wrapper">
          <label htmlFor="chat-input" className="sr-only">
            Describe your legal situation
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentCase
              ? "Ask about your case, add details, or request guidance..."
              : "Message Legal Assistant"
            }
            className="chat-input enhanced"
            disabled={isTyping}
            aria-describedby="input-help"
            aria-label="Describe your legal situation"
            maxLength={2000}
            rows={1}
            style={{ resize: 'none', overflow: 'hidden' }}
          />
          <button
            type="submit"
            data-testid="send-button"
            className={`send-button enhanced ${aiStatus}`}
            disabled={isTyping}
            aria-label={isTyping ? 'Processing your message' : 'Send message'}
          >
            {isTyping ? '⏳' : '📤 Send'}
          </button>
        </div>
        {formError && (
          <div className="form-error" role="alert" aria-live="assertive">
            {formError}
          </div>
        )}
        <div id="input-help" className="input-help">
          <p>💡 <strong>Tips:</strong> Describe what happened, when it occurred, and what outcome you're seeking</p>
          <p>🔒 <strong>Privacy:</strong> Your conversation is confidential and secure</p>
          <p>⚖️ <strong>Legal Note:</strong> This provides guidance, not formal legal advice</p>
        </div>
      </form>

      {/* Enhanced Disclaimer with system info */}
      <div className="disclaimer-bar enhanced">
        <span className="disclaimer-text">
          ⚠️ Information only—not legal advice. Verify everything.
        </span>
        {systemInfo && systemInfo.status !== 'ok' && (
          <span className="system-warning">
            System issues detected - check settings for details.
          </span>
        )}
      </div>
    </div>
  );
});

EnhancedChatInterface.displayName = 'EnhancedChatInterface';

export default EnhancedChatInterface;

// ULTRA-THINK MODE: This component is dedicated to everyone who's been told
// Enhanced AI-powered legal assistance
// Helping users understand their rights and options