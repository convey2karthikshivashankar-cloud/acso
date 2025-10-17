import React from 'react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  TextField,
  Tooltip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  useTheme,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Close,
  Info,
  Warning,
  Error,
  CheckCircle,
} from '@mui/icons-material';
import {
  useFocusTrap,
  useKeyboardNavigation,
  useScreenReader,
  useAriaAttributes,
  useReducedMotion,
  useHighContrast,
  useAriaId,
  useEscapeKey,
  useAccessibleForm,
  useAccessibleTooltip,
  useAccessibleDisclosure,
} from '../../hooks/useAccessibility';

// Accessible Modal Component
interface AccessibleModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  description?: string;
}

export const AccessibleModal: React.FC<AccessibleModalProps> = ({
  open,
  onClose,
  title,
  children,
  description,
}) => {
  const theme = useTheme();
  const containerRef = useFocusTrap(open);
  const { announce } = useScreenReader();
  const titleId = useAriaId('modal-title');
  const descriptionId = useAriaId('modal-description');
  const { prefersReducedMotion } = useReducedMotion();

  useEscapeKey(onClose, open);

  React.useEffect(() => {
    if (open) {
      announce(`Modal opened: ${title}`, 'assertive');
    }
  }, [open, title, announce]);

  if (!open) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: theme.zIndex.modal,
        transition: prefersReducedMotion ? 'none' : 'opacity 0.3s ease',
      }}
      onClick={onClose}
      role="presentation"
    >
      <Card
        ref={containerRef}
        sx={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'auto',
          m: 2,
          transform: prefersReducedMotion ? 'none' : 'scale(1)',
          transition: prefersReducedMotion ? 'none' : 'transform 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography id={titleId} variant="h6" component="h2">
              {title}
            </Typography>
            <IconButton
              onClick={onClose}
              aria-label="Close modal"
              size="small"
            >
              <Close />
            </IconButton>
          </Box>
          
          {description && (
            <Typography id={descriptionId} variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {description}
            </Typography>
          )}
          
          {children}
        </CardContent>
      </Card>
    </Box>
  );
};

// Accessible List with Keyboard Navigation
interface AccessibleListProps<T> {
  items: T[];
  renderItem: (item: T, index: number, isSelected: boolean) => React.ReactNode;
  onSelectionChange?: (index: number, item: T) => void;
  orientation?: 'horizontal' | 'vertical';
  ariaLabel: string;
}

export function AccessibleList<T>({
  items,
  renderItem,
  onSelectionChange,
  orientation = 'vertical',
  ariaLabel,
}: AccessibleListProps<T>) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const itemRefs = React.useRef<HTMLElement[]>([]);
  
  const { currentIndex } = useKeyboardNavigation(itemRefs.current, {
    orientation,
    onSelectionChange: (index) => {
      setSelectedIndex(index);
      onSelectionChange?.(index, items[index]);
    },
  });

  return (
    <List
      role="listbox"
      aria-label={ariaLabel}
      aria-activedescendant={`list-item-${currentIndex}`}
    >
      {items.map((item, index) => (
        <ListItem
          key={index}
          ref={(el) => {
            if (el) itemRefs.current[index] = el;
          }}
          id={`list-item-${index}`}
          role="option"
          aria-selected={index === selectedIndex}
          tabIndex={index === selectedIndex ? 0 : -1}
          onClick={() => {
            setSelectedIndex(index);
            onSelectionChange?.(index, item);
          }}
          sx={{
            cursor: 'pointer',
            '&:focus': {
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: '2px',
            },
          }}
        >
          {renderItem(item, index, index === selectedIndex)}
        </ListItem>
      ))}
    </List>
  );
}

// Accessible Form Field with Error Handling
interface AccessibleFormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helpText?: string;
  required?: boolean;
  type?: string;
}

export const AccessibleFormField: React.FC<AccessibleFormFieldProps> = ({
  label,
  value,
  onChange,
  error,
  helpText,
  required = false,
  type = 'text',
}) => {
  const fieldId = useAriaId('field');
  const errorId = useAriaId('error');
  const helpId = useAriaId('help');
  const { announce } = useScreenReader();

  React.useEffect(() => {
    if (error) {
      announce(`Error in ${label}: ${error}`, 'assertive');
    }
  }, [error, label, announce]);

  return (
    <Box sx={{ mb: 2 }}>
      <TextField
        id={fieldId}
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={!!error}
        required={required}
        type={type}
        fullWidth
        aria-describedby={[
          error ? errorId : null,
          helpText ? helpId : null,
        ].filter(Boolean).join(' ') || undefined}
        aria-invalid={!!error}
        helperText={error || helpText}
      />
      
      {error && (
        <Typography
          id={errorId}
          variant="caption"
          color="error"
          role="alert"
          sx={{ display: 'block', mt: 0.5 }}
        >
          {error}
        </Typography>
      )}
      
      {helpText && !error && (
        <Typography
          id={helpId}
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 0.5 }}
        >
          {helpText}
        </Typography>
      )}
    </Box>
  );
};

// Accessible Tooltip
interface AccessibleTooltipProps {
  content: string;
  children: React.ReactElement;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export const AccessibleTooltip: React.FC<AccessibleTooltipProps> = ({
  content,
  children,
  placement = 'top',
}) => {
  const {
    isVisible,
    tooltipId,
    triggerProps,
    tooltipProps,
  } = useAccessibleTooltip();

  return (
    <>
      {React.cloneElement(children, {
        ...triggerProps,
        ref: (el: HTMLElement) => {
          // Handle both ref callback and ref object
          if (typeof children.ref === 'function') {
            children.ref(el);
          } else if (children.ref) {
            children.ref.current = el;
          }
        },
      })}
      
      {isVisible && (
        <Box
          {...tooltipProps}
          sx={{
            position: 'absolute',
            zIndex: 'tooltip',
            backgroundColor: 'grey.800',
            color: 'common.white',
            padding: 1,
            borderRadius: 1,
            fontSize: '0.75rem',
            maxWidth: 200,
            wordWrap: 'break-word',
          }}
        >
          {content}
        </Box>
      )}
    </>
  );
};

// Accessible Disclosure/Collapsible Content
interface AccessibleDisclosureProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const AccessibleDisclosure: React.FC<AccessibleDisclosureProps> = ({
  title,
  children,
  defaultOpen = false,
}) => {
  const { isOpen, buttonProps, contentProps } = useAccessibleDisclosure(defaultOpen);
  const { prefersReducedMotion } = useReducedMotion();

  return (
    <Box>
      <Button
        {...buttonProps}
        variant="text"
        sx={{
          justifyContent: 'space-between',
          width: '100%',
          textAlign: 'left',
          '&:focus': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: '2px',
          },
        }}
        endIcon={isOpen ? <ExpandLess /> : <ExpandMore />}
      >
        {title}
      </Button>
      
      <Box
        {...contentProps}
        sx={{
          overflow: 'hidden',
          transition: prefersReducedMotion ? 'none' : 'height 0.3s ease',
          height: isOpen ? 'auto' : 0,
        }}
      >
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

// Accessible Status Message
interface AccessibleStatusProps {
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  live?: 'polite' | 'assertive';
}

export const AccessibleStatus: React.FC<AccessibleStatusProps> = ({
  message,
  severity,
  live = 'polite',
}) => {
  const { announce } = useScreenReader();

  React.useEffect(() => {
    announce(message, live);
  }, [message, live, announce]);

  const getIcon = () => {
    switch (severity) {
      case 'info': return <Info />;
      case 'warning': return <Warning />;
      case 'error': return <Error />;
      case 'success': return <CheckCircle />;
    }
  };

  return (
    <Alert
      severity={severity}
      icon={getIcon()}
      role="status"
      aria-live={live}
      sx={{ mb: 2 }}
    >
      {message}
    </Alert>
  );
};

// Accessible Skip Links
export const SkipLinks: React.FC = () => {
  const skipLinks = [
    { href: '#main-content', text: 'Skip to main content' },
    { href: '#navigation', text: 'Skip to navigation' },
    { href: '#footer', text: 'Skip to footer' },
  ];

  return (
    <Box
      sx={{
        position: 'absolute',
        top: -40,
        left: 6,
        zIndex: 'tooltip',
        '&:focus-within': {
          top: 6,
        },
      }}
    >
      {skipLinks.map((link) => (
        <Button
          key={link.href}
          href={link.href}
          component="a"
          variant="contained"
          size="small"
          sx={{
            mr: 1,
            '&:focus': {
              position: 'relative',
            },
          }}
        >
          {link.text}
        </Button>
      ))}
    </Box>
  );
};

// Accessible Loading Indicator
interface AccessibleLoadingProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

export const AccessibleLoading: React.FC<AccessibleLoadingProps> = ({
  message = 'Loading...',
  size = 'medium',
}) => {
  const { announce } = useScreenReader();

  React.useEffect(() => {
    announce(message, 'polite');
  }, [message, announce]);

  return (
    <Box
      role="status"
      aria-live="polite"
      aria-label={message}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Box
        sx={{
          width: size === 'small' ? 20 : size === 'large' ? 60 : 40,
          height: size === 'small' ? 20 : size === 'large' ? 60 : 40,
          border: '2px solid',
          borderColor: 'primary.main',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          '@keyframes spin': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' },
          },
        }}
      />
      <Typography variant="body2" sx={{ ml: 2, srOnly: true }}>
        {message}
      </Typography>
    </Box>
  );
};

// Screen Reader Only Text Component
export const SROnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    component="span"
    sx={{
      position: 'absolute',
      width: 1,
      height: 1,
      padding: 0,
      margin: -1,
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: 0,
    }}
  >
    {children}
  </Box>
);