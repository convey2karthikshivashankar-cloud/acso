import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Alert,
  Skeleton,
  LinearProgress,
  Badge,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Refresh,
  Pause,
  PlayArrow,
  Settings,
  Fullscreen,
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Error,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { useRealTimeData } from '../../hooks/useRealTimeData';
import { backgroundDataService } from '../../services/backgroundDataService';
import { demoDataIntegrationService } from '../../services/demoDataIntegrationService';
import { metricsAggregationService } from '../../services/metricsAggregationService';
import { dataVisualizationEngine } from '../../services/dataVisualizationEngine';

interface RealTimeMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'healthy' | 'warning' | 'critical';
  lastUpdated: Date;
  change?: number;
  threshold?: {
    warning: number;
    critical: number;
  };
}

interface RealTimeDashboardProps {
  refreshInterval?: number;
  autoRefresh?: boolean;
  showTrends?: boolean;
  compactMode?: boolean;
  onMetricClick?: (metric: RealTimeMetric) => void;
}

export const RealTimeDashboard: React.FC<RealTimeDashboardProps> = ({
  refreshInterval = 5000,
  autoRefresh = true,
  showTrends = true,
  compactMode = false,
  onMetricClick,
}) => {
  const [isPaused, setIsPaused] = useState(!autoRefresh);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsAnchor, setSettingsAnchor] = useState<null | HTMLElement>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    title: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: string;
  }>>([]);
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: 0,
    memory: 0,
    disk: 0,
    network: { in: 0, out: 0 },
  });

  // Real-time data hook
  const { isConnected, error } = useRealTimeData();
  const [isLoading, setIsLoading] = useState(false);

  // Generate metrics using our data visualization engine
  const [metrics, setMetrics] = useState(dataVisualizationEngine.generateMetricCards(6));

  const refreshData = useCallback(() => {
    setIsLoading(true);
    try {
      setMetrics(dataVisualizationEngine.generateMetricCards(6));
      setLastUpdate(new Date());
      
      // Update system metrics
      const cpuStats = metricsAggregationService.getMetricStats('system.cpu.usage');
      const memoryStats = metricsAggregationService.getMetricStats('system.memory.usage');
      const diskStats = metricsAggregationService.getMetricStats('system.disk.usage');
      const networkInStats = metricsAggregationService.getMetricStats('system.network.in');
      const networkOutStats = metricsAggregationService.getMetricStats('system.network.out');

      setSystemMetrics({
        cpu: cpuStats.latestValue || 0,
        memory: memoryStats.latestValue || 0,
        disk: diskStats.latestValue || 0,
        network: {
          in: networkInStats.latestValue || 0,
          out: networkOutStats.latestValue || 0,
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(refreshData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [isPaused, refreshInterval, refreshData]);

  useEffect(() => {
    // Initialize demo data services
    const initializeServices = async () => {
      try {
        await demoDataIntegrationService.initialize();
      } catch (error) {
        console.error('Failed to initialize demo services:', error);
      }
    };

    initializeServices();
    refreshData();

    // Listen for alerts
    const handleAlert = (alert: any) => {
      setAlerts(prev => [alert, ...prev.slice(0, 4)]);
    };

    demoDataIntegrationService.on('metric_alert', handleAlert);
    demoDataIntegrationService.on('demo_event', (event: any) => {
      if (event.type === 'security_breach' || event.type === 'incident_creation') {
        handleAlert({
          id: `alert_${Date.now()}`,
          title: event.description || 'System Alert',
          severity: event.data?.severity || 'medium',
          timestamp: new Date().toISOString(),
        });
      }
    });

    return () => {
      demoDataIntegrationService.off('metric_alert', handleAlert);
    };
  }, [refreshData]);

  // Convert our metric cards to the expected format
  const displayMetrics: RealTimeMetric[] = useMemo(() => 
    metrics.map(metric => ({
      id: metric.id,
      name: metric.title,
      value: typeof metric.value === 'number' ? metric.value : parseFloat(metric.value.toString()) || 0,
      unit: metric.format === 'percentage' ? '%' : 
            metric.format === 'currency' ? '$' : 
            metric.format === 'duration' ? 'ms' : '',
      trend: metric.change && metric.change > 0 ? 'up' : 
             metric.change && metric.change < 0 ? 'down' : 'stable',
      status: metric.status || 'healthy',
      lastUpdated: new Date(),
      change: metric.change,
    })), [metrics]);

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
  };

  const handleRefresh = () => {
    refreshData();
  };

  const handleSettingsClick = (event: React.MouseEvent<HTMLElement>) => {
    setSettingsAnchor(event.currentTarget);
  };

  const handleSettingsClose = () => {
    setSettingsAnchor(null);
  };

  const handleMetricClick = (metric: RealTimeMetric) => {
    onMetricClick?.(metric);
  };

  const getStatusIcon = (status: RealTimeMetric['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle color="success" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'critical':
        return <Error color="error" />;
      default:
        return <CheckCircle />;
    }
  };

  const getTrendIcon = (trend: RealTimeMetric['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp color="error" />;
      case 'down':
        return <TrendingDown color="success" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: RealTimeMetric['status']) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === '%') {
      return `${value.toFixed(1)}%`;
    }
    if (unit === 'ms') {
      return `${Math.round(value)}ms`;
    }
    return `${value} ${unit}`;
  };

  const formatChange = (change: number | undefined, unit: string) => {
    if (change === undefined) return null;
    const sign = change > 0 ? '+' : '';
    if (unit === '%') {
      return `${sign}${change.toFixed(1)}%`;
    }
    if (unit === 'ms') {
      return `${sign}${Math.round(change)}ms`;
    }
    return `${sign}${change}`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'info';
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Header Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h2">
            Real-Time Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={isConnected ? <CheckCircle /> : <Error />}
            label={isConnected ? "Connected" : "Disconnected"}
            color={isConnected ? 'success' : 'error'}
            size="small"
          />
          <Badge badgeContent={alerts.length} color="error">
            <Chip
              icon={<Warning />}
              label="Alerts"
              color={alerts.length > 0 ? 'warning' : 'default'}
              size="small"
            />
          </Badge>
          <FormControlLabel
            control={
              <Switch
                checked={!isPaused}
                onChange={handleTogglePause}
                size="small"
              />
            }
            label="Auto Refresh"
          />
          <Tooltip title={isPaused ? 'Resume' : 'Pause'}>
            <IconButton onClick={handleTogglePause} size="small">
              {isPaused ? <PlayArrow /> : <Pause />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh Now">
            <IconButton onClick={handleRefresh} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton onClick={handleSettingsClick} size="small">
              <Settings />
            </IconButton>
          </Tooltip>
          <Tooltip title="Fullscreen">
            <IconButton onClick={() => setIsFullscreen(!isFullscreen)} size="small">
              <Fullscreen />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Connection Status Alert */}
      {!isConnected && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Real-time connection is not available. Showing simulated data.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Connection Error: {error}
        </Alert>
      )}

      {/* System Overview */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Overview
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      CPU Usage
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={systemMetrics.cpu} 
                      sx={{ mt: 1, mb: 1 }}
                      color={systemMetrics.cpu > 80 ? 'error' : systemMetrics.cpu > 60 ? 'warning' : 'primary'}
                    />
                    <Typography variant="caption">
                      {systemMetrics.cpu.toFixed(1)}%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Memory Usage
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={systemMetrics.memory} 
                      sx={{ mt: 1, mb: 1 }}
                      color={systemMetrics.memory > 85 ? 'error' : systemMetrics.memory > 70 ? 'warning' : 'primary'}
                    />
                    <Typography variant="caption">
                      {systemMetrics.memory.toFixed(1)}%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Disk Usage
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={systemMetrics.disk} 
                      sx={{ mt: 1, mb: 1 }}
                      color={systemMetrics.disk > 90 ? 'error' : systemMetrics.disk > 75 ? 'warning' : 'primary'}
                    />
                    <Typography variant="caption">
                      {systemMetrics.disk.toFixed(1)}%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Network I/O
                    </Typography>
                    <Typography variant="caption" display="block">
                      In: {systemMetrics.network.in.toFixed(0)} MB/s
                    </Typography>
                    <Typography variant="caption" display="block">
                      Out: {systemMetrics.network.out.toFixed(0)} MB/s
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Alerts
              </Typography>
              {alerts.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  No recent alerts
                </Typography>
              ) : (
                alerts.slice(0, 3).map((alert, index) => (
                  <Box key={alert.id}>
                    <Alert 
                      severity={getSeverityColor(alert.severity) as any}
                      sx={{ mb: 1 }}
                    >
                      <Typography variant="body2" fontWeight="bold">
                        {alert.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Alert>
                    {index < Math.min(alerts.length, 3) - 1 && <Divider sx={{ my: 1 }} />}
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Metrics Grid */}
      <Grid container spacing={compactMode ? 1 : 2}>
        {displayMetrics.map((metric) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={metric.id}>
            <Card
              sx={{
                cursor: onMetricClick ? 'pointer' : 'default',
                transition: 'all 0.2s ease-in-out',
                '&:hover': onMetricClick ? {
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                } : {},
                height: compactMode ? 120 : 140,
              }}
              onClick={() => handleMetricClick(metric)}
            >
              <CardContent sx={{ p: compactMode ? 1.5 : 2, '&:last-child': { pb: compactMode ? 1.5 : 2 } }}>
                {isLoading ? (
                  <Box>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" height={32} />
                    <Skeleton variant="text" width="30%" />
                  </Box>
                ) : (
                  <>
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {metric.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {showTrends && getTrendIcon(metric.trend)}
                        {getStatusIcon(metric.status)}
                      </Box>
                    </Box>

                    {/* Value */}
                    <Typography
                      variant={compactMode ? "h5" : "h4"}
                      component="div"
                      sx={{ 
                        fontWeight: 'bold',
                        color: `${getStatusColor(metric.status)}.main`,
                        mb: 0.5,
                      }}
                    >
                      {formatValue(metric.value, metric.unit)}
                    </Typography>

                    {/* Change and Status */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {metric.change !== undefined && (
                        <Typography
                          variant="body2"
                          sx={{
                            color: metric.change > 0 ? 'error.main' : 'success.main',
                            fontWeight: 'medium',
                          }}
                        >
                          {formatChange(metric.change, metric.unit)}
                        </Typography>
                      )}
                      <Chip
                        label={metric.status}
                        size="small"
                        color={getStatusColor(metric.status)}
                        variant="outlined"
                      />
                    </Box>

                    {/* Last Updated */}
                    {!compactMode && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Updated: {metric.lastUpdated.toLocaleTimeString()}
                      </Typography>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Settings Menu */}
      <Menu
        anchorEl={settingsAnchor}
        open={Boolean(settingsAnchor)}
        onClose={handleSettingsClose}
      >
        <MenuItem>
          <FormControlLabel
            control={
              <Switch
                checked={showTrends}
                size="small"
              />
            }
            label="Show Trends"
          />
        </MenuItem>
        <MenuItem>
          <FormControlLabel
            control={
              <Switch
                checked={compactMode}
                size="small"
              />
            }
            label="Compact Mode"
          />
        </MenuItem>
        <MenuItem>
          <FormControlLabel
            control={
              <Switch
                checked={!isPaused}
                onChange={handleTogglePause}
                size="small"
              />
            }
            label="Auto Refresh"
          />
        </MenuItem>
      </Menu>
    </Box>
  );
};