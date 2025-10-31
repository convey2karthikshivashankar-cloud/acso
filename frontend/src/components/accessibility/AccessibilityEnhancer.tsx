import React, { useEffect, useState } from 'react';
import { AccessibilityCompliance } from '../../utils/accessibilityCompliance';

// High contrast mode toggle
export const HighContrastToggle: React.FC = () => {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const compliance = AccessibilityCompliance.getInstance();
    setIsHighContrast(compliance.detectHighContrastMode());
  }, []);

  const toggleHighContrast = () => {
    const newValue = !isHighContrast;
    setIsHighContrast(newValue);
    
    if (newValue) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
    
    localStorage.setItem('high-contrast', newValue.toString());
  };

  return (
    <button
      onClick={toggleHighContrast}
      className="accessibility-toggle"
      aria-label={`${isHighContrast ? 'Disable' : 'Enable'} high contrast mode`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-4.08 3.06-7.44 7-7.93v15.86z"/>
      </svg>
      {isHighContrast ? 'Normal Contrast' : 'High Contrast'}
    </button>
  );
};

// Font size adjuster
export const FontSizeAdjuster: React.FC = () => {
  const [fontSize, setFontSize] = useState(100);

  useEffect(() => {
    const savedSize = localStorage.getItem('font-size');
    if (savedSize) {
      const size = parseInt(savedSize);
      setFontSize(size);
      document.documentElement.style.fontSize = `${size}%`;
    }
  }, []);

  const adjustFontSize = (delta: number) => {
    const newSize = Math.max(75, Math.min(150, fontSize + delta));
    setFontSize(newSize);
    document.documentElement.style.fontSize = `${newSize}%`;
    localStorage.setItem('font-size', newSize.toString());
  };

  return (
    <div className="font-size-adjuster">
      <label htmlFor="font-size-slider">Font Size: {fontSize}%</label>
      <div className="font-size-controls">
        <button
          onClick={() => adjustFontSize(-10)}
          aria-label="Decrease font size"
          disabled={fontSize <= 75}
        >
          A-
        </button>
        <input
          id="font-size-slider"
          type="range"
          min="75"
          max="150"
          step="5"
          value={fontSize}
          onChange={(e) => adjustFontSize(parseInt(e.target.value) - fontSize)}
          aria-label="Font size slider"
        />
        <button
          onClick={() => adjustFontSize(10)}
          aria-label="Increase font size"
          disabled={fontSize >= 150}
        >
          A+
        </button>
      </div>
    </div>
  );
};

// Keyboard navigation helper
export const KeyboardNavigationHelper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showFocusOutlines, setShowFocusOutlines] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setShowFocusOutlines(true);
      }
    };

    const handleMouseDown = () => {
      setShowFocusOutlines(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return (
    <div className={`keyboard-navigation-helper ${showFocusOutlines ? 'show-focus' : ''}`}>
      {children}
      
      <style jsx>{`
        .keyboard-navigation-helper:not(.show-focus) *:focus {
          outline: none;
        }
        
        .keyboard-navigation-helper.show-focus *:focus {
          outline: 3px solid #4A90E2;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
};

// Screen reader announcements
export const ScreenReaderAnnouncer: React.FC = () => {
  useEffect(() => {
    const compliance = AccessibilityCompliance.getInstance();
    
    // Announce page changes
    const announcePageChange = () => {
      const pageTitle = document.title;
      compliance.announceToScreenReader(`Page loaded: ${pageTitle}`);
    };

    // Announce navigation changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          const addedElements = Array.from(mutation.addedNodes).filter(
            node => node.nodeType === Node.ELEMENT_NODE
          ) as Element[];
          
          addedElements.forEach(element => {
            const ariaLive = element.getAttribute('aria-live');
            if (ariaLive) {
              compliance.announceToScreenReader(element.textContent || '', ariaLive as any);
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    announcePageChange();

    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
};

// Accessibility toolbar
export const AccessibilityToolbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const compliance = AccessibilityCompliance.getInstance();
    setReducedMotion(compliance.prefersReducedMotion());
  }, []);

  const toggleReducedMotion = () => {
    const newValue = !reducedMotion;
    setReducedMotion(newValue);
    
    if (newValue) {
      document.body.classList.add('reduced-motion');
    } else {
      document.body.classList.remove('reduced-motion');
    }
  };

  return (
    <>
      <button
        className="accessibility-toolbar-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open accessibility options"
        aria-expanded={isOpen}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/>
        </svg>
      </button>

      {isOpen && (
        <div className="accessibility-toolbar">
          <div className="accessibility-toolbar-header">
            <h3>Accessibility Options</h3>
            <button onClick={() => setIsOpen(false)} aria-label="Close accessibility options">
              ×
            </button>
          </div>
          
          <div className="accessibility-toolbar-content">
            <HighContrastToggle />
            <FontSizeAdjuster />
            
            <button
              onClick={toggleReducedMotion}
              className="accessibility-toggle"
              aria-label={`${reducedMotion ? 'Enable' : 'Disable'} animations`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              {reducedMotion ? 'Enable Animations' : 'Reduce Motion'}
            </button>

            <button
              onClick={() => {
                const compliance = AccessibilityCompliance.getInstance();
                compliance.addSkipLinks();
              }}
              className="accessibility-toggle"
            >
              Add Skip Links
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .accessibility-toolbar-toggle {
          position: fixed;
          top: 50%;
          right: 0;
          transform: translateY(-50%);
          background: #4A90E2;
          color: white;
          border: none;
          padding: 12px 8px;
          border-radius: 8px 0 0 8px;
          cursor: pointer;
          z-index: 1000;
          transition: all 0.3s ease;
        }

        .accessibility-toolbar-toggle:hover {
          background: #357ABD;
          padding-right: 12px;
        }

        .accessibility-toolbar {
          position: fixed;
          top: 50%;
          right: 0;
          transform: translateY(-50%);
          background: white;
          border: 2px solid #4A90E2;
          border-radius: 8px 0 0 8px;
          box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
          z-index: 1001;
          width: 300px;
          max-height: 80vh;
          overflow-y: auto;
        }

        .accessibility-toolbar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #eee;
          background: #f8f9fa;
        }

        .accessibility-toolbar-header h3 {
          margin: 0;
          font-size: 1.1rem;
        }

        .accessibility-toolbar-header button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .accessibility-toolbar-content {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .accessibility-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
          text-align: left;
        }

        .accessibility-toggle:hover {
          background: #f8f9fa;
          border-color: #4A90E2;
        }

        .font-size-adjuster {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .font-size-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .font-size-controls button {
          background: #4A90E2;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.5rem;
          cursor: pointer;
          min-width: 40px;
        }

        .font-size-controls button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .font-size-controls input[type="range"] {
          flex: 1;
        }

        /* High contrast styles */
        :global(.high-contrast) {
          filter: contrast(150%) brightness(150%);
        }

        :global(.high-contrast) * {
          border-color: #000 !important;
          background-color: #fff !important;
          color: #000 !important;
        }

        :global(.high-contrast) button,
        :global(.high-contrast) .btn {
          background-color: #000 !important;
          color: #fff !important;
          border: 2px solid #fff !important;
        }

        /* Reduced motion styles */
        :global(.reduced-motion) *,
        :global(.reduced-motion) *::before,
        :global(.reduced-motion) *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      `}</style>
    </>
  );
};

// ARIA live region for dynamic content
export const AriaLiveRegion: React.FC<{
  message: string;
  priority?: 'polite' | 'assertive';
  atomic?: boolean;
}> = ({ message, priority = 'polite', atomic = true }) => {
  return (
    <div
      aria-live={priority}
      aria-atomic={atomic}
      className="sr-only"
    >
      {message}
      
      <style jsx>{`
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `}</style>
    </div>
  );
};