import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Button,
  LinearProgress,
  Alert,
  Tooltip,
  Badge,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Computer,
  Security,
  Analytics,
  Storage,
  NetworkCheck,
  Warning,
  Error,
  CheckCircle,
  MoreVert,
  Refresh,
  Settings,
  Stop,
  PlayArrow,
  RestartAlt,
  Visibility,
  Timeline,
  Speed,
  Memory,
  Cpu,
} from '@mui/icons-material';

export interface Agent {
  id: string;
  name: string;
  type: 'supervisor' | 'threat_hunter' | 'incident_response' | 'service_orchestration' | 'financial_intelligence';
  status: 'online' | 'offline' | 'warning' | 'error' | 'maintenance';
  health: {
    score: number;
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  performance: {
    tasksCompleted: number;
    averageResponseTime: number;
    successRate: number;
    uptime: number;
  };
  lastHeartbeat: Date;
  version: string;
  location: string;
  tags: string[];
  metadata: Record<string, any>;
}

export interface AgentOverviewProps {
  agents: Agent[];
  loading?: boolean;
  error?: string | null;
  onAgentAction?: (agentId: string, action: 'start' | 'stop' | 'restart' | 'configure' | 'view') => void;
  onRefresh?: () => void;
  onAgentSelect?: (agent: Agent) => void;
}

export const AgentOverview: React.FC<AgentOverviewProps> = ({
  agents,
  loading = false,
  error = null,
  onAgentAction,
  onRefresh,
  onAgentSelect,
}) => {
  const theme = useTheme();
  const [selectedAgent, setSelectedAgent] = React.useState<Agent | null>(null);
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);

  const getAgentTypeIcon = (type: Agent['type']) => {
    switch (type) {
      case 'supervisor':
        return <Settings />;
      case 'threat_hunter':
        return <Security />;
      case 'incident_response':
        return <Warning />;
      case 'service_orchestration':
        return <NetworkCheck />;
      case 'financial_intelligence':
        return <Analytics />;
      default:
        return <Computer />;
    }
  };

  const getAgentTypeColor = (type: Agent['type']) => {
    switch (type) {
      case 'supervisor':
        return theme.palette.primary.main;
      case 'threat_hunter':
        return theme.palette.error.main;
      case 'incident_response':
        return theme.palette.warning.main;
      case 'service_orchestration':
        return theme.palette.info.main;
      case 'financial_intelligence':
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'online':
        return theme.palette.success.main;
      case 'offline':
        return theme.palette.grey[500];
      case 'warning':
        return theme.palette.warning.main;
      case 'error':
        return theme.palette.error.main;
      case 'maintenance':
        return theme.palette.info.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getStatusIcon = (status: Agent['status']) => {
    switch (status) {
      case 'online':
        return <CheckCircle />;
      case 'offline':
        return <Stop />;
      case 'warning':
        return <Warning />;
      case 'error':
        return <Error />;
      case 'maintenance':
        return <Settings />;
      default:
        return <Computer />;
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return theme.palette.success.main;
    if (score >= 70) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const handleAgentMenuOpen = (agent: Agent, event: React.MouseEvent<HTMLElement>) => {
    setSelectedAgent(agent);
    setMenuAnchor(event.currentTarget);
  };

  const handleAgentMenuClose = () => {
    setSelectedAgent(null);
    setMenuAnchor(null);
  };

  const handleAgentAction = (action: 'start' | 'stop' | 'restart' | 'configure' | 'view') => {
    if (selectedAgent) {
      onAgentAction?.(selectedAgent.id, action);
    }
    handleAgentMenuClose();
  };

  const formatUptime = (uptime: number) => {
    const days = Math.floor(uptime / (24 * 60 * 60));
    const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((uptime % (60 * 60)) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const renderAgentCard = (agent: Agent) => (
    <Card
      key={agent.id}
      sx={{
        height: '100%',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[8],
        },
        border: `2px solid ${alpha(getStatusColor(agent.status), 0.3)}`,
      }}
      onClick={() => onAgentSelect?.(agent)}
    >
      <CardHeader
        avatar={
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            badgeContent={
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: getStatusColor(agent.status),
                  border: `2px solid ${theme.palette.background.paper}`,
                }}
              />
            }
          >
            <Avatar
              sx={{
                bgcolor: getAgentTypeColor(agent.type),
                width: 48,
                height: 48,
              }}
            >
              {getAgentTypeIcon(agent.type)}
            </Avatar>
          </Badge>
        }
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" component="div">
              {agent.name}
            </Typography>
            <Chip
              label={agent.status}
              size="small"
              sx={{
                bgcolor: alpha(getStatusColor(agent.status), 0.1),
                color: getStatusColor(agent.status),
                fontWeight: 'bold',
              }}
            />
          </Box>
        }
        subheader={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {agent.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              v{agent.version}
            </Typography>
          </Box>
        }
        action={
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              handleAgentMenuOpen(agent, e);
            }}
          >
            <MoreVert />
          </IconButton>
        }
      />

      <CardContent sx={{ pt: 0 }}>
        {/* Health Score */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Health Score
            </Typography>
            <Typography variant="body2" fontWeight="bold" color={getHealthColor(agent.health.score)}>
              {agent.health.score}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={agent.health.score}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: alpha(getHealthColor(agent.health.score), 0.1),
              '& .MuiLinearProgress-bar': {
                backgroundColor: getHealthColor(agent.health.score),
                borderRadius: 4,
              },
            }}
          />
        </Box>

        {/* Resource Usage */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Resource Usage
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={3}>
              <Tooltip title={`CPU: ${agent.health.cpu}%`}>
                <Box sx={{ textAlign: 'center' }}>
                  <Cpu fontSize="small" color="action" />
                  <Typography variant="caption" display="block">
                    {agent.health.cpu}%
                  </Typography>
                </Box>
              </Tooltip>
            </Grid>
            <Grid item xs={3}>
              <Tooltip title={`Memory: ${agent.health.memory}%`}>
                <Box sx={{ textAlign: 'center' }}>
                  <Memory fontSize="small" color="action" />
                  <Typography variant="caption" display="block">
                    {agent.health.memory}%
                  </Typography>
                </Box>
              </Tooltip>
            </Grid>
            <Grid item xs={3}>
              <Tooltip title={`Disk: ${agent.health.disk}%`}>
                <Box sx={{ textAlign: 'center' }}>
                  <Storage fontSize="small" color="action" />
                  <Typography variant="caption" display="block">
                    {agent.health.disk}%
                  </Typography>
                </Box>
              </Tooltip>
            </Grid>
            <Grid item xs={3}>
              <Tooltip title={`Network: ${agent.health.network}%`}>
                <Box sx={{ textAlign: 'center' }}>
                  <NetworkCheck fontSize="small" color="action" />
                  <Typography variant="caption" display="block">
                    {agent.health.network}%
                  </Typography>
                </Box>
              </Tooltip>
            </Grid>
          </Grid>
        </Box>

        {/* Performance Metrics */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Performance
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Tasks Completed
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {agent.performance.tasksCompleted.toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Success Rate
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {agent.performance.successRate}%
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Avg Response
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {agent.performance.averageResponseTime}ms
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Uptime
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {formatUptime(agent.performance.uptime)}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Tags */}
        {agent.tags.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {agent.tags.slice(0, 3).map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            ))}
            {agent.tags.length > 3 && (
              <Chip
                label={`+${agent.tags.length - 3}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            )}
          </Box>
        )}

        {/* Last Heartbeat */}
        <Box sx={{ mt: 2, pt: 1, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            Last seen: {agent.lastHeartbeat.toLocaleString()}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  const renderAgentMenu = () => (
    <Menu
      anchorEl={menuAnchor}
      open={Boolean(menuAnchor)}
      onClose={handleAgentMenuClose}
    >
      <MenuItem onClick={() => handleAgentAction('view')}>
        <Visibility sx={{ mr: 1 }} />
        View Details
      </MenuItem>
      <MenuItem onClick={() => handleAgentAction('configure')}>
        <Settings sx={{ mr: 1 }} />
        Configure
      </MenuItem>
      {selectedAgent?.status === 'offline' ? (
        <MenuItem onClick={() => handleAgentAction('start')}>
          <PlayArrow sx={{ mr: 1 }} />
          Start Agent
        </MenuItem>
      ) : (
        <MenuItem onClick={() => handleAgentAction('stop')}>
          <Stop sx={{ mr: 1 }} />
          Stop Agent
        </MenuItem>
      )}
      <MenuItem onClick={() => handleAgentAction('restart')}>
        <RestartAlt sx={{ mr: 1 }} />
        Restart Agent
      </MenuItem>
    </Menu>
  );

  const renderSummaryStats = () => {
    const stats = {
      total: agents.length,
      online: agents.filter(a => a.status === 'online').length,
      offline: agents.filter(a => a.status === 'offline').length,
      warning: agents.filter(a => a.status === 'warning').length,
      error: agents.filter(a => a.status === 'error').length,
      avgHealth: agents.reduce((sum, a) => sum + a.health.score, 0) / agents.length || 0,
    };

    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="primary">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Agents
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="success.main">
                {stats.online}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Online
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="text.secondary">
                {stats.offline}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Offline
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="warning.main">
                {stats.warning}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Warning
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="error.main">
                {stats.error}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Error
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color={getHealthColor(stats.avgHealth)}>
                {Math.round(stats.avgHealth)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Health
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Failed to load agents
        </Typography>
        <Typography variant="body2">{error}</Typography>
        <Button onClick={onRefresh} sx={{ mt: 1 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Agent Overview
        </Typography>
        <Button
          startIcon={<Refresh />}
          onClick={onRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Loading */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Summary Stats */}
      {renderSummaryStats()}

      {/* Agent Cards */}
      <Grid container spacing={3}>
        {agents.map(agent => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={agent.id}>
            {renderAgentCard(agent)}
          </Grid>
        ))}
      </Grid>

      {/* Empty State */}
      {agents.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Computer sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No agents found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Agents will appear here once they are registered and running.
          </Typography>
        </Box>
      )}

      {/* Agent Menu */}
      {renderAgentMenu()}
    </Box>
  );
};

export default AgentOverview;