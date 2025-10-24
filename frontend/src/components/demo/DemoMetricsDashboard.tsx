/**
 * Demo Metrics Dashboard - Analytics and reporting for demo sessions
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Assessment,
  Timer,
  Group,
  CheckCircle,
  Error,
  Warning,
  Info,
  Refresh,
  Download,
  FilterList
} from '@mui/icons-material';
import { DemoSession, BusinessMetric } from '../../types/demo';

interface DemoMetricsDashboardProps {
  sessions: DemoSession[];
  currentSession?: DemoSession;
  metrics: BusinessMetric[];
  onRefreshMetrics: () => Promise<void>;
  onExportMetrics: () => Promise<void>;
}

interface MetricCard {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  color?: 'primary' | 'success' | 'warning' | 'error';
  icon?: React.ReactNode;
}

export const DemoMetricsDashboard: React.FC<DemoMetricsDashboardProps> = ({
  sessions,
  currentSession,
  metrics,
  onRefreshMetrics,
  onExportMetrics
}) => {
  const [timeRange, setTimeRange] = useState('24h');
  const [metricType, setMetricType] = useState('all');
  const [loading, setLoading] = useState(false);

  const calculateMetrics = (): MetricCard[] => {
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;
    const runningSessions = sessions.filter(s => s.status === 'running').length;
    const errorSessions = sessions.filter(s => s.status === 'error').length;
    
    const successRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
    const avgDuration = totalSessions > 0 
      ? sessions.reduce((acc, s) => acc + (s.duration || 0), 0) / totalSessions 
      : 0;

    // Calculate business metrics
    const totalROI = metrics
      .filter(m => m.category === 'financial' && m.name === 'roi')
      .reduce((acc, m) => acc + m.value, 0);

    const avgResponseTime = metrics
      .filter(m => m.category === 'performance' && m.name === 'response_time')
      .reduce((acc, m, _, arr) => acc + m.value / arr.length, 0);

    return [
      {
        title: 'Total Sessions',
        value: totalSessions,
        icon: <Assessment />,
        color: 'primary'
      },
      {
        title: 'Success Rate',
        value: `${Math.round(successRate)}%`,
        trend: successRate > 80 ? 'up' : successRate > 60 ? 'stable' : 'down',
        icon: <CheckCircle />,
        color: successRate > 80 ? 'success' : successRate > 60 ? 'warning' : 'error'
      },
      {
        title: 'Active Sessions',
        value: runningSessions,
        icon: <Timer />,
        color: runningSessions > 0 ? 'success' : 'primary'
      },
      {
        title: 'Average Duration',
        value: `${Math.round(avgDuration)}min`,
        icon: <Timer />,
        color: 'primary'
      },
      {
        title: 'Total ROI Demonstrated',
        value: `$${Math.round(totalROI).toLocaleString()}`,
        trend: totalROI > 0 ? 'up' : 'stable',
        icon: <TrendingUp />,
        color: 'success'
      },
      {
        title: 'Avg Response Time',
        value: `${Math.round(avgResponseTime)}ms`,
        trend: avgResponseTime < 2000 ? 'up' : avgResponseTime < 5000 ? 'stable' : 'down',
        icon: <Timer />,
        color: avgResponseTime < 2000 ? 'success' : avgResponseTime < 5000 ? 'warning' : 'error'
      },
      {
        title: 'Error Rate',
        value: `${totalSessions > 0 ? Math.round((errorSessions / totalSessions) * 100) : 0}%`,
        trend: errorSessions === 0 ? 'up' : errorSessions < totalSessions * 0.1 ? 'stable' : 'down',
        icon: <Error />,
        color: errorSessions === 0 ? 'success' : errorSessions < totalSessions * 0.1 ? 'warning' : 'error'
      },
      {
        title: 'Agents Deployed',
        value: metrics.filter(m => m.category === 'agents').length,
        icon: <Group />,
        color: 'primary'
      }
    ];
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await onRefreshMetrics();
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp color="success" fontSize="small" />;
      case 'down':
        return <TrendingDown color="error" fontSize="small" />;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" fontSize="small" />;
      case 'running':
        return <Timer color="primary" fontSize="small" />;
      case 'error':
        return <Error color="error" fontSize="small" />;
      case 'paused':
        return <Warning color="warning" fontSize="small" />;
      default:
        return <Info color="action" fontSize="small" />;
    }
  };

  const filteredMetrics = metrics.filter(metric => {
    if (metricType === 'all') return true;
    return metric.category === metricType;
  });

  const metricCards = calculateMetrics();

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Demo Analytics</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="1h">Last Hour</MenuItem>
              <MenuItem value="24h">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Metric Type</InputLabel>
            <Select
              value={metricType}
              onChange={(e) => setMetricType(e.target.value)}
            >
              <MenuItem value="all">All Metrics</MenuItem>
              <MenuItem value="performance">Performance</MenuItem>
              <MenuItem value="financial">Financial</MenuItem>
              <MenuItem value="agents">Agents</MenuItem>
              <MenuItem value="security">Security</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh Metrics">
            <IconButton onClick={handleRefresh} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={onExportMetrics}
          >
            Export
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Current Session Status */}
      {currentSession && (
        <Alert 
          severity={currentSession.status === 'running' ? 'info' : 'success'} 
          sx={{ mb: 3 }}
          icon={getStatusIcon(currentSession.status)}
        >
          <Typography variant="subtitle2">
            Current Session: {currentSession.name || currentSession.id}
          </Typography>
          <Typography variant="body2">
            Status: {currentSession.status} • Duration: {currentSession.duration}min
            {currentSession.progress !== undefined && (
              <> • Progress: {Math.round(currentSession.progress * 100)}%</>
            )}
          </Typography>
        </Alert>
      )}

      {/* Metric Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {metricCards.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" color={`${metric.color}.main`}>
                      {metric.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {metric.title}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {metric.icon}
                    {getTrendIcon(metric.trend)}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Sessions Overview */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Sessions
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Session</TableCell>
                      <TableCell>Scenario</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Started</TableCell>
                      <TableCell>Completion</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sessions.slice(0, 10).map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <Typography variant="body2">
                            {session.name || session.id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={session.scenario} size="small" />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getStatusIcon(session.status)}
                            <Typography variant="body2">
                              {session.status}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {session.duration}min
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {session.createdAt 
                              ? new Date(session.createdAt).toLocaleString()
                              : 'N/A'
                            }
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {session.progress !== undefined ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={session.progress * 100}
                                sx={{ width: 60, height: 4 }}
                              />
                              <Typography variant="caption">
                                {Math.round(session.progress * 100)}%
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              N/A
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Business Metrics
              </Typography>
              {filteredMetrics.length === 0 ? (
                <Alert severity="info">
                  No metrics available for the selected filter.
                </Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {filteredMetrics.slice(0, 8).map((metric, index) => (
                    <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {metric.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {metric.category}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" fontWeight="medium">
                          {typeof metric.value === 'number' 
                            ? metric.value.toLocaleString()
                            : metric.value
                          }
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {metric.unit}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DemoMetricsDashboard;