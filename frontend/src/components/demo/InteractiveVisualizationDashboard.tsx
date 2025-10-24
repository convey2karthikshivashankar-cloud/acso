/**
 * Interactive Visualization Dashboard
 * 
 * Combines multiple visualization components into a comprehensive dashboard
 * with drill-down capabilities, filtering, and real-time updates.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Tooltip,
  Chip,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Drawer,
  Badge,
  Collapse
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Timeline as TimelineIcon,
  AccountTree as NetworkIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Fullscreen,
  FullscreenExit,
  FilterList,
  Refresh,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  AgentStatus,
  AgentMessage,
  AgentDecision,
  BusinessMetric,
  DemoEvent
} from '../../types/demo';
import RealTimeAgentMonitor from './RealTimeAgentMonitor';
import AgentCommunicationFlow from './AgentCommunicationFlow';
import AgentDecisionViewer from './AgentDecisionViewer';
import { BarChart, TimeSeriesChart } from '../charts';
import { visualizationEngine, VisualizationLayer } from '../../services/visualizationEngine';

interface InteractiveVisualizationDashboardProps {
  agents: AgentStatus[];
  messages: AgentMessage[];
  decisions: AgentDecision[];
  metrics: BusinessMetric[];
  events: DemoEvent[];
  isRunning?: boolean;
  onAgentClick?: (agent: AgentStatus) => void;
  onMessageClick?: (message: AgentMessage) => void;
  onDecisionClick?: (decision: AgentDecision) => void;
  onMetricClick?: (metric: BusinessMetric) => void;
}

interface DashboardSettings {
  layout: 'grid' | 'tabs' | 'split';
  layer: VisualizationLayer;
  autoRefresh: boolean;
  refreshInterval: number;
  showFilters: boolean;
  compactMode: boolean;
}

interface FilterState {
  agentTypes: string[];
  messagePriorities: string[];
  timeRange: string;
  metricCategories: string[];
}

const InteractiveVisualizationDashboard: React.FC<InteractiveVisualizationDashboardProps> = ({
  agents,
  messages,
  decisions,
  metrics,
  events,
  isRunning = false,
  onAgentClick,
  onMessageClick,
  onDecisionClick,
  onMetricClick
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState<DashboardSettings>({
    layout: 'grid',
    layer: 'overview',
    autoRefresh: true,
    refreshInterval: 2000,
    showFilters: false,
    compactMode: false
  });
  const [filters, setFilters] = useState<FilterState>({
    agentTypes: [],
    messagePriorities: [],
    timeRange: '5m',
    metricCategories: []
  });
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(new Set(['monitor', 'communication']));
  const [fullscreenPanel, setFullscreenPanel] = useState<string | null>(null);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);

  // Filter data based on current filters
  const filteredData = useMemo(() => {
    let filteredAgents = agents;
    let filteredMessages = messages;
    let filteredDecisions = decisions;
    let filteredMetrics = metrics;

    // Apply agent type filter
    if (filters.agentTypes.length > 0) {
      filteredAgents = agents.filter(agent => filters.agentTypes.includes(agent.type));
      const agentIds = filteredAgents.map(a => a.id);
      filteredMessages = messages.filter(msg => 
        agentIds.includes(msg.fromAgent) || agentIds.includes(msg.toAgent)
      );
      filteredDecisions = decisions.filter(dec => agentIds.includes(dec.agentId));
    }

    // Apply message priority filter
    if (filters.messagePriorities.length > 0) {
      filteredMessages = filteredMessages.filter(msg => 
        filters.messagePriorities.includes(msg.priority)
      );
    }

    // Apply time range filter
    const timeRangeMs = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000
    }[filters.timeRange] || 5 * 60 * 1000;

    const cutoffTime = new Date(Date.now() - timeRangeMs);
    filteredMessages = filteredMessages.filter(msg => msg.timestamp >= cutoffTime);
    filteredDecisions = filteredDecisions.filter(dec => dec.timestamp >= cutoffTime);

    // Apply metric category filter
    if (filters.metricCategories.length > 0) {
      filteredMetrics = metrics.filter(metric => 
        filters.metricCategories.includes(metric.category)
      );
    }

    return {
      agents: filteredAgents,
      messages: filteredMessages,
      decisions: filteredDecisions,
      metrics: filteredMetrics
    };
  }, [agents, messages, decisions, metrics, filters]);

  // Auto-refresh effect
  useEffect(() => {
    if (!settings.autoRefresh || !isRunning) return;

    const interval = setInterval(() => {
      visualizationEngine.setLayer(settings.layer);
    }, settings.refreshInterval);

    return () => clearInterval(interval);
  }, [settings.autoRefresh, settings.refreshInterval, settings.layer, isRunning]);

  // Panel management
  const togglePanel = (panelId: string) => {
    setExpandedPanels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(panelId)) {
        newSet.delete(panelId);
      } else {
        newSet.add(panelId);
      }
      return newSet;
    });
  };

  const toggleFullscreen = (panelId: string) => {
    setFullscreenPanel(fullscreenPanel === panelId ? null : panelId);
  };

  // Generate analytics data
  const analyticsData = useMemo(() => {
    const agentActivityData = agents.map(agent => ({
      name: agent.name,
      value: agent.performance.tasksCompleted,
      color: getAgentColor(agent.type)
    }));

    const messagePriorityData = [
      { name: 'Critical', value: messages.filter(m => m.priority === 'critical').length, color: theme.palette.error.main },
      { name: 'High', value: messages.filter(m => m.priority === 'high').length, color: theme.palette.warning.main },
      { name: 'Medium', value: messages.filter(m => m.priority === 'medium').length, color: theme.palette.info.main },
      { name: 'Low', value: messages.filter(m => m.priority === 'low').length, color: theme.palette.grey[500] }
    ];

    const decisionConfidenceData = decisions.map((decision, index) => ({
      x: index,
      y: decision.confidence * 100,
      timestamp: decision.timestamp
    }));

    return {
      agentActivity: agentActivityData,
      messagePriority: messagePriorityData,
      decisionConfidence: decisionConfidenceData
    };
  }, [agents, messages, decisions, theme]);

  const getAgentColor = (type: string): string => {
    const colors = {
      'supervisor': theme.palette.primary.main,
      'threat-hunter': theme.palette.error.main,
      'incident-response': theme.palette.warning.main,
      'financial-intelligence': theme.palette.success.main,
      'service-orchestration': theme.palette.info.main
    };
    return colors[type as keyof typeof colors] || theme.palette.grey[500];
  };

  // Render panel with controls
  const renderPanel = (id: string, title: string, icon: React.ReactNode, content: React.ReactNode, height = 400) => {
    const isExpanded = expandedPanels.has(id);
    const isFullscreen = fullscreenPanel === id;
    
    return (
      <Card 
        key={id}
        sx={{ 
          height: isFullscreen ? '100vh' : (isExpanded ? 'auto' : 60),
          position: isFullscreen ? 'fixed' : 'relative',
          top: isFullscreen ? 0 : 'auto',
          left: isFullscreen ? 0 : 'auto',
          width: isFullscreen ? '100vw' : 'auto',
          zIndex: isFullscreen ? theme.zIndex.modal : 'auto',
          transition: 'all 0.3s ease'
        }}
      >
        <CardHeader
          avatar={icon}
          title={title}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Badge badgeContent={getNotificationCount(id)} color="error">
                <Tooltip title={isExpanded ? 'Collapse' : 'Expand'}>
                  <IconButton onClick={() => togglePanel(id)} size="small">
                    {isExpanded ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Tooltip>
              </Badge>
              <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
                <IconButton onClick={() => toggleFullscreen(id)} size="small">
                  {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
                </IconButton>
              </Tooltip>
            </Box>
          }
          sx={{ 
            pb: isExpanded ? 1 : 0,
            '& .MuiCardHeader-content': {
              overflow: 'hidden'
            }
          }}
        />
        <Collapse in={isExpanded}>
          <CardContent sx={{ pt: 0, height: isFullscreen ? 'calc(100vh - 80px)' : height }}>
            {content}
          </CardContent>
        </Collapse>
      </Card>
    );
  };

  const getNotificationCount = (panelId: string): number => {
    switch (panelId) {
      case 'communication':
        return filteredData.messages.filter(m => m.priority === 'critical').length;
      case 'decisions':
        return filteredData.decisions.filter(d => d.confidence < 0.6).length;
      case 'metrics':
        return filteredData.metrics.filter(m => m.status === 'alert').length;
      default:
        return 0;
    }
  };

  // Render filters sidebar
  const renderFilters = () => (
    <Box sx={{ p: 2, width: 300 }}>
      <Typography variant="h6" gutterBottom>
        Filters
      </Typography>
      
      {/* Agent Types */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Agent Types</InputLabel>
        <Select
          multiple
          value={filters.agentTypes}
          onChange={(e) => setFilters(prev => ({ ...prev, agentTypes: e.target.value as string[] }))}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {(selected as string[]).map((value) => (
                <Chip key={value} label={value} size="small" />
              ))}
            </Box>
          )}
        >
          {['supervisor', 'threat-hunter', 'incident-response', 'financial-intelligence', 'service-orchestration'].map((type) => (
            <MenuItem key={type} value={type}>{type}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Message Priorities */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Message Priorities</InputLabel>
        <Select
          multiple
          value={filters.messagePriorities}
          onChange={(e) => setFilters(prev => ({ ...prev, messagePriorities: e.target.value as string[] }))}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {(selected as string[]).map((value) => (
                <Chip key={value} label={value} size="small" />
              ))}
            </Box>
          )}
        >
          {['critical', 'high', 'medium', 'low'].map((priority) => (
            <MenuItem key={priority} value={priority}>{priority}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Time Range */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Time Range</InputLabel>
        <Select
          value={filters.timeRange}
          onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value }))}
        >
          <MenuItem value="1m">Last 1 minute</MenuItem>
          <MenuItem value="5m">Last 5 minutes</MenuItem>
          <MenuItem value="15m">Last 15 minutes</MenuItem>
          <MenuItem value="1h">Last 1 hour</MenuItem>
          <MenuItem value="24h">Last 24 hours</MenuItem>
        </Select>
      </FormControl>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <IconButton onClick={() => setFilters({
          agentTypes: [],
          messagePriorities: [],
          timeRange: '5m',
          metricCategories: []
        })} size="small">
          <Refresh />
        </IconButton>
        <Typography variant="caption" sx={{ alignSelf: 'center' }}>
          Clear Filters
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DashboardIcon />
            Interactive Visualization Dashboard
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip
              label={isRunning ? 'LIVE' : 'PAUSED'}
              color={isRunning ? 'success' : 'default'}
              size="small"
            />
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Layer</InputLabel>
              <Select
                value={settings.layer}
                label="Layer"
                onChange={(e) => setSettings(prev => ({ ...prev, layer: e.target.value as VisualizationLayer }))}
              >
                <MenuItem value="overview">Overview</MenuItem>
                <MenuItem value="detailed">Detailed</MenuItem>
                <MenuItem value="technical">Technical</MenuItem>
                <MenuItem value="business">Business</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoRefresh}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoRefresh: e.target.checked }))}
                  size="small"
                />
              }
              label="Auto Refresh"
            />

            <Tooltip title="Filters">
              <IconButton
                onClick={() => setSettingsDrawerOpen(true)}
                color={Object.values(filters).some(f => Array.isArray(f) ? f.length > 0 : f !== '5m') ? 'primary' : 'default'}
              >
                <FilterList />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Main content area */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          <Grid item xs={12} lg={8}>
            {renderPanel(
              'monitor',
              'Real-Time Agent Monitor',
              <NetworkIcon />,
              <RealTimeAgentMonitor
                agents={filteredData.agents}
                messages={filteredData.messages}
                decisions={filteredData.decisions}
                isRunning={isRunning}
                height={400}
                showControls={false}
                onAgentClick={onAgentClick}
                onMessageClick={onMessageClick}
              />,
              400
            )}
          </Grid>
          
          <Grid item xs={12} lg={4}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                {renderPanel(
                  'communication',
                  'Communication Flow',
                  <TimelineIcon />,
                  <AgentCommunicationFlow
                    messages={filteredData.messages}
                    agents={filteredData.agents}
                    isRunning={isRunning}
                    height={180}
                    compact={true}
                    onMessageClick={onMessageClick}
                  />,
                  200
                )}
              </Grid>
              
              <Grid item xs={12}>
                {renderPanel(
                  'decisions',
                  'Decision Analytics',
                  <AnalyticsIcon />,
                  <AgentDecisionViewer
                    decisions={filteredData.decisions}
                    agents={filteredData.agents}
                    isRunning={isRunning}
                    height={180}
                    compact={true}
                    onDecisionClick={onDecisionClick}
                  />,
                  200
                )}
              </Grid>
            </Grid>
          </Grid>
          
          <Grid item xs={12}>
            {renderPanel(
              'metrics',
              'Business Metrics',
              <DashboardIcon />,
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <BarChart
                    data={analyticsData.agentActivity}
                    title="Agent Activity"
                    height={200}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <BarChart
                    data={analyticsData.messagePriority}
                    title="Message Priority"
                    height={200}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TimeSeriesChart
                    data={analyticsData.decisionConfidence}
                    title="Decision Confidence"
                    height={200}
                  />
                </Grid>
              </Grid>,
              250
            )}
          </Grid>
        </Grid>
      </Box>

      {/* Filters Drawer */}
      <Drawer
        anchor="right"
        open={settingsDrawerOpen}
        onClose={() => setSettingsDrawerOpen(false)}
      >
        {renderFilters()}
      </Drawer>
    </Box>
  );
};

export default InteractiveVisualizationDashboard;