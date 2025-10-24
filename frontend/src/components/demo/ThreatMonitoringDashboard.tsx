/**
 * Threat Monitoring Dashboard
 * 
 * Real-time security monitoring dashboard with threat detection,
 * incident tracking, and security metrics visualization.
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
  Button
} from '@mui/material';
import {
  Security,
  Warning,
  Error,
  CheckCircle,
  Timeline,
  Assessment,
  BugReport,
  Shield,
  Visibility,
  Block,
  PlayArrow,
  Pause,
  Refresh,
  MoreVert,
  TrendingUp,
  TrendingDown,
  NetworkCheck,
  Computer,
  Storage,
  Router
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  ThreatScenario,
  ThreatEvent,
  ThreatIndicator,
  NetworkNode,
  ThreatSeverity,
  BusinessImpact
} from '../../services/threatScenarioGenerator';
import { TimeSeriesChart, BarChart } from '../charts';

interface ThreatMonitoringDashboardProps {
  threats: ThreatScenario[];
  events: ThreatEvent[];
  indicators: ThreatIndicator[];
  nodes: NetworkNode[];
  isRunning?: boolean;
  onThreatAction?: (threatId: string, action: 'investigate' | 'contain' | 'mitigate') => void;
  onEventClick?: (event: ThreatEvent) => void;
}

interface SecurityMetrics {
  threatsDetected: number;
  threatsBlocked: number;
  incidentsActive: number;
  incidentsResolved: number;
  riskScore: number;
  securityPosture: 'excellent' | 'good' | 'fair' | 'poor';
  mttr: number; // Mean Time To Response (minutes)
  mttd: number; // Mean Time To Detection (minutes)
}

const ThreatMonitoringDashboard: React.FC<ThreatMonitoringDashboardProps> = ({
  threats,
  events,
  indicators,
  nodes,
  isRunning = false,
  onThreatAction,
  onEventClick
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('1h');

  // Calculate security metrics
  const securityMetrics = useMemo((): SecurityMetrics => {
    const now = Date.now();
    const timeRangeMs = {
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    }[timeRange] || 60 * 60 * 1000;

    const recentEvents = events.filter(e => now - e.timestamp.getTime() < timeRangeMs);
    const recentThreats = threats.filter(t => 
      t.timeline.some(e => now - e.timestamp.getTime() < timeRangeMs)
    );

    const threatsDetected = recentThreats.length;
    const threatsBlocked = recentEvents.filter(e => e.type === 'containment').length;
    const incidentsActive = threats.filter(t => 
      !t.timeline.some(e => e.type === 'mitigation')
    ).length;
    const incidentsResolved = threats.filter(t => 
      t.timeline.some(e => e.type === 'mitigation')
    ).length;

    // Calculate risk score based on active threats and compromised nodes
    const compromisedNodes = nodes.filter(n => n.status === 'compromised').length;
    const criticalThreats = threats.filter(t => t.severity === 'critical').length;
    const riskScore = Math.min(100, 
      (compromisedNodes * 20) + 
      (criticalThreats * 15) + 
      (incidentsActive * 10)
    );

    const securityPosture: SecurityMetrics['securityPosture'] = 
      riskScore < 20 ? 'excellent' :
      riskScore < 40 ? 'good' :
      riskScore < 70 ? 'fair' : 'poor';

    // Calculate response times
    const detectionTimes = recentEvents
      .filter(e => e.type === 'detection')
      .map(e => Math.random() * 10 + 2); // Simulated detection times
    const responseTimes = recentEvents
      .filter(e => e.type === 'containment')
      .map(e => Math.random() * 30 + 5); // Simulated response times

    const mttd = detectionTimes.length > 0 ? 
      detectionTimes.reduce((a, b) => a + b, 0) / detectionTimes.length : 0;
    const mttr = responseTimes.length > 0 ? 
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;

    return {
      threatsDetected,
      threatsBlocked,
      incidentsActive,
      incidentsResolved,
      riskScore,
      securityPosture,
      mttr,
      mttd
    };
  }, [threats, events, nodes, timeRange]);

  // Generate chart data
  const chartData = useMemo(() => {
    const now = Date.now();
    const hours = 24;
    const timeSeriesData = [];
    const severityData = [];

    // Time series data for threat detection over time
    for (let i = hours; i >= 0; i--) {
      const timePoint = now - (i * 60 * 60 * 1000);
      const hourEvents = events.filter(e => 
        Math.abs(e.timestamp.getTime() - timePoint) < 30 * 60 * 1000
      );
      
      timeSeriesData.push({
        x: new Date(timePoint),
        y: hourEvents.length,
        detections: hourEvents.filter(e => e.type === 'detection').length,
        containments: hourEvents.filter(e => e.type === 'containment').length
      });
    }

    // Severity distribution
    const severityCounts = {
      critical: threats.filter(t => t.severity === 'critical').length,
      high: threats.filter(t => t.severity === 'high').length,
      medium: threats.filter(t => t.severity === 'medium').length,
      low: threats.filter(t => t.severity === 'low').length
    };

    Object.entries(severityCounts).forEach(([severity, count]) => {
      severityData.push({
        name: severity.charAt(0).toUpperCase() + severity.slice(1),
        value: count,
        color: getSeverityColor(severity as ThreatSeverity)
      });
    });

    return { timeSeriesData, severityData };
  }, [threats, events]);

  const getSeverityColor = (severity: ThreatSeverity): string => {
    switch (severity) {
      case 'critical': return theme.palette.error.main;
      case 'high': return theme.palette.warning.main;
      case 'medium': return theme.palette.info.main;
      case 'low': return theme.palette.success.main;
      default: return theme.palette.grey[500];
    }
  };

  const getSeverityIcon = (severity: ThreatSeverity) => {
    switch (severity) {
      case 'critical': return <Error color="error" />;
      case 'high': return <Warning color="warning" />;
      case 'medium': return <Assessment color="info" />;
      case 'low': return <CheckCircle color="success" />;
      default: return <Security />;
    }
  };

  const getPostureColor = (posture: SecurityMetrics['securityPosture']): 'success' | 'warning' | 'error' | 'info' => {
    switch (posture) {
      case 'excellent': return 'success';
      case 'good': return 'info';
      case 'fair': return 'warning';
      case 'poor': return 'error';
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const renderSecurityOverview = () => (
    <Grid container spacing={3}>
      {/* Key Metrics Cards */}
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Risk Score
                </Typography>
                <Typography variant="h4" color={
                  securityMetrics.riskScore < 30 ? 'success.main' :
                  securityMetrics.riskScore < 70 ? 'warning.main' : 'error.main'
                }>
                  {securityMetrics.riskScore}
                </Typography>
                <Chip 
                  label={securityMetrics.securityPosture} 
                  size="small" 
                  color={getPostureColor(securityMetrics.securityPosture)}
                />
              </Box>
              <Shield sx={{ fontSize: 40, color: 'text.secondary' }} />
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={securityMetrics.riskScore} 
              sx={{ mt: 2 }}
              color={
                securityMetrics.riskScore < 30 ? 'success' :
                securityMetrics.riskScore < 70 ? 'warning' : 'error'
              }
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Active Threats
                </Typography>
                <Typography variant="h4" color="error.main">
                  {securityMetrics.incidentsActive}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {securityMetrics.threatsDetected} detected today
                </Typography>
              </Box>
              <Error sx={{ fontSize: 40, color: 'error.main' }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  MTTD
                </Typography>
                <Typography variant="h4" color="info.main">
                  {formatDuration(securityMetrics.mttd)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Mean Time to Detection
                </Typography>
              </Box>
              <Visibility sx={{ fontSize: 40, color: 'info.main' }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  MTTR
                </Typography>
                <Typography variant="h4" color="success.main">
                  {formatDuration(securityMetrics.mttr)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Mean Time to Response
                </Typography>
              </Box>
              <Block sx={{ fontSize: 40, color: 'success.main' }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Charts */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardHeader title="Threat Detection Timeline" />
          <CardContent>
            <TimeSeriesChart
              data={chartData.timeSeriesData}
              title=""
              height={300}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardHeader title="Threat Severity Distribution" />
          <CardContent>
            <BarChart
              data={chartData.severityData}
              title=""
              height={300}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderActiveThreats = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardHeader 
            title="Active Threat Scenarios"
            action={
              <Chip 
                label={`${threats.length} Active`} 
                color={threats.length > 0 ? 'error' : 'success'}
              />
            }
          />
          <CardContent>
            <List>
              {threats.slice(0, 10).map((threat, index) => (
                <React.Fragment key={threat.id}>
                  <ListItem>
                    <ListItemIcon>
                      {getSeverityIcon(threat.severity)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">{threat.name}</Typography>
                          <Chip 
                            label={threat.severity} 
                            size="small" 
                            color={
                              threat.severity === 'critical' ? 'error' :
                              threat.severity === 'high' ? 'warning' :
                              threat.severity === 'medium' ? 'info' : 'success'
                            }
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            {threat.description}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Targets: {threat.targetNodes.length} nodes • 
                            Duration: {formatDuration(threat.duration)} • 
                            Impact: ${threat.businessImpact.financialLoss.toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          onClick={() => onThreatAction?.(threat.id, 'investigate')}
                        >
                          Investigate
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="warning"
                          onClick={() => onThreatAction?.(threat.id, 'contain')}
                        >
                          Contain
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          onClick={() => onThreatAction?.(threat.id, 'mitigate')}
                        >
                          Mitigate
                        </Button>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < threats.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderSecurityEvents = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardHeader 
            title="Recent Security Events"
            action={
              <Chip 
                label={`${events.length} Events`} 
                color="info"
              />
            }
          />
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Node</TableCell>
                    <TableCell>Confidence</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {events.slice(0, 20).map((event) => (
                    <TableRow 
                      key={event.id}
                      hover
                      onClick={() => onEventClick?.(event)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Typography variant="body2">
                          {event.timestamp.toLocaleTimeString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={event.type} 
                          size="small"
                          color={
                            event.type === 'detection' ? 'warning' :
                            event.type === 'containment' ? 'info' :
                            event.type === 'mitigation' ? 'success' : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {event.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getSeverityIcon(event.severity)}
                          <Typography variant="body2">
                            {event.severity}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {event.nodeId ? 
                            nodes.find(n => n.id === event.nodeId)?.name || event.nodeId :
                            'N/A'
                          }
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={event.confidence * 100} 
                            sx={{ width: 60 }}
                          />
                          <Typography variant="body2">
                            {Math.round(event.confidence * 100)}%
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderThreatIntelligence = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Threat Indicators" />
          <CardContent>
            <List>
              {indicators.slice(0, 10).map((indicator, index) => (
                <React.Fragment key={indicator.id}>
                  <ListItem>
                    <ListItemIcon>
                      <BugReport color={
                        indicator.severity === 'critical' ? 'error' :
                        indicator.severity === 'high' ? 'warning' : 'info'
                      } />
                    </ListItemIcon>
                    <ListItemText
                      primary={indicator.value}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            {indicator.description}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Confidence: {Math.round(indicator.confidence * 100)}% • 
                            Type: {indicator.type} • 
                            First seen: {indicator.firstSeen.toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Chip 
                        label={indicator.severity} 
                        size="small"
                        color={
                          indicator.severity === 'critical' ? 'error' :
                          indicator.severity === 'high' ? 'warning' :
                          indicator.severity === 'medium' ? 'info' : 'success'
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < indicators.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Compromised Assets" />
          <CardContent>
            <List>
              {nodes.filter(n => n.status === 'compromised' || n.status === 'suspicious').map((node, index) => (
                <React.Fragment key={node.id}>
                  <ListItem>
                    <ListItemIcon>
                      <Avatar sx={{ 
                        bgcolor: node.status === 'compromised' ? 'error.main' : 'warning.main',
                        width: 32,
                        height: 32
                      }}>
                        {node.type === 'server' ? <Storage /> :
                         node.type === 'router' ? <Router /> : <Computer />}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={node.name}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            {node.ipAddress} • {node.type}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Vulnerabilities: {node.vulnerabilities.length} • 
                            Criticality: {node.criticality}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Chip 
                        label={node.status} 
                        size="small"
                        color={node.status === 'compromised' ? 'error' : 'warning'}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < nodes.filter(n => n.status === 'compromised' || n.status === 'suspicious').length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Security />
            Threat Monitoring Dashboard
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip
              label={isRunning ? 'LIVE MONITORING' : 'PAUSED'}
              color={isRunning ? 'success' : 'default'}
              icon={isRunning ? <PlayArrow /> : <Pause />}
            />
            
            <Tooltip title="Refresh Data">
              <IconButton>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Navigation Tabs */}
      <Paper elevation={1} sx={{ mb: 2 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
        >
          <Tab label="Security Overview" icon={<Assessment />} />
          <Tab label="Active Threats" icon={<Error />} />
          <Tab label="Security Events" icon={<Timeline />} />
          <Tab label="Threat Intelligence" icon={<BugReport />} />
        </Tabs>
      </Paper>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 0 && renderSecurityOverview()}
        {activeTab === 1 && renderActiveThreats()}
        {activeTab === 2 && renderSecurityEvents()}
        {activeTab === 3 && renderThreatIntelligence()}
      </Box>
    </Box>
  );
};

export default ThreatMonitoringDashboard;