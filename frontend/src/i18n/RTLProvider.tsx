import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import { prefixer } from 'stylis';
import { useI18n } from '../hooks/useI18n';

interface RTLContextType {
  isRTL: boolean;
  direction: 'ltr' | 'rtl';
}

const RTLContext = createContext<RTLContextType>({
  isRTL: false,
  direction: 'ltr',
});

interface RTLProviderProps {
  children: ReactNode;
}

// RTL languages
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

// Create RTL cache
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

// Create LTR cache
const cacheLtr = createCache({
  key: 'muiltr',
});

export const RTLProvider: React.FC<RTLProviderProps> = ({ children }) => {
  const { language } = useI18n();
  const isRTL = RTL_LANGUAGES.includes(language);
  const direction = isRTL ? 'rtl' : 'ltr';

  // Update document direction
  useEffect(() => {
    document.dir = direction;
    document.documentElement.setAttribute('dir', direction);
    document.documentElement.setAttribute('lang', language);
    
    // Update body class for RTL-specific styles
    if (isRTL) {
      document.body.classList.add('rtl');
      document.body.classList.remove('ltr');
    } else {
      document.body.classList.add('ltr');
      document.body.classList.remove('rtl');
    }
  }, [direction, language, isRTL]);

  // Create theme with RTL support
  const theme = createTheme({
    direction,
    typography: {
      fontFamily: isRTL 
        ? '"Noto Sans Arabic", "Arial", sans-serif'
        : '"Roboto", "Helvetica", "Arial", sans-serif',
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            direction,
          },
        },
      },
      // RTL-specific component overrides
      MuiDrawer: {
        styleOverrides: {
          paper: {
            ...(isRTL && {
              right: 0,
              left: 'auto',
            }),
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            ...(isRTL && {
              textAlign: 'right',
            }),
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            ...(isRTL && {
              textAlign: 'right',
            }),
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            ...(isRTL && {
              textAlign: 'right',
            }),
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            ...(isRTL && {
              textAlign: 'right',
            }),
          },
        },
      },
      MuiListItemText: {
        styleOverrides: {
          root: {
            ...(isRTL && {
              textAlign: 'right',
            }),
          },
        },
      },
      MuiFormLabel: {
        styleOverrides: {
          root: {
            ...(isRTL && {
              transformOrigin: 'top right',
            }),
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            ...(isRTL && {
              transformOrigin: 'top right',
            }),
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            ...(isRTL && {
              '& .MuiOutlinedInput-notchedOutline legend': {
                textAlign: 'right',
              },
            }),
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            ...(isRTL && {
              '& .MuiChip-deleteIcon': {
                marginLeft: 5,
                marginRight: -6,
              },
            }),
          },
        },
      },
      MuiBreadcrumbs: {
        styleOverrides: {
          separator: {
            ...(isRTL && {
              transform: 'scaleX(-1)',
            }),
          },
        },
      },
      MuiStepConnector: {
        styleOverrides: {
          line: {
            ...(isRTL && {
              borderLeftWidth: 0,
              borderRightWidth: 1,
            }),
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            ...(isRTL && {
              right: 0,
              left: 'auto',
            }),
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            ...(isRTL && {
              transform: 'scaleX(-1)',
            }),
          },
        },
      },
    },
  });

  const contextValue: RTLContextType = {
    isRTL,
    direction,
  };

  return (
    <RTLContext.Provider value={contextValue}>
      <CacheProvider value={isRTL ? cacheRtl : cacheLtr}>
        <ThemeProvider theme={theme}>
          {children}
        </ThemeProvider>
      </CacheProvider>
    </RTLContext.Provider>
  );
};

export const useRTL = (): RTLContextType => {
  const context = useContext(RTLContext);
  if (!context) {
    throw new Error('useRTL must be used within an RTLProvider');
  }
  return context;
};

// RTL-aware component wrapper
export const withRTL = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  return (props: P) => {
    const { isRTL } = useRTL();
    
    return (
      <div className={isRTL ? 'rtl-component' : 'ltr-component'}>
        <Component {...props} />
      </div>
    );
  };
};

// RTL-aware style helper
export const rtlStyle = (ltrStyle: React.CSSProperties, rtlStyle: React.CSSProperties) => {
  const { isRTL } = useRTL();
  return isRTL ? rtlStyle : ltrStyle;
};

// RTL-aware margin/padding helpers
export const marginStart = (value: number | string) => {
  const { isRTL } = useRTL();
  return isRTL ? { marginRight: value } : { marginLeft: value };
};

export const marginEnd = (value: number | string) => {
  const { isRTL } = useRTL();
  return isRTL ? { marginLeft: value } : { marginRight: value };
};

export const paddingStart = (value: number | string) => {
  const { isRTL } = useRTL();
  return isRTL ? { paddingRight: value } : { paddingLeft: value };
};

export const paddingEnd = (value: number | string) => {
  const { isRTL } = useRTL();
  return isRTL ? { paddingLeft: value } : { paddingRight: value };
};

export const borderStart = (value: string) => {
  const { isRTL } = useRTL();
  return isRTL ? { borderRight: value } : { borderLeft: value };
};

export const borderEnd = (value: string) => {
  const { isRTL } = useRTL();
  return isRTL ? { borderLeft: value } : { borderRight: value };
};

export const textAlign = (align: 'left' | 'right' | 'center' | 'justify' = 'left') => {
  const { isRTL } = useRTL();
  
  if (align === 'center' || align === 'justify') {
    return { textAlign: align };
  }
  
  if (align === 'left') {
    return { textAlign: isRTL ? 'right' : 'left' };
  }
  
  if (align === 'right') {
    return { textAlign: isRTL ? 'left' : 'right' };
  }
  
  return {};
};

export default RTLProvider;