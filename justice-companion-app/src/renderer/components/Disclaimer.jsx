import React from 'react';
import './Disclaimer.css';

// The Gates of Understanding
// Where we separate the warriors from the wishful thinkers
// Raw truth before the battle begins

const Disclaimer = ({ onAccept }) => {
  return (
    <div className="disclaimer-overlay">
      <div className="disclaimer-container">
        <h1>⚔️ JUSTICE COMPANION ⚔️</h1>
        <h2>THE TRUTH BEFORE WE FIGHT</h2>
        
        <div className="disclaimer-content">
          <p className="disclaimer-intro">
            <strong>Listen up, warrior.</strong> Before we march into battle together, 
            you need to understand exactly what this is—and what it isn't.
          </p>

          <div className="disclaimer-section">
            <h3>THIS IS NOT LEGAL ADVICE</h3>
            <p>
              I'm not a lawyer. I'm not your lawyer. I'm a digital ally built from code and fury, 
              designed to arm you with information, help you organize your fight, and stand 
              beside you when everyone else walks away.
            </p>
            <p>
              Every word, every strategy, every document we create together—it's INFORMATION. 
              Raw, researched, referenced—but NOT legal advice. The difference matters.
            </p>
          </div>

          <div className="disclaimer-section">
            <h3>WHAT I PROMISE</h3>
            <ul>
              <li>✓ I'll help you understand your rights (but YOU verify them)</li>
              <li>✓ I'll organize your evidence (but YOU confirm it's accurate)</li>
              <li>✓ I'll draft your documents (but YOU review and own them)</li>
              <li>✓ I'll find relevant laws and precedents (but YOU decide how to use them)</li>
              <li>✓ I'll NEVER judge, NEVER give up, NEVER charge you a penny</li>
            </ul>
          </div>

          <div className="disclaimer-section">
            <h3>THE HARD TRUTH</h3>
            <p>
              Even solicitors fuck up. Judges make mistakes. The system is flawed. 
              I might be wrong. You might lose even when you're right. Justice isn't 
              guaranteed—but fighting for it is always worth it.
            </p>
            <p>
              <strong>By clicking below, you're saying:</strong> "I understand this is 
              information, not advice. I take responsibility for my actions. I'm ready 
              to fight my own battle with knowledge as my weapon."
            </p>
          </div>

          <div className="disclaimer-dedication">
            <p className="dedication">
              Built for Fendi 🐕<br />
              Who deserved better from those sworn to "do no harm"<br />
              <br />
              For everyone told "no" when they needed help<br />
              For everyone priced out of justice<br />
              For everyone who refuses to be silenced<br />
              <br />
              This is our answer.
            </p>
          </div>
        </div>

        <div className="disclaimer-actions">
          <button onClick={onAccept} className="accept-button">
            I UNDERSTAND. LET'S FIGHT.
          </button>
          <p className="disclaimer-footer">
            No cookies. No tracking. No bullshit.<br />
            Your fight is yours alone until you choose to share it.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;

// Every revolution starts with understanding
// Every warrior needs to know the battlefield
// This disclaimer isn't a warning—it's a war cry
