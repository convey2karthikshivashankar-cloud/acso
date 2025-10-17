import React from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  IconButton,
  Box,
  Typography,
  Chip,
  Avatar,
  Button,
  Collapse,
  LinearProgress,
  Fade,
  Slide,
  Grow,
} from '@mui/material';
import {
  Close,
  ExpandMore,
  ExpandLess,
  CheckCircle,
  Warning,
  Error,
  Info,
  Notifications,
  Schedule,
  Person,
} from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';

export interface NotificationAction {
  label: string;
  onClick: () => void;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  variant?: 'text' | 'outlined' | 'contained';
}

export interface NotificationProps {
  id?: string;
  title?: string;
  message: string;
  severity?: 'success' | 'info' | 'warning' | 'error';
  variant?: 'filled' | 'outlined' | 'standard';
  open?: boolean;
  autoHideDuration?: number | null;
  persistent?: boolean;
  expandable?: boolean;
  expandedContent?: React.ReactNode;
  actions?: NotificationAction[];
  avatar?: React.ReactNode;
  timestamp?: Date;
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  progress?: {
    value: number;
    label?: string;
  };
  anchorOrigin?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
  transition?: 'fade' | 'slide' | 'grow';
  onClose?: () => void;
  onAction?: (actionIndex: number) => void;
  sx?: object;
}

const TransitionComponent = ({ 
  transition, 
  children, 
  ...props 
}: { 
  transition: 'fade' | 'slide' | 'grow';
  children: React.ReactElement;
} & TransitionProps) => {
  switch (transition) {
    case 'slide':
      return <Slide {...props} direction="up">{children}</Slide>;
    case 'grow':
      return <Grow {...props}>{children}</Grow>;
    case 'fade':
    default:
      return <Fade {...props}>{children}</Fade>;
  }
};

export const EnhancedNotification: React.FC<NotificationProps> = ({
  id,
  title,
  message,
  severity = 'info',
  variant = 'filled',
  open = true,
  autoHideDuration = 6000,
  persistent = false,
  expandable = false,
  expandedContent,
  actions = [],
  avatar,
  timestamp,
  category,
  priority,
  progress,
  anchorOrigin = { vertical: 'bottom', horizontal: 'left' },
  transition = 'slide',
  onClose,
  onAction,
  sx = {},
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState(autoHideDuration);

  React.useEffect(() => {
    if (!persistent && autoHideDuration && timeLeft && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev ? prev - 100 : 0);
      }, 100);

      return () => clearInterval(timer);
    }
  }, [persistent, autoHideDuration, timeLeft]);

  React.useEffect(() => {
    if (timeLeft === 0 && onClose) {
      onClose();
    }
  }, [timeLeft, onClose]);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const handleActionClick = (index: number, action: NotificationAction) => {
    action.onClick();
    onAction?.(index);
  };

  const getSeverityIcon = () => {
    switch (severity) {
      case 'success': return <CheckCircle />;
      case 'warning': return <Warning />;
      case 'error': return <Error />;
      case 'info': return <Info />;
      default: return <Notifications />;
    }
  };

  const getPriorityColor = () => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return severity;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const progressPercentage = autoHideDuration && timeLeft 
    ? ((autoHideDuration - timeLeft) / autoHideDuration) * 100 
    : 0;

  return (
    <Snackbar
      open={open}
      autoHideDuration={persistent ? null : autoHideDuration}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
      TransitionComponent={(props) => (
        <TransitionComponent transition={transition} {...props} />
      )}
      sx={sx}
    >
      <Alert
        severity={getPriorityColor() as any}
        variant={variant}
        onClose={persistent ? undefined : onClose}
        icon={avatar || getSeverityIcon()}
        sx={{
          width: '100%',
          minWidth: 300,
          maxWidth: 500,
          '& .MuiAlert-message': {
            width: '100%',
            overflow: 'hidden',
          },
        }}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {expandable && (
              <IconButton
                size="small"
                onClick={handleExpandClick}
                color="inherit"
              >
                {expanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            )}
            {!persistent && (
              <IconButton
                size="small"
                onClick={onClose}
                color="inherit"
              >
                <Close />
              </IconButton>
            )}
          </Box>
        }
      >
        {/* Header */}
        <Box>
          {title && (
            <AlertTitle sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" component="span">
                  {title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {category && (
                    <Chip
                      label={category}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  )}
                  {priority && (
                    <Chip
                      label={priority.toUpperCase()}
                      size="small"
                      color={getPriorityColor() as any}
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              </Box>
            </AlertTitle>
          )}

          {/* Message */}
          <Typography variant="body2" sx={{ mb: 1 }}>
            {message}
          </Typography>

          {/* Metadata */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            {timestamp && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Schedule fontSize="small" sx={{ opacity: 0.7 }} />
                <Typography variant="caption" color="text.secondary">
                  {formatTimestamp(timestamp)}
                </Typography>
              </Box>
            )}
            
            {id && (
              <Typography variant="caption" color="text.secondary">
                ID: {id}
              </Typography>
            )}
          </Box>

          {/* Progress */}
          {progress && (
            <Box sx={{ mb: 1 }}>
              {progress.label && (
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  {progress.label}
                </Typography>
              )}
              <LinearProgress
                variant="determinate"
                value={progress.value}
                sx={{ height: 4, borderRadius: 2 }}
              />
            </Box>
          )}

          {/* Auto-hide progress */}
          {!persistent && autoHideDuration && (
            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              sx={{
                height: 2,
                borderRadius: 1,
                mb: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                },
              }}
            />
          )}

          {/* Actions */}
          {actions.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {actions.map((action, index) => (
                <Button
                  key={index}
                  size="small"
                  variant={action.variant || 'text'}
                  color={action.color || 'inherit'}
                  onClick={() => handleActionClick(index, action)}
                  sx={{ minWidth: 'auto' }}
                >
                  {action.label}
                </Button>
              ))}
            </Box>
          )}
        </Box>

        {/* Expanded Content */}
        {expandable && (
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              {expandedContent}
            </Box>
          </Collapse>
        )}
      </Alert>
    </Snackbar>
  );
};

// Notification Provider Context
export interface NotificationContextType {
  notifications: NotificationProps[];
  addNotification: (notification: Omit<NotificationProps, 'id' | 'open'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = React.createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = React.useState<NotificationProps[]>([]);

  const addNotification = (notification: Omit<NotificationProps, 'id' | 'open'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: NotificationProps = {
      ...notification,
      id,
      open: true,
    };

    setNotifications(prev => [...prev, newNotification]);
    return id;
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const value: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {notifications.map(notification => (
        <EnhancedNotification
          key={notification.id}
          {...notification}
          onClose={() => removeNotification(notification.id!)}
        />
      ))}
    </NotificationContext.Provider>
  );
};