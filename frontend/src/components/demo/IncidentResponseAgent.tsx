/**
 * Incident Response Agent Component
 * 
 * Demonstrates autonomous incident response capabilities with automated
 * containment, investigation, and remediation workflows.
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
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/material';
import {
  Security,
  Warning,
  Error,
  CheckCircle,
  Block,
  Assessment,
  Speed,
  PlayArrow,
  Pause,
  Stop,
  Refresh,
  Shield,
  AutoFixHigh,
  Healing,
  Investigation,
  Lock,
  Visibility,
  Report,
  Timeline as TimelineIcon,
  Emergency
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  ThreatDetection,
  ThreatSeverity
} from '../../services/threatDetectionEngine';
import {
  NetworkNode,
  ThreatEvent,
  BusinessImpact
} from '../../services/threatScenarioGenerator';
import { AgentStatus } from '../../types/demo';

interface IncidentResponseAgentProps {
  agent: AgentStatus;
  incidents: Incident[];
  nodes: NetworkNode[];
  isRunning?: boolean;
  onIncidentResolved?: (incident: Incident, resolution: IncidentResolution) => void;
  onContainmentAction?: (action: ContainmentAction) => void;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: ThreatSeverity;
  status: IncidentStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  affectedNodes: string[];
  detections: ThreatDetection[];
  timeline: IncidentTimelineEvent[];
  containmentActions: ContainmentAction[];
  investigationFindings: InvestigationFinding[];
  businessImpact: BusinessImpact;
  estimatedResolutionTime: number; // minutes
  actualResolutionTime?: number; // minutes
}

type IncidentStatus = 
  | 'new' 
  | 'acknowledged' 
  | 'investigating' 
  | 'containing' 
  | 'remediating' 
  | 'resolved' 
  | 'closed';

interface IncidentTimelineEvent {
  id: string;
  timestamp: Date;
  type: 'detection' | 'escalation' | 'containment' | 'investigation' | 'remediation' | 'resolution';
  description: string;
  actor: 'system' | 'agent' | 'human';
  details?: any;
}

interface ContainmentAction {
  id: string;
  type: 'isolate_node' | 'block_traffic' | 'disable_account' | 'quarantine_file' | 'kill_process' | 'patch_vulnerability';
  description: string;
  targetNodeId?: string;
  targetResource?: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  effectiveness: number; // 0-1
  sideEffects: string[];
  rollbackPossible: boolean;
}

interface InvestigationFinding {
  id: string;
  type: 'evidence' | 'indicator' | 'artifact' | 'correlation';
  description: string;
  confidence: number; // 0-1
  source: string;
  timestamp: Date;
  data: any;
  relevance: 'high' | 'medium' | 'low';
}

interface IncidentResolution {
  incidentId: string;
  resolutionType: 'automated' | 'manual' | 'escalated';
  resolutionTime: number; // minutes
  actionsPerformed: string[];
  lessonsLearned: string[];
  preventiveMeasures: string[];
  effectiveness: number; // 0-1
}

interface ResponseMetrics {
  totalIncidents: number;
  resolvedIncidents: number;
  averageResponseTime: number; // minutes
  averageResolutionTime: number; // minutes
  containmentEffectiveness: number; // 0-1
  automationRate: number; // 0-1
  falsePositiveRate: number; // 0-1
}

const IncidentResponseAgent: React.FC<IncidentResponseAgentProps> = ({
  agent,
  incidents,
  nodes,
  isRunning = false,
  onIncidentResolved,
  onContainmentAction
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [responseMetrics, setResponseMetrics] = useState<ResponseMetrics>({
    totalIncidents: 0,
    resolvedIncidents: 0,
    averageResponseTime: 0,
    averageResolutionTime: 0,
    containmentEffectiveness: 0,
    automationRate: 0,
    falsePositiveRate: 0
  });

  // Simulate incident response activities
  useEffect(() => {
    if (isRunning) {
      const responseInterval = setInterval(() => {
        processIncidents();
      }, 3000); // Process every 3 seconds

      return () => clearInterval(responseInterval);
    }
  }, [isRunning, incidents]);

  // Update metrics periodically
  useEffect(() => {
    updateResponseMetrics();
  }, [incidents]);

  const processIncidents = useCallback(() => {
    incidents.forEach(incident => {
      if (incident.status === 'new') {
        // Auto-acknowledge new incidents
        acknowledgeIncident(incident);
      } else if (incident.status === 'acknowledged') {
        // Start investigation
        startInvestigation(incident);
      } else if (incident.status === 'investigating') {
        // Perform containment if needed
        if (incident.severity === 'critical' || incident.severity === 'high') {
          performContainment(incident);
        }
      } else if (incident.status === 'containing') {
        // Start remediation
        startRemediation(incident);
      } else if (incident.status === 'remediating') {
        // Check if ready to resolve
        if (Math.random() > 0.7) { // 30% chance to resolve
          resolveIncident(incident);
        }
      }
    });
  }, [incidents]);

  const acknowledgeIncident = (incident: Incident) => {
    const timelineEvent: IncidentTimelineEvent = {
      id: `event-${Date.now()}`,
      timestamp: new Date(),
      type: 'escalation',
      description: 'Incident automatically acknowledged by IR Agent',
      actor: 'agent'
    };

    // Update incident status (simulated)
    console.log(`Acknowledging incident: ${incident.title}`);
  };

  const startInvestigation = (incident: Incident) => {
    const findings: InvestigationFinding[] = [
      {
        id: `finding-${Date.now()}-1`,
        type: 'evidence',
        description: 'Suspicious network traffic detected',
        confidence: 0.85,
        source: 'Network Monitor',
        timestamp: new Date(),
        data: { bytes: 1024000, connections: 15 },
        relevance: 'high'
      },
      {
        id: `finding-${Date.now()}-2`,
        type: 'indicator',
        description: 'Known malicious IP address contacted',
        confidence: 0.92,
        source: 'Threat Intelligence',
        timestamp: new Date(),
        data: { ip: '192.168.1.100', reputation: 'malicious' },
        relevance: 'high'
      }
    ];

    console.log(`Starting investigation for incident: ${incident.title}`);
  };

  const performContainment = (incident: Incident) => {
    const containmentActions: ContainmentAction[] = [
      {
        id: `action-${Date.now()}-1`,
        type: 'isolate_node',
        description: `Isolating compromised node ${incident.affectedNodes[0]}`,
        targetNodeId: incident.affectedNodes[0],
        status: 'executing',
        startTime: new Date(),
        effectiveness: 0.9,
        sideEffects: ['Network connectivity lost', 'User productivity impact'],
        rollbackPossible: true
      },
      {
        id: `action-${Date.now()}-2`,
        type: 'block_traffic',
        description: 'Blocking malicious network traffic',
        status: 'executing',
        startTime: new Date(),
        effectiveness: 0.85,
        sideEffects: ['Some legitimate traffic may be blocked'],
        rollbackPossible: true
      }
    ];

    containmentActions.forEach(action => {
      onContainmentAction?.(action);
    });

    console.log(`Performing containment for incident: ${incident.title}`);
  };

  const startRemediation = (incident: Incident) => {
    const remediationActions = [
      'Applying security patches',
      'Updating antivirus signatures',
      'Resetting compromised credentials',
      'Restoring from clean backup'
    ];

    console.log(`Starting remediation for incident: ${incident.title}`);
  };

  const resolveIncident = (incident: Incident) => {
    const resolution: IncidentResolution = {
      incidentId: incident.id,
      resolutionType: 'automated',
      resolutionTime: Math.random() * 120 + 30, // 30-150 minutes
      actionsPerformed: [
        'Isolated affected systems',
        'Blocked malicious traffic',
        'Applied security patches',
        'Verified system integrity'
      ],
      lessonsLearned: [
        'Faster detection needed for this threat type',
        'Additional monitoring required for critical systems'
      ],
      preventiveMeasures: [
        'Update detection signatures',
        'Enhance network segmentation',
        'Implement additional access controls'
      ],
      effectiveness: Math.random() * 0.3 + 0.7 // 70-100%
    };

    onIncidentResolved?.(incident, resolution);
    console.log(`Resolved incident: ${incident.title}`);
  };

  const updateResponseMetrics = useCallback(() => {
    const total = incidents.length;
    const resolved = incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length;
    
    const responseTimes = incidents
      .filter(i => i.timeline.length > 0)
      .map(i => {
        const firstResponse = i.timeline.find(e => e.type === 'escalation');
        return firstResponse ? 
          (firstResponse.timestamp.getTime() - i.createdAt.getTime()) / (1000 * 60) : 0;
      });

    const resolutionTimes = incidents
      .filter(i => i.actualResolutionTime)
      .map(i => i.actualResolutionTime!);

    const avgResponseTime = responseTimes.length > 0 ?
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;

    const avgResolutionTime = resolutionTimes.length > 0 ?
      resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length : 0;

    const containmentActions = incidents.flatMap(i => i.containmentActions);
    const containmentEffectiveness = containmentActions.length > 0 ?
      containmentActions.reduce((sum, action) => sum + action.effectiveness, 0) / containmentActions.length : 0;

    setResponseMetrics({
      totalIncidents: total,
      resolvedIncidents: resolved,
      averageResponseTime: avgResponseTime,
      averageResolutionTime: avgResolutionTime,
      containmentEffectiveness,
      automationRate: total > 0 ? resolved / total : 0,
      falsePositiveRate: Math.random() * 0.1 // Simulated 0-10%
    });
  }, [incidents]);

  const getStatusColor = (status: IncidentStatus): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'new': return 'error';
      case 'acknowledged': return 'warning';
      case 'investigating': return 'info';
      case 'containing': return 'warning';
      case 'remediating': return 'primary';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
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

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const renderAgentStatus = () => (
    <Card>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: theme.palette.error.main }}>
            <Emergency />
          </Avatar>
        }
        title="Incident Response Agent"
        subheader={`Status: ${agent.status} • Workload: ${agent.workload}%`}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={`${responseMetrics.totalIncidents} Incidents`}
              color={responseMetrics.totalIncidents > 0 ? 'error' : 'success'}
              size="small"
            />
            <Chip
              label={`${Math.round(responseMetrics.automationRate * 100)}% Automated`}
              color="primary"
              size="small"
            />
          </Box>
        }
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Typography variant="body2" color="textSecondary">
              Active Incidents
            </Typography>
            <Typography variant="h6" color="error.main">
              {incidents.filter(i => !['resolved', 'closed'].includes(i.status)).length}
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="body2" color="textSecondary">
              Avg Response Time
            </Typography>
            <Typography variant="h6">
              {formatDuration(responseMetrics.averageResponseTime)}
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="body2" color="textSecondary">
              Containment Rate
            </Typography>
            <Typography variant="h6" color="success.main">
              {Math.round(responseMetrics.containmentEffectiveness * 100)}%
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="body2" color="textSecondary">
              Resolution Time
            </Typography>
            <Typography variant="h6">
              {formatDuration(responseMetrics.averageResolutionTime)}
            </Typography>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Agent Capabilities
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label="Auto-Containment" size="small" color="primary" />
            <Chip label="Threat Investigation" size="small" color="primary" />
            <Chip label="Evidence Collection" size="small" color="primary" />
            <Chip label="Automated Remediation" size="small" color="primary" />
            <Chip label="Impact Assessment" size="small" color="primary" />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const renderActiveIncidents = () => (
    <Card>
      <CardHeader
        title="Active Incidents"
        action={
          <Badge badgeContent={incidents.filter(i => !['resolved', 'closed'].includes(i.status)).length} color="error">
            <Emergency />
          </Badge>
        }
      />
      <CardContent>
        {incidents.filter(i => !['resolved', 'closed'].includes(i.status)).length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Shield sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" color="success.main" gutterBottom>
              No Active Incidents
            </Typography>
            <Typography variant="body2" color="textSecondary">
              All incidents have been resolved or are under control
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Incident</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Affected Nodes</TableCell>
                  <TableCell>Age</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {incidents
                  .filter(i => !['resolved', 'closed'].includes(i.status))
                  .slice(0, 10)
                  .map((incident) => (
                    <TableRow key={incident.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {incident.title}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {incident.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={incident.severity}
                          size="small"
                          color={getSeverityColor(incident.severity)}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={incident.status}
                          size="small"
                          color={getStatusColor(incident.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {incident.affectedNodes.length} nodes
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDuration((Date.now() - incident.createdAt.getTime()) / (1000 * 60))}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => {
                            setSelectedIncident(incident);
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

  const renderIncidentHistory = () => (
    <Card>
      <CardHeader title="Incident History" />
      <CardContent>
        <List>
          {incidents.slice(-10).map((incident, index) => (
            <React.Fragment key={incident.id}>
              <ListItem>
                <ListItemIcon>
                  {incident.status === 'resolved' || incident.status === 'closed' ? 
                    <CheckCircle color="success" /> : 
                    <Warning color="warning" />}
                </ListItemIcon>
                <ListItemText
                  primary={incident.title}
                  secondary={
                    <Box>
                      <Typography variant="caption" display="block">
                        {incident.createdAt.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {incident.affectedNodes.length} nodes affected • 
                        {incident.detections.length} detections • 
                        {incident.containmentActions.length} actions taken
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                    <Chip
                      label={incident.severity}
                      size="small"
                      color={getSeverityColor(incident.severity)}
                    />
                    <Chip
                      label={incident.status}
                      size="small"
                      color={getStatusColor(incident.status)}
                    />
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
              {index < incidents.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </CardContent>
    </Card>
  );

  const renderResponseMetrics = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Response Performance" />
          <CardContent>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Average Response Time
              </Typography>
              <Typography variant="h4" color="primary.main">
                {formatDuration(responseMetrics.averageResponseTime)}
              </Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Average Resolution Time
              </Typography>
              <Typography variant="h4" color="success.main">
                {formatDuration(responseMetrics.averageResolutionTime)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">
                Automation Rate
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={responseMetrics.automationRate * 100}
                  sx={{ flex: 1, height: 8 }}
                />
                <Typography variant="body2">
                  {Math.round(responseMetrics.automationRate * 100)}%
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Containment Effectiveness" />
          <CardContent>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Containment Success Rate
              </Typography>
              <Typography variant="h4" color="success.main">
                {Math.round(responseMetrics.containmentEffectiveness * 100)}%
              </Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                False Positive Rate
              </Typography>
              <Typography variant="h4" color={responseMetrics.falsePositiveRate < 0.1 ? 'success.main' : 'warning.main'}>
                {Math.round(responseMetrics.falsePositiveRate * 100)}%
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">
                Total Incidents Handled
              </Typography>
              <Typography variant="h4" color="info.main">
                {responseMetrics.totalIncidents}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
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
          <Tab label="Active Incidents" icon={<Emergency />} />
          <Tab label="History" icon={<TimelineIcon />} />
          <Tab label="Metrics" icon={<Assessment />} />
        </Tabs>
      </Paper>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 0 && renderActiveIncidents()}
        {activeTab === 1 && renderIncidentHistory()}
        {activeTab === 2 && renderResponseMetrics()}
      </Box>

      {/* Incident Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Incident Details</DialogTitle>
        <DialogContent>
          {selectedIncident && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedIncident.title}
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedIncident.description}
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={3}>
                  <Typography variant="subtitle2">Severity</Typography>
                  <Chip label={selectedIncident.severity} color={getSeverityColor(selectedIncident.severity)} />
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="subtitle2">Status</Typography>
                  <Chip label={selectedIncident.status} color={getStatusColor(selectedIncident.status)} />
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="subtitle2">Priority</Typography>
                  <Chip label={selectedIncident.priority} />
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="subtitle2">Affected Nodes</Typography>
                  <Typography variant="body2">{selectedIncident.affectedNodes.length}</Typography>
                </Grid>
              </Grid>

              <Typography variant="subtitle2" gutterBottom>
                Containment Actions ({selectedIncident.containmentActions.length})
              </Typography>
              <List dense>
                {selectedIncident.containmentActions.map((action) => (
                  <ListItem key={action.id}>
                    <ListItemIcon>
                      {action.status === 'completed' ? <CheckCircle color="success" /> :
                       action.status === 'executing' ? <AutoFixHigh color="primary" /> :
                       action.status === 'failed' ? <Error color="error" /> :
                       <Block color="disabled" />}
                    </ListItemIcon>
                    <ListItemText
                      primary={action.description}
                      secondary={`Type: ${action.type} • Effectiveness: ${Math.round(action.effectiveness * 100)}%`}
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={action.status}
                        size="small"
                        color={
                          action.status === 'completed' ? 'success' :
                          action.status === 'executing' ? 'primary' :
                          action.status === 'failed' ? 'error' : 'default'
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Business Impact
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Financial Loss
                  </Typography>
                  <Typography variant="body1">
                    ${selectedIncident.businessImpact.financialLoss.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Downtime
                  </Typography>
                  <Typography variant="body1">
                    {formatDuration(selectedIncident.businessImpact.downtime)}
                  </Typography>
                </Grid>
              </Grid>
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

export default IncidentResponseAgent;