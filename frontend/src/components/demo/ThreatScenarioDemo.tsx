/**
 * Threat Scenario Demo
 * 
 * Comprehensive demonstration of autonomous threat response capabilities
 * combining network topology, threat monitoring, and agent coordination.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Tooltip,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  LinearProgress,
  Fade,
  Slide
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Stop,
  Refresh,
  Security,
  Warning,
  CheckCircle,
  Timeline,
  Visibility,
  Settings,
  Speed,
  Assessment
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  networkTopologyGenerator,
  threatScenarioGenerator,
  NetworkNode,
  NetworkConnection,
  ThreatScenario,
  ThreatEvent,
  ThreatIndicator,
  ThreatType,
  BusinessImpact
} from '../../services/threatScenarioGenerator';
import NetworkTopologyVisualization from './NetworkTopologyVisualization';
import ThreatMonitoringDashboard from './ThreatMonitoringDashboard';
import { AgentStatus, AgentMessage, AgentDecision } from '../../types/demo';
import { agentSimulator } from '../../services/agentSimulator';
import { demoOrchestrator } from '../../services/demoOrchestrator';

interface ThreatScenarioDemoProps {
  onComplete?: (results: DemoResults) => void;
}

interface DemoResults {
  scenarioId: string;
  duration: number;
  threatsDetected: number;
  threatsBlocked: number;
  responseTime: number;
  businessImpactPrevented: BusinessImpact;
  agentEffectiveness: number;
}

interface DemoState {
  isRunning: boolean;
  isPaused: boolean;
  currentPhase: number;
  progress: number;
  startTime?: Date;
  elapsedTime: number;
}

const ThreatScenarioDemo: React.FC<ThreatScenarioDemoProps> = ({
  onComplete
}) => {
  const theme = useTheme();
  
  // Demo state
  const [demoState, setDemoState] = useState<DemoState>({
    isRunning: false,
    isPaused: false,
    currentPhase: 0,
    progress: 0,
    elapsedTime: 0
  });

  // Network and threat data
  const [networkData, setNetworkData] = useState<{
    nodes: NetworkNode[];
    connections: NetworkConnection[];
  }>({ nodes: [], connections: [] });
  
  const [threatData, setThreatData] = useState<{
    scenarios: ThreatScenario[];
    events: ThreatEvent[];
    indicators: ThreatIndicator[];
  }>({ scenarios: [], events: [], indicators: [] });

  // Agent data
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [decisions, setDecisions] = useState<AgentDecision[]>([]);

  // Demo configuration
  const [selectedThreatType, setSelectedThreatType] = useState<ThreatType>('apt');
  const [networkSize, setNetworkSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [demoSpeed, setDemoSpeed] = useState<number>(1.0);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedThreat, setSelectedThreat] = useState<ThreatScenario | null>(null);

  // Initialize demo data
  useEffect(() => {
    initializeDemo();
  }, [networkSize]);

  // Demo timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (demoState.isRunning && !demoState.isPaused) {
      interval = setInterval(() => {
        setDemoState(prev => ({
          ...prev,
          elapsedTime: prev.startTime ? 
            Date.now() - prev.startTime.getTime() : 0
        }));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [demoState.isRunning, demoState.isPaused]);

  // Demo progression
  useEffect(() => {
    if (demoState.isRunning && !demoState.isPaused) {
      const progressInterval = setInterval(() => {
        updateDemoProgress();
      }, 1000 / demoSpeed);

      return () => clearInterval(progressInterval);
    }
  }, [demoState.isRunning, demoState.isPaused, demoSpeed]);

  const initializeDemo = useCallback(() => {
    // Generate network topology
    const topology = networkTopologyGenerator.generateEnterpriseNetwork(networkSize);
    setNetworkData(topology);

    // Initialize agents
    const initialAgents = agentSimulator.initializeAgents();
    setAgents(initialAgents);

    // Clear previous data
    setThreatData({ scenarios: [], events: [], indicators: [] });
    setMessages([]);
    setDecisions([]);
    
    setDemoState({
      isRunning: false,
      isPaused: false,
      currentPhase: 0,
      progress: 0,
      elapsedTime: 0
    });
  }, [networkSize]);

  const startDemo = useCallback(() => {
    // Generate threat scenario
    const scenario = threatScenarioGenerator.generateThreatScenario(
      selectedThreatType,
      networkData.nodes,
      'moderate'
    );

    // Update network nodes to reflect initial compromise
    const updatedNodes = networkData.nodes.map(node => {
      if (scenario.targetNodes.includes(node.id)) {
        return { ...node, status: 'suspicious' as const };
      }
      return node;
    });

    setNetworkData(prev => ({ ...prev, nodes: updatedNodes }));
    setThreatData(prev => ({ 
      ...prev, 
      scenarios: [scenario],
      indicators: scenario.indicators
    }));

    setDemoState({
      isRunning: true,
      isPaused: false,
      currentPhase: 0,
      progress: 0,
      startTime: new Date(),
      elapsedTime: 0
    });

    // Start agent simulation
    agentSimulator.startSimulation();
  }, [selectedThreatType, networkData.nodes]);

  const pauseDemo = useCallback(() => {
    setDemoState(prev => ({ ...prev, isPaused: !prev.isPaused }));
    
    if (demoState.isPaused) {
      agentSimulator.resumeSimulation();
    } else {
      agentSimulator.pauseSimulation();
    }
  }, [demoState.isPaused]);

  const stopDemo = useCallback(() => {
    setDemoState({
      isRunning: false,
      isPaused: false,
      currentPhase: 0,
      progress: 0,
      elapsedTime: 0
    });

    agentSimulator.stopSimulation();
    
    // Calculate results
    if (onComplete && threatData.scenarios.length > 0) {
      const results: DemoResults = {
        scenarioId: threatData.scenarios[0].id,
        duration: demoState.elapsedTime,
        threatsDetected: threatData.events.filter(e => e.type === 'detection').length,
        threatsBlocked: threatData.events.filter(e => e.type === 'containment').length,
        responseTime: Math.random() * 300 + 60, // Simulated response time
        businessImpactPrevented: threatData.scenarios[0].businessImpact,
        agentEffectiveness: Math.random() * 0.3 + 0.7 // 70-100%
      };
      onComplete(results);
    }
  }, [demoState.elapsedTime, threatData, onComplete]);

  const updateDemoProgress = useCallback(() => {
    if (threatData.scenarios.length === 0) return;

    const scenario = threatData.scenarios[0];
    const totalDuration = scenario.duration * 60 * 1000; // Convert to milliseconds
    const elapsed = demoState.elapsedTime;
    const progress = Math.min(100, (elapsed / totalDuration) * 100);

    // Calculate current phase
    const phaseProgress = (elapsed / totalDuration) * scenario.phases.length;
    const currentPhase = Math.floor(phaseProgress);

    setDemoState(prev => ({
      ...prev,
      progress,
      currentPhase
    }));

    // Simulate threat progression
    if (currentPhase < scenario.phases.length) {
      const phase = scenario.phases[currentPhase];
      
      // Generate events for current phase
      if (Math.random() < 0.3) { // 30% chance per update
        const newEvent: ThreatEvent = {
          id: `event-${Date.now()}`,
          timestamp: new Date(),
          type: Math.random() < 0.7 ? 'detection' : 'action',
          description: `${phase.name}: ${phase.description}`,
          nodeId: scenario.targetNodes[Math.floor(Math.random() * scenario.targetNodes.length)],
          severity: scenario.severity,
          confidence: Math.random() * 0.3 + 0.7,
          evidence: [`Phase: ${phase.name}`, `Technique: ${phase.actions[0]?.technique || 'Unknown'}`]
        };

        setThreatData(prev => ({
          ...prev,
          events: [...prev.events, newEvent].slice(-50) // Keep last 50 events
        }));
      }

      // Update agent responses
      const updatedAgents = agents.map(agent => {
        if (agent.type === 'threat-hunter' || agent.type === 'incident-response') {
          return {
            ...agent,
            status: 'active' as const,
            workload: Math.min(100, agent.workload + Math.random() * 10),
            performance: {
              ...agent.performance,
              tasksCompleted: agent.performance.tasksCompleted + (Math.random() < 0.2 ? 1 : 0)
            }
          };
        }
        return agent;
      });

      setAgents(updatedAgents);

      // Generate agent messages
      if (Math.random() < 0.4) { // 40% chance
        const newMessage: AgentMessage = {
          id: `msg-${Date.now()}`,
          fromAgent: 'threat-hunter-1',
          toAgent: 'supervisor-1',
          type: 'alert',
          priority: scenario.severity === 'critical' ? 'critical' : 'high',
          content: `Threat detected in phase: ${phase.name}`,
          timestamp: new Date(),
          metadata: {
            phase: phase.name,
            confidence: Math.random() * 0.3 + 0.7
          }
        };

        setMessages(prev => [...prev, newMessage].slice(-20));
      }

      // Update compromised nodes
      if (Math.random() < 0.1 && currentPhase > 1) { // 10% chance after initial phase
        const targetNodeId = scenario.targetNodes[Math.floor(Math.random() * scenario.targetNodes.length)];
        setNetworkData(prev => ({
          ...prev,
          nodes: prev.nodes.map(node => 
            node.id === targetNodeId ? 
              { ...node, status: 'compromised' as const } : 
              node
          )
        }));
      }
    }

    // Complete demo when progress reaches 100%
    if (progress >= 100) {
      stopDemo();
    }
  }, [threatData.scenarios, demoState.elapsedTime, agents, stopDemo]);

  const handleThreatAction = useCallback((threatId: string, action: 'investigate' | 'contain' | 'mitigate') => {
    // Simulate agent response to threat action
    const responseEvent: ThreatEvent = {
      id: `response-${Date.now()}`,
      timestamp: new Date(),
      type: action === 'investigate' ? 'detection' : 
            action === 'contain' ? 'containment' : 'mitigation',
      description: `Agent initiated ${action} action for threat ${threatId}`,
      severity: 'medium',
      confidence: 0.9,
      evidence: [`Action: ${action}`, `Threat ID: ${threatId}`],
      response: `Automated ${action} procedure initiated`
    };

    setThreatData(prev => ({
      ...prev,
      events: [...prev.events, responseEvent]
    }));

    // Update agent status
    setAgents(prev => prev.map(agent => {
      if (agent.type === 'incident-response') {
        return {
          ...agent,
          status: 'active' as const,
          workload: Math.min(100, agent.workload + 20)
        };
      }
      return agent;
    }));
  }, []);

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getCurrentPhaseInfo = () => {
    if (threatData.scenarios.length === 0) return null;
    
    const scenario = threatData.scenarios[0];
    const phase = scenario.phases[demoState.currentPhase];
    
    return {
      name: phase?.name || 'Initialization',
      description: phase?.description || 'Preparing threat scenario',
      totalPhases: scenario.phases.length
    };
  };

  const phaseInfo = getCurrentPhaseInfo();

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Demo Control Header */}
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Security />
              Autonomous Threat Response Demo
            </Typography>
            
            {phaseInfo && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  Phase {demoState.currentPhase + 1} of {phaseInfo.totalPhases}: {phaseInfo.name}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={demoState.progress} 
                  sx={{ mt: 1, height: 8, borderRadius: 4 }}
                />
              </Box>
            )}
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {/* Demo Configuration */}
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Threat Type</InputLabel>
                <Select
                  value={selectedThreatType}
                  label="Threat Type"
                  onChange={(e) => setSelectedThreatType(e.target.value as ThreatType)}
                  disabled={demoState.isRunning}
                >
                  <MenuItem value="apt">APT Campaign</MenuItem>
                  <MenuItem value="ransomware">Ransomware</MenuItem>
                  <MenuItem value="malware">Malware</MenuItem>
                  <MenuItem value="phishing">Phishing</MenuItem>
                  <MenuItem value="ddos">DDoS Attack</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Network</InputLabel>
                <Select
                  value={networkSize}
                  label="Network"
                  onChange={(e) => setNetworkSize(e.target.value as typeof networkSize)}
                  disabled={demoState.isRunning}
                >
                  <MenuItem value="small">Small</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="large">Large</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Speed</InputLabel>
                <Select
                  value={demoSpeed}
                  label="Speed"
                  onChange={(e) => setDemoSpeed(e.target.value as number)}
                >
                  <MenuItem value={0.5}>0.5x</MenuItem>
                  <MenuItem value={1.0}>1x</MenuItem>
                  <MenuItem value={2.0}>2x</MenuItem>
                  <MenuItem value={5.0}>5x</MenuItem>
                </Select>
              </FormControl>

              {/* Demo Controls */}
              {!demoState.isRunning ? (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PlayArrow />}
                  onClick={startDemo}
                >
                  Start Demo
                </Button>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    color={demoState.isPaused ? 'primary' : 'warning'}
                    startIcon={demoState.isPaused ? <PlayArrow /> : <Pause />}
                    onClick={pauseDemo}
                  >
                    {demoState.isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Stop />}
                    onClick={stopDemo}
                  >
                    Stop
                  </Button>
                </>
              )}

              <Chip
                label={formatTime(demoState.elapsedTime)}
                color={demoState.isRunning ? 'primary' : 'default'}
                icon={<Timeline />}
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Demo Content */}
      <Grid container spacing={2} sx={{ flex: 1, overflow: 'hidden' }}>
        {/* Network Topology */}
        <Grid item xs={12} lg={6}>
          <NetworkTopologyVisualization
            nodes={networkData.nodes}
            connections={networkData.connections}
            threats={threatData.scenarios}
            events={threatData.events}
            isRunning={demoState.isRunning && !demoState.isPaused}
            height={600}
            onNodeClick={(node) => console.log('Node clicked:', node)}
            onThreatClick={(threat) => {
              setSelectedThreat(threat);
              setShowDetailsDialog(true);
            }}
          />
        </Grid>

        {/* Threat Monitoring */}
        <Grid item xs={12} lg={6}>
          <ThreatMonitoringDashboard
            threats={threatData.scenarios}
            events={threatData.events}
            indicators={threatData.indicators}
            nodes={networkData.nodes}
            isRunning={demoState.isRunning && !demoState.isPaused}
            onThreatAction={handleThreatAction}
            onEventClick={(event) => console.log('Event clicked:', event)}
          />
        </Grid>
      </Grid>

      {/* Threat Details Dialog */}
      <Dialog
        open={showDetailsDialog}
        onClose={() => setShowDetailsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Threat Scenario Details
        </DialogTitle>
        <DialogContent>
          {selectedThreat && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedThreat.name}
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedThreat.description}
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Severity</Typography>
                  <Chip 
                    label={selectedThreat.severity} 
                    color={
                      selectedThreat.severity === 'critical' ? 'error' :
                      selectedThreat.severity === 'high' ? 'warning' : 'info'
                    }
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Duration</Typography>
                  <Typography variant="body2">{selectedThreat.duration} minutes</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Target Nodes</Typography>
                  <Typography variant="body2">{selectedThreat.targetNodes.length} systems</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Financial Impact</Typography>
                  <Typography variant="body2">
                    ${selectedThreat.businessImpact.financialLoss.toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>

              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                Attack Phases
              </Typography>
              <Stepper orientation="vertical">
                {selectedThreat.phases.map((phase, index) => (
                  <Step key={phase.id} active={index === demoState.currentPhase}>
                    <StepLabel>{phase.name}</StepLabel>
                    <StepContent>
                      <Typography variant="body2">
                        {phase.description}
                      </Typography>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailsDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ThreatScenarioDemo;