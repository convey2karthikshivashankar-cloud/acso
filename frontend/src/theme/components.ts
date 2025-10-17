import { Components, Theme } from '@mui/material/styles';
import { designTokens } from './index';

// Light theme components
const lightComponents: Components<Omit<Theme, 'components'>> = {
  // Button components
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: designTokens.borderRadius.md,
        textTransform: 'none',
        fontWeight: 500,
        boxShadow: 'none',
        '&:hover': {
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
        },
        '&:focus': {
          boxShadow: '0px 0px 0px 3px rgba(33, 150, 243, 0.2)',
        },
      },
      contained: {
        '&:hover': {
          boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
        },
      },
      outlined: {
        borderWidth: '1.5px',
        '&:hover': {
          borderWidth: '1.5px',
        },
      },
    },
  },
  
  // Card components
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: designTokens.borderRadius.lg,
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
        '&:hover': {
          boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1), 0px 2px 4px rgba(0, 0, 0, 0.06)',
        },
      },
    },
  },
  
  // Paper components
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: designTokens.borderRadius.md,
      },
      elevation1: {
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
      },
      elevation2: {
        boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1), 0px 2px 4px rgba(0, 0, 0, 0.06)',
      },
      elevation3: {
        boxShadow: '0px 10px 15px rgba(0, 0, 0, 0.1), 0px 4px 6px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  
  // Input components
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: designTokens.borderRadius.md,
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(0, 0, 0, 0.4)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: '2px',
          },
        },
      },
    },
  },
  
  // Chip components
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: designTokens.borderRadius.xl,
        fontWeight: 500,
      },
    },
  },
  
  // Dialog components
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: designTokens.borderRadius.lg,
      },
    },
  },
  
  // Menu components
  MuiMenu: {
    styleOverrides: {
      paper: {
        borderRadius: designTokens.borderRadius.md,
        boxShadow: '0px 10px 15px rgba(0, 0, 0, 0.1), 0px 4px 6px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  
  // Tooltip components
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        borderRadius: designTokens.borderRadius.sm,
        fontSize: '0.75rem',
        fontWeight: 500,
      },
    },
  },
  
  // AppBar components
  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  
  // Drawer components
  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRadius: 0,
        borderRight: '1px solid rgba(0, 0, 0, 0.12)',
      },
    },
  },
  
  // Tab components
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 500,
        minHeight: 48,
      },
    },
  },
  
  // Table components
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
      },
      head: {
        fontWeight: 600,
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
      },
    },
  },
  
  // Switch components
  MuiSwitch: {
    styleOverrides: {
      root: {
        '& .MuiSwitch-switchBase': {
          '&.Mui-checked': {
            '& + .MuiSwitch-track': {
              opacity: 1,
            },
          },
        },
      },
    },
  },
  
  // Checkbox components
  MuiCheckbox: {
    styleOverrides: {
      root: {
        borderRadius: designTokens.borderRadius.sm,
      },
    },
  },
  
  // Radio components
  MuiRadio: {
    styleOverrides: {
      root: {
        '&:hover': {
          backgroundColor: 'rgba(33, 150, 243, 0.04)',
        },
      },
    },
  },
  
  // Alert components
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: designTokens.borderRadius.md,
        fontWeight: 500,
      },
      standardSuccess: {
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        color: '#2e7d32',
      },
      standardError: {
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        color: '#c62828',
      },
      standardWarning: {
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
        color: '#f57c00',
      },
      standardInfo: {
        backgroundColor: 'rgba(3, 169, 244, 0.1)',
        color: '#0277bd',
      },
    },
  },
  
  // Snackbar components
  MuiSnackbar: {
    styleOverrides: {
      root: {
        '& .MuiSnackbarContent-root': {
          borderRadius: designTokens.borderRadius.md,
        },
      },
    },
  },
  
  // Backdrop components
  MuiBackdrop: {
    styleOverrides: {
      root: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
      },
    },
  },
};

// Dark theme components
const darkComponents: Components<Omit<Theme, 'components'>> = {
  ...lightComponents,
  
  // Override specific components for dark theme
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: designTokens.borderRadius.lg,
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.3), 0px 1px 2px rgba(0, 0, 0, 0.2)',
        '&:hover': {
          boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.3), 0px 2px 4px rgba(0, 0, 0, 0.2)',
        },
      },
    },
  },
  
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: designTokens.borderRadius.md,
      },
      elevation1: {
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.3), 0px 1px 2px rgba(0, 0, 0, 0.2)',
      },
      elevation2: {
        boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.3), 0px 2px 4px rgba(0, 0, 0, 0.2)',
      },
      elevation3: {
        boxShadow: '0px 10px 15px rgba(0, 0, 0, 0.3), 0px 4px 6px rgba(0, 0, 0, 0.2)',
      },
    },
  },
  
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: designTokens.borderRadius.md,
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255, 255, 255, 0.4)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: '2px',
          },
        },
      },
    },
  },
  
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      },
      head: {
        fontWeight: 600,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
      },
    },
  },
  
  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRadius: 0,
        borderRight: '1px solid rgba(255, 255, 255, 0.12)',
      },
    },
  },
};

// High contrast theme components
const highContrastComponents: Components<Omit<Theme, 'components'>> = {
  ...darkComponents,
  
  // Override for high contrast accessibility
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: designTokens.borderRadius.md,
        textTransform: 'none',
        fontWeight: 700,
        border: '2px solid',
        '&:focus': {
          outline: '3px solid #ffff00',
          outlineOffset: '2px',
        },
      },
    },
  },
  
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: designTokens.borderRadius.md,
          '& .MuiOutlinedInput-notchedOutline': {
            borderWidth: '2px',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderWidth: '3px',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: '3px',
          },
        },
      },
    },
  },
  
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: designTokens.borderRadius.lg,
        border: '2px solid #ffffff',
        boxShadow: 'none',
      },
    },
  },
};

export const components = {
  light: lightComponents,
  dark: darkComponents,
  highContrast: highContrastComponents,
};