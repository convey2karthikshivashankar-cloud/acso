import React from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Alert,
  LinearProgress,
  useTheme,
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Refresh,
  Clear,
  SignalWifi4Bar,
  SignalWifiOff,
  Speed,
  Memory,
} from '@mui/icons-material';
import { TimeSeriesChart, TimeSeriesChartProps } from './TimeSeriesChart';
import { useRealTimeChart, useRealTimeChartPerformance } from '../../hooks/useRealTimeChart';
import { realTimeChartService, RealTimeDataSource } from '../../services/realTimeChartService';

export interface RealTimeChartProps extends Omit<TimeSeriesChartProps, 'data' | 'realTime'> {
  dataSourceId: string;
  dataSource?: RealTimeDataSource;
  autoStart?: boolean;
  showControls?: boolean;
  showStatus?: boolean;
  showPerformance?: boolean;
  maxDataPoints?: number;
  updateThreshold?: number;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
}

export const RealTimeChart: React.FC<RealTimeChartProps> = ({
  dataSourceId,
  dataSource,
  autoStart = true,
  showControls = true,
  showStatus = true,
  showPerformance = false,
  maxDataPoints = 100,
  updateThreshold = 16, // ~60fps
  onConnectionChange,
  onError,
  config = {},
  ...chartProps
}) => {
  const theme = useTheme();
  const [isEnabled, setIsEnabled] = React.useState(autoStart);
  const [lastRenderTime, setLastRenderTime] = React.useState(0);

  // Register data source if provided
  React.useEffect(() => {
    if (dataSource) {
      realTimeChartService.registerDataSource(dataSource);
      return () => {
        realTimeChartService.unregisterDataSource(dataSource.id);
      };
    }
  }, [dataSource]);

  // Real-time data hook
  const {
    data,
    isConnected,
    isLoading,
    error,
    lastUpdate,
    updateCount,
    refresh,
    clearData,
    pause,
    resume,
    getStats,
  } = useRealTimeChart({
    dataSourceId,
    enabled: isEnabled,
    maxDataPoints,
    onError,
    onConnect: () => onConnectionChange?.(true),
    onDisconnect: () => onConnectionChange?.(false),
  });

  // Performance monitoring
  const { performance, recordFrame } = useRealTimeChartPerformance(dataSourceId);

  // Throttle updates for performance
  const throttledData = React.useMemo(() => {
    const now = Date.now();
    if (now - lastRenderTime < updateThreshold) {
      return data;
    }
    
    setLastRenderTime(now);
    recordFrame(now - lastRenderTime);
    return data;
  }, [data, lastRenderTime, updateThreshold, recordFrame]);

  const handleToggleEnabled = () => {
    if (isEnabled) {
      pause();
    } else {
      resume();
    }
    setIsEnabled(!isEnabled);
  };

  const handleRefresh = () => {
    refresh();
  };

  const handleClear = () => {
    clearData();
  };

  const getConnectionStatusColor = () => {
    if (isLoading) return theme.palette.warning.main;
    if (error) return theme.palette.error.main;
    if (isConnected) return theme.palette.success.main;
    return theme.palette.grey[500];
  };

  const getConnectionStatusText = () => {
    if (isLoading) return 'Connecting...';
    if (error) return 'Error';
    if (isConnected) return 'Connected';
    return 'Disconnected';
  };

  const renderControls = () => {
    if (!showControls) return null;

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={isEnabled}
              onChange={handleToggleEnabled}
              size="small"
            />
          }
          label="Real-time"
        />

        <Tooltip title={isEnabled ? 'Pause' : 'Resume'}>
          <IconButton size="small" onClick={handleToggleEnabled}>
            {isEnabled ? <Pause /> : <PlayArrow />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Refresh">
          <IconButton size="small" onClick={handleRefresh}>
            <Refresh />
          </IconButton>
        </Tooltip>

        <Tooltip title="Clear Data">
          <IconButton size="small" onClick={handleClear}>
            <Clear />
          </IconButton>
        </Tooltip>
      </Box>
    );
  };

  const renderStatus = () => {
    if (!showStatus) return null;

    const stats = getStats();

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Chip
          icon={isConnected ? <SignalWifi4Bar /> : <SignalWifiOff />}
          label={getConnectionStatusText()}
          size="small"
          sx={{
            backgroundColor: getConnectionStatusColor(),
            color: theme.palette.getContrastText(getConnectionStatusColor()),
          }}
        />

        {stats && (
          <>
            <Chip
              label={`${stats.bufferSize}/${stats.maxBufferSize} points`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`${updateCount} updates`}
              size="small"
              variant="outlined"
            />
            {lastUpdate && (
              <Chip
                label={`Last: ${lastUpdate.toLocaleTimeString()}`}
                size="small"
                variant="outlined"
              />
            )}
          </>
        )}
      </Box>
    );
  };

  const renderPerformance = () => {
    if (!showPerformance) return null;

    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary" gutterBottom>
          Performance Metrics
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Speed fontSize="small" />
            <Typography variant="caption">
              {performance.fps} FPS
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Memory fontSize="small" />
            <Typography variant="caption">
              {Math.round(performance.avgUpdateTime)}ms avg
            </Typography>
          </Box>
          {performance.droppedFrames > 0 && (
            <Typography variant="caption" color="warning.main">
              {performance.droppedFrames} dropped
            </Typography>
          )}
        </Box>
      </Box>
    );
  };

  const renderLoadingIndicator = () => {
    if (!isLoading) return null;

    return (
      <Box sx={{ mb: 2 }}>
        <LinearProgress />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          Connecting to real-time data source...
        </Typography>
      </Box>
    );
  };

  const renderError = () => {
    if (!error) return null;

    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        <Typography variant="body2">
          Real-time connection error: {error}
        </Typography>
      </Alert>
    );
  };

  return (
    <Box>
      {renderControls()}
      {renderStatus()}
      {renderPerformance()}
      {renderLoadingIndicator()}
      {renderError()}

      <TimeSeriesChart
        data={throttledData}
        realTime={true}
        config={{
          ...config,
          title: config.title || 'Real-time Chart',
        }}
        {...chartProps}
      />
    </Box>
  );
};

export default RealTimeChart;