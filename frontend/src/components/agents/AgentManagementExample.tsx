import React from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Chip,
  Card,
  CardContent,
  Grid,
  Divider,
} from '@mui/material';
import {
  Computer,
  Timeline,
  AccountTree,
  Refresh,
  Settings,
  PlayArrow,
  Stop,
  RestartAlt,
} from '@mui/icons-material';
import { AgentOverview } from './AgentOverview';
import { AgentTopology } from './AgentTopology';
import { AgentMetrics } from './AgentMetrics';
import {
  generateMockAgents,
  generateMockAgentConnections,
  generateMockAgentMetrics,
  getAgentStatusSummary,
  Agent,
  AgentConnection,
  AgentMetric,
} from './index';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`agent-tabpanel-${index}`}
    aria-labelledby={`agent-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

export const AgentManagementExample: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState(0);
  const [agents, setAgents] = React.useState<Agent[]>(() => generateMockAgents());
  const [connections] = React.useState<AgentConnection[]>(() => generateMockAgentConnections());
  const [metrics] = React.useState<AgentMetric[]>(() => generateMockAgentMetrics(generateMockAgents()));
  const [selectedAgentId, setSelectedAgentId] = React.useState<string>('');
  const [topologyLayout, setTopologyLayout] = React.useState<'hierarchical' | 'circular' | 'force' | 'grid'>('hierarchical');
  const [realTimeEnabled, setRealTimeEnabled] = React.useState(true);
  const [loading, setLoading] = React.useState(false);

  // Simulate real-time updates
  React.useEffect(() => {
    if (!realTimeEnabled) return;

    const interval = setInterval(() => {
      setAgents(prevAgents => 
        prevAgents.map(agent => ({
          ...agent,
          health: {
            ...agent.health,
            cpu: Math.max(0, Math.min(100, agent.health.cpu + (Math.random() - 0.5) * 10)),
            memory: Math.max(0, Math.min(100, agent.health.memory + (Math.random() - 0.5) * 8)),
            network: Math.max(0, Math.min(100, agent.health.network + (Math.random() - 0.5) * 15)),
          },
          performance: {
            ...agent.performance,
            tasksCompleted: agent.performance.tasksCompleted + Math.floor(Math.random() * 3),
            averageResponseTime: Math.max(50, agent.performance.averageResponseTime + (Math.random() - 0.5) * 20),
          },
          lastHeartbeat: new Date(),
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [realTimeEnabled]);

  const handleAgentAction = async (agentId: string, action: 'start' | 'stop' | 'restart' | 'configure' | 'view') => {
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setAgents(prevAgents => 
      prevAgents.map(agent => {
        if (agent.id !== agentId) return agent;
        
        switch (action) {
          case 'start':
            return { ...agent, status: 'online' as const };
          case 'stop':
            return { ...agent, status: 'offline' as const };
          case 'restart':
            return { 
              ...agent, 
              status: 'online' as const,
              lastHeartbeat: new Date(),
              performance: {
                ...agent.performance,
                uptime: 0,
              }
            };
          case 'view':
            setSelectedAgentId(agentId);
            setActiveTab(2); // Switch to metrics tab
            return agent;
          case 'configure':
            console.log(`Configure agent ${agentId}`);
            return agent;
          default:
            return agent;
        }
      })
    );
    
    setLoading(false);
  };

  const handleRefresh = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setAgents(generateMockAgents());
    setLoading(false);
  };

  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgentId(agent.id);
    setActiveTab(2); // Switch to metrics tab
  };

  const statusSummary = getAgentStatusSummary(agents);

  const renderOverview = () => (
    <AgentOverview
      agents={agents}
      loading={loading}
      onAgentAction={handleAgentAction}
      onRefresh={handleRefresh}
      onAgentSelect={handleAgentSelect}
    />
  );

  const renderTopology = () => (
    <AgentTopology
      agents={agents}
      connections={connections}
      layout={topologyLayout}
      showLabels={true}
      showMetrics={true}
      showConnections={true}
      onAgentClick={handleAgentSelect}
      onConnectionClick={(connection) => {
        console.log('Connection clicked:', connection);
      }}
      onLayoutChange={(layout) => {
        setTopologyLayout(layout as any);
      }}
    />
  );

  const renderMetrics = () => (
    <AgentMetrics
      agents={agents}
      metrics={metrics}
      selectedAgentId={selectedAgentId}
      onAgentSelect={setSelectedAgentId}
      onRefresh={handleRefresh}
    />
  );

  const renderSummaryCards = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={2}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h4" color="primary">
              {statusSummary.total}
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
              {statusSummary.online}
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
            <Typography variant="h4" color="warning.main">
              {statusSummary.warning}
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
              {statusSummary.error}
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
            <Typography variant="h4">
              {statusSummary.avgHealth}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Avg Health
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={2}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h4">
              {statusSummary.avgResponseTime}ms
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Avg Response
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom>
          Agent Management System
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Comprehensive agent monitoring, topology visualization, and performance analytics 
          for the ACSO multi-agent system.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={realTimeEnabled}
                onChange={(e) => setRealTimeEnabled(e.target.checked)}
              />
            }
            label="Real-time Updates"
          />

          <Button
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading}
            variant="outlined"
          >
            Refresh All
          </Button>

          <Divider orientation="vertical" flexItem />

          <Chip
            icon={<Computer />}
            label={`${statusSummary.online}/${statusSummary.total} Online`}
            color={statusSummary.online === statusSummary.total ? 'success' : 'warning'}
          />

          {selectedAgentId && (
            <Chip
              label={`Selected: ${agents.find(a => a.id === selectedAgentId)?.name}`}
              onDelete={() => setSelectedAgentId('')}
              color="primary"
            />
          )}
        </Box>

        {statusSummary.error > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {statusSummary.error} agent(s) in error state require immediate attention.
          </Alert>
        )}

        {statusSummary.warning > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {statusSummary.warning} agent(s) showing warning conditions.
          </Alert>
        )}
      </Box>

      {/* Summary Cards */}
      {renderSummaryCards()}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
        >
          <Tab icon={<Computer />} label="Agent Overview" />
          <Tab icon={<AccountTree />} label="Topology View" />
          <Tab icon={<Timeline />} label="Performance Metrics" />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        {renderOverview()}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {renderTopology()}
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {renderMetrics()}
      </TabPanel>
    </Container>
  );
};

export default AgentManagementExample;