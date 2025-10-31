import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  Tooltip,
  IconButton,
  Popover,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  LinearProgress,
} from '@mui/material';
import {
  Wifi as ConnectedIcon,
  WifiOff as DisconnectedIcon,
  Sync as ReconnectingIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { websocketService } from '../../services/websocketService';
import { realTimeDataService } from '../../services/realTimeDataService';
import { formatDistanceToNow } from 'date-fns';

interface ConnectionStatusProps {
  variant?: 'chip' | 'icon' | 'full';
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  variant = 'chip',
  showDetails = true,
  size = 'medium',
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastConnected, setLastConnected] = useState<Date | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [bufferStats, setBufferStats] = useState<Record<string, any>>({});

  useEffect(() => {
    const updateStatus = () => {
      const connected = websocketService.isConnected();
      const state = websocketService.getConnectionState();
      const attempts = websocketService.getReconnectAttempts();
      
      setIsConnected(connected);
      setConnectionState(state);
      setReconnectAttempts(attempts);
      
      if (connected && !isConnected) {
        setLastConnected(new Date());
      }
    };

    // Initial status check
    updateStatus();

    // Set up connection handlers
    const unsubscribeConnection = websocketService.onConnection((connected) => {
      setIsConnected(connected);
      if (connected) {
        setLastConnected(new Date());
        setReconnectAttempts(0);
      }
    });

    // Periodic status updates
    const interval = setInterval(updateStatus, 2000);

    // Buffer stats updates
    const statsInterval = setInterval(() => {
      setBufferStats(realTimeDataService.getMetrics());
    }, 5000);

    return () => {
      unsubscribeConnection();
      clearInterval(interval);
      clearInterval(statsInterval);
    };
  }, [isConnected]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (showDetails) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleReconnect = () => {
    websocketService.disconnect();
    setTimeout(() => {
      websocketService.connect();
    }, 1000);
    handleClose();
  };

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'success';
      case 'connecting':
      case 'reconnecting':
        return 'warning';
      case 'disconnected':
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = () => {
    switch (connectionState) {
      case 'connected':
        return <ConnectedIcon />;
      case 'connecting':
      case 'reconnecting':
        return <ReconnectingIcon className="animate-spin" />;
      case 'error':
        return <ErrorIcon />;
      default:
        return <DisconnectedIcon />;
    }
  };

  const getStatusLabel = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return `Reconnecting... (${reconnectAttempts})`;
      case 'error':
        return 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  const getStatusDescription = () => {
    switch (connectionState) {
      case 'connected':
        return 'Real-time data is flowing normally';
      case 'connecting':
        return 'Establishing connection to server';
      case 'reconnecting':
        return `Attempting to reconnect (attempt ${reconnectAttempts})`;
      case 'error':
        return 'Unable to connect to server';
      default:
        return 'No real-time connection';
    }
  };

  if (variant === 'icon') {
    return (
      <Tooltip title={getStatusDescription()}>
        <IconButton
          size={size}
          onClick={handleClick}
          color={getStatusColor() as any}
        >
          {getStatusIcon()}
        </IconButton>
      </Tooltip>
    );
  }

  if (variant === 'full') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1,
          borderRadius: 1,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
        }}
      >
        {getStatusIcon()}
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {getStatusLabel()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {getStatusDescription()}
          </Typography>
        </Box>
        {showDetails && (
          <IconButton size="small" onClick={handleClick}>
            <InfoIcon />
          </IconButton>
        )}
      </Box>
    );
  }

  // Default chip variant
  return (
    <>
      <Chip
        icon={getStatusIcon()}
        label={getStatusLabel()}
        color={getStatusColor() as any}
        variant="outlined"
        size={size === 'large' ? 'medium' : size}
        onClick={showDetails ? handleClick : undefined}
        sx={{
          cursor: showDetails ? 'pointer' : 'default',
          '& .MuiChip-icon': {
            animation: connectionState === 'connecting' || connectionState === 'reconnecting' 
              ? 'spin 1s linear infinite' : 'none',
          },
          '@keyframes spin': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' },
          },
        }}
      />

      {showDetails && (
        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            sx: { width: 320, p: 2 },
          }}
        >
          <Typography variant="h6" gutterBottom>
            Connection Details
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {getStatusIcon()}
              <Typography variant="body1" fontWeight="medium">
                {getStatusLabel()}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {getStatusDescription()}
            </Typography>
          </Box>

          {connectionState === 'connecting' || connectionState === 'reconnecting' && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Please wait...
              </Typography>
            </Box>
          )}

          <List dense>
            <ListItem>
              <ListItemIcon>
                <InfoIcon />
              </ListItemIcon>
              <ListItemText
                primary="Connection ID"
                secondary={websocketService.getConnectionId() || 'Not available'}
              />
            </ListItem>

            {lastConnected && (
              <ListItem>
                <ListItemIcon>
                  <ConnectedIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Last Connected"
                  secondary={formatDistanceToNow(lastConnected, { addSuffix: true })}
                />
              </ListItem>
            )}

            {reconnectAttempts > 0 && (
              <ListItem>
                <ListItemIcon>
                  <ReconnectingIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Reconnect Attempts"
                  secondary={reconnectAttempts}
                />
              </ListItem>
            )}
          </List>

          {bufferStats && (
            <>
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                Real-Time Metrics
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Active Subscriptions"
                    secondary={`${bufferStats.activeSubscriptions || 0} / ${bufferStats.totalSubscriptions || 0}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Messages/Second"
                    secondary={bufferStats.messagesPerSecond || 0}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Average Latency"
                    secondary={`${Math.round(bufferStats.averageLatency || 0)}ms`}
                  />
                </ListItem>
              </List>
            </>
          )}

          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={handleReconnect}
              disabled={connectionState === 'connecting'}
            >
              Reconnect
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={handleClose}
            >
              Close
            </Button>
          </Box>
        </Popover>
      )}
    </>
  );
};

export default ConnectionStatus;