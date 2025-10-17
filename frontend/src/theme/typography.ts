import { TypographyOptions } from '@mui/material/styles/createTypography';

// Font families
const fontFamilies = {
  primary: [
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
  ].join(','),
  monospace: [
    '"Fira Code"',
    '"JetBrains Mono"',
    'Consolas',
    '"Liberation Mono"',
    'Menlo',
    'Courier',
    'monospace',
  ].join(','),
};

// Typography scale
export const typography: TypographyOptions = {
  fontFamily: fontFamilies.primary,
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,
  
  // Headings
  h1: {
    fontFamily: fontFamilies.primary,
    fontWeight: 700,
    fontSize: '2.5rem', // 40px
    lineHeight: 1.2,
    letterSpacing: '-0.01562em',
    '@media (max-width:600px)': {
      fontSize: '2rem', // 32px
    },
  },
  h2: {
    fontFamily: fontFamilies.primary,
    fontWeight: 700,
    fontSize: '2rem', // 32px
    lineHeight: 1.25,
    letterSpacing: '-0.00833em',
    '@media (max-width:600px)': {
      fontSize: '1.75rem', // 28px
    },
  },
  h3: {
    fontFamily: fontFamilies.primary,
    fontWeight: 600,
    fontSize: '1.75rem', // 28px
    lineHeight: 1.3,
    letterSpacing: '0em',
    '@media (max-width:600px)': {
      fontSize: '1.5rem', // 24px
    },
  },
  h4: {
    fontFamily: fontFamilies.primary,
    fontWeight: 600,
    fontSize: '1.5rem', // 24px
    lineHeight: 1.35,
    letterSpacing: '0.00735em',
    '@media (max-width:600px)': {
      fontSize: '1.25rem', // 20px
    },
  },
  h5: {
    fontFamily: fontFamilies.primary,
    fontWeight: 600,
    fontSize: '1.25rem', // 20px
    lineHeight: 1.4,
    letterSpacing: '0em',
    '@media (max-width:600px)': {
      fontSize: '1.125rem', // 18px
    },
  },
  h6: {
    fontFamily: fontFamilies.primary,
    fontWeight: 600,
    fontSize: '1.125rem', // 18px
    lineHeight: 1.45,
    letterSpacing: '0.0075em',
    '@media (max-width:600px)': {
      fontSize: '1rem', // 16px
    },
  },
  
  // Body text
  body1: {
    fontFamily: fontFamilies.primary,
    fontWeight: 400,
    fontSize: '1rem', // 16px
    lineHeight: 1.5,
    letterSpacing: '0.00938em',
  },
  body2: {
    fontFamily: fontFamilies.primary,
    fontWeight: 400,
    fontSize: '0.875rem', // 14px
    lineHeight: 1.43,
    letterSpacing: '0.01071em',
  },
  
  // Subtitles
  subtitle1: {
    fontFamily: fontFamilies.primary,
    fontWeight: 500,
    fontSize: '1rem', // 16px
    lineHeight: 1.5,
    letterSpacing: '0.00938em',
  },
  subtitle2: {
    fontFamily: fontFamilies.primary,
    fontWeight: 500,
    fontSize: '0.875rem', // 14px
    lineHeight: 1.43,
    letterSpacing: '0.01071em',
  },
  
  // Button text
  button: {
    fontFamily: fontFamilies.primary,
    fontWeight: 500,
    fontSize: '0.875rem', // 14px
    lineHeight: 1.43,
    letterSpacing: '0.02857em',
    textTransform: 'none' as const,
  },
  
  // Caption and overline
  caption: {
    fontFamily: fontFamilies.primary,
    fontWeight: 400,
    fontSize: '0.75rem', // 12px
    lineHeight: 1.33,
    letterSpacing: '0.03333em',
  },
  overline: {
    fontFamily: fontFamilies.primary,
    fontWeight: 500,
    fontSize: '0.75rem', // 12px
    lineHeight: 1.33,
    letterSpacing: '0.08333em',
    textTransform: 'uppercase' as const,
  },
};

// Custom typography variants for ACSO
declare module '@mui/material/styles' {
  interface TypographyVariants {
    code: React.CSSProperties;
    display1: React.CSSProperties;
    display2: React.CSSProperties;
    label: React.CSSProperties;
    helper: React.CSSProperties;
  }

  interface TypographyVariantsOptions {
    code?: React.CSSProperties;
    display1?: React.CSSProperties;
    display2?: React.CSSProperties;
    label?: React.CSSProperties;
    helper?: React.CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    code: true;
    display1: true;
    display2: true;
    label: true;
    helper: true;
  }
}

// Extend typography with custom variants
export const extendedTypography = {
  ...typography,
  code: {
    fontFamily: fontFamilies.monospace,
    fontWeight: 400,
    fontSize: '0.875rem', // 14px
    lineHeight: 1.43,
    letterSpacing: '0.01071em',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    padding: '2px 4px',
    borderRadius: '4px',
  },
  display1: {
    fontFamily: fontFamilies.primary,
    fontWeight: 700,
    fontSize: '3.5rem', // 56px
    lineHeight: 1.1,
    letterSpacing: '-0.02em',
    '@media (max-width:600px)': {
      fontSize: '2.5rem', // 40px
    },
  },
  display2: {
    fontFamily: fontFamilies.primary,
    fontWeight: 700,
    fontSize: '3rem', // 48px
    lineHeight: 1.15,
    letterSpacing: '-0.015em',
    '@media (max-width:600px)': {
      fontSize: '2.25rem', // 36px
    },
  },
  label: {
    fontFamily: fontFamilies.primary,
    fontWeight: 500,
    fontSize: '0.75rem', // 12px
    lineHeight: 1.33,
    letterSpacing: '0.03333em',
    textTransform: 'uppercase' as const,
  },
  helper: {
    fontFamily: fontFamilies.primary,
    fontWeight: 400,
    fontSize: '0.75rem', // 12px
    lineHeight: 1.33,
    letterSpacing: '0.03333em',
    fontStyle: 'italic',
  },
};