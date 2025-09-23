import React, { useState } from 'react';
import './MinimalInterface.css';

// Justice Companion - Minimal ChatGPT-style Interface
// Clean, approachable legal assistance

const MinimalInterface = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="minimal-container">
      <div className="minimal-content">
        <div className="simple-greeting">
          <h1 className="minimal-greeting">Ready when you are.</h1>
        </div>
      </div>
      
      <div className="minimal-input-container">
        <form onSubmit={handleSubmit} className="minimal-form">
          <div className="minimal-input-wrapper">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe your legal situation - employment, housing, consumer rights, council disputes..."
              className="minimal-input"
              rows="1"
              autoFocus
            />
            <button 
              type="submit" 
              className="minimal-send-button"
              disabled={!message.trim()}
            >
              ↑
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MinimalInterface;