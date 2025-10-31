import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  AppBar,
  Toolbar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Badge,
  Chip,
  LinearProgress,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,

  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Snackbar,
  Menu,
  MenuItem,

  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  CircularProgress,
  Backdrop,
} from '@mui/material';
import { ErrorBoundary } from './common/ErrorBoundary';
import {
  Dashboard as DashboardIcon,
  Security as SecurityIcon,
  Psychology as AgentIcon,
  AttachMoney as FinancialIcon,
  Warning as WarningIcon,
  Shield as ShieldIcon,
  Menu as MenuIcon,
  Notifications as NotificationsIcon,

  AccountTree as WorkflowIcon,
  Analytics as AnalyticsIcon,

  NetworkCheck as NetworkIcon,
  PlayArrow as PlayIcon,

  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,

  MoreVert as MoreVertIcon,
  TrendingUp as TrendingUpIcon,

} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const EnhancedEnterpriseDashboard: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [agents, setAgents] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isSimulationRunning, setIsSimulationRunning] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Enhanced dialog states
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [workflowExecutionOpen, setWorkflowExecutionOpen] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [networkDialogOpen, setNetworkDialogOpen] = useState(false);
  const [incidentDetailsOpen, setIncidentDetailsOpen] = useState(false);
  const [selectedIncidentDetails, setSelectedIncidentDetails] = useState<any>(null);

  // Initialize data with error handling
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading
        generateInitialData();
        setIsLoading(false);
      } catch (err) {
        setError('Failed to initialize demo data');
        setIsLoading(false);
        console.error('Initialization error:', err);
      }
    };

    initializeData();

    const interval = setInterval(() => {
      if (isSimulationRunning && !error) {
        try {
          updateLiveData();
        } catch (err) {
          console.error('Live data update error:', err);
          setError('Failed to update live data');
        }
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isSimulationRunning, error]);

  // Realistic data generation utilities
  const generateRealisticIP = () => {
    const subnets = ['192.168.1', '192.168.10', '10.0.1', '172.16.1'];
    const subnet = subnets[Math.floor(Math.random() * subnets.length)];
    const host = Math.floor(Math.random() * 254) + 1;
    return `${subnet}.${host}`;
  };

  const generateHostname = (type: string, index: number) => {
    const prefixes = {
      'Threat Hunter': 'TH-SEC',
      'Incident Response': 'IR-RSP',
      'Financial Intelligence': 'FI-ANL',
      'Service Orchestration': 'SO-CTL',
      'Vulnerability Scanner': 'VS-SCN'
    };
    const prefix = prefixes[type as keyof typeof prefixes] || 'ACSO';
    return `${prefix}-${String(index).padStart(3, '0')}`;
  };

  // Data validation and consistency utilities
  const validateMetrics = (data: any) => {
    // Ensure online agents <= total agents
    if (data.onlineAgents > data.totalAgents) {
      data.onlineAgents = data.totalAgents;
    }
    
    // Ensure critical incidents <= total incidents
    if (data.criticalIncidents > data.totalIncidents) {
      data.criticalIncidents = data.totalIncidents;
    }
    
    // Ensure reasonable ranges
    data.roi = Math.max(0, Math.min(500, data.roi));
    data.systemHealth = Math.max(0, Math.min(100, data.systemHealth));
    data.costSavings = Math.max(0, data.costSavings);
    data.threatsBlocked = Math.max(0, data.threatsBlocked);
    
    return data;
  };

  const validateAgent = (agent: any) => {
    return {
      ...agent,
      cpu: Math.max(0, Math.min(100, agent.cpu || 0)),
      memory: Math.max(0, Math.min(100, agent.memory || 0)),
      threats: Math.max(0, agent.threats || 0),
      uptime: Math.max(0, agent.uptime || 0),
    };
  };

  const generateInitialData = () => {
    // Generate agents with realistic data
    const agentTypes = ['Threat Hunter', 'Incident Response', 'Financial Intelligence', 'Service Orchestration', 'Vulnerability Scanner'];
    const sampleAgents = Array.from({ length: 15 }, (_, i) => {
      const type = agentTypes[i % agentTypes.length];
      const status = ['online', 'offline', 'warning', 'maintenance'][Math.floor(Math.random() * 4)];
      
      return {
        id: `agent-${i + 1}`,
        name: `${type} ${Math.floor(i / agentTypes.length) + 1}`,
        type,
        status,
        hostname: generateHostname(type, i + 1),
        ipAddress: generateRealisticIP(),
        cpu: status === 'offline' ? 0 : Math.floor(Math.random() * 80) + 10,
        memory: status === 'offline' ? 0 : Math.floor(Math.random() * 70) + 20,
        threats: Math.floor(Math.random() * 50),
        uptime: status === 'offline' ? 0 : Math.floor(Math.random() * 720) + 1,
        lastActivity: new Date(Date.now() - Math.random() * 3600000).toLocaleTimeString(),
        version: `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
        location: ['US-East-1', 'US-West-2', 'EU-Central-1', 'Asia-Pacific-1'][Math.floor(Math.random() * 4)],
      };
    });

    // Generate incidents with realistic correlations
    const incidentTypes = [
      { type: 'Malware Detection', severity: ['high', 'critical'], systems: [1, 5] },
      { type: 'Phishing Attempt', severity: ['medium', 'high'], systems: [1, 3] },
      { type: 'DDoS Attack', severity: ['high', 'critical'], systems: [5, 20] },
      { type: 'Data Breach', severity: ['critical'], systems: [3, 15] },
      { type: 'Insider Threat', severity: ['medium', 'high'], systems: [2, 8] },
      { type: 'Ransomware', severity: ['critical'], systems: [10, 50] },
      { type: 'SQL Injection', severity: ['high', 'critical'], systems: [1, 5] }
    ];
    
    const sampleIncidents = Array.from({ length: 12 }, (_, i) => {
      const incidentTemplate = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
      const severity = incidentTemplate.severity[Math.floor(Math.random() * incidentTemplate.severity.length)];
      const affectedSystems = Math.floor(Math.random() * (incidentTemplate.systems[1] - incidentTemplate.systems[0] + 1)) + incidentTemplate.systems[0];
      const createdTime = Date.now() - Math.random() * 86400000 * 7; // Last 7 days
      
      return {
        id: `INC-${String(i + 1).padStart(4, '0')}`,
        title: `${incidentTemplate.type} - ${generateRealisticIP()}`,
        description: `Automated detection of ${incidentTemplate.type.toLowerCase()} targeting ${affectedSystems} system${affectedSystems > 1 ? 's' : ''}`,
        severity,
        status: severity === 'critical' ? 'investigating' : ['open', 'investigating', 'resolved'][Math.floor(Math.random() * 3)],
        assignee: `SOC Analyst ${Math.floor(Math.random() * 5) + 1}`,
        created: new Date(createdTime).toLocaleString(),
        updated: new Date(createdTime + Math.random() * 3600000).toLocaleString(),
        affectedSystems,
        priority: severity === 'critical' ? 5 : severity === 'high' ? 4 : severity === 'medium' ? 3 : 2,
        sourceIP: generateRealisticIP(),
        targetIP: generateRealisticIP(),
        detectionMethod: ['ML Algorithm', 'Signature Match', 'Behavioral Analysis', 'Threat Intelligence'][Math.floor(Math.random() * 4)],
      };
    });

    // Generate workflows
    const workflowNames = ['Threat Response', 'Incident Triage', 'Vulnerability Assessment', 'Compliance Check', 'Cost Optimization'];
    const sampleWorkflows = Array.from({ length: 8 }, (_, i) => ({
      id: `wf-${i + 1}`,
      name: `${workflowNames[Math.floor(Math.random() * workflowNames.length)]} ${i + 1}`,
      status: ['running', 'completed', 'failed', 'paused'][Math.floor(Math.random() * 4)],
      progress: Math.floor(Math.random() * 100),
      duration: `${Math.floor(Math.random() * 60)}m ${Math.floor(Math.random() * 60)}s`,
      trigger: ['Manual', 'Scheduled', 'Event-driven'][Math.floor(Math.random() * 3)],
    }));

    // Generate notifications
    const sampleNotifications = Array.from({ length: 5 }, (_, i) => ({
      id: `notif-${i + 1}`,
      message: `System alert: ${['High CPU usage detected', 'New threat signature available', 'Backup completed successfully', 'License expiring soon', 'Agent update available'][i]}`,
      type: ['info', 'warning', 'error', 'success'][Math.floor(Math.random() * 4)],
      timestamp: new Date(Date.now() - Math.random() * 3600000).toLocaleTimeString(),
      read: Math.random() > 0.5,
    }));

    // Validate agents
    const validatedAgents = sampleAgents.map(validateAgent);
    
    const sampleMetrics = {
      totalAgents: validatedAgents.length,
      onlineAgents: validatedAgents.filter(a => a.status === 'online').length,
      totalIncidents: sampleIncidents.length,
      criticalIncidents: sampleIncidents.filter(i => i.severity === 'critical').length,
      roi: 285 + Math.floor(Math.random() * 50),
      costSavings: 450000 + Math.floor(Math.random() * 100000),
      threatsBlocked: 1247 + Math.floor(Math.random() * 100),
      systemHealth: 85 + Math.floor(Math.random() * 15),
    };

    // Validate and set data
    setAgents(validatedAgents);
    setIncidents(sampleIncidents);
    setWorkflows(sampleWorkflows);
    setMetrics(validateMetrics(sampleMetrics));
    setNotifications(sampleNotifications);
  };

  const updateLiveData = () => {
    setAgents((prev: any[]) => {
      const updatedAgents = prev.map(agent => validateAgent({
        ...agent,
        cpu: Math.max(0, Math.min(100, agent.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(0, Math.min(100, agent.memory + (Math.random() - 0.5) * 8)),
        threats: agent.threats + (Math.random() < 0.1 ? 1 : 0),
        lastActivity: new Date().toLocaleTimeString(),
      }));
      
      // Update metrics based on current agent states
      setMetrics((prevMetrics: any) => validateMetrics({
        ...prevMetrics,
        onlineAgents: updatedAgents.filter(a => a.status === 'online').length,
        totalAgents: updatedAgents.length,
        threatsBlocked: prevMetrics.threatsBlocked + (Math.random() < 0.3 ? Math.floor(Math.random() * 3) : 0),
        systemHealth: Math.max(75, Math.min(100, prevMetrics.systemHealth + (Math.random() - 0.5) * 5)),
      }));
      
      return updatedAgents;
    });

    // Occasionally add new notifications
    if (Math.random() < 0.1) {
      const newNotification = {
        id: `notif-${Date.now()}`,
        message: `Real-time alert: ${['Suspicious activity detected', 'Agent performance optimized', 'Threat neutralized', 'System backup initiated'][Math.floor(Math.random() * 4)]}`,
        type: ['info', 'warning', 'success'][Math.floor(Math.random() * 3)],
        timestamp: new Date().toLocaleTimeString(),
        read: false,
      };
      setNotifications((prev: any[]) => [newNotification, ...prev.slice(0, 9)]);
    }
  };

  const showNotification = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  const handleAgentAction = useCallback((action: string, agent: any) => {
    if (!agent || !agent.id) {
      showNotification('Invalid agent selected', 'error');
      return;
    }

    try {
      switch (action) {
        case 'restart':
          if (agent.status === 'maintenance') {
            showNotification('Agent is already being restarted', 'warning');
            return;
          }
          showNotification(`Restarting ${agent.name}...`, 'info');
          setAgents((prev: any[]) => prev.map(a => 
            a.id === agent.id ? { ...a, status: 'maintenance' } : a
          ));
          setTimeout(() => {
            setAgents((prev: any[]) => prev.map(a => 
              a.id === agent.id ? { ...a, status: 'online', cpu: Math.random() * 30 + 10, memory: Math.random() * 40 + 20 } : a
            ));
            showNotification(`${agent.name} restarted successfully`, 'success');
          }, 3000);
          break;
        case 'configure':
          setSelectedAgent(agent);
          setAgentDialogOpen(true);
          break;
        case 'stop':
          if (agent.status === 'offline') {
            showNotification('Agent is already stopped', 'warning');
            return;
          }
          showNotification(`Stopping ${agent.name}...`, 'info');
          setAgents((prev: any[]) => prev.map(a => 
            a.id === agent.id ? { ...a, status: 'offline' } : a
          ));
          break;
        default:
          showNotification('Unknown action', 'error');
      }
    } catch (err) {
      console.error('Agent action error:', err);
      showNotification('Failed to perform agent action', 'error');
    }
  }, [showNotification]);

  const handleWorkflowAction = useCallback((action: string, workflow: any) => {
    if (!workflow || !workflow.id) {
      showNotification('Invalid workflow selected', 'error');
      return;
    }

    try {
      switch (action) {
        case 'run':
          if (workflow.status === 'running') {
            showNotification('Workflow is already running', 'warning');
            return;
          }
          setSelectedWorkflow(workflow);
          setWorkflowExecutionOpen(true);
          setExecutionLogs([]);
          
          // Simulate workflow execution
          showNotification(`Starting workflow: ${workflow.name}`, 'info');
          setWorkflows((prev: any[]) => prev.map(w => 
            w.id === workflow.id ? { ...w, status: 'running', progress: 0 } : w
          ));
          
          // Simulate step-by-step execution
          const steps = [
            'Initializing workflow environment...',
            'Validating input parameters...',
            'Connecting to target systems...',
            'Executing security checks...',
            'Processing threat intelligence...',
            'Applying remediation actions...',
            'Generating compliance report...',
            'Workflow completed successfully!'
          ];
          
          steps.forEach((step, index) => {
            setTimeout(() => {
              setExecutionLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${step}`]);
              const progress = ((index + 1) / steps.length) * 100;
              setWorkflows((prev: any[]) => prev.map(w => 
                w.id === workflow.id ? { ...w, progress } : w
              ));
              
              if (index === steps.length - 1) {
                setWorkflows((prev: any[]) => prev.map(w => 
                  w.id === workflow.id ? { ...w, status: 'completed' } : w
                ));
                showNotification(`Workflow "${workflow.name}" completed successfully!`, 'success');
              }
            }, (index + 1) * 1500);
          });
          break;
          
        case 'edit':
          setSelectedWorkflow(workflow);
          setWorkflowDialogOpen(true);
          break;
          
        case 'stop':
          if (workflow.status !== 'running') {
            showNotification('Workflow is not currently running', 'warning');
            return;
          }
          setWorkflows((prev: any[]) => prev.map(w => 
            w.id === workflow.id ? { ...w, status: 'paused' } : w
          ));
          showNotification(`Workflow "${workflow.name}" stopped`, 'info');
          break;
          
        default:
          showNotification('Unknown workflow action', 'error');
      }
    } catch (err) {
      console.error('Workflow action error:', err);
      showNotification('Failed to perform workflow action', 'error');
    }
  }, [showNotification]);

  const handleIncidentAction = useCallback((action: string, incident: any) => {
    if (!incident || !incident.id) {
      showNotification('Invalid incident selected', 'error');
      return;
    }

    try {
      switch (action) {
        case 'investigate':
          if (incident.status === 'investigating') {
            showNotification('Incident is already being investigated', 'warning');
            return;
          }
          showNotification(`Starting investigation for ${incident.id}...`, 'info');
          setIncidents((prev: any[]) => prev.map(i => 
            i.id === incident.id ? { ...i, status: 'investigating' } : i
          ));
          break;
        case 'resolve':
          if (incident.status === 'resolved') {
            showNotification('Incident is already resolved', 'warning');
            return;
          }
          showNotification(`Resolving incident ${incident.id}...`, 'info');
          setIncidents((prev: any[]) => prev.map(i => 
            i.id === incident.id ? { ...i, status: 'resolved' } : i
          ));
          break;
        case 'escalate':
          if (incident.severity === 'critical') {
            showNotification('Incident is already at critical severity', 'warning');
            return;
          }
          showNotification(`Escalating incident ${incident.id}...`, 'info');
          setIncidents((prev: any[]) => prev.map(i => 
            i.id === incident.id ? { ...i, severity: 'critical', priority: 5 } : i
          ));
          break;
        default:
          showNotification('Unknown action', 'error');
      }
    } catch (err) {
      console.error('Incident action error:', err);
      showNotification('Failed to perform incident action', 'error');
    }
  }, [showNotification]);

  const getStatusColor = (status: string): "success" | "error" | "warning" | "info" => {
    const colors: Record<string, "success" | "error" | "warning" | "info"> = { 
      online: 'success', 
      offline: 'error', 
      warning: 'warning', 
      maintenance: 'info',
      running: 'success',
      completed: 'info',
      failed: 'error',
      paused: 'warning'
    };
    return colors[status] || 'info';
  };

  const getSeverityColor = (severity: string): "error" | "warning" | "info" | "default" => {
    const colors: Record<string, "error" | "warning" | "info" | "default"> = { 
      critical: 'error', 
      high: 'warning', 
      medium: 'info', 
      low: 'default' 
    };
    return colors[severity] || 'default';
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, tab: 0 },
    { text: 'Agents', icon: <AgentIcon />, tab: 1 },
    { text: 'Incidents', icon: <WarningIcon />, tab: 2 },
    { text: 'Workflows', icon: <WorkflowIcon />, tab: 3 },
    { text: 'Analytics', icon: <AnalyticsIcon />, tab: 4 },
    { text: 'Network', icon: <NetworkIcon />, tab: 5 },
  ];

  // Loading state
  if (isLoading) {
    return (
      <Backdrop open={true} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="inherit" size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading ACSO Enterprise Demo...
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
            Initializing agents and security systems
          </Typography>
        </Box>
      </Backdrop>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', p: 3 }}>
        <Alert 
          severity="error" 
          sx={{ maxWidth: 600 }}
          action={
            <Button color="inherit" size="small" onClick={() => window.location.reload()}>
              Reload
            </Button>
          }
        >
          <Typography variant="h6" gutterBottom>
            Demo Error
          </Typography>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={() => setDrawerOpen(!drawerOpen)}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <ShieldIcon sx={{ mr: 2 }} />
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            ACSO Enterprise Command Center
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={isSimulationRunning}
                onChange={(e) => setIsSimulationRunning(e.target.checked)}
                color="secondary"
              />
            }
            label="Live Simulation"
            sx={{ color: 'white', mr: 2 }}
          />
          
          <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Badge badgeContent={notifications.filter(n => !n.read).length} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Notifications Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { width: 350, maxHeight: 400 } }}
      >
        <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          Notifications
        </Typography>
        {notifications.map((notification) => (
          <MenuItem key={notification.id} sx={{ whiteSpace: 'normal', py: 1 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}>
                {notification.message}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {notification.timestamp}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>

      {/* Drawer */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={drawerOpen}
        sx={{
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              <ListItem 
                button 
                key={item.text}
                selected={currentTab === item.tab}
                onClick={() => setCurrentTab(item.tab)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerOpen ? 240 : 0}px)` },
          ml: { sm: drawerOpen ? `240px` : 0 },
          transition: 'margin 0.3s',
        }}
      >
        <Toolbar />

        {/* Dashboard Tab */}
        <TabPanel value={currentTab} index={0}>
          <Typography variant="h4" gutterBottom>
            🛡️ ACSO Enterprise Dashboard
          </Typography>
          
          {/* Key Metrics */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {[
              { title: 'Total Agents', value: metrics.totalAgents, icon: <AgentIcon />, color: 'primary' },
              { title: 'Online Agents', value: metrics.onlineAgents, icon: <AgentIcon />, color: 'success' },
              { title: 'Active Incidents', value: metrics.totalIncidents, icon: <WarningIcon />, color: 'warning' },
              { title: 'Critical Issues', value: metrics.criticalIncidents, icon: <SecurityIcon />, color: 'error' },
              { title: 'ROI', value: `${metrics.roi}%`, icon: <FinancialIcon />, color: 'info' },
              { title: 'Cost Savings', value: `${(metrics.costSavings / 1000).toFixed(0)}K`, icon: <FinancialIcon />, color: 'success' },
            ].map((metric, index) => (
              <Grid item xs={12} sm={6} md={2} key={index}>
                <Card sx={{ height: '100%', cursor: 'pointer', '&:hover': { elevation: 8 } }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Box sx={{ color: `${metric.color}.main`, mb: 1 }}>
                      {React.cloneElement(metric.icon, { sx: { fontSize: 40 } })}
                    </Box>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                      {metric.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {metric.title}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Real-time Charts and Status */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3, height: 400 }}>
                <Typography variant="h6" gutterBottom>
                  System Health Overview
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Overall System Health: {metrics.systemHealth}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={metrics.systemHealth} 
                    sx={{ height: 10, borderRadius: 5, mb: 2 }}
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Threats Blocked Today: {metrics.threatsBlocked}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(100, (metrics.threatsBlocked / 2000) * 100)} 
                    color="success"
                    sx={{ height: 10, borderRadius: 5, mb: 2 }}
                  />
                </Box>
                <Alert severity="info" sx={{ mt: 2 }}>
                  🔄 Live data simulation is {isSimulationRunning ? 'active' : 'paused'}. 
                  Toggle the switch in the header to control real-time updates.
                </Alert>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, height: 400 }}>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
                  {notifications.slice(0, 8).map((notification) => (
                    <Alert 
                      key={notification.id} 
                      severity={notification.type as any} 
                      sx={{ mb: 1, fontSize: '0.8rem' }}
                    >
                      <Typography variant="caption" display="block">
                        {notification.timestamp}
                      </Typography>
                      {notification.message}
                    </Alert>
                  ))}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Agents Tab */}
        <TabPanel value={currentTab} index={1}>
          <Typography variant="h4" gutterBottom>
            🤖 Agent Management
          </Typography>
          
          <Grid container spacing={3}>
            {agents.map((agent) => (
              <Grid item xs={12} sm={6} md={4} key={agent.id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" component="div">
                          {agent.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {agent.type}
                        </Typography>
                      </Box>
                      <IconButton 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAgent(agent);
                          setAnchorEl(e.currentTarget);
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                    
                    <Chip 
                      label={agent.status} 
                      color={getStatusColor(agent.status)} 
                      size="small"
                      sx={{ mb: 2 }}
                    />
                    
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" gutterBottom>
                        CPU: {agent.cpu.toFixed(1)}%
                      </Typography>
                      <LinearProgress variant="determinate" value={agent.cpu} sx={{ mb: 1 }} />
                    </Box>
                    
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" gutterBottom>
                        Memory: {agent.memory.toFixed(1)}%
                      </Typography>
                      <LinearProgress variant="determinate" value={agent.memory} sx={{ mb: 1 }} />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary">
                      Hostname: {agent.hostname}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      IP: {agent.ipAddress}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Threats: {agent.threats} | Uptime: {agent.uptime}h
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Version: {agent.version} | Location: {agent.location}
                    </Typography>
                    
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Button 
                        size="small" 
                        variant="outlined"
                        onClick={() => handleAgentAction('restart', agent)}
                      >
                        Restart
                      </Button>
                      <Button 
                        size="small" 
                        variant="outlined"
                        onClick={() => handleAgentAction('configure', agent)}
                      >
                        Configure
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Incidents Tab */}
        <TabPanel value={currentTab} index={2}>
          <Typography variant="h4" gutterBottom>
            🚨 Incident Management
          </Typography>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Assignee</TableCell>
                  <TableCell>Systems</TableCell>
                  <TableCell>Detection</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {incidents.map((incident) => (
                  <TableRow key={incident.id} hover>
                    <TableCell>{incident.id}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {incident.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={incident.severity} 
                        color={getSeverityColor(incident.severity)} 
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={incident.status} 
                        color={getStatusColor(incident.status)} 
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{incident.assignee}</TableCell>
                    <TableCell>
                      <Chip 
                        label={incident.affectedSystems} 
                        color={incident.affectedSystems > 10 ? 'error' : incident.affectedSystems > 5 ? 'warning' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {incident.detectionMethod}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="small" 
                        variant="outlined"
                        onClick={() => {
                          setSelectedIncidentDetails(incident);
                          setIncidentDetailsOpen(true);
                        }}
                        sx={{ mr: 1 }}
                      >
                        Details
                      </Button>
                      <Button 
                        size="small" 
                        onClick={() => handleIncidentAction('investigate', incident)}
                        disabled={incident.status === 'resolved'}
                        sx={{ mr: 1 }}
                      >
                        Investigate
                      </Button>
                      <Button 
                        size="small" 
                        onClick={() => handleIncidentAction('resolve', incident)}
                        disabled={incident.status === 'resolved'}
                      >
                        Resolve
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Workflows Tab */}
        <TabPanel value={currentTab} index={3}>
          <Typography variant="h4" gutterBottom>
            ⚙️ Workflow Management
          </Typography>
          
          <Grid container spacing={3}>
            {workflows.map((workflow) => (
              <Grid item xs={12} sm={6} md={4} key={workflow.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" component="div" gutterBottom>
                      {workflow.name}
                    </Typography>
                    
                    <Chip 
                      label={workflow.status} 
                      color={getStatusColor(workflow.status)} 
                      size="small"
                      sx={{ mb: 2 }}
                    />
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        Progress: {workflow.progress}%
                      </Typography>
                      <LinearProgress variant="determinate" value={workflow.progress} />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Duration: {workflow.duration}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Trigger: {workflow.trigger}
                    </Typography>
                    
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Button 
                        size="small" 
                        variant="outlined" 
                        startIcon={<PlayIcon />}
                        onClick={() => handleWorkflowAction('run', workflow)}
                        disabled={workflow.status === 'running'}
                      >
                        {workflow.status === 'running' ? 'Running...' : 'Run'}
                      </Button>
                      <Button 
                        size="small" 
                        variant="outlined" 
                        startIcon={<EditIcon />}
                        onClick={() => handleWorkflowAction('edit', workflow)}
                      >
                        Edit
                      </Button>
                      {workflow.status === 'running' && (
                        <Button 
                          size="small" 
                          variant="outlined" 
                          color="error"
                          onClick={() => handleWorkflowAction('stop', workflow)}
                        >
                          Stop
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Analytics Tab */}
        <TabPanel value={currentTab} index={4}>
          <Typography variant="h4" gutterBottom>
            📊 Advanced Analytics & Business Intelligence
          </Typography>
          
          <Grid container spacing={3}>
            {/* Financial Analytics */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: 400 }}>
                <Typography variant="h6" gutterBottom>
                  💰 Financial Impact Analysis
                </Typography>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h3" color="success.main" sx={{ fontWeight: 'bold' }}>
                    ${(metrics.costSavings / 1000).toFixed(0)}K
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Cost Savings This Month
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">ROI Performance</Typography>
                    <Typography variant="body2" color="success.main">+{metrics.roi}%</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(100, metrics.roi)} 
                    color="success"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Cost Reduction</Typography>
                    <Typography variant="body2" color="primary.main">67%</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={67} 
                    color="primary"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="success.main">$125K</Typography>
                    <Typography variant="caption">Prevented Losses</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="primary.main">$89K</Typography>
                    <Typography variant="caption">Operational Savings</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="info.main">$236K</Typography>
                    <Typography variant="caption">Total Value</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
            
            {/* Security Analytics */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: 400 }}>
                <Typography variant="h6" gutterBottom>
                  🛡️ Security Performance Metrics
                </Typography>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h3" color="primary.main" sx={{ fontWeight: 'bold' }}>
                    {metrics.threatsBlocked}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Threats Blocked Today
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Detection Rate</Typography>
                    <Typography variant="body2" color="success.main">99.7%</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={99.7} 
                    color="success"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Response Time</Typography>
                    <Typography variant="body2" color="primary.main">&lt; 30s</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={95} 
                    color="primary"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" color="error.main">23</Typography>
                      <Typography variant="caption">Critical Blocked</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" color="warning.main">156</Typography>
                      <Typography variant="caption">High Severity</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" color="info.main">892</Typography>
                      <Typography variant="caption">Total Detected</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            
            {/* Operational Efficiency */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: 350 }}>
                <Typography variant="h6" gutterBottom>
                  ⚡ Operational Efficiency
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" gutterBottom>
                    Automation Rate: 89%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={89} 
                    color="success"
                    sx={{ height: 10, borderRadius: 5, mb: 2 }}
                  />
                  
                  <Typography variant="body2" gutterBottom>
                    Incident Resolution Speed: 94%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={94} 
                    color="primary"
                    sx={{ height: 10, borderRadius: 5, mb: 2 }}
                  />
                  
                  <Typography variant="body2" gutterBottom>
                    Agent Utilization: 76%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={76} 
                    color="info"
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
                
                <Alert severity="success" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Excellent Performance!</strong> All KPIs are above target thresholds.
                  </Typography>
                </Alert>
              </Paper>
            </Grid>
            
            {/* Predictive Analytics */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: 350 }}>
                <Typography variant="h6" gutterBottom>
                  🔮 Predictive Analytics
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Threat Forecast (Next 7 Days)
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TrendingUpIcon color="warning" sx={{ mr: 1 }} />
                    <Typography variant="body1">
                      <strong>15% increase</strong> in phishing attempts expected
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Resource Optimization
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • Deploy 2 additional threat hunters in US-East region
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • Scale down financial agents during weekend
                  </Typography>
                  <Typography variant="body2">
                    • Increase monitoring for SQL injection patterns
                  </Typography>
                </Box>
                
                <Button 
                  variant="contained" 
                  size="small"
                  onClick={() => showNotification('Predictive recommendations applied!', 'success')}
                >
                  Apply Recommendations
                </Button>
              </Paper>
            </Grid>
            
            {/* Compliance Dashboard */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  📋 Compliance & Governance Dashboard
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                        98%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        SOC 2 Compliance
                      </Typography>
                      <Chip label="Compliant" color="success" size="small" sx={{ mt: 1 }} />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                        96%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        GDPR Compliance
                      </Typography>
                      <Chip label="Compliant" color="success" size="small" sx={{ mt: 1 }} />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" color="warning.main" sx={{ fontWeight: 'bold' }}>
                        87%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        HIPAA Compliance
                      </Typography>
                      <Chip label="Review Needed" color="warning" size="small" sx={{ mt: 1 }} />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                        94%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ISO 27001
                      </Typography>
                      <Chip label="Compliant" color="success" size="small" sx={{ mt: 1 }} />
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Network Tab */}
        <TabPanel value={currentTab} index={5}>
          <Typography variant="h4" gutterBottom>
            🌐 Network Topology & Monitoring
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3, height: 500 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">
                    Live Network Map
                  </Typography>
                  <Box>
                    <Button 
                      variant="outlined" 
                      startIcon={<RefreshIcon />}
                      onClick={() => showNotification('Network topology refreshed', 'success')}
                      sx={{ mr: 1 }}
                    >
                      Refresh
                    </Button>
                    <Button 
                      variant="contained" 
                      onClick={() => setNetworkDialogOpen(true)}
                    >
                      Full Screen
                    </Button>
                  </Box>
                </Box>
                
                {/* Simulated Network Visualization */}
                <Box sx={{ 
                  height: 400, 
                  bgcolor: 'grey.50', 
                  borderRadius: 2, 
                  position: 'relative',
                  overflow: 'hidden',
                  border: '2px solid',
                  borderColor: 'primary.light'
                }}>
                  {/* Network Nodes */}
                  {agents.slice(0, 8).map((agent, index) => (
                    <Box
                      key={agent.id}
                      sx={{
                        position: 'absolute',
                        left: `${20 + (index % 4) * 20}%`,
                        top: `${20 + Math.floor(index / 4) * 40}%`,
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        bgcolor: agent.status === 'online' ? 'success.main' : 
                                agent.status === 'warning' ? 'warning.main' : 'error.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'scale(1.1)',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                        }
                      }}
                      onClick={() => showNotification(`Agent: ${agent.name} - Status: ${agent.status}`, 'info')}
                    >
                      <AgentIcon />
                    </Box>
                  ))}
                  
                  {/* Connection Lines */}
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                    {agents.slice(0, 7).map((_, index) => (
                      <line
                        key={index}
                        x1={`${20 + (index % 4) * 20}%`}
                        y1={`${20 + Math.floor(index / 4) * 40}%`}
                        x2={`${20 + ((index + 1) % 4) * 20}%`}
                        y2={`${20 + Math.floor((index + 1) / 4) * 40}%`}
                        stroke="#1976d2"
                        strokeWidth="2"
                        opacity="0.6"
                      />
                    ))}
                  </svg>
                  
                  {/* Status Overlay */}
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 10, 
                    right: 10, 
                    bgcolor: 'rgba(255,255,255,0.9)', 
                    p: 1, 
                    borderRadius: 1 
                  }}>
                    <Typography variant="caption" display="block">
                      🟢 Online: {agents.filter(a => a.status === 'online').length}
                    </Typography>
                    <Typography variant="caption" display="block">
                      🟡 Warning: {agents.filter(a => a.status === 'warning').length}
                    </Typography>
                    <Typography variant="caption" display="block">
                      🔴 Offline: {agents.filter(a => a.status === 'offline').length}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, height: 500 }}>
                <Typography variant="h6" gutterBottom>
                  Network Statistics
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" gutterBottom>
                    Network Health: 94%
                  </Typography>
                  <LinearProgress variant="determinate" value={94} color="success" sx={{ mb: 2 }} />
                  
                  <Typography variant="body2" gutterBottom>
                    Bandwidth Usage: 67%
                  </Typography>
                  <LinearProgress variant="determinate" value={67} color="warning" sx={{ mb: 2 }} />
                  
                  <Typography variant="body2" gutterBottom>
                    Latency: 12ms (Excellent)
                  </Typography>
                  <LinearProgress variant="determinate" value={88} color="success" />
                </Box>
                
                <Typography variant="h6" gutterBottom>
                  Recent Network Events
                </Typography>
                
                <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                  {[
                    { time: '14:32', event: 'Agent TH-SEC-001 connected', type: 'success' },
                    { time: '14:28', event: 'High bandwidth usage detected', type: 'warning' },
                    { time: '14:25', event: 'Network scan completed', type: 'info' },
                    { time: '14:20', event: 'Agent IR-RSP-003 disconnected', type: 'error' },
                    { time: '14:15', event: 'Firewall rules updated', type: 'success' }
                  ].map((event, index) => (
                    <Alert 
                      key={index}
                      severity={event.type as any}
                      sx={{ mb: 1, fontSize: '0.8rem' }}
                    >
                      <Typography variant="caption" display="block">
                        {event.time}
                      </Typography>
                      {event.event}
                    </Alert>
                  ))}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Workflow Execution Dialog */}
        <Dialog open={workflowExecutionOpen} onClose={() => setWorkflowExecutionOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Workflow Execution: {selectedWorkflow?.name}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Progress: {selectedWorkflow?.progress || 0}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={selectedWorkflow?.progress || 0} 
                sx={{ mb: 2 }}
              />
              <Chip 
                label={selectedWorkflow?.status || 'Unknown'}
                color={getStatusColor(selectedWorkflow?.status || 'unknown')}
                size="small"
              />
            </Box>
            
            <Typography variant="h6" gutterBottom>
              Execution Log
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.900', color: 'white', maxHeight: 300, overflowY: 'auto' }}>
              {executionLogs.length === 0 ? (
                <Typography variant="body2" color="grey.400">
                  Waiting for execution to start...
                </Typography>
              ) : (
                executionLogs.map((log, index) => (
                  <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace', mb: 0.5 }}>
                    {log}
                  </Typography>
                ))
              )}
            </Paper>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setWorkflowExecutionOpen(false)}>Close</Button>
            {selectedWorkflow?.status === 'running' && (
              <Button 
                color="error" 
                onClick={() => {
                  handleWorkflowAction('stop', selectedWorkflow);
                  setWorkflowExecutionOpen(false);
                }}
              >
                Stop Workflow
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Workflow Editor Dialog */}
        <Dialog open={workflowDialogOpen} onClose={() => setWorkflowDialogOpen(false)} maxWidth="lg" fullWidth>
          <DialogTitle>
            Edit Workflow: {selectedWorkflow?.name}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Workflow Name"
                  defaultValue={selectedWorkflow?.name}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  defaultValue="Automated security response workflow"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  select
                  label="Trigger Type"
                  defaultValue={selectedWorkflow?.trigger}
                  sx={{ mb: 2 }}
                >
                  <MenuItem value="Manual">Manual</MenuItem>
                  <MenuItem value="Scheduled">Scheduled</MenuItem>
                  <MenuItem value="Event-driven">Event-driven</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Workflow Steps
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  {[
                    '1. Initialize security scan',
                    '2. Analyze threat patterns',
                    '3. Execute containment actions',
                    '4. Generate incident report',
                    '5. Notify stakeholders'
                  ].map((step, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Chip label={index + 1} size="small" sx={{ mr: 2 }} />
                      <Typography variant="body2">{step}</Typography>
                    </Box>
                  ))}
                </Paper>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setWorkflowDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={() => {
                setWorkflowDialogOpen(false);
                showNotification('Workflow configuration saved!', 'success');
              }}
            >
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>

        {/* Incident Details Dialog */}
        <Dialog open={incidentDetailsOpen} onClose={() => setIncidentDetailsOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Incident Details: {selectedIncidentDetails?.id}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Title</Typography>
                  <Typography variant="body1">{selectedIncidentDetails?.title}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Description</Typography>
                  <Typography variant="body1">{selectedIncidentDetails?.description}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Severity</Typography>
                  <Chip 
                    label={selectedIncidentDetails?.severity} 
                    color={getSeverityColor(selectedIncidentDetails?.severity)}
                    size="small"
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip 
                    label={selectedIncidentDetails?.status} 
                    color={getStatusColor(selectedIncidentDetails?.status)}
                    size="small"
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Technical Details
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Source IP</Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                    {selectedIncidentDetails?.sourceIP}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Target IP</Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                    {selectedIncidentDetails?.targetIP}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Detection Method</Typography>
                  <Typography variant="body1">{selectedIncidentDetails?.detectionMethod}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Affected Systems</Typography>
                  <Chip 
                    label={selectedIncidentDetails?.affectedSystems} 
                    color={selectedIncidentDetails?.affectedSystems > 10 ? 'error' : 'warning'}
                  />
                </Box>
              </Grid>
            </Grid>
            
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Response Timeline
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              {[
                { time: selectedIncidentDetails?.created, action: 'Incident detected and created', status: 'completed' },
                { time: selectedIncidentDetails?.updated, action: 'Initial analysis completed', status: 'completed' },
                { time: 'In Progress', action: 'Containment measures applied', status: 'current' },
                { time: 'Pending', action: 'Full remediation and cleanup', status: 'pending' }
              ].map((item, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ 
                    width: 12, 
                    height: 12, 
                    borderRadius: '50%', 
                    bgcolor: item.status === 'completed' ? 'success.main' : 
                            item.status === 'current' ? 'warning.main' : 'grey.300',
                    mr: 2 
                  }} />
                  <Box>
                    <Typography variant="body2">{item.action}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.time}</Typography>
                  </Box>
                </Box>
              ))}
            </Paper>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIncidentDetailsOpen(false)}>Close</Button>
            <Button 
              variant="contained" 
              onClick={() => {
                handleIncidentAction('investigate', selectedIncidentDetails);
                setIncidentDetailsOpen(false);
              }}
              disabled={selectedIncidentDetails?.status === 'resolved'}
            >
              Start Investigation
            </Button>
          </DialogActions>
        </Dialog>

        {/* Network Full Screen Dialog */}
        <Dialog open={networkDialogOpen} onClose={() => setNetworkDialogOpen(false)} maxWidth="xl" fullWidth>
          <DialogTitle>
            Network Topology - Full View
          </DialogTitle>
          <DialogContent>
            <Box sx={{ height: 600, bgcolor: 'grey.50', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
              <Typography variant="h6" sx={{ p: 2, textAlign: 'center' }}>
                🌐 Interactive Network Visualization
              </Typography>
              <Typography variant="body2" sx={{ textAlign: 'center', mb: 3 }}>
                Advanced network topology with real-time monitoring and threat detection
              </Typography>
              
              {/* Enhanced network visualization would go here */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '80%',
                flexDirection: 'column'
              }}>
                <NetworkIcon sx={{ fontSize: 120, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Advanced Network Topology
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                  This would show an interactive network diagram with:<br/>
                  • Real-time traffic flows • Threat detection overlays • Performance metrics<br/>
                  • Agent deployment status • Security zone boundaries
                </Typography>
                <Button variant="contained" onClick={() => showNotification('Network analysis refreshed', 'success')}>
                  Run Network Analysis
                </Button>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNetworkDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Agent Configuration Dialog */}
        <Dialog open={agentDialogOpen} onClose={() => setAgentDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            Configure Agent: {selectedAgent?.name}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <TextField
                fullWidth
                label="Agent Name"
                defaultValue={selectedAgent?.name}
                sx={{ mb: 2 }}
                inputProps={{ maxLength: 50 }}
                helperText="Maximum 50 characters"
              />
              <TextField
                fullWidth
                label="CPU Limit (%)"
                type="number"
                defaultValue={80}
                sx={{ mb: 2 }}
                inputProps={{ min: 10, max: 100 }}
                helperText="Value between 10-100%"
              />
              <TextField
                fullWidth
                label="Memory Limit (%)"
                type="number"
                defaultValue={75}
                sx={{ mb: 2 }}
                inputProps={{ min: 10, max: 100 }}
                helperText="Value between 10-100%"
              />
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Auto-restart on failure"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAgentDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={() => {
                try {
                  setAgentDialogOpen(false);
                  showNotification('Agent configuration updated successfully!', 'success');
                } catch (err) {
                  showNotification('Failed to update agent configuration', 'error');
                }
              }}
            >
              Save Configuration
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={4000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity}>
            {snackbarMessage}
          </Alert>
        </Snackbar>

        {/* Speed Dial for Quick Actions */}
        <SpeedDial
          ariaLabel="Quick Actions"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          icon={<SpeedDialIcon />}
        >
          <SpeedDialAction
            icon={<AddIcon />}
            tooltipTitle="Deploy New Agent"
            onClick={() => {
              try {
                showNotification('Deploying new agent...', 'info');
                // Simulate agent deployment
                setTimeout(() => {
                  const newAgent = {
                    id: `agent-${agents.length + 1}`,
                    name: `New Agent ${agents.length + 1}`,
                    type: 'Threat Hunter',
                    status: 'online',
                    cpu: Math.random() * 30 + 10,
                    memory: Math.random() * 40 + 20,
                    threats: 0,
                    uptime: 0,
                    lastActivity: new Date().toLocaleTimeString(),
                    version: 'v2.1.0',
                  };
                  setAgents(prev => [...prev, newAgent]);
                  showNotification('New agent deployed successfully!', 'success');
                }, 2000);
              } catch (err) {
                showNotification('Failed to deploy agent', 'error');
              }
            }}
          />
          <SpeedDialAction
            icon={<RefreshIcon />}
            tooltipTitle="Refresh All Data"
            onClick={() => {
              try {
                generateInitialData();
                showNotification('All data refreshed!', 'success');
              } catch (err) {
                showNotification('Failed to refresh data', 'error');
              }
            }}
          />
          <SpeedDialAction
            icon={<PlayIcon />}
            tooltipTitle="Run Security Scan"
            onClick={() => {
              try {
                showNotification('Initiating comprehensive security scan...', 'info');
                setTimeout(() => {
                  showNotification('Security scan completed - No threats detected', 'success');
                }, 3000);
              } catch (err) {
                showNotification('Security scan failed', 'error');
              }
            }}
          />
        </SpeedDial>
      </Box>
    </Box>
    </ErrorBoundary>
  );
};