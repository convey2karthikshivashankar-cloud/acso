import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Switch,
  FormControlLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Error as ErrorIcon,
  Timeline as TimelineIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { performanceService } from '../../services/performanceService';

interface WebVital {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

interface PerformanceSummary {
  webVitals: Record<string, WebVital>;
  slowResources: PerformanceMetric[];
  apiErrors: PerformanceMetric[];
  memoryUsage?: number;
}

const PerformanceDashboard: React.FC = () => {
  const [summary, setSummary] = useState<PerformanceSummary>({
    webVitals: {},
    slowResources: [],
    apiErrors: [],
  });
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    refreshData();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(refreshData, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const refreshData = () => {
    const newSummary = performanceService.getPerformanceSummary();
    const newMetrics = performanceService.getMetrics();
    
    setSummary(newSummary);
    setMetrics(newMetrics.slice(-50)); // Show last 50 metrics
  };

  const getWebVitalColor = (rating: WebVital['rating']) => {
    switch (rating) {
      case 'good': return 'success';
      case 'needs-improvement': return 'warning';
      case 'poor': return 'error';
      default: return 'default';
    }
  };

  const formatValue = (name: string, value: number) => {
    if (name.includes('time') || name.includes('duration')) {
      return `${value.toFixed(2)}ms`;
    }
    if (name.includes('size') || name.includes('memory')) {
      return formatBytes(value);
    }
    if (name.includes('percentage')) {
      return `${value.toFixed(1)}%`;
    }
    return value.toFixed(2);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getMemoryStatus = (usage?: number) => {
    if (!usage) return { color: 'default', text: 'Unknown' };
    if (usage < 50) return { color: 'success', text: 'Good' };
    if (usage < 80) return { color: 'warning', text: 'Moderate' };
    return { color: 'error', text: 'High' };
  };

  const webVitalDescriptions = {
    CLS: 'Cumulative Layout Shift - Visual stability',
    FID: 'First Input Delay - Interactivity',
    FCP: 'First Contentful Paint - Loading',
    LCP: 'Largest Contentful Paint - Loading',
    TTFB: 'Time to First Byte - Server response',
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Performance Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            }
            label="Auto Refresh"
          />
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refreshData}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setSettingsOpen(true)}
          >
            Settings
          </Button>
        </Box>
      </Box>

      {/* Web Vitals */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <SpeedIcon sx={{ mr: 1 }} />
            Core Web Vitals
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(summary.webVitals).map(([name, vital]) => (
              <Grid item xs={12} sm={6} md={2.4} key={name}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h4" color={getWebVitalColor(vital.rating)}>
                      {formatValue(name, vital.value)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {name}
                    </Typography>
                    <Chip
                      label={vital.rating}
                      color={getWebVitalColor(vital.rating)}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      {webVitalDescriptions[vital.name]}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Memory Usage */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <MemoryIcon sx={{ mr: 1 }} />
                Memory Usage
              </Typography>
              {summary.memoryUsage !== undefined ? (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">
                      {summary.memoryUsage.toFixed(1)}%
                    </Typography>
                    <Chip
                      label={getMemoryStatus(summary.memoryUsage).text}
                      color={getMemoryStatus(summary.memoryUsage).color as any}
                      size="small"
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={summary.memoryUsage}
                    color={getMemoryStatus(summary.memoryUsage).color as any}
                  />
                  {summary.memoryUsage > 80 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      High memory usage detected. Consider optimizing your application.
                    </Alert>
                  )}
                </Box>
              ) : (
                <Typography color="text.secondary">
                  Memory usage data not available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* API Errors */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <ErrorIcon sx={{ mr: 1 }} />
                API Errors ({summary.apiErrors.length})
              </Typography>
              {summary.apiErrors.length > 0 ? (
                <TableContainer sx={{ maxHeight: 200 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Endpoint</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Time</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {summary.apiErrors.slice(0, 5).map((error, index) => (
                        <TableRow key={index}>
                          <TableCell>{error.tags?.endpoint || 'Unknown'}</TableCell>
                          <TableCell>
                            <Chip
                              label={error.tags?.status || 'Error'}
                              color="error"
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {new Date(error.timestamp).toLocaleTimeString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary">
                  No API errors detected
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Slow Resources */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <TimelineIcon sx={{ mr: 1 }} />
                Slow Resources ({summary.slowResources.length})
              </Typography>
              {summary.slowResources.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Resource</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell>Time</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {summary.slowResources.slice(0, 10).map((resource, index) => (
                        <TableRow key={index}>
                          <TableCell>{resource.tags?.resource_name || 'Unknown'}</TableCell>
                          <TableCell>
                            <Chip
                              label={resource.tags?.duration ? `${resource.tags.duration}ms` : 'Unknown'}
                              color="warning"
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {new Date(resource.timestamp).toLocaleTimeString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary">
                  No slow resources detected
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Metrics */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Metrics
              </Typography>
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Metric</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell>Tags</TableCell>
                      <TableCell>Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {metrics.slice().reverse().map((metric, index) => (
                      <TableRow key={index}>
                        <TableCell>{metric.name}</TableCell>
                        <TableCell>{formatValue(metric.name, metric.value)}</TableCell>
                        <TableCell>
                          {metric.tags && Object.entries(metric.tags).map(([key, value]) => (
                            <Chip
                              key={key}
                              label={`${key}: ${value}`}
                              size="small"
                              variant="outlined"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))}
                        </TableCell>
                        <TableCell>
                          {new Date(metric.timestamp).toLocaleTimeString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Performance Monitoring Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isMonitoring}
                  onChange={(e) => setIsMonitoring(e.target.checked)}
                />
              }
              label="Enable Performance Monitoring"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Toggle performance monitoring on/off. When disabled, no metrics will be collected.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PerformanceDashboard;