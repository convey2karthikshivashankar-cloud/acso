/**
 * Demo Session Manager - Manages demo sessions and their lifecycle
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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  LinearProgress,
  Tooltip,
  Menu,
  MenuList,
  MenuItem as MenuItemComponent,
  ListItemIcon
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Stop,
  Refresh,
  Delete,
  Edit,
  FileCopy,
  Share,
  Download,
  Upload,
  MoreVert,
  Schedule,
  Group,
  Assessment,
  CheckCircle,
  Error,
  Warning
} from '@mui/icons-material';
import { DemoSession, DemoScenarioType } from '../../types/demo';

interface DemoSessionManagerProps {
  sessions: DemoSession[];
  currentSession?: DemoSession;
  onCreateSession: (config: Partial<DemoSession>) => Promise<void>;
  onStartSession: (sessionId: string) => Promise<void>;
  onPauseSession: (sessionId: string) => Promise<void>;
  onStopSession: (sessionId: string) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onDuplicateSession: (sessionId: string) => Promise<void>;
  onExportSession: (sessionId: string) => Promise<void>;
  onImportSession: (sessionData: any) => Promise<void>;
}

export const DemoSessionManager: React.FC<DemoSessionManagerProps> = ({
  sessions,
  currentSession,
  onCreateSession,
  onStartSession,
  onPauseSession,
  onStopSession,
  onDeleteSession,
  onDuplicateSession,
  onExportSession,
  onImportSession
}) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<DemoSession | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuSessionId, setMenuSessionId] = useState<string>('');
  const [newSessionConfig, setNewSessionConfig] = useState({
    name: '',
    description: '',
    scenario: 'threat-response' as DemoScenarioType,
    duration: 10,
    parameters: {}
  });

  const handleCreateSession = async () => {
    try {
      await onCreateSession({
        ...newSessionConfig,
        id: `session-${Date.now()}`,
        status: 'created',
        createdAt: new Date().toISOString()
      });
      setCreateDialogOpen(false);
      setNewSessionConfig({
        name: '',
        description: '',
        scenario: 'threat-response',
        duration: 10,
        parameters: {}
      });
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, sessionId: string) => {
    setMenuAnchor(event.currentTarget);
    setMenuSessionId(sessionId);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuSessionId('');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <PlayArrow color="success" />;
      case 'paused':
        return <Pause color="warning" />;
      case 'completed':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      case 'stopped':
        return <Stop color="action" />;
      default:
        return <Schedule color="action" />;
    }
  };

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'running':
        return 'success';
      case 'paused':
        return 'warning';
      case 'completed':
        return 'info';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const sessionData = JSON.parse(e.target?.result as string);
          onImportSession(sessionData);
        } catch (error) {
          console.error('Failed to import session:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Demo Sessions</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Session
          </Button>
          <Button
            variant="outlined"
            component="label"
            startIcon={<Upload />}
          >
            Import
            <input
              type="file"
              hidden
              accept=".json"
              onChange={handleFileImport}
            />
          </Button>
        </Box>
      </Box>

      {/* Current Session Status */}
      {currentSession && (
        <Card sx={{ mb: 3, bgcolor: 'primary.50' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {getStatusIcon(currentSession.status)}
                <Box>
                  <Typography variant="h6">
                    Current Session: {currentSession.name || currentSession.id}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currentSession.scenario} • {formatDuration(currentSession.duration || 0)}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {currentSession.status === 'running' && (
                  <Button
                    variant="outlined"
                    startIcon={<Pause />}
                    onClick={() => onPauseSession(currentSession.id)}
                  >
                    Pause
                  </Button>
                )}
                {currentSession.status === 'paused' && (
                  <Button
                    variant="outlined"
                    startIcon={<PlayArrow />}
                    onClick={() => onStartSession(currentSession.id)}
                  >
                    Resume
                  </Button>
                )}
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Stop />}
                  onClick={() => onStopSession(currentSession.id)}
                  disabled={!['running', 'paused'].includes(currentSession.status)}
                >
                  Stop
                </Button>
              </Box>
            </Box>
            {currentSession.status === 'running' && currentSession.progress !== undefined && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={currentSession.progress * 100} 
                />
                <Typography variant="caption" color="text.secondary">
                  Progress: {Math.round(currentSession.progress * 100)}%
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sessions List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            All Sessions ({sessions.length})
          </Typography>
          
          {sessions.length === 0 ? (
            <Alert severity="info">
              No demo sessions found. Create your first session to get started.
            </Alert>
          ) : (
            <List>
              {sessions.map((session, index) => (
                <React.Fragment key={session.id}>
                  <ListItem>
                    <ListItemIcon>
                      {getStatusIcon(session.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">
                            {session.name || session.id}
                          </Typography>
                          <Chip 
                            label={session.status} 
                            size="small" 
                            color={getStatusColor(session.status)}
                          />
                          {session.id === currentSession?.id && (
                            <Chip label="Current" size="small" variant="outlined" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {session.description || 'No description'}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                            <Typography variant="caption">
                              Scenario: {session.scenario}
                            </Typography>
                            <Typography variant="caption">
                              Duration: {formatDuration(session.duration || 0)}
                            </Typography>
                            {session.createdAt && (
                              <Typography variant="caption">
                                Created: {new Date(session.createdAt).toLocaleDateString()}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {session.status === 'created' && (
                          <Tooltip title="Start Session">
                            <IconButton
                              onClick={() => onStartSession(session.id)}
                              color="primary"
                            >
                              <PlayArrow />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="More Actions">
                          <IconButton
                            onClick={(e) => handleMenuOpen(e, session.id)}
                          >
                            <MoreVert />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < sessions.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuList>
          <MenuItemComponent onClick={() => {
            const session = sessions.find(s => s.id === menuSessionId);
            if (session) {
              setSelectedSession(session);
              setEditDialogOpen(true);
            }
            handleMenuClose();
          }}>
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            Edit Session
          </MenuItemComponent>
          <MenuItemComponent onClick={() => {
            onDuplicateSession(menuSessionId);
            handleMenuClose();
          }}>
            <ListItemIcon>
              <FileCopy fontSize="small" />
            </ListItemIcon>
            Duplicate
          </MenuItemComponent>
          <MenuItemComponent onClick={() => {
            onExportSession(menuSessionId);
            handleMenuClose();
          }}>
            <ListItemIcon>
              <Download fontSize="small" />
            </ListItemIcon>
            Export
          </MenuItemComponent>
          <Divider />
          <MenuItemComponent 
            onClick={() => {
              onDeleteSession(menuSessionId);
              handleMenuClose();
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <Delete fontSize="small" color="error" />
            </ListItemIcon>
            Delete
          </MenuItemComponent>
        </MenuList>
      </Menu>

      {/* Create Session Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Demo Session</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Session Name"
              value={newSessionConfig.name}
              onChange={(e) => setNewSessionConfig(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={newSessionConfig.description}
              onChange={(e) => setNewSessionConfig(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
            />
            <FormControl fullWidth>
              <InputLabel>Scenario Type</InputLabel>
              <Select
                value={newSessionConfig.scenario}
                onChange={(e) => setNewSessionConfig(prev => ({ ...prev, scenario: e.target.value as DemoScenarioType }))}
              >
                <MenuItem value="threat-response">Threat Response</MenuItem>
                <MenuItem value="cost-optimization">Cost Optimization</MenuItem>
                <MenuItem value="multi-agent-coordination">Multi-Agent Coordination</MenuItem>
                <MenuItem value="real-time-decision">Real-Time Decision Making</MenuItem>
                <MenuItem value="human-ai-collaboration">Human-AI Collaboration</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Duration (minutes)"
              type="number"
              value={newSessionConfig.duration}
              onChange={(e) => setNewSessionConfig(prev => ({ ...prev, duration: parseInt(e.target.value) || 10 }))}
              fullWidth
              inputProps={{ min: 1, max: 120 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateSession}
            disabled={!newSessionConfig.name.trim()}
          >
            Create Session
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Session Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Demo Session</DialogTitle>
        <DialogContent>
          {selectedSession && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Session Name"
                defaultValue={selectedSession.name}
                fullWidth
              />
              <TextField
                label="Description"
                defaultValue={selectedSession.description}
                fullWidth
                multiline
                rows={3}
              />
              <FormControl fullWidth>
                <InputLabel>Scenario Type</InputLabel>
                <Select defaultValue={selectedSession.scenario}>
                  <MenuItem value="threat-response">Threat Response</MenuItem>
                  <MenuItem value="cost-optimization">Cost Optimization</MenuItem>
                  <MenuItem value="multi-agent-coordination">Multi-Agent Coordination</MenuItem>
                  <MenuItem value="real-time-decision">Real-Time Decision Making</MenuItem>
                  <MenuItem value="human-ai-collaboration">Human-AI Collaboration</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Duration (minutes)"
                type="number"
                defaultValue={selectedSession.duration}
                fullWidth
                inputProps={{ min: 1, max: 120 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setEditDialogOpen(false)}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DemoSessionManager;