import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Speed,
  Memory,
  Storage,
  NetworkCheck,
  Timer,
  CheckCircle,
  Error,
  Refresh,
} from '@mui/icons-material';
import { TimeSeriesChart } from '../charts/TimeSeriesChart';
import { BarChart } from '../charts/BarChart';
import { PieChart } from '../charts/PieChart';
import { Agent } from './AgentOverview';
import { formatters } from '../charts';

export interface AgentMetric {
  timestamp: Date;
  agentId: string;
  agentName: string;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  tasksCompleted: number;
  tasksActive: number;
  responseTime: number;
  errorRate: number;
  uptime: number;
}

export interface AgentMetricsProps {
  agents: Agent[];
  metrics: AgentMetric[];
  selectedAgentId?: string;
  timeRange?: '1h' | '6h' | '24h' | '7d' | '30d';
  onAgentSelect?: (agentId: string) => void;
  onRefresh?: () => void;
}

export const AgentMetrics: React.FC<AgentMetricsProps> = ({
  agents,
  metrics,
  selectedAgentId,
  timeRange = '24h',
  onAgentSelect,
  onRefresh,
}) => {
  const theme = useTheme();

  // Filter metrics for selected agent or all agents
  const filteredMetrics = React.useMemo(() => {
    if (selectedAgentId) {
      return metrics.filter(m => m.agentId === selectedAgentId);
    }
    return metrics;
  }, [metrics, selectedAgentId]);

  // Calculate aggregate metrics
  const aggregateMetrics = React.useMemo(() => {
    if (filteredMetrics.length === 0) return null;

    const latest = filteredMetrics.slice(-agents.length);
    const previous = filteredMetrics.slice(-agents.length * 2, -agents.length);

    const current = {
      avgCpu: latest.reduce((sum, m) => sum + m.cpu, 0) / latest.length,
      avgMemory: latest.reduce((sum, m) => sum + m.memory, 0) / latest.length,
      avgDisk: latest.reduce((sum, m) => sum + m.disk, 0) / latest.length,
      avgNetwork: latest.reduce((sum, m) => sum + m.network, 0) / latest.length,
      totalTasks: latest.reduce((sum, m) => sum + m.tasksCompleted, 0),
      avgResponseTime: latest.reduce((sum, m) => sum + m.responseTime, 0) / latest.length,
      avgErrorRate: latest.reduce((sum, m) => sum + m.errorRate, 0) / latest.length,
      avgUptime: latest.reduce((sum, m) => sum + m.uptime, 0) / latest.length,
    };

    const prev = previous.length > 0 ? {
      avgCpu: previous.reduce((sum, m) => sum + m.cpu, 0) / previous.length,
      avgMemory: previous.reduce((sum, m) => sum + m.memory, 0) / previous.length,
      avgResponseTime: previous.reduce((sum, m) => sum + m.responseTime, 0) / previous.length,
      avgErrorRate: previous.reduce((sum, m) => sum + m.errorRate, 0) / previous.length,
    } : null;

    return { current, previous: prev };
  }, [filteredMetrics, agents.length]);

  const getTrendIcon = (current: number, previous: number | undefined, inverse = false) => {
    if (previous === undefined) return <TrendingFlat />;
    
    const isUp = current > previous;
    const trend = inverse ? !isUp : isUp;
    
    if (trend) {
      return <TrendingUp color="success" />;
    } else if (current < previous) {
      return <TrendingDown color="error" />;
    }
    return <TrendingFlat color="action" />;
  };

  const getTrendColor = (current: number, previous: number | undefined, inverse = false) => {
    if (previous === undefined) return theme.palette.text.secondary;
    
    const isUp = current > previous;
    const trend = inverse ? !isUp : isUp;
    
    if (trend) {
      return theme.palette.success.main;
    } else if (current < previous) {
      return theme.palette.error.main;
    }
    return theme.palette.text.secondary;
  };

  const renderMetricCard = (
    title: string,
    value: number,
    previousValue: number | undefined,
    unit: string,
    icon: React.ReactNode,
    format: (value: number) => string = (v) => v.toFixed(1),
    inverse = false
  ) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {format(value)}{unit}
            </Typography>
            {previousValue !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {getTrendIcon(value, previousValue, inverse)}
                <Typography
                  variant="body2"
                  sx={{ ml: 0.5, color: getTrendColor(value, previousValue, inverse) }}
                >
                  {Math.abs(((value - previousValue) / previousValue) * 100).toFixed(1)}%
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ color: theme.palette.primary.main }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const renderResourceUsageChart = () => {
    const chartData = filteredMetrics.map(metric => ({
      timestamp: metric.timestamp,
      CPU: metric.cpu,
      Memory: metric.memory,
      Disk: metric.disk,
      Network: metric.network,
    }));

    return (
      <Card>
        <CardHeader
          title="Resource Usage Over Time"
          action={
            <Tooltip title="Refresh">
              <IconButton onClick={onRefresh}>
                <Refresh />
              </IconButton>
            </Tooltip>
          }
        />
        <CardContent>
          <TimeSeriesChart
            data={chartData}
            type="line"
            multiSeries={true}
            showBrush={true}
            valueFormat={formatters.percentage}
            config={{
              showLegend: true,
            }}
            height={300}
          />
        </CardContent>
      </Card>
    );
  };

  const renderPerformanceChart = () => {
    const chartData = filteredMetrics.map(metric => ({
      timestamp: metric.timestamp,
      'Response Time': metric.responseTime,
      'Error Rate': metric.errorRate * 10, // Scale for visibility
      'Tasks Completed': metric.tasksCompleted / 10, // Scale for visibility
    }));

    return (
      <Card>
        <CardHeader title="Performance Metrics" />
        <CardContent>
          <TimeSeriesChart
            data={chartData}
            type="line"
            multiSeries={true}
            valueFormat={(value, name) => {
              if (name === 'Response Time') return `${value}ms`;
              if (name === 'Error Rate') return `${(value / 10).toFixed(2)}%`;
              if (name === 'Tasks Completed') return `${Math.round(value * 10)}`;
              return value.toString();
            }}
            config={{
              showLegend: true,
            }}
            height={300}
          />
        </CardContent>
      </Card>
    );
  };

  const renderAgentComparison = () => {
    const latestMetrics = agents.map(agent => {
      const agentMetrics = metrics.filter(m => m.agentId === agent.id);
      const latest = agentMetrics[agentMetrics.length - 1];
      
      return {
        category: agent.name,
        value: latest?.cpu || 0,
        target: 80, // Target CPU usage
        comparison: latest?.memory || 0,
        timestamp: new Date(),
      };
    });

    return (
      <Card>
        <CardHeader title="Agent CPU Usage Comparison" />
        <CardContent>
          <BarChart
            data={latestMetrics}
            orientation="horizontal"
            showValues={true}
            showTarget={true}
            showComparison={true}
            valueFormat={formatters.percentage}
            config={{
              showLegend: true,
            }}
            height={300}
          />
        </CardContent>
      </Card>
    );
  };

  const renderTaskDistribution = () => {
    const taskData = agents.map(agent => {
      const agentMetrics = metrics.filter(m => m.agentId === agent.id);
      const totalTasks = agentMetrics.reduce((sum, m) => sum + m.tasksCompleted, 0);
      
      return {
        category: agent.name,
        value: totalTasks,
        timestamp: new Date(),
      };
    });

    return (
      <Card>
        <CardHeader title="Task Distribution" />
        <CardContent>
          <PieChart
            data={taskData}
            variant="donut"
            showPercentages={true}
            valueFormat={formatters.number}
            config={{
              showLegend: true,
            }}
            height={300}
          />
        </CardContent>
      </Card>
    );
  };

  const renderAgentTable = () => (
    <Card>
      <CardHeader title="Agent Performance Summary" />
      <CardContent>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Agent</TableCell>
                <TableCell align="right">Status</TableCell>
                <TableCell align="right">CPU</TableCell>
                <TableCell align="right">Memory</TableCell>
                <TableCell align="right">Tasks</TableCell>
                <TableCell align="right">Response Time</TableCell>
                <TableCell align="right">Error Rate</TableCell>
                <TableCell align="right">Uptime</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {agents.map(agent => {
                const agentMetrics = metrics.filter(m => m.agentId === agent.id);
                const latest = agentMetrics[agentMetrics.length - 1];
                
                return (
                  <TableRow
                    key={agent.id}
                    hover
                    onClick={() => onAgentSelect?.(agent.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {agent.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {agent.type}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={agent.status}
                        size="small"
                        color={
                          agent.status === 'online' ? 'success' :
                          agent.status === 'warning' ? 'warning' :
                          agent.status === 'error' ? 'error' : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={latest?.cpu || 0}
                          sx={{ width: 50, height: 4 }}
                        />
                        <Typography variant="body2">
                          {latest?.cpu?.toFixed(1) || 0}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={latest?.memory || 0}
                          sx={{ width: 50, height: 4 }}
                        />
                        <Typography variant="body2">
                          {latest?.memory?.toFixed(1) || 0}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {latest?.tasksCompleted?.toLocaleString() || 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {latest?.responseTime?.toFixed(0) || 0}ms
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        color={latest?.errorRate > 5 ? 'error' : 'text.primary'}
                      >
                        {latest?.errorRate?.toFixed(2) || 0}%
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatters.duration((latest?.uptime || 0) * 1000)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  if (!aggregateMetrics) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          No metrics data available
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          {renderMetricCard(
            'Average CPU',
            aggregateMetrics.current.avgCpu,
            aggregateMetrics.previous?.avgCpu,
            '%',
            <Speed fontSize="large" />,
            formatters.number
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {renderMetricCard(
            'Average Memory',
            aggregateMetrics.current.avgMemory,
            aggregateMetrics.previous?.avgMemory,
            '%',
            <Memory fontSize="large" />,
            formatters.number
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {renderMetricCard(
            'Response Time',
            aggregateMetrics.current.avgResponseTime,
            aggregateMetrics.previous?.avgResponseTime,
            'ms',
            <Timer fontSize="large" />,
            formatters.number,
            true // Lower is better
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {renderMetricCard(
            'Error Rate',
            aggregateMetrics.current.avgErrorRate,
            aggregateMetrics.previous?.avgErrorRate,
            '%',
            <Error fontSize="large" />,
            (v) => v.toFixed(2),
            true // Lower is better
          )}
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          {renderResourceUsageChart()}
        </Grid>
        <Grid item xs={12} lg={4}>
          {renderTaskDistribution()}
        </Grid>
        <Grid item xs={12} lg={8}>
          {renderPerformanceChart()}
        </Grid>
        <Grid item xs={12} lg={4}>
          {renderAgentComparison()}
        </Grid>
        <Grid item xs={12}>
          {renderAgentTable()}
        </Grid>
      </Grid>
    </Box>
  );
};

export default AgentMetrics;