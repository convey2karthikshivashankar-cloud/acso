import React from 'react';
import {
  Box,
  Chip,
  Avatar,
  Typography,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  CheckCircle as HealthyIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Help as UnknownIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';

export type StatusType = 'healthy' | 'warning' | 'error' | 'unknown' | 'active' | 'inactive';

interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  variant?: 'dot' | 'chip' | 'icon' | 'avatar';
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  tooltip?: string;
  animated?: boolean;
  onClick?: () => void;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  variant = 'chip',
  size = 'medium',
  showLabel = true,
  tooltip,
  animated = false,
  onClick,
}) => {
  const theme = useTheme();

  const getStatusConfig = (status: StatusType) => {
    const configs = {
      healthy: {
        color: theme.palette.success.main,
        backgroundColor: alpha(theme.palette.success.main, 0.1),
        icon: <HealthyIcon />,
        label: 'Healthy',
        chipColor: 'success' as const,
      },
      warning: {
        color: theme.palette.warning.main,
        backgroundColor: alpha(theme.palette.warning.main, 0.1),
        icon: <WarningIcon />,
        label: 'Warning',
        chipColor: 'warning' as const,
      },
      error: {
        color: theme.palette.error.main,
        backgroundColor: alpha(theme.palette.error.main, 0.1),
        icon: <ErrorIcon />,
        label: 'Error',
        chipColor: 'error' as const,
      },
      unknown: {
        color: theme.palette.grey[500],
        backgroundColor: alpha(theme.palette.grey[500], 0.1),
        icon: <UnknownIcon />,
        label: 'Unknown',
        chipColor: 'default' as const,
      },
      active: {
        color: theme.palette.success.main,
        backgroundColor: alpha(theme.palette.success.main, 0.1),
        icon: <CircleIcon />,
        label: 'Active',
        chipColor: 'success' as const,
      },
      inactive: {
        color: theme.palette.grey[500],
        backgroundColor: alpha(theme.palette.grey[500], 0.1),
        icon: <CircleIcon />,
        label: 'Inactive',
        chipColor: 'default' as const,
      },
    };

    return configs[status];
  };

  const config = getStatusConfig(status);
  const displayLabel = label || config.label;

  const getSizeProps = () => {
    switch (size) {
      case 'small':
        return { width: 16, height: 16, fontSize: '0.75rem' };
      case 'large':
        return { width: 24, height: 24, fontSize: '1rem' };
      default:
        return { width: 20, height: 20, fontSize: '0.875rem' };
    }
  };

  const sizeProps = getSizeProps();

  const renderIndicator = () => {
    switch (variant) {
      case 'dot':
        return (
          <Box
            sx={{
              width: sizeProps.width,
              height: sizeProps.height,
              borderRadius: '50%',
              backgroundColor: config.color,
              display: 'inline-block',
              animation: animated ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%': {
                  opacity: 1,
                },
                '50%': {
                  opacity: 0.5,
                },
                '100%': {
                  opacity: 1,
                },
              },
            }}
          />
        );

      case 'icon':
        return (
          <Box
            sx={{
              color: config.color,
              display: 'flex',
              alignItems: 'center',
              '& .MuiSvgIcon-root': {
                fontSize: sizeProps.width,
              },
            }}
          >
            {config.icon}
          </Box>
        );

      case 'avatar':
        return (
          <Avatar
            sx={{
              width: sizeProps.width * 1.5,
              height: sizeProps.height * 1.5,
              backgroundColor: config.backgroundColor,
              color: config.color,
              '& .MuiSvgIcon-root': {
                fontSize: sizeProps.width,
              },
            }}
          >
            {config.icon}
          </Avatar>
        );

      case 'chip':
      default:
        return (
          <Chip
            label={showLabel ? displayLabel : ''}
            color={config.chipColor}
            variant="outlined"
            size={size === 'large' ? 'medium' : 'small'}
            icon={config.icon}
            onClick={onClick}
            sx={{
              cursor: onClick ? 'pointer' : 'default',
              '& .MuiChip-icon': {
                fontSize: sizeProps.width,
              },
            }}
          />
        );
    }
  };

  const indicator = renderIndicator();

  if (tooltip) {
    return <Tooltip title={tooltip}>{indicator}</Tooltip>;
  }

  if (showLabel && variant !== 'chip') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: onClick ? 'pointer' : 'default',
        }}
        onClick={onClick}
      >
        {indicator}
        <Typography variant="body2" sx={{ fontSize: sizeProps.fontSize }}>
          {displayLabel}
        </Typography>
      </Box>
    );
  }

  return indicator;
};

// Health status component for system monitoring
export const HealthStatus: React.FC<{
  health: 'healthy' | 'warning' | 'critical' | 'unknown';
  uptime?: number;
  lastCheck?: Date;
  details?: string;
}> = ({ health, uptime, lastCheck, details }) => {
  const getHealthPercentage = () => {
    if (uptime !== undefined) {
      return `${(uptime * 100).toFixed(2)}%`;
    }
    return undefined;
  };

  const getTooltipContent = () => {
    const parts = [];
    if (uptime !== undefined) {
      parts.push(`Uptime: ${getHealthPercentage()}`);
    }
    if (lastCheck) {
      parts.push(`Last Check: ${lastCheck.toLocaleString()}`);
    }
    if (details) {
      parts.push(details);
    }
    return parts.join('\n');
  };

  return (
    <StatusIndicator
      status={health}
      variant="chip"
      tooltip={getTooltipContent()}
      label={getHealthPercentage() || undefined}
    />
  );
};

// Connection status component
export const ConnectionStatus: React.FC<{
  connected: boolean;
  connecting?: boolean;
  lastConnected?: Date;
  error?: string;
}> = ({ connected, connecting, lastConnected, error }) => {
  const getStatus = (): StatusType => {
    if (connecting) return 'warning';
    if (connected) return 'active';
    return 'inactive';
  };

  const getLabel = () => {
    if (connecting) return 'Connecting...';
    if (connected) return 'Connected';
    return 'Disconnected';
  };

  const getTooltip = () => {
    if (error) return `Error: ${error}`;
    if (lastConnected) return `Last connected: ${lastConnected.toLocaleString()}`;
    return undefined;
  };

  return (
    <StatusIndicator
      status={getStatus()}
      label={getLabel()}
      tooltip={getTooltip()}
      animated={connecting}
    />
  );
};