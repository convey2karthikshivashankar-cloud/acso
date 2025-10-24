/**
 * Threat Hunter Agent Component
 * 
 * Interactive demonstration of autonomous threat hunting capabilities
 * with proactive scanning, pattern recognition, and threat analysis.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Badge,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Search,
  Security,
  Warning,
  Error,
  CheckCircle,
  Timeline,
  Assessment,
  BugReport,
  Visibility,
  PlayArrow,
  Pause,
  Stop,
  Refresh,
  TrendingUp,
  NetworkCheck,
  Computer,
  Storage,
  Shield,
  Psychology,
  AutoFixHigh,
  ExpandMore,
  Speed,
  Analytics
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  threatDetectionEngine,
  ThreatDetection,
  DetectionRule,
  BehavioralProfile,
  MLModel
} from '../../services/threatDetectionEngine';
import {
  NetworkNode,
  NetworkTraffic,
  ThreatSeverity
} from '../../services/threatScenarioGenerator';
import { AgentStatus } from '../../types/demo';

interface ThreatHunterAgentProps {
  agent: AgentStatus;
  nodes: NetworkNode[];
  traffic: NetworkTraffic[];
  isRunning?: boolean;
  onThreatFound?: (detection: ThreatDetection) => void;
  onInvestigationComplete?: (results: InvestigationResults) => void;
}

interface HuntingSession {
  id: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  targets: string[]; // Node IDs
  huntingRules: string[]; // Rule IDs
  detections: ThreatDetection[];
  progress: number; // 0-100
  currentPhase: HuntingPhase;
}

interface HuntingPhase {
  name: string;
  description: string;
  progress: number;
  startTime: Date;
  estimatedDuration: number; // seconds
  activities: HuntingActivity[];
}

interface HuntingActivity {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  results?: any;
}

interface InvestigationResults {
  sessionId: string;
  threatsFound: number;
  falsePositives: number;
  coveragePercentage: number;
  timeToDetection: number; // average in seconds
  confidence: number; // 0-1
  recommendations: string[];
  artifacts: string[];
}

interface ThreatHuntingMetrics {
  sessionsCompleted: number;
  threatsDetected: number;
  averageDetectionTime: number;
  falsePositiveRate: number;
  coverageScore: number;
  efficiency: number;
}

const ThreatHunterAgent: React.FC<ThreatHunterAgentProps> = ({
  agent,
  nodes,
  traffic,
  isRunning = false,
  onThreatFound,
  onInvestigationComplete
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [currentSession, setCurrentSession] = useState<HuntingSession | null>(null);
  const [sessionHistory, setSessionHistory] = useState<HuntingSession[]>([]);
  const [detections, setDetections] = useState<ThreatDetection[]>([]);
  const [selectedDetection, setSelectedDetection] = useState<ThreatDetection | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [huntingMetrics, setHuntingMetrics] = useState<ThreatHuntingMetrics>({
    sessionsCompleted: 0,
    threatsDetected: 0,
    averageDetectionTime: 0,
    falsePositiveRate: 0,
    coverageScore: 0,
    efficiency: 0
  });

  // Initialize threat detection engine
  useEffect(() => {
    threatDetectionEngine.start();
    return () => threatDetectionEngine.stop();
  }, []);

  // Run continuous threat hunting when active
  useEffect(() => {
    if (isRunning && currentSession?.status === 'active') {
      const huntingInterval = setInterval(() => {
        runThreatHunting();
      }, 5000); // Hunt every 5 seconds

      return () => clearInterval(huntingInterval);
    }
  }, [isRunning, currentSession]);

  // Update metrics periodically
  useEffect(() => {
    const metricsInterval = setInterval(() => {
      updateHuntingMetrics();
    }, 10000); // Update every 10 seconds

    return () => clearInterval(metricsInterval);
  }, [sessionHistory, detections]);

  const runThreatHunting = useCallback(() => {
    if (!currentSession || currentSession.status !== 'active') return;

    // Analyze each target node
    const newDetections: ThreatDetection[] = [];
    
    currentSession.targets.forEach(nodeId => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      const nodeTraffic = traffic.filter(t => 
        t.sourceIp === node.ipAddress || t.targetIp === node.ipAddress
      );

      const nodeDetections = threatDetectionEngine.analyzeNode(node, nodeTraffic);
      newDetections.push(...nodeDetections);
    });

    if (newDetections.length > 0) {
      setDetections(prev => [...prev, ...newDetections]);
      newDetections.forEach(detection => {
        onThreatFound?.(detection);
      });
    }

    // Update session progress
    setCurrentSession(prev => {
      if (!prev) return prev;
      
      const newProgress = Math.min(100, prev.progress + Math.random() * 5);
      const updatedSession = { ...prev, progress: newProgress };
      
      // Complete session if progress reaches 100%
      if (newProgress >= 100) {
        updatedSession.status = 'completed';
        updatedSession.endTime = new Date();
        
        // Generate investigation results
        const results: InvestigationResults = {
          sessionId: prev.id,
          threatsFound: prev.detections.length,
          falsePositives: Math.floor(prev.detections.length * 0.1), // 10% false positive rate
          coveragePercentage: newProgress,
          timeToDetection: Math.random() * 300 + 60, // 1-5 minutes
          confidence: Math.random() * 0.3 + 0.7, // 70-100%
          recommendations: generateRecommendations(prev.detections),
          artifacts: generateArtifacts(prev.detections)
        };
        
        onInvestigationComplete?.(results);
      }
      
      return updatedSession;
    });
  }, [currentSession, nodes, traffic, onThreatFound, onInvestigationComplete]);

  const startHuntingSession = useCallback(() => {
    const session: HuntingSession = {
      id: `hunt-${Date.now()}`,
      name: `Threat Hunt ${new Date().toLocaleTimeString()}`,
      startTime: new Date(),
      status: 'active',
      targets: nodes.slice(0, Math.min(5, nodes.length)).map(n => n.id), // Hunt first 5 nodes
      huntingRules: threatDetectionEngine.getDetectionRules().map(r => r.id),
      detections: [],
      progress: 0,
      currentPhase: {
        name: 'Reconnaissance',
        description: 'Gathering baseline information and identifying potential targets',
        progress: 0,
        startTime: new Date(),
        estimatedDuration: 300, // 5 minutes
        activities: [
          {
            id: 'recon-1',
            name: 'Network Discovery',
            description: 'Scanning network topology and identifying active nodes',
            status: 'active'
          },
          {
            id: 'recon-2',
            name: 'Baseline Analysis',
            description: 'Analyzing normal behavior patterns',
            status: 'pending'
          },
          {
            id: 'recon-3',
            name: 'Vulnerability Assessment',
            description: 'Identifying potential security weaknesses',
            status: 'pending'
          }
        ]
      }
    };

    setCurrentSession(session);
    setDetections([]);
  }, [nodes]);

  const pauseHuntingSession = useCallback(() => {
    setCurrentSession(prev => 
      prev ? { ...prev, status: prev.status === 'paused' ? 'active' : 'paused' } : prev
    );
  }, []);

  const stopHuntingSession = useCallback(() => {
    if (currentSession) {
      const completedSession = {
        ...currentSession,
        status: 'completed' as const,
        endTime: new Date()
      };
      
      setSessionHistory(prev => [...prev, completedSession]);
      setCurrentSession(null);
    }
  }, [currentSession]);

  const updateHuntingMetrics = useCallback(() => {
    const completedSessions = sessionHistory.filter(s => s.status === 'completed');
    const totalDetections = detections.length;
    const totalFalsePositives = Math.floor(totalDetections * 0.1);
    
    const avgDetectionTime = completedSessions.length > 0 ?
      completedSessions.reduce((sum, session) => {
        const duration = session.endTime ? 
          session.endTime.getTime() - session.startTime.getTime() : 0;
        return sum + duration;
      }, 0) / completedSessions.length / 1000 : 0;

    const coverageScore = completedSessions.length > 0 ?
      completedSessions.reduce((sum, session) => sum + session.progress, 0) / completedSessions.length : 0;

    setHuntingMetrics({
      sessionsCompleted: completedSessions.length,
      threatsDetected: totalDetections,
      averageDetectionTime: avgDetectionTime,
      falsePositiveRate: totalDetections > 0 ? totalFalsePositives / totalDetections : 0,
      coverageScore,
      efficiency: totalDetections > 0 ? (totalDetections - totalFalsePositives) / totalDetections : 0
    });
  }, [sessionHistory, detections]);

  const generateRecommendations = (detections: ThreatDetection[]): string[] => {
    const recommendations = [
      'Implement additional network monitoring',
      'Update threat detection signatures',
      'Enhance user security training',
      'Review access control policies'
    ];

    if (detections.some(d => d.severity === 'critical')) {
      recommendations.unshift('Immediate incident response required');
    }

    return recommendations;
  };

  const generateArtifacts = (detections: ThreatDetection[]): string[] => {
    return [
      'Network traffic logs',
      'Process execution logs',
      'File system changes',
      'Registry modifications',
      'Authentication events'
    ];
  };

  const getSeverityColor = (severity: ThreatSeverity): 'success' | 'warning' | 'error' | 'info' => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'info';
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const renderAgentStatus = () => (
    <Card>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
            <Psychology />
          </Avatar>
        }
        title="Threat Hunter Agent"
        subheader={`Status: ${agent.status} • Workload: ${agent.workload}%`}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={currentSession?.status || 'Idle'}
              color={
                currentSession?.status === 'active' ? 'success' :
                currentSession?.status === 'paused' ? 'warning' : 'default'
              }
              size="small"
            />
            <Chip
              label={`${huntingMetrics.threatsDetected} Threats`}
              color={huntingMetrics.threatsDetected > 0 ? 'error' : 'success'}
              size="small"
            />
          </Box>
        }
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Typography variant="body2" color="textSecondary">
              Sessions Completed
            </Typography>
            <Typography variant="h6">
              {huntingMetrics.sessionsCompleted}
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="body2" color="textSecondary">
              Avg Detection Time
            </Typography>
            <Typography variant="h6">
              {formatDuration(huntingMetrics.averageDetectionTime)}
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="body2" color="textSecondary">
              False Positive Rate
            </Typography>
            <Typography variant="h6" color={huntingMetrics.falsePositiveRate < 0.1 ? 'success.main' : 'warning.main'}>
              {Math.round(huntingMetrics.falsePositiveRate * 100)}%
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="body2" color="textSecondary">
              Efficiency Score
            </Typography>
            <Typography variant="h6" color="primary.main">
              {Math.round(huntingMetrics.efficiency * 100)}%
            </Typography>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          {!currentSession ? (
            <Button
              variant="contained"
              startIcon={<Search />}
              onClick={startHuntingSession}
              disabled={!isRunning}
            >
              Start Hunt
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                startIcon={currentSession.status === 'paused' ? <PlayArrow /> : <Pause />}
                onClick={pauseHuntingSession}
              >
                {currentSession.status === 'paused' ? 'Resume' : 'Pause'}
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Stop />}
                onClick={stopHuntingSession}
              >
                Stop
              </Button>
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  const renderCurrentSession = () => {
    if (!currentSession) {
      return (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Search sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No Active Hunting Session
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Start a new threat hunting session to begin proactive threat detection
              </Typography>
            </Box>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader
          title={currentSession.name}
          subheader={`Started: ${currentSession.startTime.toLocaleTimeString()}`}
          action={
            <Chip
              label={currentSession.status}
              color={getSeverityColor(currentSession.status === 'active' ? 'low' : 'medium')}
            />
          }
        />
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Progress: {Math.round(currentSession.progress)}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={currentSession.progress}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          <Typography variant="subtitle2" gutterBottom>
            Current Phase: {currentSession.currentPhase.name}
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            {currentSession.currentPhase.description}
          </Typography>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2">
                Hunting Activities ({currentSession.currentPhase.activities.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {currentSession.currentPhase.activities.map((activity, index) => (
                  <ListItem key={activity.id}>
                    <ListItemIcon>
                      {activity.status === 'completed' ? <CheckCircle color="success" /> :
                       activity.status === 'active' ? <AutoFixHigh color="primary" /> :
                       activity.status === 'failed' ? <Error color="error" /> :
                       <Timeline color="disabled" />}
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.name}
                      secondary={activity.description}
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={activity.status}
                        size="small"
                        color={
                          activity.status === 'completed' ? 'success' :
                          activity.status === 'active' ? 'primary' :
                          activity.status === 'failed' ? 'error' : 'default'
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Targets: {currentSession.targets.length} nodes
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {currentSession.targets.slice(0, 5).map(nodeId => {
                const node = nodes.find(n => n.id === nodeId);
                return (
                  <Chip
                    key={nodeId}
                    label={node?.name || nodeId}
                    size="small"
                    variant="outlined"
                  />
                );
              })}
              {currentSession.targets.length > 5 && (
                <Chip
                  label={`+${currentSession.targets.length - 5} more`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderDetections = () => (
    <Card>
      <CardHeader
        title="Threat Detections"
        action={
          <Badge badgeContent={detections.length} color="error">
            <BugReport />
          </Badge>
        }
      />
      <CardContent>
        {detections.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Shield sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" color="success.main" gutterBottom>
              No Threats Detected
            </Typography>
            <Typography variant="body2" color="textSecondary">
              The threat hunter is actively monitoring for suspicious activities
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Rule</TableCell>
                  <TableCell>Node</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Confidence</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detections.slice(0, 10).map((detection) => (
                  <TableRow key={detection.id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {detection.timestamp.toLocaleTimeString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {detection.ruleName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {nodes.find(n => n.id === detection.nodeId)?.name || detection.nodeId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={detection.severity}
                        size="small"
                        color={getSeverityColor(detection.severity)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={detection.confidence * 100}
                          sx={{ width: 60 }}
                        />
                        <Typography variant="body2">
                          {Math.round(detection.confidence * 100)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => {
                          setSelectedDetection(detection);
                          setDetailsDialogOpen(true);
                        }}
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );

  const renderSessionHistory = () => (
    <Card>
      <CardHeader title="Hunting Session History" />
      <CardContent>
        {sessionHistory.length === 0 ? (
          <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
            No completed sessions yet
          </Typography>
        ) : (
          <List>
            {sessionHistory.slice(-5).map((session, index) => (
              <React.Fragment key={session.id}>
                <ListItem>
                  <ListItemIcon>
                    <Timeline color={session.status === 'completed' ? 'success' : 'warning'} />
                  </ListItemIcon>
                  <ListItemText
                    primary={session.name}
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          {session.startTime.toLocaleString()} - {session.endTime?.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {session.detections.length} threats detected • {Math.round(session.progress)}% coverage
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={session.status}
                      size="small"
                      color={session.status === 'completed' ? 'success' : 'warning'}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                {index < sessionHistory.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Agent Status */}
      <Box sx={{ mb: 2 }}>
        {renderAgentStatus()}
      </Box>

      {/* Navigation Tabs */}
      <Paper elevation={1} sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Current Hunt" icon={<Search />} />
          <Tab label="Detections" icon={<BugReport />} />
          <Tab label="History" icon={<Timeline />} />
          <Tab label="Analytics" icon={<Analytics />} />
        </Tabs>
      </Paper>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 0 && renderCurrentSession()}
        {activeTab === 1 && renderDetections()}
        {activeTab === 2 && renderSessionHistory()}
        {activeTab === 3 && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Detection Rules" />
                <CardContent>
                  <Typography variant="body2" color="textSecondary">
                    {threatDetectionEngine.getDetectionRules().length} active rules
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="ML Models" />
                <CardContent>
                  <Typography variant="body2" color="textSecondary">
                    {threatDetectionEngine.getMLModels().length} models deployed
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Detection Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Threat Detection Details</DialogTitle>
        <DialogContent>
          {selectedDetection && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedDetection.ruleName}
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedDetection.description}
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Severity</Typography>
                  <Chip label={selectedDetection.severity} color={getSeverityColor(selectedDetection.severity)} />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Confidence</Typography>
                  <Typography variant="body2">{Math.round(selectedDetection.confidence * 100)}%</Typography>
                </Grid>
              </Grid>

              <Typography variant="subtitle2" gutterBottom>
                Evidence ({selectedDetection.evidence.length})
              </Typography>
              <List dense>
                {selectedDetection.evidence.map((evidence, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={evidence.description}
                      secondary={`Type: ${evidence.type} • Relevance: ${Math.round(evidence.relevance * 100)}%`}
                    />
                  </ListItem>
                ))}
              </List>

              <Typography variant="subtitle2" gutterBottom>
                Recommendations
              </Typography>
              <List dense>
                {selectedDetection.recommendations.map((rec, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={rec} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ThreatHunterAgent;