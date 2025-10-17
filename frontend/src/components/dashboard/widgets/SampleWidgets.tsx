import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress,
  Chip,
  Avatar,
  Grid,
  useTheme,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Security,
  Warning,
  CheckCircle,
  Error,
  Speed,
  People,
  Storage,
  NetworkCheck,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// Sample data generators
const generateTimeSeriesData = (points: number = 24) => {
  return Array.from({ length: points }, (_, i) => ({
    time: `${i}:00`,
    value: Math.floor(Math.random() * 100) + 20,
    secondary: Math.floor(Math.random() * 80) + 10,
  }));
};

const generateStatusData = () => [
  { name: 'Healthy', value: 85, color: '#4caf50' },
  { name: 'Warning', value: 10, color: '#ff9800' },
  { name: 'Critical', value: 5, color: '#f44336' },
];

// Metric Widget
export const MetricWidget: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease';
  color?: string;
  icon?: React.ReactNode;
}> = ({ title, value, change, changeType, color = '#1976d2', icon }) => {
  const theme = useTheme();

  return (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" color="text.secondary">
          {title}
        </Typography>
        {icon && (
          <Avatar sx={{ bgcolor: color, width: 40, height: 40 }}>
            {icon}
          </Avatar>
        )}
      </Box>
      
      <Typography variant="h3" fontWeight="bold" sx={{ color, mb: 1 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Typography>
      
      {change !== undefined && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {changeType === 'increase' ? (
            <TrendingUp color="success" fontSize="small" />
          ) : (
            <TrendingDown color="error" fontSize="small" />
          )}
          <Typography
            variant="body2"
            color={changeType === 'increase' ? 'success.main' : 'error.main'}
          >
            {Math.abs(change)}% vs last period
          </Typography>
        </Box>
      )}
    </Box>
  );
};

// System Health Widget
export const SystemHealthWidget: React.FC = () => {
  const healthData = [
    { name: 'CPU Usage', value: 65, status: 'normal' },
    { name: 'Memory', value: 78, status: 'warning' },
    { name: 'Disk Space', value: 45, status: 'normal' },
    { name: 'Network', value: 92, status: 'critical' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'primary';
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        System Health
      </Typography>
      
      <List dense>
        {healthData.map((item, index) => (
          <ListItem key={index} sx={{ px: 0 }}>
            <ListItemIcon>
              <Speed color={getStatusColor(item.status) as any} />
            </ListItemIcon>
            <ListItemText
              primary={item.name}
              secondary={
                <Box sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">{item.value}%</Typography>
                    <Chip
                      label={item.status}
                      color={getStatusColor(item.status) as any}
                      size="small"
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={item.value}
                    color={getStatusColor(item.status) as any}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

// Activity Feed Widget
export const ActivityFeedWidget: React.FC = () => {
  const activities = [
    {
      id: 1,
      type: 'security',
      message: 'Security scan completed',
      time: '2 minutes ago',
      severity: 'success',
    },
    {
      id: 2,
      type: 'warning',
      message: 'High CPU usage detected',
      time: '5 minutes ago',
      severity: 'warning',
    },
    {
      id: 3,
      type: 'error',
      message: 'Agent connection lost',
      time: '10 minutes ago',
      severity: 'error',
    },
    {
      id: 4,
      type: 'info',
      message: 'System backup completed',
      time: '1 hour ago',
      severity: 'info',
    },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'security': return <Security />;
      case 'warning': return <Warning />;
      case 'error': return <Error />;
      default: return <CheckCircle />;
    }
  };

  const getColor = (severity: string) => {
    switch (severity) {
      case 'success': return 'success.main';
      case 'warning': return 'warning.main';
      case 'error': return 'error.main';
      default: return 'info.main';
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Recent Activity
      </Typography>
      
      <List dense>
        {activities.map((activity) => (
          <ListItem key={activity.id} sx={{ px: 0, alignItems: 'flex-start' }}>
            <ListItemIcon sx={{ mt: 0.5 }}>
              <Avatar
                sx={{
                  bgcolor: getColor(activity.severity),
                  width: 32,
                  height: 32,
                }}
              >
                {getIcon(activity.type)}
              </Avatar>
            </ListItemIcon>
            <ListItemText
              primary={activity.message}
              secondary={activity.time}
              primaryTypographyProps={{ variant: 'body2' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

// Chart Widget
export const ChartWidget: React.FC<{
  type: 'line' | 'area' | 'bar' | 'pie';
  title: string;
  data?: any[];
}> = ({ type, title, data = generateTimeSeriesData() }) => {
  const theme = useTheme();

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke={theme.palette.primary.main}
              strokeWidth={2}
            />
          </LineChart>
        );
      
      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="value"
              stroke={theme.palette.primary.main}
              fill={theme.palette.primary.light}
            />
          </AreaChart>
        );
      
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill={theme.palette.primary.main} />
          </BarChart>
        );
      
      case 'pie':
        const pieData = generateStatusData();
        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        );
      
      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      
      <Box sx={{ flex: 1, minHeight: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

// Agent Status Widget
export const AgentStatusWidget: React.FC = () => {
  const agents = [
    { name: 'Threat Hunter', status: 'active', lastSeen: '1m ago' },
    { name: 'Incident Response', status: 'active', lastSeen: '2m ago' },
    { name: 'Service Orchestrator', status: 'warning', lastSeen: '5m ago' },
    { name: 'Financial Intelligence', status: 'inactive', lastSeen: '1h ago' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'warning': return 'warning';
      case 'inactive': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Agent Status
      </Typography>
      
      <Grid container spacing={2}>
        {agents.map((agent, index) => (
          <Grid item xs={12} sm={6} key={index}>
            <Card variant="outlined" sx={{ p: 1 }}>
              <CardContent sx={{ p: '8px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" fontWeight="medium">
                    {agent.name}
                  </Typography>
                  <Chip
                    label={agent.status}
                    color={getStatusColor(agent.status) as any}
                    size="small"
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Last seen: {agent.lastSeen}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

// Performance Metrics Widget
export const PerformanceMetricsWidget: React.FC = () => {
  const metrics = [
    { label: 'Response Time', value: '1.2s', trend: 'down', good: true },
    { label: 'Throughput', value: '2.5k/min', trend: 'up', good: true },
    { label: 'Error Rate', value: '0.1%', trend: 'down', good: true },
    { label: 'Uptime', value: '99.9%', trend: 'stable', good: true },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Performance Metrics
      </Typography>
      
      <Grid container spacing={2}>
        {metrics.map((metric, index) => (
          <Grid item xs={6} key={index}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" fontWeight="bold" color="primary">
                {metric.value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {metric.label}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.5 }}>
                {metric.trend === 'up' && <TrendingUp color="success" fontSize="small" />}
                {metric.trend === 'down' && <TrendingDown color={metric.good ? 'success' : 'error'} fontSize="small" />}
                {metric.trend === 'stable' && <NetworkCheck color="info" fontSize="small" />}
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};