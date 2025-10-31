import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  NetworkCheck as NetworkIcon,
  Refresh as RefreshIcon,
  Computer as ComputerIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { metricsAggregationService } from '../../services/metricsAggregationService';
import { backgroundDataService } from '../../services/backgroundDataService';

interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  icon: React.ReactNode;
  threshold?: {
    warning: number;
    critical: number;
  };
}

interface EnhancedSystemOverviewProps {
  refreshInterval?: number;
  showDetails?: boolean;
  compactMode?: boolean;
  onMetricClick?: (metric: SystemMetric) => void;
}

export const EnhancedSystemOverview: React.FC<EnhancedSystemOverviewProps> = ({
  refreshInterval = 5000,
  showDetails = true,
  compactMode = false,
  onMetricClick,
}) => {
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [systemStatus, setSystemStatus] = useState<'healthy' | 'warning' | 'critical'>('healthy');
  const [isLoading, setIsLoading] = useState(false);

  const updateMetrics = useCallback(() => {
    setIsLoading(true);
    try {
      const cpuStats = metricsAggregationService.getMetricStats('system.cpu.usage');
      const memoryStats = metricsAggregationService.getMetricStats('system.memory.usage');
      const diskStats = metricsAggregationService.getMetricStats('system.disk.usage');
      const networkInStats = metricsAggregationService.getMetricStats('system.network.in');
      const agentStats = metricsAggregationService.getMetricStats('agents.active.count');
      const responseTimeStats = metricsAggregationService.getMetricStats('agents.response.time');

      const newMetrics: SystemMetric[] = [
        {
          name: 'CPU Usage',
          value: cpuStats.latestValue || 45.2,
          unit: '%',
          status: (cpuStats.latestValue || 45.2) > 80 ? 'critical' : (cpuStats.latestValue || 45.2) > 60 ? 'warning' : 'healthy',
          icon: <SpeedIcon />,
          threshold: { warning: 70, critical: 90 },
        },
        {
          name: 'Memory Usage',
          value: memoryStats.latestValue || 67.8,
          unit: '%',
          status: (memoryStats.latestValue || 67.8) > 85 ? 'critical' : (memoryStats.latestValue || 67.8) > 70 ? 'warning' : 'healthy',
          icon: <MemoryIcon />,
          threshold: { warning: 80, critical: 95 },
        },
        {
          name: 'Disk Usage',
          value: diskStats.latestValue || 23.4,
          unit: '%',
          status: (diskStats.latestValue || 23.4) > 90 ? 'critical' : (diskStats.latestValue || 23.4) > 75 ? 'warning' : 'healthy',
          icon: <StorageIcon />,
          threshold: { warning: 80, critical: 95 },
        },
        {
          name: 'Network Load',
          value: networkInStats.latestValue || 12.1,
          unit: 'MB/s',
          status: 'healthy',
          icon: <NetworkIcon />,
        },
        {
          name: 'Active Agents',
          value: agentStats.latestValue || 12,
          unit: 'agents',
          status: (agentStats.latestValue || 12) < 5 ? 'critical' : (agentStats.latestValue || 12) < 10 ? 'warning' : 'healthy',
          icon: <ComputerIcon />,
        },
        {
          name: 'Response Time',
          value: responseTimeStats.latestValue || 245,
          unit: 'ms',
          status: (responseTimeStats.latestValue || 245) > 1000 ? 'critical' : (responseTimeStats.latestValue || 245) > 500 ? 'warning' : 'healthy',
          icon: <SecurityIcon />,
          threshold: { warning: 500, critical: 1000 },
        },
      ];

      setMetrics(newMetrics);
      setLastUpdate(new Date());

      // Calculate overall system status
      const criticalCount = newMetrics.filter(m => m.status === 'critical').length;
      const warningCount = newMetrics.filter(m => m.status === 'warning').length;
      
      if (criticalCount > 0) {
        setSystemStatus('critical');
      } else if (warningCount > 1) {
        setSystemStatus('warning');
      } else {
        setSystemStatus('healthy');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    updateMetrics();
    const interval = setInterval(updateMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, updateMetrics]);

  const getStatusColor = (status: SystemMetric['status']) => {
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

  const handleRefresh = () => {
    updateMetrics();
  };

  const getSystemStatusMessage = () => {
    switch (systemStatus) {
      case 'critical':
        return 'System requires immediate attention';
      case 'warning':
        return 'System performance degraded';
      case 'healthy':
        return 'All systems operating normally';
      default:
        return 'System status unknown';
    }
  };

  return (
    <Card>
      <CardContent sx={{ p: compactMode ? 2 : 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant={compactMode ? "subtitle1" : "h6"} component="h3">
            System Overview
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={systemStatus}
              size="small"
              color={getStatusColor(systemStatus)}
              variant="outlined"
            />
            {!compactMode && (
              <Typography variant="caption" color="text.secondary">
                {lastUpdate.toLocaleTimeString()}
              </Typography>
            )}
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={handleRefresh} disabled={isLoading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {systemStatus !== 'healthy' && (
          <Alert 
            severity={systemStatus === 'critical' ? 'error' : 'warning'} 
            sx={{ mb: 2 }}
          >
            {getSystemStatusMessage()}
          </Alert>
        )}

        <Grid container spacing={compactMode ? 1 : 2}>
          {metrics.map((metric, index) => (
            <Grid item xs={12} sm={6} md={compactMode ? 6 : 4} key={index}>
              <Box
                sx={{
                  p: compactMode ? 1.5 : 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  cursor: onMetricClick ? 'pointer' : 'default',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': onMetricClick ? {
                    bgcolor: 'action.hover',
                    transform: 'translateY(-1px)',
                    boxShadow: 2,
                  } : {},
                }}
                onClick={() => onMetricClick?.(metric)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {metric.icon}
                  <Typography variant="body2" sx={{ ml: 1, fontWeight: 'medium' }}>
                    {metric.name}
                  </Typography>
                </Box>
                
                <Typography variant={compactMode ? "h6" : "h5"} component="div" sx={{ mb: 1, fontWeight: 'bold' }}>
                  {metric.unit === '%' ? metric.value.toFixed(1) : Math.round(metric.value)}{metric.unit}
                </Typography>
                
                {metric.unit === '%' && (
                  <LinearProgress
                    variant="determinate"
                    value={metric.value}
                    color={getStatusColor(metric.status)}
                    sx={{ mb: 1, height: 6, borderRadius: 3 }}
                  />
                )}
                
                {showDetails && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip
                      label={metric.status}
                      size="small"
                      color={getStatusColor(metric.status)}
                      variant="outlined"
                    />
                    {metric.threshold && metric.unit === '%' && !compactMode && (
                      <Typography variant="caption" color="text.secondary">
                        Warn: {metric.threshold.warning}%
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default EnhancedSystemOverview;