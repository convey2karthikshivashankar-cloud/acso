import React from 'react';

export interface AccessibilityPreferences {
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  screenReaderMode: boolean;
  keyboardNavigation: boolean;
  focusIndicators: boolean;
  colorBlindnessSupport: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

export interface AccessibilityFeatures {
  preferences: AccessibilityPreferences;
  updatePreference: (key: keyof AccessibilityPreferences, value: any) => void;
  resetPreferences: () => void;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  focusElement: (selector: string) => void;
  skipToContent: () => void;
  isKeyboardUser: boolean;
  currentFocusedElement: Element | null;
}

const defaultPreferences: AccessibilityPreferences = {
  highContrast: false,
  reducedMotion: false,
  largeText: false,
  screenReaderMode: false,
  keyboardNavigation: true,
  focusIndicators: true,
  colorBlindnessSupport: 'none',
};

export const useAccessibilityFeatures = (): AccessibilityFeatures => {
  const [preferences, setPreferences] = React.useState<AccessibilityPreferences>(() => {
    // Load from localStorage or detect system preferences
    const saved = localStorage.getItem('accessibility-preferences');
    const savedPrefs = saved ? JSON.parse(saved) : {};
    
    // Detect system preferences
    const systemPrefs = {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      highContrast: window.matchMedia('(prefers-contrast: high)').matches,
    };
    
    return { ...defaultPreferences, ...systemPrefs, ...savedPrefs };
  });

  const [isKeyboardUser, setIsKeyboardUser] = React.useState(false);
  const [currentFocusedElement, setCurrentFocusedElement] = React.useState<Element | null>(null);
  const announcementRef = React.useRef<HTMLDivElement | null>(null);

  // Save preferences to localStorage
  React.useEffect(() => {
    localStorage.setItem('accessibility-preferences', JSON.stringify(preferences));
  }, [preferences]);

  // Apply CSS classes based on preferences
  React.useEffect(() => {
    const root = document.documentElement;
    
    // High contrast
    if (preferences.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Reduced motion
    if (preferences.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
    
    // Large text
    if (preferences.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }
    
    // Screen reader mode
    if (preferences.screenReaderMode) {
      root.classList.add('screen-reader-mode');
    } else {
      root.classList.remove('screen-reader-mode');
    }
    
    // Color blindness support
    root.classList.remove('protanopia', 'deuteranopia', 'tritanopia');
    if (preferences.colorBlindnessSupport !== 'none') {
      root.classList.add(preferences.colorBlindnessSupport);
    }
    
    // Focus indicators
    if (!preferences.focusIndicators) {
      root.classList.add('no-focus-indicators');
    } else {
      root.classList.remove('no-focus-indicators');
    }
  }, [preferences]);

  // Keyboard navigation detection
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        setIsKeyboardUser(true);
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardUser(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  // Focus tracking
  React.useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      setCurrentFocusedElement(event.target as Element);
    };

    const handleFocusOut = () => {
      setCurrentFocusedElement(null);
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Create screen reader announcement area
  React.useEffect(() => {
    if (!announcementRef.current) {
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.style.position = 'absolute';
      announcer.style.left = '-10000px';
      announcer.style.width = '1px';
      announcer.style.height = '1px';
      announcer.style.overflow = 'hidden';
      document.body.appendChild(announcer);
      announcementRef.current = announcer;
    }

    return () => {
      if (announcementRef.current) {
        document.body.removeChild(announcementRef.current);
        announcementRef.current = null;
      }
    };
  }, []);

  // Listen for system preference changes
  React.useEffect(() => {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setPreferences(prev => ({ ...prev, reducedMotion: e.matches }));
    };

    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setPreferences(prev => ({ ...prev, highContrast: e.matches }));
    };

    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    highContrastQuery.addEventListener('change', handleHighContrastChange);

    return () => {
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
    };
  }, []);

  const updatePreference = React.useCallback((key: keyof AccessibilityPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetPreferences = React.useCallback(() => {
    setPreferences(defaultPreferences);
    localStorage.removeItem('accessibility-preferences');
  }, []);

  const announceToScreenReader = React.useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announcementRef.current) {
      announcementRef.current.setAttribute('aria-live', priority);
      announcementRef.current.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  const focusElement = React.useCallback((selector: string) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
      // Scroll into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const skipToContent = React.useCallback(() => {
    const mainContent = document.querySelector('main, [role="main"], #main-content') as HTMLElement;
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
      announceToScreenReader('Skipped to main content');
    }
  }, [announceToScreenReader]);

  return {
    preferences,
    updatePreference,
    resetPreferences,
    announceToScreenReader,
    focusElement,
    skipToContent,
    isKeyboardUser,
    currentFocusedElement,
  };
};