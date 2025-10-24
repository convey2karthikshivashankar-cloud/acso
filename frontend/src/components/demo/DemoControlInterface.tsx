/**
 * Demo Control Interface - Admin interface for demo management
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Slider,
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
  Paper
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Stop,
  Refresh,
  Settings,
  Analytics,
  Save,
  Download,
  Upload,
  Delete,
  Edit,
  Visibility,
  Timeline,
  Dashboard,
  Group,
  Security,
  AttachMoney
} from '@mui/icons-material';
import { useDemoOrchestrator } from '../../hooks/useDemoOrchestrator';
import { DemoSession, BusinessMetric } from '../../types/demo';

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
      id={`demo-tabpanel-${index}`}
      aria-labelledby={`demo-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export const DemoControlInterface: React.FC = () => {
  const {
    currentSession,
    availableScenarios,
    isRunning,
    metrics,
    startDemo,
    pauseDemo,
    stopDemo,
    resetDemo,
    updateScenarioParameters,
    exportSession,
    importSession
  } = useDemoOrchestrator();

  const [activeTab, setActiveTab] = useState(0);
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [scenarioDialogOpen, setScenarioDialogOpen] = useState(false);
  const [parametersDialogOpen, setParametersDialogOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [currentParameters, setCurrentParameters] = useState<any>({});
  const [sessions, setSessions] = useState<DemoSession[]>([]);

  useEffect(() => {
    // Load saved sessions
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const savedSessions = localStorage.getItem('demo-sessions');
      if (savedSessions) {
        setSessions(JSON.parse(savedSessions));
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleStartDemo = async () => {
    if (!selectedScenario) {
      alert('Please select a scenario first');
      return;
    }

    try {
      await startDemo(selectedScenario, currentParameters);
    } catch (error) {
      console.error('Failed to start demo:', error);
    }
  };

  const handleParameterChange = (key: string, value: any) => {
    setCurrentParameters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSession = async () => {
    if (!currentSession) return;

    try {
      const sessionData = {
        ...currentSession,
        savedAt: new Date().toISOString()
      };

      const updatedSessions = [...sessions, sessionData];
      setSessions(updatedSessions);
      localStorage.setItem('demo-sessions', JSON.stringify(updatedSessions));
      
      setSessionDialogOpen(false);
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  };

  const handleExportSession = async () => {
    if (!currentSession) return;

    try {
      const sessionData = await exportSession(currentSession.id);
      const blob = new Blob([JSON.stringify(sessionData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `demo-session-${currentSession.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export session:', error);
    }
  };

  const getScenarioIcon = (type: string) => {
    switch (type) {
      case 'threat-response':
        return <Security />;
      case 'cost-optimization':
        return <AttachMoney />;
      case 'multi-agent':
        return <Group />;
      default:
        return <Dashboard />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'success';
      case 'paused':
        return 'warning';
      case 'stopped':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100vh', overflow: 'auto' }}>
      {/* Header */}
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h4" gutterBottom>
          Demo Control Center
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Manage and monitor ACSO demonstration scenarios
        </Typography>
      </Box>

      {/* Status Bar */}
      {currentSession && (
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
          <Grid container alignItems="center" spacing={2}>
            <Grid item>
              <Chip
                label={currentSession.status}
                color={getStatusColor(currentSession.status) as any}
                variant="filled"
              />
            </Grid>
            <Grid item>
              <Typography variant="body2">
                Session: {currentSession.name}
              </Typography>
            </Grid>
            <Grid item>
              <Typography variant="body2">
                Scenario: {currentSession.scenarioType}
              </Typography>
            </Grid>
            <Grid item xs>
              {currentSession.status === 'running' && (
                <LinearProgress 
                  variant="determinate" 
                  value={(currentSession.progress || 0) * 100} 
                />
              )}
            </Grid>
            <Grid item>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton
                  onClick={isRunning ? pauseDemo : handleStartDemo}
                  color="primary"
                  disabled={!selectedScenario && !currentSession}
                >
                  {isRunning ? <Pause /> : <PlayArrow />}
                </IconButton>
                <IconButton onClick={stopDemo} color="error" disabled={!currentSession}>
                  <Stop />
                </IconButton>
                <IconButton onClick={resetDemo} disabled={!currentSession}>
                  <Refresh />
                </IconButton>
              </Box>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Main Content */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Scenarios" icon={<Dashboard />} />
          <Tab label="Parameters" icon={<Settings />} />
          <Tab label="Sessions" icon={<Timeline />} />
          <Tab label="Analytics" icon={<Analytics />} />
        </Tabs>
      </Box>

      {/* Scenarios Tab */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          {availableScenarios.map((scenario) => (
            <Grid item xs={12} md={6} lg={4} key={scenario.id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  border: selectedScenario === scenario.id ? 2 : 1,
                  borderColor: selectedScenario === scenario.id ? 'primary.main' : 'divider'
                }}
                onClick={() => setSelectedScenario(scenario.id)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {getScenarioIcon(scenario.type)}
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      {scenario.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {scenario.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={scenario.type} size="small" />
                    <Chip label={`${scenario.duration}min`} size="small" variant="outlined" />
                    <Chip label={scenario.complexity} size="small" variant="outlined" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={handleStartDemo}
            disabled={!selectedScenario || isRunning}
          >
            Start Demo
          </Button>
          <Button
            variant="outlined"
            startIcon={<Settings />}
            onClick={() => setParametersDialogOpen(true)}
            disabled={!selectedScenario}
          >
            Configure Parameters
          </Button>
        </Box>
      </TabPanel>

      {/* Parameters Tab */}
      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Scenario Parameters
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Typography gutterBottom>Demo Speed</Typography>
                  <Slider
                    value={currentParameters.speed || 1}
                    onChange={(_, value) => handleParameterChange('speed', value)}
                    min={0.1}
                    max={5}
                    step={0.1}
                    marks={[
                      { value: 0.5, label: '0.5x' },
                      { value: 1, label: '1x' },
                      { value: 2, label: '2x' },
                      { value: 5, label: '5x' }
                    ]}
                    valueLabelDisplay="auto"
                  />
                </Box>

                <Box sx={{ mt: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel>Network Size</InputLabel>
                    <Select
                      value={currentParameters.networkSize || 'medium'}
                      onChange={(e) => handleParameterChange('networkSize', e.target.value)}
                    >
                      <MenuItem value="small">Small (15 nodes)</MenuItem>
                      <MenuItem value="medium">Medium (30 nodes)</MenuItem>
                      <MenuItem value="large">Large (50 nodes)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ mt: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel>Complexity Level</InputLabel>
                    <Select
                      value={currentParameters.complexity || 'medium'}
                      onChange={(e) => handleParameterChange('complexity', e.target.value)}
                    >
                      <MenuItem value="basic">Basic</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="advanced">Advanced</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ mt: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={currentParameters.enableAnimations || true}
                        onChange={(e) => handleParameterChange('enableAnimations', e.target.checked)}
                      />
                    }
                    label="Enable Animations"
                  />
                </Box>

                <Box sx={{ mt: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={currentParameters.autoAdvance || false}
                        onChange={(e) => handleParameterChange('autoAdvance', e.target.checked)}
                      />
                    }
                    label="Auto Advance Scenarios"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Agent Configuration
                </Typography>

                <Box sx={{ mt: 2 }}>
                  <Typography gutterBottom>Max Concurrent Agents</Typography>
                  <Slider
                    value={currentParameters.maxAgents || 5}
                    onChange={(_, value) => handleParameterChange('maxAgents', value)}
                    min={1}
                    max={10}
                    step={1}
                    marks
                    valueLabelDisplay="auto"
                  />
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Typography gutterBottom>Agent Response Delay (ms)</Typography>
                  <Slider
                    value={currentParameters.agentDelay || 1000}
                    onChange={(_, value) => handleParameterChange('agentDelay', value)}
                    min={100}
                    max={5000}
                    step={100}
                    valueLabelDisplay="auto"
                  />
                </Box>

                <Box sx={{ mt: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={currentParameters.enableLearning || true}
                        onChange={(e) => handleParameterChange('enableLearning', e.target.checked)}
                      />
                    }
                    label="Enable Agent Learning"
                  />
                </Box>

                <Box sx={{ mt: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={currentParameters.enableHumanApproval || true}
                        onChange={(e) => handleParameterChange('enableHumanApproval', e.target.checked)}
                      />
                    }
                    label="Enable Human Approval Workflows"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={() => updateScenarioParameters(currentParameters)}
          >
            Save Parameters
          </Button>
          <Button
            variant="outlined"
            onClick={() => setCurrentParameters({})}
          >
            Reset to Defaults
          </Button>
        </Box>
      </TabPanel>

      {/* Sessions Tab */}
      <TabPanel value={activeTab} index={2}>
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={() => setSessionDialogOpen(true)}
            disabled={!currentSession}
          >
            Save Current Session
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExportSession}
            disabled={!currentSession}
          >
            Export Session
          </Button>
          <Button
            variant="outlined"
            startIcon={<Upload />}
            component="label"
          >
            Import Session
            <input
              type="file"
              hidden
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const sessionData = JSON.parse(event.target?.result as string);
                      importSession(sessionData);
                    } catch (error) {
                      console.error('Failed to import session:', error);
                    }
                  };
                  reader.readAsText(file);
                }
              }}
            />
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Scenario</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Saved At</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>{session.name}</TableCell>
                  <TableCell>{session.scenarioType}</TableCell>
                  <TableCell>{session.duration}min</TableCell>
                  <TableCell>
                    {new Date(session.savedAt || '').toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <IconButton size="small">
                      <Visibility />
                    </IconButton>
                    <IconButton size="small">
                      <Edit />
                    </IconButton>
                    <IconButton size="small" color="error">
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Analytics Tab */}
      <TabPanel value={activeTab} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Total Sessions
                </Typography>
                <Typography variant="h3" color="primary">
                  {sessions.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Average Duration
                </Typography>
                <Typography variant="h3" color="primary">
                  {sessions.length > 0 
                    ? Math.round(sessions.reduce((acc, s) => acc + (s.duration || 0), 0) / sessions.length)
                    : 0
                  }min
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Success Rate
                </Typography>
                <Typography variant="h3" color="success.main">
                  {sessions.length > 0 
                    ? Math.round((sessions.filter(s => s.status === 'completed').length / sessions.length) * 100)
                    : 0
                  }%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Active Sessions
                </Typography>
                <Typography variant="h3" color="warning.main">
                  {sessions.filter(s => s.status === 'running').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {metrics && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Current Session Metrics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Alert severity="info">
                  Agents Active: {metrics.activeAgents}
                </Alert>
              </Grid>
              <Grid item xs={12} md={6}>
                <Alert severity="success">
                  Tasks Completed: {metrics.completedTasks}
                </Alert>
              </Grid>
            </Grid>
          </Box>
        )}
      </TabPanel>

      {/* Dialogs */}
      <Dialog open={parametersDialogOpen} onClose={() => setParametersDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Configure Scenario Parameters</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Adjust parameters for the selected scenario to customize the demonstration experience.
          </Typography>
          {/* Parameter configuration form would go here */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setParametersDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setParametersDialogOpen(false)}>
            Apply Parameters
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={sessionDialogOpen} onClose={() => setSessionDialogOpen(false)}>
        <DialogTitle>Save Demo Session</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Session Name"
            fullWidth
            variant="outlined"
            defaultValue={currentSession?.name || ''}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSessionDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveSession}>
            Save Session
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DemoControlInterface;