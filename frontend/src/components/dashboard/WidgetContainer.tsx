import React from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Skeleton,
  Alert,
  CircularProgress,
  Tooltip,
  Badge,
  useTheme,
  alpha,
} from '@mui/material';
import {
  MoreVert,
  Refresh,
  Settings as SettingsIcon,
  Fullscreen,
  FullscreenExit,
  Close,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  DragIndicator,
} from '@mui/icons-material';

export interface WidgetContainerProps {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  loading?: boolean;
  error?: string | Error;
  warning?: string;
  info?: string;
  success?: string;
  refreshing?: boolean;
  lastUpdated?: Date;
  refreshInterval?: number;
  allowResize?: boolean;
  allowRemove?: boolean;
  allowFullscreen?: boolean;
  allowRefresh?: boolean;
  allowSettings?: boolean;
  isDraggable?: boolean;
  isFullscreen?: boolean;
  badge?: {
    count?: number;
    color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
    variant?: 'standard' | 'dot';
  };
  actions?: Array<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }>;
  onRefresh?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  onRemove?: () => void;
  sx?: object;
}

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
  id,
  title,
  subtitle,
  children,
  loading = false,
  error,
  warning,
  info,
  success,
  refreshing = false,
  lastUpdated,
  refreshInterval,
  allowResize = true,
  allowRemove = true,
  allowFullscreen = true,
  allowRefresh = true,
  allowSettings = false,
  isDraggable = false,
  isFullscreen = false,
  badge,
  actions = [],
  onRefresh,
  onSettings,
  onFullscreen,
  onRemove,
  sx = {},
}) => {
  const theme = useTheme();
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [autoRefreshTimer, setAutoRefreshTimer] = React.useState<NodeJS.Timeout | null>(null);

  // Auto-refresh functionality
  React.useEffect(() => {
    if (refreshInterval && refreshInterval > 0 && onRefresh && !loading && !refreshing) {
      const timer = setInterval(() => {
        onRefresh();
      }, refreshInterval * 1000);
      
      setAutoRefreshTimer(timer);
      
      return () => {
        clearInterval(timer);
        setAutoRefreshTimer(null);
      };
    }
  }, [refreshInterval, onRefresh, loading, refreshing]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleRefresh = () => {
    onRefresh?.();
    handleMenuClose();
  };

  const handleSettings = () => {
    onSettings?.();
    handleMenuClose();
  };

  const handleFullscreen = () => {
    onFullscreen?.();
    handleMenuClose();
  };

  const handleRemove = () => {
    onRemove?.();
    handleMenuClose();
  };

  const getStatusIcon = () => {
    if (error) return <ErrorIcon color="error" fontSize="small" />;
    if (warning) return <WarningIcon color="warning" fontSize="small" />;
    if (success) return <SuccessIcon color="success" fontSize="small" />;
    if (info) return <InfoIcon color="info" fontSize="small" />;
    return null;
  };

  const getStatusMessage = () => {
    if (error) return typeof error === 'string' ? error : error.message;
    if (warning) return warning;
    if (success) return success;
    if (info) return info;
    return null;
  };

  const getStatusSeverity = (): 'error' | 'warning' | 'info' | 'success' => {
    if (error) return 'error';
    if (warning) return 'warning';
    if (success) return 'success';
    return 'info';
  };

  const formatLastUpdated = (date: Date) => {
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

  const containerSx = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    ...(isFullscreen && {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: theme.zIndex.modal,
      margin: 0,
    }),
    ...sx,
  };

  const headerSx = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    p: 2,
    borderBottom: 1,
    borderColor: 'divider',
    backgroundColor: alpha(theme.palette.primary.main, 0.02),
    cursor: isDraggable ? 'move' : 'default',
    minHeight: 64,
  };

  return (
    <Paper elevation={2} sx={containerSx}>
      {/* Widget Header */}
      <Box sx={headerSx} className={isDraggable ? 'drag-handle' : ''}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          {isDraggable && (
            <DragIndicator sx={{ color: 'text.secondary', fontSize: 16 }} />
          )}
          
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {badge ? (
                <Badge
                  badgeContent={badge.count}
                  color={badge.color || 'primary'}
                  variant={badge.variant || 'standard'}
                  invisible={badge.variant === 'dot' && !badge.count}
                >
                  <Typography variant="subtitle1" fontWeight="medium" noWrap>
                    {title}
                  </Typography>
                </Badge>
              ) : (
                <Typography variant="subtitle1" fontWeight="medium" noWrap>
                  {title}
                </Typography>
              )}
              
              {refreshing && (
                <CircularProgress size={16} thickness={4} />
              )}
              
              {getStatusIcon()}
            </Box>
            
            {subtitle && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {subtitle}
              </Typography>
            )}
            
            {lastUpdated && (
              <Typography variant="caption" color="text.secondary" noWrap>
                Updated {formatLastUpdated(lastUpdated)}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Header Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {/* Custom Actions */}
          {actions.map((action, index) => (
            <Tooltip key={index} title={action.label}>
              <IconButton
                size="small"
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.icon}
              </IconButton>
            </Tooltip>
          ))}

          {/* Refresh Button */}
          {allowRefresh && onRefresh && (
            <Tooltip title="Refresh">
              <IconButton
                size="small"
                onClick={handleRefresh}
                disabled={loading || refreshing}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          )}

          {/* Fullscreen Button */}
          {allowFullscreen && onFullscreen && (
            <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
              <IconButton size="small" onClick={handleFullscreen}>
                {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
              </IconButton>
            </Tooltip>
          )}

          {/* Menu Button */}
          <Tooltip title="Widget Options">
            <IconButton size="small" onClick={handleMenuOpen}>
              <MoreVert />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleMenuClose}
          >
            {allowRefresh && onRefresh && (
              <MenuItem onClick={handleRefresh} disabled={loading || refreshing}>
                <Refresh sx={{ mr: 1 }} />
                Refresh
              </MenuItem>
            )}
            
            {allowSettings && onSettings && (
              <MenuItem onClick={handleSettings}>
                <SettingsIcon sx={{ mr: 1 }} />
                Settings
              </MenuItem>
            )}
            
            {allowFullscreen && onFullscreen && (
              <MenuItem onClick={handleFullscreen}>
                {isFullscreen ? <FullscreenExit sx={{ mr: 1 }} /> : <Fullscreen sx={{ mr: 1 }} />}
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </MenuItem>
            )}
            
            {allowRemove && onRemove && (
              <MenuItem onClick={handleRemove} sx={{ color: 'error.main' }}>
                <Close sx={{ mr: 1 }} />
                Remove Widget
              </MenuItem>
            )}
          </Menu>
        </Box>
      </Box>

      {/* Status Message */}
      {getStatusMessage() && (
        <Alert
          severity={getStatusSeverity()}
          sx={{ borderRadius: 0, '& .MuiAlert-message': { width: '100%' } }}
        >
          {getStatusMessage()}
        </Alert>
      )}

      {/* Widget Content */}
      <Box sx={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {loading ? (
          <Box sx={{ p: 2 }}>
            <Skeleton variant="rectangular" height={200} />
            <Box sx={{ mt: 2 }}>
              <Skeleton variant="text" />
              <Skeleton variant="text" width="60%" />
            </Box>
          </Box>
        ) : (
          children
        )}
      </Box>
    </Paper>
  );
};

export default WidgetContainer;