import React, { useEffect, useRef, useState } from 'react';
import './KeyboardNavigation.css';

// Keyboard navigation context for the legal aid application
export const KeyboardNavigationProvider = ({ children }) => {
  const [focusMode, setFocusMode] = useState('auto'); // auto, manual, voice
  const [announcements, setAnnouncements] = useState([]);
  const announcementRef = useRef(null);

  // Announce important actions to screen readers
  const announce = (message, priority = 'polite') => {
    const announcement = {
      id: Date.now(),
      message,
      priority,
      timestamp: new Date().toISOString()
    };

    setAnnouncements(prev => [...prev.slice(-4), announcement]);

    // Create temporary announcement element
    if (announcementRef.current) {
      announcementRef.current.textContent = message;
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== announcement.id));
    }, 5000);
  };

  // Global keyboard shortcuts for legal interface
  useEffect(() => {
    const handleGlobalKeydown = (e) => {
      // Ctrl/Cmd + K: Quick case search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        announce('Quick case search activated');
        document.getElementById('case-search')?.focus();
      }

      // Ctrl/Cmd + N: New case
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        announce('New case form opened');
        document.querySelector('.new-case-button')?.click();
      }

      // Ctrl/Cmd + /: Show keyboard shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        announce('Keyboard shortcuts menu opened');
        // Trigger shortcuts modal
        window.dispatchEvent(new CustomEvent('showKeyboardShortcuts'));
      }

      // Escape: Close modals and forms
      if (e.key === 'Escape') {
        const activeModal = document.querySelector('[role="dialog"]:not([aria-hidden="true"])');
        if (activeModal) {
          e.preventDefault();
          announce('Dialog closed');
          // Find and click cancel/close button
          const closeBtn = activeModal.querySelector('.cancel-button, .close-button, [aria-label*="close"]');
          closeBtn?.click();
        }
      }

      // F1: Help and guidance
      if (e.key === 'F1') {
        e.preventDefault();
        announce('Help and guidance opened');
        window.dispatchEvent(new CustomEvent('showHelp'));
      }

      // Alt + H: Go to home/dashboard
      if (e.altKey && e.key === 'h') {
        e.preventDefault();
        announce('Navigating to dashboard');
        window.dispatchEvent(new CustomEvent('navigateHome'));
      }

      // Alt + C: Focus chat input
      if (e.altKey && e.key === 'c') {
        e.preventDefault();
        announce('Chat input focused');
        document.getElementById('legal-input')?.focus();
      }
    };

    document.addEventListener('keydown', handleGlobalKeydown);
    return () => document.removeEventListener('keydown', handleGlobalKeydown);
  }, []);

  return (
    <div className="keyboard-navigation-provider">
      {children}

      {/* Live region for announcements */}
      <div
        ref={announcementRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      ></div>

      {/* Additional announcement queue for complex messages */}
      <div className="announcements-queue">
        {announcements.map(announcement => (
          <div
            key={announcement.id}
            className="sr-only"
            aria-live={announcement.priority}
            aria-atomic="true"
            role={announcement.priority === 'assertive' ? 'alert' : 'status'}
          >
            {announcement.message}
          </div>
        ))}
      </div>
    </div>
  );
};

// Enhanced focus trap for modals and forms
export const FocusTrap = ({ children, isActive = false, onEscape, restoreFocus = true }) => {
  const containerRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (!isActive) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement;

    const container = containerRef.current;
    if (!container) return;

    // Get all focusable elements
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"]'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus the first element
    firstElement?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }

      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus to previous element
      if (restoreFocus && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive, onEscape, restoreFocus]);

  return (
    <div ref={containerRef} className={`focus-trap ${isActive ? 'active' : ''}`}>
      {children}
    </div>
  );
};

// Skip links for better navigation
export const SkipLinks = () => (
  <div className="skip-links">
    <a href="#main-content" className="skip-link">
      Skip to main content
    </a>
    <a href="#case-list" className="skip-link">
      Skip to case list
    </a>
    <a href="#chat-interface" className="skip-link">
      Skip to legal chat
    </a>
    <a href="#help-section" className="skip-link">
      Skip to help
    </a>
  </div>
);

// Keyboard shortcuts help modal
export const KeyboardShortcutsModal = ({ isOpen, onClose }) => {
  const shortcuts = [
    {
      category: "Navigation",
      items: [
        { keys: ["Ctrl/Cmd", "K"], description: "Quick case search" },
        { keys: ["Alt", "H"], description: "Go to dashboard" },
        { keys: ["Alt", "C"], description: "Focus chat input" },
        { keys: ["Tab"], description: "Navigate between elements" },
        { keys: ["Shift", "Tab"], description: "Navigate backwards" }
      ]
    },
    {
      category: "Case Management",
      items: [
        { keys: ["Ctrl/Cmd", "N"], description: "Create new case" },
        { keys: ["Enter"], description: "Open selected case" },
        { keys: ["Space"], description: "Select case card" }
      ]
    },
    {
      category: "Chat Interface",
      items: [
        { keys: ["Ctrl/Cmd", "Enter"], description: "Send message" },
        { keys: ["Shift", "Enter"], description: "New line in message" },
        { keys: ["Arrow Up"], description: "Edit last message" }
      ]
    },
    {
      category: "General",
      items: [
        { keys: ["Escape"], description: "Close modal or cancel action" },
        { keys: ["F1"], description: "Show help and guidance" },
        { keys: ["Ctrl/Cmd", "/"], description: "Show keyboard shortcuts" }
      ]
    }
  ];

  if (!isOpen) return null;

  return (
    <FocusTrap isActive={isOpen} onEscape={onClose}>
      <div className="shortcuts-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
        <div className="shortcuts-modal">
          <div className="modal-header">
            <h2 id="shortcuts-title">Keyboard Shortcuts</h2>
            <button
              onClick={onClose}
              className="close-button"
              aria-label="Close keyboard shortcuts"
            >
              ×
            </button>
          </div>

          <div className="modal-content">
            <p className="shortcuts-intro">
              Use these keyboard shortcuts to navigate Justice Companion more efficiently:
            </p>

            <div className="shortcuts-grid">
              {shortcuts.map((category, index) => (
                <div key={index} className="shortcut-category">
                  <h3 className="category-title">{category.category}</h3>
                  <ul className="shortcut-list">
                    {category.items.map((shortcut, itemIndex) => (
                      <li key={itemIndex} className="shortcut-item">
                        <div className="shortcut-keys">
                          {shortcut.keys.map((key, keyIndex) => (
                            <React.Fragment key={keyIndex}>
                              <kbd className="key">{key}</kbd>
                              {keyIndex < shortcut.keys.length - 1 && (
                                <span className="key-separator">+</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                        <span className="shortcut-description">{shortcut.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="shortcuts-tips">
              <h3>Accessibility Tips</h3>
              <ul>
                <li>Use Tab to navigate between interactive elements</li>
                <li>Press Enter or Space to activate buttons and links</li>
                <li>Use arrow keys to navigate within lists and menus</li>
                <li>Screen reader users can navigate by landmarks and headings</li>
                <li>All functionality is available via keyboard</li>
              </ul>
            </div>
          </div>

          <div className="modal-footer">
            <button onClick={onClose} className="close-modal-button">
              Close (Esc)
            </button>
          </div>
        </div>
      </div>
    </FocusTrap>
  );
};

// Enhanced roving tabindex for complex widgets
export const RovingTabIndex = ({ children, direction = 'horizontal', wrap = true }) => {
  const containerRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = Array.from(container.children).filter(
      child => !child.hasAttribute('disabled') && !child.getAttribute('aria-hidden')
    );

    // Set initial tabindex values
    items.forEach((item, index) => {
      item.setAttribute('tabindex', index === currentIndex ? '0' : '-1');
    });

    const handleKeyDown = (e) => {
      const isHorizontal = direction === 'horizontal';
      const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';
      const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';

      let newIndex = currentIndex;

      if (e.key === nextKey) {
        e.preventDefault();
        newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : wrap ? 0 : currentIndex;
      } else if (e.key === prevKey) {
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : wrap ? items.length - 1 : currentIndex;
      } else if (e.key === 'Home') {
        e.preventDefault();
        newIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        newIndex = items.length - 1;
      }

      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);

        // Update tabindex values
        items.forEach((item, index) => {
          item.setAttribute('tabindex', index === newIndex ? '0' : '-1');
        });

        // Focus the new item
        items[newIndex]?.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentIndex, direction, wrap]);

  return (
    <div ref={containerRef} className="roving-tabindex" role="tablist">
      {children}
    </div>
  );
};

// Voice navigation helper (for future voice commands)
export const VoiceNavigationIndicator = ({ isListening = false, command = '' }) => {
  if (!isListening && !command) return null;

  return (
    <div className="voice-navigation-indicator" role="status" aria-live="polite">
      {isListening && (
        <div className="listening-indicator">
          <span className="voice-icon pulse" aria-hidden="true">🎤</span>
          <span className="status-text">Listening for voice commands...</span>
        </div>
      )}

      {command && (
        <div className="command-recognition">
          <span className="command-text">Recognized: "{command}"</span>
        </div>
      )}
    </div>
  );
};

export default {
  KeyboardNavigationProvider,
  FocusTrap,
  SkipLinks,
  KeyboardShortcutsModal,
  RovingTabIndex,
  VoiceNavigationIndicator
};