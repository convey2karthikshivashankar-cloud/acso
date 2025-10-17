import { createTheme, ThemeOptions } from '@mui/material/styles';
import { palette } from './palette';
import { typography } from './typography';
import { components } from './components';
import { shadows } from './shadows';
import { breakpoints } from './breakpoints';

// Design tokens
export const designTokens = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  zIndex: {
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500,
  },
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },
};

// Base theme configuration
const baseThemeOptions: ThemeOptions = {
  breakpoints,
  typography,
  shadows,
  shape: {
    borderRadius: designTokens.borderRadius.md,
  },
  spacing: designTokens.spacing.xs,
  zIndex: designTokens.zIndex,
  transitions: {
    duration: designTokens.transitions.duration,
    easing: designTokens.transitions.easing,
  },
};

// Light theme
export const lightTheme = createTheme({
  ...baseThemeOptions,
  palette: palette.light,
  components: components.light,
});

// Dark theme
export const darkTheme = createTheme({
  ...baseThemeOptions,
  palette: palette.dark,
  components: components.dark,
});

// High contrast theme
// Accessibility-enhanced high contrast theme
export const highContrastTheme = createTheme({
  ...baseThemeOptions,
  palette: {
    ...palette.highContrast,
    // Ensure maximum contrast ratios
    primary: {
      main: '#000000',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ffffff',
      contrastText: '#000000',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#000000',
      secondary: '#000000',
    },
  },
  components: {
    ...components.highContrast,
    // Enhanced accessibility components
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 44, // WCAG minimum touch target
          minWidth: 44,
          border: '2px solid #000000',
          '&:focus-visible': {
            outline: '3px solid #0066cc',
            outlineOffset: '2px',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minHeight: 44,
          minWidth: 44,
          border: '2px solid #000000',
          '&:focus-visible': {
            outline: '3px solid #0066cc',
            outlineOffset: '2px',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': {
            minHeight: 44,
          },
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#000000',
              borderWidth: '2px',
            },
            '&:focus-within fieldset': {
              borderColor: '#0066cc',
              borderWidth: '3px',
            },
          },
        },
      },
    },
  },
});

export type ThemeMode = 'light' | 'dark' | 'auto';

export const getTheme = (mode: ThemeMode) => {
  switch (mode) {
    case 'light':
      return lightTheme;
    case 'dark':
      return darkTheme;
    case 'auto':
      // Detect system preference
      if (typeof window !== 'undefined') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? darkTheme : lightTheme;
      }
      return lightTheme;
    default:
      return lightTheme;
  }
};

export { palette, typography, components, shadows, breakpoints };