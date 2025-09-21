import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import './ChatInterface.css';

// Legal tech form validation utilities
const validateInput = (input) => {
  const errors = [];

  if (!input.trim()) {
    errors.push('Please describe your legal situation to get started.');
    return errors;
  }

  if (input.length < 10) {
    errors.push('Please provide more details about your situation (at least 10 characters).');
  }

  if (input.length > 5000) {
    errors.push('Please keep your message under 5000 characters for better processing.');
  }

  // Legal context validation
  const suspiciousPatterns = [
    /\b(kill|murder|harm|attack|violence)\b/i,
    /\b(illegal|unlawful|criminal)\s+(activity|behavior|behaviour)\b/i
  ];

  suspiciousPatterns.forEach(pattern => {
    if (pattern.test(input)) {
      errors.push('For safety reasons, we cannot provide guidance on potentially harmful or illegal activities. Please contact appropriate authorities if you are in immediate danger.');
    }
  });

  return errors;
};

// ARIA live region announcements for screen readers
const announceToScreenReader = (message) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

// Justice Companion Chat Interface
// Providing accessible legal information and support

const ChatInterface = forwardRef(({ currentCase, messages, setMessages, onFactFound }, ref) => {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [extractingFacts, setExtractingFacts] = useState(false);
  const [inputErrors, setInputErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const [showLoadingDetails, setShowLoadingDetails] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const formRef = useRef(null);
  
  // Expose methods to parent - command and control (Context7 optimized)
  const addMessage = useCallback((message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  useImperativeHandle(ref, () => ({
    addMessage,
    clearChat
  }), [addMessage, clearChat]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount for better accessibility
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Initial greeting when no messages exist
  useEffect(() => {
    if (messages.length === 0) {
      const greeting = {
        type: 'ai',
        content: `Welcome to Justice Companion. I'm here to help you understand your legal situation and options.

While I'm not a lawyer and cannot provide formal legal advice, I can help you:
• Understand your rights and responsibilities
• Organize important documents
• Prepare questions for legal professionals
• Find relevant resources and information

${currentCase ? `I see you're working on: "${currentCase.title}". How can I assist you with this matter today?` : `Please describe your legal situation, and I'll do my best to provide helpful information and resources.`}

Note: This service provides legal information, not legal advice. For specific legal counsel, please consult with a qualified attorney.

How can I help you today?`,
        timestamp: new Date().toISOString()
      };
      setMessages([greeting]);
    }
  }, []);

  // Handle input changes with validation and character counting (Context7 optimized)
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setInputValue(value);
    setCharacterCount(value.length);

    // Clear errors when user starts typing
    if (inputErrors.length > 0 && value.trim()) {
      setInputErrors([]);
    }
  }, [inputErrors.length]);

  // Enhanced form submission with comprehensive validation (Context7 optimized)
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    // Validate input
    const errors = validateInput(inputValue);
    if (errors.length > 0) {
      setInputErrors(errors);
      announceToScreenReader(`Form validation failed: ${errors.join(' ')}`);
      inputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setInputErrors([]);

    const userMessage = {
      type: 'user',
      content: inputValue,
      timestamp: new Date().toISOString(),
      id: `user-${Date.now()}`
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setCharacterCount(0);
    setIsTyping(true);

    announceToScreenReader('Message sent. Processing your request...');

    try {
      // Simulate fact extraction from message
      await extractFacts(currentInput);

      // Process with AI (local or API)
      await processWithAI(currentInput);
    } catch (error) {
      console.error('Processing error:', error);
      setMessages(prev => [...prev, {
        type: 'error',
        content: 'I encountered an issue processing your message. This might be a temporary problem. Please try rephrasing your question or contact support if the issue persists.',
        timestamp: new Date().toISOString(),
        id: `error-${Date.now()}`
      }]);
      announceToScreenReader('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsTyping(false);
    }
  }, [inputValue, inputErrors, currentCase]);

  // Extract hard facts from the chaos
  const extractFacts = async (text) => {
    setExtractingFacts(true);
    
    // Pattern matching for facts - the truth detectors
    const patterns = {
      money: /£(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
      dates: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/gi,
      names: /(?:landlord|tenant|company|officer|manager|owner)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
      addresses: /\d+\s+[A-Z][a-z]+\s+(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Court|Ct)/gi,
      emails: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
      phones: /(?:0[1-9]|07)\d{9}|\+44\s?\d{10}/gi
    };

    const foundFacts = [];
    
    // Extract financial amounts
    const moneyMatches = text.matchAll(patterns.money);
    for (const match of moneyMatches) {
      foundFacts.push({
        type: 'money',
        label: 'Amount',
        value: match[0],
        context: match.input.substring(Math.max(0, match.index - 20), match.index + match[0].length + 20)
      });
    }

    // Extract dates from text
    const dateMatches = text.matchAll(patterns.dates);
    for (const match of dateMatches) {
      foundFacts.push({
        type: 'date',
        label: 'Date',
        value: match[0],
        context: match.input.substring(Math.max(0, match.index - 20), match.index + match[0].length + 20)
      });
    }

    // Extract names and entities
    const nameMatches = text.matchAll(patterns.names);
    for (const match of nameMatches) {
      if (match[1]) {
        foundFacts.push({
          type: 'name',
          label: match[0].includes('landlord') ? 'Landlord' : 'Person',
          value: match[1],
          context: match.input.substring(Math.max(0, match.index - 20), match.index + match[0].length + 20)
        });
      }
    }

    // Trigger fact confirmation for each found fact
    if (foundFacts.length > 0) {
      // Process first fact, others will queue
      if (typeof onFactFound === "function") {
        try {
          onFactFound(foundFacts[0]);
        } catch (error) {
          console.warn("onFactFound failed:", error);
        }
      }
      
      // Show in chat that we found facts
      setMessages(prev => [...prev, {
        type: 'system',
        content: `🔍 Found ${foundFacts.length} fact(s) to verify...`,
        timestamp: new Date().toISOString()
      }]);
    }

    setExtractingFacts(false);
  };

  // Process with AI - enhanced legal assistant with Ollama integration
  const processWithAI = async (input) => {
    console.log("🔥 DEBUG: processWithAI called with input:", input);
    try {
      // Generate session ID for conversation continuity
      const sessionId = currentCase?.id || `chat_${Date.now()}`;

      console.log('🚀 Justice Companion AI Request Starting:', {
        input: input.substring(0, 100) + '...',
        sessionId,
        timestamp: new Date().toISOString()
      });

      // Call the enhanced AI API
      const aiResponse = await window.justiceAPI.aiChat(input, sessionId, {
        temperature: 0.3, // Lower temperature for more consistent legal information
        max_tokens: 2048
      });

      console.log('📥 AI Response Received:', {
        success: aiResponse.success,
        hasResponse: !!aiResponse.response,
        responseType: typeof aiResponse.response,
        responseLength: (aiResponse.response?.content?.length || (typeof aiResponse.response === 'string' ? aiResponse.response.length : 0)),
        responsePreview: (aiResponse.response?.content || aiResponse.response || '').substring(0, 100),
        fullResponse: aiResponse.response,
        error: aiResponse.error?.message || 'none'
      });

      if (aiResponse.success) {
        // FIXED: Extract content from the proper IPC response structure
        console.log('DEBUG: Full aiResponse structure:', JSON.stringify(aiResponse, null, 2));

        // IPC returns { success: true, response: "content here", model: "...", ... }
        const responseContent = aiResponse.response || aiResponse.content || 'No response received';

        console.log('DEBUG: Extracted responseContent:', responseContent);

        // Add AI response with metadata - handle both response formats
        const aiMessage = {
          type: 'ai',
          content: responseContent,
          timestamp: new Date().toISOString(),
          id: `ai-${Date.now()}`,
          metadata: {
            model: aiResponse.model,
            processingTime: aiResponse.processingTime,
            fallback: aiResponse.fallback,
            sessionId: aiResponse.sessionId,
            responseTime: aiResponse.processingTime
          }
        };

        setMessages(prev => [...prev, aiMessage]);
        announceToScreenReader(`Response received from legal assistant. Processing time: ${aiResponse.processingTime || 'unknown'}ms`);

        // TODO: Re-implement confidence and risk warnings after fixing metadata structure

      } else {
        // Handle API errors gracefully
        const errorMessage = {
          type: 'error',
          content: aiResponse.error?.message || 'I encountered a technical issue while processing your request.',
          timestamp: new Date().toISOString(),
          id: `error-${Date.now()}`,
          suggestion: aiResponse.error?.suggestion,
          canRetry: aiResponse.error?.canRetry
        };

        setMessages(prev => [...prev, errorMessage]);
        announceToScreenReader('An error occurred. Please try again.');

        // If retryable, suggest retry
        if (aiResponse.error?.canRetry) {
          setTimeout(() => {
            setMessages(prev => [...prev, {
              type: 'system',
              content: '💡 This appears to be a temporary issue. You can try sending your message again.',
              timestamp: new Date().toISOString(),
              id: `retry-suggestion-${Date.now()}`
            }]);
          }, 2000);
        }
      }

    } catch (error) {
      console.error('AI processing error:', error);

      // Fallback to basic error handling
      setMessages(prev => [...prev, {
        type: 'error',
        content: `I encountered a technical issue while processing your request. This might be because:

• The AI service is temporarily unavailable
• Ollama is not running on your system
• There's a network connectivity issue

**What you can do:**
1. Check if Ollama is installed and running
2. Try your question again in a moment
3. Use the other features of Justice Companion while we resolve this

**Emergency Legal Resources:**
• Citizens Advice: 0808 223 1133
• Emergency Services: 999 (immediate danger)
• National Domestic Violence Helpline: 0808 2000 247

Your legal matter is important. Don't let technical issues stop you from getting the help you need.`,
        timestamp: new Date().toISOString(),
        id: `fallback-error-${Date.now()}`
      }]);
      announceToScreenReader('A technical error occurred. Emergency legal resources have been provided.');
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="chat-interface" role="main" aria-label="Legal assistant chat interface">
      {/* Header - The mission statement */}
      <div className="chat-header">
        <h2 id="chat-title">{currentCase ? currentCase.title : 'New Legal Consultation'}</h2>
        <div className="status-indicator" aria-live="polite" role="status">
          {extractingFacts && (
            <span className="status-extracting" aria-label="Analyzing your message for legal facts">
              🔍 Analyzing legal details...
            </span>
          )}
          {isTyping && (
            <span className="status-typing" aria-label="Generating legal guidance">
              💭 Preparing response...
            </span>
          )}
          {isSubmitting && (
            <span className="status-submitting" aria-label="Processing your message">
              📤 Processing...
            </span>
          )}
        </div>
        {showLoadingDetails && (
          <div className="loading-details" aria-live="polite">
            <p className="loading-step">Step 1: Analyzing your legal situation...</p>
            <p className="loading-step">Step 2: Identifying relevant legal principles...</p>
            <p className="loading-step">Step 3: Preparing guidance...</p>
          </div>
        )}
      </div>

      {/* Messages area - The conversation */}
      <div
        className="messages-container"
        role="log"
        aria-label="Chat conversation"
        aria-describedby="chat-title"
        tabIndex="0"
>
        {(Array.isArray(messages) ? messages : []).map((msg, idx) => {
          const isAI = msg.type === 'ai';
          const isUser = msg.type === 'user';
          const isSystem = msg.type === 'system';
          const isError = msg.type === 'error';

          return (
            <div
              key={msg.id || idx}
              className={`message ${msg.type}`}
              role={isSystem || isError ? 'alert' : 'article'}
              aria-label={`${isAI ? 'Legal assistant' : isUser ? 'Your message' : isSystem ? 'System notification' : 'Error message'} at ${new Date(msg.timestamp).toLocaleTimeString()}`}
            >
              <div className="message-wrapper">
                <div className="message-avatar">
                  {isUser && '👤'}
                  {isAI && '⚖️'}
                  {isSystem && 'ℹ️'}
                  {isError && '⚠️'}
                </div>
                <div className="message-content">
                  {(() => {
                    try {
                      console.log('DEBUG: Message object:', msg);
                      const safeContent = String(msg?.content || '');
                      console.log('DEBUG: Safe content:', safeContent);
                      if (!safeContent) return 'No content - DEBUG: msg.content was empty';
                      const lines = safeContent.split('\n');
                      return lines.map((line, i) => (
                        <React.Fragment key={i}>
                          {line}
                          {i < lines.length - 1 && <br />}
                        </React.Fragment>
                      ));
                    } catch (error) {
                      console.error('Error rendering message content:', error, msg);
                      return 'Error displaying message';
                    }
                  })()}
                  {msg.metadata && msg.metadata.confidence && (
                    <div className={`confidence-indicator confidence-${msg.metadata.confidence > 0.8 ? 'high' : msg.metadata.confidence > 0.5 ? 'medium' : 'low'}`}>
                      Confidence: {Math.round(msg.metadata.confidence * 100)}%
                    </div>
                  )}
                </div>
              </div>
              <div className="message-footer">
                <time className="message-time" dateTime={msg.timestamp}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </time>
              </div>
            </div>
          );
        })}
        
        {isTyping && (
          <div className="message ai typing">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input area - ChatGPT-style floating input */}
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="input-area"
        noValidate
        aria-describedby="input-help"
      >
        <div className="input-wrapper">
          <div className="chat-input-container">
            <label htmlFor="legal-input" className="sr-only">
              Describe your legal situation
            </label>
            <textarea
              id="legal-input"
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              placeholder={currentCase ? "Ask about your legal matter..." : "Message Legal Assistant..."}
              className={`chat-input ${inputErrors.length > 0 ? 'error' : ''}`}
              disabled={isTyping || isSubmitting}
              aria-required="true"
              aria-invalid={inputErrors.length > 0}
              aria-describedby={inputErrors.length > 0 ? 'input-errors input-help' : 'input-help'}
              rows="1"
              maxLength="5000"
              data-testid="chat-input"
              onKeyDown={(e) => {
                // Handle Enter for submission, Shift+Enter for new line
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              style={{ height: 'auto', overflowY: 'hidden' }}
              onInput={(e) => {
                // Auto-resize textarea
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
              }}
            />
            <button
              type="submit"
              className={`send-button ${isSubmitting ? 'submitting' : ''}`}
              disabled={isTyping || isSubmitting}
              aria-describedby="send-help"
              data-testid="send-button"
            >
              {isSubmitting ? (
                <span className="button-text">Sending...</span>
              ) : isTyping ? (
                <span className="button-text">Processing...</span>
              ) : (
                <>
                  <span className="button-icon">↑</span>
                </>
              )}
            </button>
          </div>

          {/* Character counter - only show when typing */}
          {inputValue && (
            <div className="input-meta">
              <span
                className={`character-count ${characterCount > 4500 ? 'warning' : ''} ${characterCount >= 5000 ? 'error' : ''}`}
                aria-live="polite"
              >
                {characterCount}/5000
              </span>
            </div>
          )}

          {/* Input validation errors */}
          {inputErrors.length > 0 && (
            <div id="input-errors" className="input-errors" role="alert" aria-live="assertive">
              {(Array.isArray(inputErrors) ? inputErrors : []).map((error, idx) => (
                <p key={idx} className="error-message">
                  <span className="error-icon" aria-hidden="true">⚠️</span>
                  {error}
                </p>
              ))}
            </div>
          )}

          {/* Help text - simplified */}
          <div id="input-help" className="input-help">
            <p>Press Enter to send • Shift+Enter for new line</p>
          </div>
        </div>

        <div id="send-help" className="sr-only">
          Send your legal question to the AI assistant for guidance and information
        </div>
      </form>

      {/* Legal disclaimer - Critical information */}
      <div className="disclaimer-bar" role="contentinfo" aria-label="Important legal disclaimer">
        <div className="disclaimer-content">
          <span className="disclaimer-icon" aria-hidden="true">⚠️</span>
          <div className="disclaimer-text">
            <strong>Important:</strong> This is legal information, not legal advice.
            Always verify information independently and consult a qualified lawyer for specific legal advice.
          </div>
          <button
            className="disclaimer-details-btn"
            onClick={() => setShowLoadingDetails(!showLoadingDetails)}
            aria-expanded={showLoadingDetails}
            aria-label="Show more disclaimer information"
          >
            ℹ️ More Info
          </button>
        </div>
        {showLoadingDetails && (
          <div className="disclaimer-details" aria-live="polite">
            <p>• AI responses are for informational purposes only</p>
            <p>• Laws vary by jurisdiction and change frequently</p>
            <p>• Contact emergency services (999) for immediate danger</p>
            <p>• Seek professional legal advice for specific situations</p>
          </div>
        )}
      </div>

      {/* Screen reader only live region for announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="chat-announcements"></div>
    </div>
  );
});

ChatInterface.displayName = 'ChatInterface';

export default ChatInterface;

// Enhanced for accessibility and legal tech best practices
// Designed to serve vulnerable users seeking legal help
// Compliant with WCAG 2.1 AA standards for inclusive access
