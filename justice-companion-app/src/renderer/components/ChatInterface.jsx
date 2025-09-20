import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import './ChatInterface.css';

// The beating heart of Justice Companion
// Where pain transforms into power
// Where stories become strategies
// Where the forgotten find their fucking voice

const ChatInterface = forwardRef(({ currentCase, messages, setMessages, onFactFound }, ref) => {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [extractingFacts, setExtractingFacts] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Expose methods to parent - command and control
  useImperativeHandle(ref, () => ({
    addMessage: (message) => {
      setMessages(prev => [...prev, message]);
    },
    clearChat: () => {
      setMessages([]);
    }
  }));

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount - ready for battle
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Initial greeting when no messages exist
  useEffect(() => {
    if (messages.length === 0) {
      const greeting = {
        type: 'ai',
        content: `Listen up. I'm not a lawyer—I'm your digital ally in this fight. 

I won't bullshit you with legal jargon or false promises. What I WILL do is help you understand your rights, organize your evidence, draft your documents, and fight back against the system that counts on you staying silent.

${currentCase ? `I see you're working on: "${currentCase.title}". Let's tear into this.` : 'Start by telling me what battle you're facing. Landlord screwing you over? Company refusing refunds? Let\'s hear it.'}

Remember: This is information and strategy, not legal advice. But sometimes information is all you need to win.

What's your situation?`,
        timestamp: new Date().toISOString()
      };
      setMessages([greeting]);
    }
  }, [currentCase]);

  // Process the user's war cry
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = {
      type: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate fact extraction from message
    await extractFacts(inputValue);
    
    // Process with AI (local or API)
    await processWithAI(inputValue);
  };

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
    
    // Money - the root of most battles
    const moneyMatches = text.matchAll(patterns.money);
    for (const match of moneyMatches) {
      foundFacts.push({
        type: 'money',
        label: 'Amount',
        value: match[0],
        context: match.input.substring(Math.max(0, match.index - 20), match.index + match[0].length + 20)
      });
    }

    // Dates - timing is everything in legal warfare
    const dateMatches = text.matchAll(patterns.dates);
    for (const match of dateMatches) {
      foundFacts.push({
        type: 'date',
        label: 'Date',
        value: match[0],
        context: match.input.substring(Math.max(0, match.index - 20), match.index + match[0].length + 20)
      });
    }

    // Names - know your enemy
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
      onFactFound(foundFacts[0]);
      
      // Show in chat that we found facts
      setMessages(prev => [...prev, {
        type: 'system',
        content: `🔍 Found ${foundFacts.length} fact(s) to verify...`,
        timestamp: new Date().toISOString()
      }]);
    }

    setExtractingFacts(false);
  };

  // Process with AI - where strategy meets technology
  const processWithAI = async (input) => {
    try {
      // This is where we'd integrate Ollama for local or API for online
      // For now, contextual responses based on keywords
      
      let response = '';
      const lowerInput = input.toLowerCase();

      // Landlord issues - the classic David vs Goliath
      if (lowerInput.includes('landlord') || lowerInput.includes('evict') || lowerInput.includes('deposit')) {
        response = `Right, landlord troubles. Here's the battle plan:

**Your immediate weapons:**
1. **Section 21 Notice** - If they're evicting, it MUST be valid. Invalid notice = you stay.
2. **Deposit Protection** - Not protected within 30 days? They owe you 1-3x the deposit.
3. **Repairs** - Document EVERYTHING. Photos, emails, texts. Build your evidence fortress.

**Next moves:**
- Request all communications in writing (they hate this)
- Check if your deposit's protected at: TDS, DPS, or MyDeposits
- Screenshot their online listings if they're already advertising your place

Want me to draft a letter that'll make them sweat? Or should we check if that eviction notice is bullshit?`;
      }
      // Consumer rights - corporate bullies
      else if (lowerInput.includes('refund') || lowerInput.includes('faulty') || lowerInput.includes('company')) {
        response = `Corporate bullshit detected. Time to fight back:

**Your consumer rights arsenal:**
1. **Consumer Rights Act 2015** - Faulty goods? 30 days for full refund, no questions.
2. **Section 75** - Paid by credit card? Your card company's equally liable.
3. **Chargeback** - Debit card? Still got power through your bank.

**Battle strategy:**
- One formal complaint email (I'll draft it—professional but threatening)
- 14 days to respond or we escalate
- Small claims court costs £35-£455 depending on amount (you can claim this back)

What's the company and what's the damage? Let's make them regret messing with you.`;
      }
      // General support
      else {
        response = `I hear you. Every fight starts somewhere, and you've taken the first step by speaking up.

Tell me more about:
- Who's involved (landlord, company, authority)?
- What triggered this situation?
- What outcome would make this right for you?

Don't hold back. The more ammunition you give me, the better strategy we can build.

Remember: They count on you not knowing your rights. They count on you giving up. 
We're about to prove them wrong.`;
      }

      // Add AI response with typing animation feel
      setTimeout(() => {
        setMessages(prev => [...prev, {
          type: 'ai',
          content: response,
          timestamp: new Date().toISOString()
        }]);
        setIsTyping(false);
      }, 1500); // Simulate thinking time

    } catch (error) {
      console.error('AI processing error:', error);
      setMessages(prev => [...prev, {
        type: 'error',
        content: 'System glitched but I'm still here. Try again—we don't give up that easy.',
        timestamp: new Date().toISOString()
      }]);
      setIsTyping(false);
    }
  };

  return (
    <div className="chat-interface">
      {/* Header - The mission statement */}
      <div className="chat-header">
        <h2>{currentCase ? currentCase.title : 'New Battle'}</h2>
        <span className="status-indicator">
          {extractingFacts && '🔍 Scanning for facts...'}
          {isTyping && '⚔️ Strategizing...'}
        </span>
      </div>

      {/* Messages area - The conversation battlefield */}
      <div className="messages-container">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.type}`}>
            <div className="message-content">
              {msg.content.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < msg.content.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </div>
            <div className="message-time">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
        
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

      {/* Input area - Where warriors speak */}
      <form onSubmit={handleSubmit} className="input-area">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={currentCase ? "Describe your situation..." : "Start with what happened..."}
          className="chat-input"
          disabled={isTyping}
        />
        <button type="submit" className="send-button" disabled={!inputValue.trim() || isTyping}>
          {isTyping ? '...' : 'FIGHT'}
        </button>
      </form>

      {/* Disclaimer bar - The truth */}
      <div className="disclaimer-bar">
        ⚠️ Information only—not legal advice. Verify everything. Even solicitors make mistakes.
      </div>
    </div>
  );
});

ChatInterface.displayName = 'ChatInterface';

export default ChatInterface;

// This component is dedicated to everyone who's been told
// "You can't fight this" or "Just accept it"
// Fuck that. We fight. We document. We win.
