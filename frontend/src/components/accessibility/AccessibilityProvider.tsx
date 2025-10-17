import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  screenReaderMode: boolean;
  keyboardNavigation: boolean;
  focusVisible: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  fontSize: number; // 1.0 = normal, 1.5 = 150%, etc.
  lineHeight: number;
  letterSpacing: number;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => void;
  resetSettings: () => void;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  focusElement: (selector: string) => void;
  skipToContent: () => void;
}

const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  reducedMotion: false,
  largeText: false,
  screenReaderMode: false,
  keyboardNavigation: true,
  focusVisible: true,
  colorBlindMode: 'none',
  fontSize: 1.0,
  lineHeight: 1.5,
  letterSpacing: 0,
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

interface AccessibilityProviderProps {
  children: ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    // Load settings from localStorage
    try {
      const saved = localStorage.getItem('accessibility-settings');
      if (saved) {
        return { ...defaultSettings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Failed to load accessibility settings:', error);
    }
    
    // Detect system preferences
    const systemSettings = { ...defaultSettings };
    
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      systemSettings.reducedMotion = true;
    }
    
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      systemSettings.highContrast = true;
    }
    
    return systemSettings;
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('accessibility-settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save accessibility settings:', error);
    }
  }, [settings]);

  // Apply CSS custom properties for accessibility
  useEffect(() => {
    const root = document.documentElement;
    
    // Font size
    root.style.setProperty('--accessibility-font-scale', settings.fontSize.toString());
    
    // Line height
    root.style.setProperty('--accessibility-line-height', settings.lineHeight.toString());
    
    // Letter spacing
    root.style.setProperty('--accessibility-letter-spacing', `${settings.letterSpacing}px`);
    
    // High contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
    
    // Large text
    if (settings.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }
    
    // Screen reader mode
    if (settings.screenReaderMode) {
      root.classList.add('screen-reader-mode');
    } else {
      root.classList.remove('screen-reader-mode');
    }
    
    // Color blind mode
    root.className = root.className.replace(/colorblind-\w+/g, '');
    if (settings.colorBlindMode !== 'none') {
      root.classList.add(`colorblind-${settings.colorBlindMode}`);
    }
    
    // Focus visible
    if (settings.focusVisible) {
      root.classList.add('focus-visible-enabled');
    } else {
      root.classList.remove('focus-visible-enabled');
    }
  }, [settings]);

  // Listen for system preference changes
  useEffect(() => {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    
    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('accessibility-settings')) {
        setSettings(prev => ({ ...prev, reducedMotion: e.matches }));
      }
    };
    
    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('accessibility-settings')) {
        setSettings(prev => ({ ...prev, highContrast: e.matches }));
      }
    };
    
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    highContrastQuery.addEventListener('change', handleHighContrastChange);
    
    return () => {
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
    };
  }, []);

  // Keyboard navigation setup
  useEffect(() => {
    if (!settings.keyboardNavigation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip to main content with Alt+1
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        skipToContent();
      }
      
      // Skip to navigation with Alt+2
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        focusElement('[role="navigation"], nav');
      }
      
      // Skip to search with Alt+3
      if (e.altKey && e.key === '3') {
        e.preventDefault();
        focusElement('[role="search"], [type="search"]');
      }
      
      // Escape key handling
      if (e.key === 'Escape') {
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && activeElement.blur) {
          activeElement.blur();
        }
        
        // Close any open modals or dropdowns
        const modals = document.querySelectorAll('[role="dialog"][open], .modal.open');
        modals.forEach(modal => {
          const closeButton = modal.querySelector('[aria-label*="close"], .close-button');
          if (closeButton) {
            (closeButton as HTMLElement).click();
          }
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [settings.keyboardNavigation]);

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('accessibility-settings');
  };

  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  const focusElement = (selector: string) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element && element.focus) {
      element.focus();
      
      // Scroll into view if needed
      element.scrollIntoView({
        behavior: settings.reducedMotion ? 'auto' : 'smooth',
        block: 'center',
      });
    }
  };

  const skipToContent = () => {
    focusElement('#main-content, [role="main"], main');
  };

  // Create accessible theme
  const accessibleTheme = createTheme({
    typography: {
      fontSize: 14 * settings.fontSize,
      body1: {
        lineHeight: settings.lineHeight,
        letterSpacing: settings.letterSpacing,
      },
      body2: {
        lineHeight: settings.lineHeight,
        letterSpacing: settings.letterSpacing,
      },
    },
    transitions: {
      create: settings.reducedMotion 
        ? () => 'none'
        : undefined,
    },
    palette: {
      mode: settings.highContrast ? 'dark' : 'light',
      ...(settings.highContrast && {
        primary: {
          main: '#ffffff',
          contrastText: '#000000',
        },
        secondary: {
          main: '#ffff00',
          contrastText: '#000000',
        },
        background: {
          default: '#000000',
          paper: '#000000',
        },
        text: {
          primary: '#ffffff',
          secondary: '#ffffff',
        },
      }),
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            minHeight: settings.largeText ? 48 : 36,
            fontSize: settings.largeText ? '1.125rem' : undefined,
            '&:focus-visible': settings.focusVisible ? {
              outline: '3px solid #005fcc',
              outlineOffset: '2px',
            } : undefined,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiInputBase-root': {
              minHeight: settings.largeText ? 48 : undefined,
              fontSize: settings.largeText ? '1.125rem' : undefined,
            },
            '& .MuiInputBase-input:focus': settings.focusVisible ? {
              outline: '3px solid #005fcc',
              outlineOffset: '2px',
            } : undefined,
          },
        },
      },
      MuiLink: {
        styleOverrides: {
          root: {
            '&:focus-visible': settings.focusVisible ? {
              outline: '3px solid #005fcc',
              outlineOffset: '2px',
              textDecoration: 'underline',
            } : undefined,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            minWidth: settings.largeText ? 48 : 40,
            minHeight: settings.largeText ? 48 : 40,
            '&:focus-visible': settings.focusVisible ? {
              outline: '3px solid #005fcc',
              outlineOffset: '2px',
            } : undefined,
          },
        },
      },
    },
  });

  const contextValue: AccessibilityContextType = {
    settings,
    updateSetting,
    resetSettings,
    announceToScreenReader,
    focusElement,
    skipToContent,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      <ThemeProvider theme={accessibleTheme}>
        <CssBaseline />
        {children}
        
        {/* Screen reader announcements container */}
        <div
          id="accessibility-announcements"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />
        
        {/* Skip links */}
        <div className="skip-links">
          <button
            className="skip-link"
            onClick={skipToContent}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                skipToContent();
              }
            }}
          >
            Skip to main content
          </button>
          <button
            className="skip-link"
            onClick={() => focusElement('[role="navigation"], nav')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                focusElement('[role="navigation"], nav');
              }
            }}
          >
            Skip to navigation
          </button>
        </div>
      </ThemeProvider>
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

export default AccessibilityProvider;