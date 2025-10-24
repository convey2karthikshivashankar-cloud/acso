/**
 * Demo Page Component
 * 
 * Main page for UI-driven agentic AI demonstrations.
 * Provides the complete demo experience with control panel, 
 * real-time visualizations, and business impact metrics.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Paper,
  Alert,
  Fade,
  Slide
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DemoControlPanel from '../components/demo/DemoControlPanel';
import { AgentOverview } from '../components/agents';
import { NetworkTopology } from '../components/charts';
import { ROICalculator } from '../components/financial';
import { useDemoOrchestrator } from '../hooks/useDemoOrchestrator';
import {
  DemoSession,
  DemoEvent,
  AgentStatus,
  BusinessMetric
} from '../types/demo';

const DemoPage: React.FC = () => {
  const theme = useTheme();
  const {
    currentSession,
    agents,
    metrics,
    isRunning,
    onDemoStarted,
    onDemoEvent,
    onAgentAction,
    onMetricsUpdated
  } = useDemoOrchestrator();

  const [recentEvents, setRecentEvents] = useState<DemoEvent[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);

  // Set up event listeners
  useEffect(() => {
    const cleanupStarted = onDemoStarted(({ session }) => {
      setShowWelcome(false);
      console.log('Demo started:', session.scenario.name);
    });

    const cleanupEvent = onDemoEvent(({ event }) => {
      setRecentEvents(prev => [event, ...prev.slice(0, 4)]);
    });

    const cleanupAgent = onAgentAction(({ agent, action }) => {
      console.log(`Agent ${agent.name} performed: ${action}`);
    });

    const cleanupMetrics = onMetricsUpdated(({ metrics: updatedMetrics }) => {
      console.log('Metrics updated:', updatedMetrics.length);
    });

    return () => {
      cleanupStarted();
      cleanupEvent();
      cleanupAgent();
      cleanupMetrics();
    };
  }, [onDemoStarted, onDemoEvent, onAgentAction, onMetricsUpdated]);

  const handleDemoStart = (session: DemoSession) => {
    setRecentEvents([]);
    setShowWelcome(false);
  };

  const handleDemoStop = () => {
    setRecentEvents([]);
    setShowWelcome(true);
  };

  const handleDemoEvent = (event: DemoEvent) => {
    setRecentEvents(prev => [event, ...prev.slice(0, 4)]);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography 
        variant="h3" 
        component="h1" 
        gutterBottom 
        sx={{ 
          textAlign: 'center',
          mb: 4,
          background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}
      >
        ACSO Agentic AI Demonstrations
      </Typography>

      {showWelcome && !currentSession && (
        <Fade in={showWelcome}>
          <Alert 
            severity="info" 
            sx={{ mb: 3, textAlign: 'center' }}
          >
            Welcome to ACSO's interactive AI demonstrations. Select a scenario below to see 
            autonomous agents in action, showcasing real-time decision-making, multi-agent 
            coordination, and measurable business impact.
          </Alert>
        </Fade>
      )}

      <Grid container spacing={3}>
        {/* Demo Control Panel */}
        <Grid item xs={12}>
          <DemoControlPanel
            onDemoStart={handleDemoStart}
            onDemoStop={handleDemoStop}
            onDemoEvent={handleDemoEvent}
          />
        </Grid>

        {/* Agent Overview */}
        {isRunning && agents.length > 0 && (
          <Grid item xs={12} lg={6}>
            <Slide direction="up" in={isRunning}>
              <Paper elevation={2} sx={{ p: 2, height: '400px' }}>
                <Typography variant="h6" gutterBottom>
                  Agent Activity Monitor
                </Typography>
                <AgentOverview 
                  agents={agents}
                  showMetrics
                  showStatus
                  realTime
                />
              </Paper>
            </Slide>
          </Grid>
        )}

        {/* Network Topology */}
        {isRunning && (
          <Grid item xs={12} lg={6}>
            <Slide direction="up" in={isRunning} style={{ transitionDelay: '100ms' }}>
              <Paper elevation={2} sx={{ p: 2, height: '400px' }}>
                <Typography variant="h6" gutterBottom>
                  System Topology
                </Typography>
                <NetworkTopology
                  nodes={agents.map(agent => ({
                    id: agent.id,
                    name: agent.name,
                    type: agent.type,
                    status: agent.status,
                    x: Math.random() * 300,
                    y: Math.random() * 200
                  }))}
                  edges={[]}
                  height={320}
                />
              </Paper>
            </Slide>
          </Grid>
        )}

        {/* ROI Calculator */}
        {metrics.length > 0 && (
          <Grid item xs={12} lg={8}>
            <Slide direction="up" in={metrics.length > 0} style={{ transitionDelay: '200ms' }}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Business Impact & ROI
                </Typography>
                <ROICalculator
                  initialInvestment={50000}
                  monthlyOperationalCost={5000}
                  projectedSavings={metrics.find(m => m.category === 'cost-savings')?.value || 0}
                  efficiencyGains={metrics.find(m => m.category === 'efficiency')?.value || 0}
                  showProjections
                />
              </Paper>
            </Slide>
          </Grid>
        )}

        {/* Recent Events */}
        {recentEvents.length > 0 && (
          <Grid item xs={12} lg={4}>
            <Slide direction="up" in={recentEvents.length > 0} style={{ transitionDelay: '300ms' }}>
              <Paper elevation={2} sx={{ p: 2, height: '300px', overflow: 'auto' }}>
                <Typography variant="h6" gutterBottom>
                  Recent Events
                </Typography>
                <Box>
                  {recentEvents.map((event, index) => (
                    <Box
                      key={event.id}
                      sx={{
                        p: 1,
                        mb: 1,
                        borderRadius: 1,
                        bgcolor: index === 0 ? theme.palette.action.selected : 'transparent',
                        border: `1px solid ${theme.palette.divider}`,
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <Typography variant="body2" fontWeight="bold">
                        {event.title}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {event.description}
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        {new Date(Date.now() - (recentEvents.length - index) * 1000).toLocaleTimeString()}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Slide>
          </Grid>
        )}

        {/* Business Metrics Summary */}
        {metrics.length > 0 && (
          <Grid item xs={12}>
            <Slide direction="up" in={metrics.length > 0} style={{ transitionDelay: '400ms' }}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Key Performance Indicators
                </Typography>
                <Grid container spacing={2}>
                  {metrics.map((metric) => (
                    <Grid item xs={12} sm={6} md={3} key={metric.id}>
                      <Box
                        sx={{
                          p: 2,
                          textAlign: 'center',
                          borderRadius: 2,
                          bgcolor: theme.palette.background.default,
                          border: `1px solid ${theme.palette.divider}`
                        }}
                      >
                        <Typography variant="h4" color="primary" fontWeight="bold">
                          {typeof metric.value === 'number' 
                            ? metric.value.toLocaleString() 
                            : metric.value}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {metric.unit}
                        </Typography>
                        <Typography variant="subtitle2" sx={{ mt: 1 }}>
                          {metric.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {metric.description}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Slide>
          </Grid>
        )}
      </Grid>

      {/* Demo Instructions */}
      {!currentSession && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary" paragraph>
            Select a demonstration scenario above to begin. Each demo showcases different aspects 
            of ACSO's agentic AI capabilities, from autonomous threat response to intelligent 
            cost optimization.
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Watch as AI agents coordinate in real-time, make intelligent decisions, and deliver 
            measurable business value - all without human intervention.
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default DemoPage;