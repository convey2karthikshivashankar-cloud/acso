import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { getTheme, ThemeMode } from '../../theme';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { setTheme } from '../../store/slices/uiSlice';

interface ThemeContextValue {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state) => state.ui.theme);
  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>('light');

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };

    // Set initial value
    setSystemPreference(mediaQuery.matches ? 'dark' : 'light');
    
    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Listen for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Update theme with reduced motion settings
      document.documentElement.style.setProperty(
        '--motion-duration',
        e.matches ? '0ms' : '300ms'
      );
    };

    handleChange(mediaQuery);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const handleSetThemeMode = (mode: ThemeMode) => {
    dispatch(setTheme(mode));
    
    // Store preference in localStorage
    localStorage.setItem('acso-theme-mode', mode);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const theme = getTheme(mode);
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme.palette.primary.main);
    }
  };

  const toggleTheme = () => {
    const newMode = themeMode === 'light' ? 'dark' : 'light';
    handleSetThemeMode(newMode);
  };

  // Determine the actual theme to use
  const actualThemeMode = themeMode === 'auto' ? systemPreference : themeMode;
  const theme = getTheme(actualThemeMode);

  // Apply theme class to body for CSS custom properties
  useEffect(() => {
    document.body.className = `theme-${actualThemeMode}`;
    
    // Set CSS custom properties for theme colors
    const root = document.documentElement;
    root.style.setProperty('--primary-main', theme.palette.primary.main);
    root.style.setProperty('--primary-light', theme.palette.primary.light);
    root.style.setProperty('--primary-dark', theme.palette.primary.dark);
    root.style.setProperty('--secondary-main', theme.palette.secondary.main);
    root.style.setProperty('--background-default', theme.palette.background.default);
    root.style.setProperty('--background-paper', theme.palette.background.paper);
    root.style.setProperty('--text-primary', theme.palette.text.primary);
    root.style.setProperty('--text-secondary', theme.palette.text.secondary);
  }, [actualThemeMode, theme]);

  const contextValue: ThemeContextValue = {
    themeMode,
    setThemeMode: handleSetThemeMode,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};