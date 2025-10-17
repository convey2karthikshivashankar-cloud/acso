import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  LinearProgress,
  IconButton,
  Button,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Psychology as AgentIcon,
  AccountTree as WorkflowIcon,
  Warning as IncidentIcon,
  AttachMoney as FinancialIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../store/hooks';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  color,
  loading = false,
}) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: `${color}.main`,
              width: 48,
              height: 48,
            }}
          >
            {icon}
          </Avatar>
          <IconButton size="small">
            <MoreVertIcon />
          </IconButton>
        </Box>

        <Typography variant="h4" component="div" sx={{ fontWeight: 700, mb: 1 }}>
          {loading ? '-' : value}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {title}
        </Typography>

        {change && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {change.type === 'increase' ? (
              <TrendingUpIcon color="success" sx={{ mr: 0.5, fontSize: 16 }} />
            ) : (
              <TrendingDownIcon color="error" sx={{ mr: 0.5, fontSize: 16 }} />
            )}
            <Typography
              variant="body2"
              color={change.type === 'increase' ? 'success.main' : 'error.main'}
              sx={{ fontWeight: 600 }}
            >
              {change.value > 0 ? '+' : ''}{change.value}%
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
              vs last week
            </Typography>
          </Box>
        )}

        {loading && <LinearProgress sx={{ mt: 2 }} />}
      </CardContent>
    </Card>
  );
};

interface StatusCardProps {
  title: string;
  items: Array<{
    name: string;
    status: 'healthy' | 'warning' | 'error';
    value?: string;
  }>;
}

const StatusCard: React.FC<StatusCardProps> = ({ title, items }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <IconButton size="small">
            <RefreshIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map((item, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  size="small"
                  label={item.status}
                  color={getStatusColor(item.status) as any}
                  variant="outlined"
                />
                <Typography variant="body2">{item.name}</Typography>
              </Box>
              {item.value && (
                <Typography variant="body2" color="text.secondary">
                  {item.value}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export const Dashboard: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);

  // Mock data - in real app, this would come from API
  const metrics = [
    {
      title: 'Active Threats',
      value: 3,
      change: { value: -25, type: 'decrease' as const },
      icon: <SecurityIcon />,
      color: 'error' as const,
    },
    {
      title: 'Agents Online',
      value: '5/5',
      change: { value: 0, type: 'increase' as const },
      icon: <AgentIcon />,
      color: 'success' as const,
    },
    {
      title: 'Active Workflows',
      value: 12,
      change: { value: 15, type: 'increase' as const },
      icon: <WorkflowIcon />,
      color: 'info' as const,
    },
    {
      title: 'Cost Savings',
      value: '$2.4K',
      change: { value: 8, type: 'increase' as const },
      icon: <FinancialIcon />,
      color: 'success' as const,
    },
  ];

  const agentStatus = [
    { name: 'Supervisor Agent', status: 'healthy' as const, value: '99.9%' },
    { name: 'Threat Hunter', status: 'healthy' as const, value: '98.5%' },
    { name: 'Incident Response', status: 'warning' as const, value: '95.2%' },
    { name: 'Service Orchestration', status: 'healthy' as const, value: '99.1%' },
    { name: 'Financial Intelligence', status: 'healthy' as const, value: '97.8%' },
  ];

  const recentIncidents = [
    { name: 'Suspicious Login Activity', status: 'warning' as const, value: '2 min ago' },
    { name: 'Failed Authentication', status: 'error' as const, value: '15 min ago' },
    { name: 'Malware Detected', status: 'error' as const, value: '1 hour ago' },
    { name: 'Policy Violation', status: 'warning' as const, value: '2 hours ago' },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          Welcome back, {user?.firstName}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's what's happening with your ACSO system today.
        </Typography>
      </Box>

      {/* Metrics Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {metrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <MetricCard {...metric} />
          </Grid>
        ))}
      </Grid>

      {/* Status Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <StatusCard title="Agent Status" items={agentStatus} />
        </Grid>
        <Grid item xs={12} md={6}>
          <StatusCard title="Recent Incidents" items={recentIncidents} />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Card>
        <CardContent>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600, mb: 3 }}>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<WorkflowIcon />}
                sx={{ py: 1.5 }}
              >
                Create Workflow
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<IncidentIcon />}
                sx={{ py: 1.5 }}
              >
                Report Incident
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<AgentIcon />}
                sx={{ py: 1.5 }}
              >
                Manage Agents
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FinancialIcon />}
                sx={{ py: 1.5 }}
              >
                View Analytics
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};