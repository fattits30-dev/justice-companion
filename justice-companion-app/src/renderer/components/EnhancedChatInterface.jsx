import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import OllamaClient from '../lib/OllamaClient';
import SystemChecker from '../lib/SystemChecker';
import './ChatInterface.css';

// Enhanced ChatInterface with REAL AI integration
// ULTRA-THINK MODE: Where pain transforms into AI-powered strategy
// Built from pain, powered by truth, enhanced by Ollama

const EnhancedChatInterface = forwardRef(({ currentCase, messages, setMessages, onFactFound }, ref) => {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [extractingFacts, setExtractingFacts] = useState(false);
  const [aiStatus, setAiStatus] = useState('checking'); // checking, connected, fallback
  const [systemInfo, setSystemInfo] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Expose methods to parent - command and control
  useImperativeHandle(ref, () => ({
    addMessage: (message) => {
      setMessages(prev => [...prev, message]);
    },
    clearChat: () => {
      setMessages([]);
      OllamaClient.clearContext();
    },
    getSystemInfo: () => systemInfo
  }));

  // System initialization - ULTRA-THINK startup sequence
  useEffect(() => {
    const initializeSystem = async () => {
      console.log('🤖 ULTRA-THINK: Initializing Justice Companion AI...');

      // Check system requirements
      const sysCheck = await SystemChecker.checkAll();
      setSystemInfo(sysCheck);

      // Initialize AI connection
      const ollamaConnected = await OllamaClient.checkConnection();
      setAiStatus(ollamaConnected ? 'connected' : 'fallback');

      console.log('🎯 ULTRA-THINK: System status:', {
        ai: ollamaConnected ? 'OLLAMA READY' : 'FALLBACK MODE',
        overall: sysCheck.status
      });
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

  // Initial greeting when no messages exist
  useEffect(() => {
    if (messages.length === 0) {
      const greeting = {
        type: 'ai',
        content: `**Welcome to Justice Companion** ⚖️

${aiStatus === 'connected' ? '🤖 **AI Status**: Connected - Full assistance available' : '⚠️ **Offline Mode**: Using local resources'}

I'm here to help you understand your legal situation and explore your options.

While I'm not a lawyer and cannot provide formal legal advice, I can help you:
• Understand your rights and responsibilities
• Organize important documents
• Prepare questions for legal professionals
• Find relevant resources and information

${currentCase ? `I see you're working on: **"${currentCase.title}"**. How can I assist you today?` : 'Please describe your legal situation, and I\'ll do my best to provide helpful information.'}

**Note:** This service provides legal information, not legal advice. For specific counsel, please consult a qualified attorney.

How can I help you today?`,
        timestamp: new Date().toISOString(),
        metadata: {
          aiMode: aiStatus,
          systemStatus: systemInfo?.status || 'checking'
        }
      };
      setMessages([greeting]);
    }
  }, [currentCase, aiStatus, systemInfo]);

  // Process user input with enhanced AI capabilities
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = {
      type: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
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
      setMessages(prev => [...prev, {
        type: 'error',
        content: `An error occurred, but I'm still here to help. Error: ${error.message}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Enhanced fact extraction with legal context
  const extractFacts = async (text) => {
    setExtractingFacts(true);

    // Enhanced patterns for UK legal context
    const patterns = {
      money: /£(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
      dates: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/gi,
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
          label: this.getFactLabel(type, match[0]),
          value: match[0],
          context: match.input.substring(Math.max(0, match.index - 30), match.index + match[0].length + 30)
        });
      }
    });

    // Trigger fact confirmation for found facts
    if (foundFacts.length > 0) {
      onFactFound(foundFacts[0]);

      setMessages(prev => [...prev, {
        type: 'system',
        content: `🔍 **FACT EXTRACTION**: Found ${foundFacts.length} verifiable fact(s) - ${foundFacts.map(f => f.type).join(', ')}`,
        timestamp: new Date().toISOString()
      }]);
    }

    setExtractingFacts(false);
  };

  // Get appropriate label for fact type
  getFactLabel = (type, value) => {
    const labels = {
      money: 'Amount',
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

  // Enhanced AI processing with Ollama integration
  const processWithEnhancedAI = async (input) => {
    try {
      let response;

      if (aiStatus === 'connected') {
        // Use Ollama for full AI processing
        response = await OllamaClient.generateResponse(input, currentCase);

        // Add AI metadata
        setMessages(prev => [...prev, {
          type: 'ai',
          content: response,
          timestamp: new Date().toISOString(),
          metadata: {
            mode: 'ollama',
            model: OllamaClient.model,
            hasContext: OllamaClient.conversationContext.length > 0
          }
        }]);
      } else {
        // Enhanced fallback responses
        response = OllamaClient.getFallbackResponse(input);

        setMessages(prev => [...prev, {
          type: 'ai',
          content: response,
          timestamp: new Date().toISOString(),
          metadata: {
            mode: 'fallback',
            enhanced: true
          }
        }]);
      }

    } catch (error) {
      console.error('🔥 AI processing error:', error);

      // Emergency fallback
      setMessages(prev => [...prev, {
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
    <div className="chat-interface enhanced">
      {/* Enhanced Header with System Status */}
      <div className="chat-header enhanced">
        <div className="header-main">
          <h2>{currentCase ? currentCase.title : 'New Battle'}</h2>
          <div className="status-indicators">
            <span
              className="ai-status"
              style={{ color: getStatusColor() }}
              title={`AI Status: ${aiStatus}`}
            >
              {getStatusText()}
            </span>
            {systemInfo && (
              <span
                className="system-status"
                title={`System: ${systemInfo.status}`}
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
              {aiStatus === 'connected' ? '🤖 AI strategizing...' : '⚔️ Tactical analysis...'}
            </span>
          )}
        </div>
      </div>

      {/* Messages area - Enhanced with metadata display */}
      <div className="messages-container enhanced">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.type} enhanced`}>
            <div className="message-content">
              {msg.content.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < msg.content.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </div>

            <div className="message-footer">
              <div className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString()}
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
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={currentCase ? "Describe your situation..." : "Tell me what happened..."}
          className="chat-input enhanced"
          disabled={isTyping}
        />
        <button
          type="submit"
          className={`send-button enhanced ${aiStatus}`}
          disabled={!inputValue.trim() || isTyping}
        >
          {isTyping ? '...' : 'FIGHT'}
        </button>
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