import { PaletteOptions } from '@mui/material/styles';

// ACSO Brand Colors
const brandColors = {
  primary: {
    50: '#e3f2fd',
    100: '#bbdefb',
    200: '#90caf9',
    300: '#64b5f6',
    400: '#42a5f5',
    500: '#2196f3', // Main brand color
    600: '#1e88e5',
    700: '#1976d2',
    800: '#1565c0',
    900: '#0d47a1',
  },
  secondary: {
    50: '#f3e5f5',
    100: '#e1bee7',
    200: '#ce93d8',
    300: '#ba68c8',
    400: '#ab47bc',
    500: '#9c27b0', // Secondary brand color
    600: '#8e24aa',
    700: '#7b1fa2',
    800: '#6a1b9a',
    900: '#4a148c',
  },
  success: {
    50: '#e8f5e8',
    100: '#c8e6c9',
    200: '#a5d6a7',
    300: '#81c784',
    400: '#66bb6a',
    500: '#4caf50',
    600: '#43a047',
    700: '#388e3c',
    800: '#2e7d32',
    900: '#1b5e20',
  },
  warning: {
    50: '#fff8e1',
    100: '#ffecb3',
    200: '#ffe082',
    300: '#ffd54f',
    400: '#ffca28',
    500: '#ffc107',
    600: '#ffb300',
    700: '#ffa000',
    800: '#ff8f00',
    900: '#ff6f00',
  },
  error: {
    50: '#ffebee',
    100: '#ffcdd2',
    200: '#ef9a9a',
    300: '#e57373',
    400: '#ef5350',
    500: '#f44336',
    600: '#e53935',
    700: '#d32f2f',
    800: '#c62828',
    900: '#b71c1c',
  },
  info: {
    50: '#e1f5fe',
    100: '#b3e5fc',
    200: '#81d4fa',
    300: '#4fc3f7',
    400: '#29b6f6',
    500: '#03a9f4',
    600: '#039be5',
    700: '#0288d1',
    800: '#0277bd',
    900: '#01579b',
  },
};

// Neutral colors
const neutralColors = {
  50: '#fafafa',
  100: '#f5f5f5',
  200: '#eeeeee',
  300: '#e0e0e0',
  400: '#bdbdbd',
  500: '#9e9e9e',
  600: '#757575',
  700: '#616161',
  800: '#424242',
  900: '#212121',
};

// Light theme palette
const lightPalette: PaletteOptions = {
  mode: 'light',
  primary: {
    main: brandColors.primary[500],
    light: brandColors.primary[300],
    dark: brandColors.primary[700],
    contrastText: '#ffffff',
  },
  secondary: {
    main: brandColors.secondary[500],
    light: brandColors.secondary[300],
    dark: brandColors.secondary[700],
    contrastText: '#ffffff',
  },
  success: {
    main: brandColors.success[500],
    light: brandColors.success[300],
    dark: brandColors.success[700],
    contrastText: '#ffffff',
  },
  warning: {
    main: brandColors.warning[500],
    light: brandColors.warning[300],
    dark: brandColors.warning[700],
    contrastText: 'rgba(0, 0, 0, 0.87)',
  },
  error: {
    main: brandColors.error[500],
    light: brandColors.error[300],
    dark: brandColors.error[700],
    contrastText: '#ffffff',
  },
  info: {
    main: brandColors.info[500],
    light: brandColors.info[300],
    dark: brandColors.info[700],
    contrastText: '#ffffff',
  },
  grey: neutralColors,
  background: {
    default: '#fafafa',
    paper: '#ffffff',
  },
  text: {
    primary: 'rgba(0, 0, 0, 0.87)',
    secondary: 'rgba(0, 0, 0, 0.6)',
    disabled: 'rgba(0, 0, 0, 0.38)',
  },
  divider: 'rgba(0, 0, 0, 0.12)',
  action: {
    active: 'rgba(0, 0, 0, 0.54)',
    hover: 'rgba(0, 0, 0, 0.04)',
    selected: 'rgba(0, 0, 0, 0.08)',
    disabled: 'rgba(0, 0, 0, 0.26)',
    disabledBackground: 'rgba(0, 0, 0, 0.12)',
    focus: 'rgba(0, 0, 0, 0.12)',
  },
};

// Dark theme palette
const darkPalette: PaletteOptions = {
  mode: 'dark',
  primary: {
    main: brandColors.primary[400],
    light: brandColors.primary[200],
    dark: brandColors.primary[600],
    contrastText: '#ffffff',
  },
  secondary: {
    main: brandColors.secondary[400],
    light: brandColors.secondary[200],
    dark: brandColors.secondary[600],
    contrastText: '#ffffff',
  },
  success: {
    main: brandColors.success[400],
    light: brandColors.success[200],
    dark: brandColors.success[600],
    contrastText: 'rgba(0, 0, 0, 0.87)',
  },
  warning: {
    main: brandColors.warning[400],
    light: brandColors.warning[200],
    dark: brandColors.warning[600],
    contrastText: 'rgba(0, 0, 0, 0.87)',
  },
  error: {
    main: brandColors.error[400],
    light: brandColors.error[200],
    dark: brandColors.error[600],
    contrastText: '#ffffff',
  },
  info: {
    main: brandColors.info[400],
    light: brandColors.info[200],
    dark: brandColors.info[600],
    contrastText: '#ffffff',
  },
  grey: neutralColors,
  background: {
    default: '#121212',
    paper: '#1e1e1e',
  },
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.7)',
    disabled: 'rgba(255, 255, 255, 0.5)',
  },
  divider: 'rgba(255, 255, 255, 0.12)',
  action: {
    active: '#ffffff',
    hover: 'rgba(255, 255, 255, 0.08)',
    selected: 'rgba(255, 255, 255, 0.16)',
    disabled: 'rgba(255, 255, 255, 0.3)',
    disabledBackground: 'rgba(255, 255, 255, 0.12)',
    focus: 'rgba(255, 255, 255, 0.12)',
  },
};

// High contrast theme palette
const highContrastPalette: PaletteOptions = {
  mode: 'dark',
  primary: {
    main: '#ffffff',
    light: '#ffffff',
    dark: '#cccccc',
    contrastText: '#000000',
  },
  secondary: {
    main: '#ffff00',
    light: '#ffff66',
    dark: '#cccc00',
    contrastText: '#000000',
  },
  success: {
    main: '#00ff00',
    light: '#66ff66',
    dark: '#00cc00',
    contrastText: '#000000',
  },
  warning: {
    main: '#ffaa00',
    light: '#ffcc66',
    dark: '#cc8800',
    contrastText: '#000000',
  },
  error: {
    main: '#ff0000',
    light: '#ff6666',
    dark: '#cc0000',
    contrastText: '#ffffff',
  },
  info: {
    main: '#00ffff',
    light: '#66ffff',
    dark: '#00cccc',
    contrastText: '#000000',
  },
  grey: {
    50: '#ffffff',
    100: '#f0f0f0',
    200: '#e0e0e0',
    300: '#c0c0c0',
    400: '#a0a0a0',
    500: '#808080',
    600: '#606060',
    700: '#404040',
    800: '#202020',
    900: '#000000',
  },
  background: {
    default: '#000000',
    paper: '#000000',
  },
  text: {
    primary: '#ffffff',
    secondary: '#ffffff',
    disabled: '#808080',
  },
  divider: '#ffffff',
  action: {
    active: '#ffffff',
    hover: 'rgba(255, 255, 255, 0.2)',
    selected: 'rgba(255, 255, 255, 0.3)',
    disabled: '#808080',
    disabledBackground: '#404040',
    focus: 'rgba(255, 255, 255, 0.3)',
  },
};

export const palette = {
  light: lightPalette,
  dark: darkPalette,
  highContrast: highContrastPalette,
  brand: brandColors,
  neutral: neutralColors,
};