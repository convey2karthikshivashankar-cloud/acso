import React, { useState, useEffect } from 'react';
import { Box, Chip, Tooltip, IconButton, Popover, Typography, LinearProgress } from '@mui/material';
import {
  Wifi as ConnectedIcon,
  WifiOff as DisconnectedIcon,
  Sync as ReconnectingIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { ConnectionState, getWebSocketManager } from '../../services/websocketManager';
import { getRealTimeSyncService } from '../../services/realTimeSyncService';

interface ConnectionStatusProps {
  showDetails?: boolean;
  compact?: boolean;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusProps> = ({
  showDetails = false,
  compact = false,
}) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [stats, setStats] = useState<any>({});
  const [syncStats, setSyncStats] = useState<any>({});
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const wsManager = getWebSocketManager();
    const syncService = getRealTimeSyncService();

    // Update connection state
    const updateState = () => {
      setConnectionState(wsManager.getState());
      setStats(wsManager.getStats());
      setSyncStats(syncService.getSyncStats());
    };

    // Initial state
    updateState();

    // Listen for state changes
    const handleStateChange = () => updateState();
    wsManager.on('stateChange', handleStateChange);

    // Update stats periodically
    const statsInterval = setInterval(updateState, 5000);

    return () => {
      wsManager.off('stateChange', handleStateChange);
      clearInterval(statsInterval);
    };
  }, []);

  const getStatusConfig = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return {
          color: 'success' as const,
          icon: <ConnectedIcon />,
          label: 'Connected',
          description: 'Real-time connection active',
        };
      case ConnectionState.CONNECTING:
        return {
          color: 'warning' as const,
          icon: <ReconnectingIcon className="animate-spin" />,
          label: 'Connecting',
          description: 'Establishing connection...',
        };
      case ConnectionState.RECONNECTING:
        return {
          color: 'warning' as const,
          icon: <ReconnectingIcon className="animate-spin" />,
          label: 'Reconnecting',
          description: 'Attempting to reconnect...',
        };
      case ConnectionState.ERROR:
        return {
          color: 'error' as const,
          icon: <ErrorIcon />,
          label: 'Error',
          description: 'Connection failed',
        };
      case ConnectionState.DISCONNECTED:
      default:
        return {
          color: 'default' as const,
          icon: <DisconnectedIcon />,
          label: 'Disconnected',
          description: 'No real-time connection',
        };
    }
  };

  const statusConfig = getStatusConfig();

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (showDetails) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  };

  if (compact) {
    return (
      <Tooltip title={statusConfig.description}>
        <Chip
          icon={statusConfig.icon}
          label={statusConfig.label}
          color={statusConfig.color}
          size="small"
          onClick={showDetails ? handleClick : undefined}
          sx={{ cursor: showDetails ? 'pointer' : 'default' }}
        />
      </Tooltip>
    );
  }

  return (
    <>
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        onClick={handleClick}
        sx={{ cursor: showDetails ? 'pointer' : 'default' }}
      >
        <Chip
          icon={statusConfig.icon}
          label={statusConfig.label}
          color={statusConfig.color}
          variant="outlined"
        />
        
        {showDetails && (
          <IconButton size="small">
            <InfoIcon />
          </IconButton>
        )}

        {connectionState === ConnectionState.CONNECTING || connectionState === ConnectionState.RECONNECTING && (
          <LinearProgress sx={{ width: 100, height: 2 }} />
        )}
      </Box>

      {showDetails && (
        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          <Box p={2} minWidth={300}>
            <Typography variant="h6" gutterBottom>
              Connection Details
            </Typography>
            
            <Box mb={2}>
              <Typography variant="body2" color="textSecondary">
                Status: <strong>{statusConfig.label}</strong>
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {statusConfig.description}
              </Typography>
            </Box>

            {connectionState === ConnectionState.CONNECTED && (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  Connection Statistics
                </Typography>
                <Box mb={2}>
                  <Typography variant="body2">
                    Connected: {formatDuration(Date.now() - stats.connectTime)}
                  </Typography>
                  <Typography variant="body2">
                    Latency: {stats.latency}ms
                  </Typography>
                  <Typography variant="body2">
                    Messages Sent: {stats.messagesSent}
                  </Typography>
                  <Typography variant="body2">
                    Messages Received: {stats.messagesReceived}
                  </Typography>
                  <Typography variant="body2">
                    Data Transferred: {formatBytes(stats.bytesTransferred)}
                  </Typography>
                  {stats.reconnectCount > 0 && (
                    <Typography variant="body2">
                      Reconnections: {stats.reconnectCount}
                    </Typography>
                  )}
                </Box>

                <Typography variant="subtitle2" gutterBottom>
                  Sync Statistics
                </Typography>
                <Box>
                  <Typography variant="body2">
                    Active Subscriptions: {syncStats.subscriptions || 0}
                  </Typography>
                  <Typography variant="body2">
                    Queued Events: {syncStats.queuedEvents || 0}
                  </Typography>
                </Box>
              </>
            )}

            {connectionState === ConnectionState.ERROR && (
              <Box>
                <Typography variant="subtitle2" color="error" gutterBottom>
                  Connection Error
                </Typography>
                <Typography variant="body2">
                  Unable to establish WebSocket connection. Please check your network connection and try again.
                </Typography>
              </Box>
            )}

            {connectionState === ConnectionState.RECONNECTING && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Reconnection Progress
                </Typography>
                <Typography variant="body2">
                  Attempt: {stats.reconnectCount || 0}
                </Typography>
                <LinearProgress sx={{ mt: 1 }} />
              </Box>
            )}
          </Box>
        </Popover>
      )}
    </>
  );
};

export default ConnectionStatusIndicator;