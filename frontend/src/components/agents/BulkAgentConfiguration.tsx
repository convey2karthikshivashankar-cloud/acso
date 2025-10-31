import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Card,
  CardContent,
  CardActions,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Chip,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Tabs,
  Tab,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Info,
  PlayArrow,
  Pause,
  Schedule,
  Group,
  Settings,
  Visibility,
  Edit,
  Delete,
  Add,
} from '@mui/icons-material';
import { Agent } from './EnhancedAgentOverview';

// Bulk operation types
export type BulkOperationType = 'update_config' | 'restart' | 'start' | 'stop' | 'update_version' | 'apply_template';

// Bulk operation interface
export interface BulkOperation {
  id: string;
  type: BulkOperationType;
  name: string;
  description: string;
  targetAgents: string[];
  parameters: Record<string, any>;
  schedule?: {
    type: 'immediate' | 'scheduled' | 'rolling';
    startTime?: Date;
    batchSize?: number;
    batchDelay?: number;
  };
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    failed: number;
    errors: Array<{ agentId: string; error: string }>;
  };
  createdAt: Date;
  completedAt?: Date;
}

// Configuration change interface
export interface ConfigurationChange {
  path: string;
  operation: 'set' | 'unset' | 'merge' | 'append';
  value: any;
  condition?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater' | 'less';
    value: any;
  };
}

// Props interface
export interface BulkAgentConfigurationProps {
  agents: Agent[];
  selectedAgents: string[];
  operations: BulkOperation[];
  onCreateOperation?: (operation: Omit<BulkOperation, 'id' | 'status' | 'progress' | 'createdAt'>) => void;
  onExecuteOperation?: (operationId: string) => void;
  onCancelOperation?: (operationId: string) => void;
  onDeleteOperation?: (operationId: string) => void;
}

export const BulkAgentConfiguration: React.FC<BulkAgentConfigurationProps> = ({
  agents,
  selectedAgents,
  operations,
  onCreateOperation,
  onExecuteOperation,
  onCancelOperation,
  onDeleteOperation,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [operationType, setOperationType] = useState<BulkOperationType>('update_config');
  const [operationName, setOperationName] = useState('');
  const [operationDescription, setOperationDescription] = useState('');
  const [configChanges, setConfigChanges] = useState<ConfigurationChange[]>([]);
  const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled' | 'rolling'>('immediate');
  const [scheduledTime, setScheduledTime] = useState<Date>(new Date());
  const [batchSize, setBatchSize] = useState(5);
  const [batchDelay, setBatchDelay] = useState(30);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<BulkOperation | null>(null);

  // Get selected agent objects
  const selectedAgentObjects = useMemo(() => {
    return agents.filter(agent => selectedAgents.includes(agent.id));
  }, [agents, selectedAgents]);

  // Operation type configurations
  const operationTypeConfig = {
    update_config: {
      name: 'Update Configuration',
      description: 'Update configuration settings for selected agents',
      icon: <Settings />,
      color: '#2196F3',
    },
    restart: {
      name: 'Restart Agents',
      description: 'Restart selected agents',
      icon: <PlayArrow />,
      color: '#4CAF50',
    },
    start: {
      name: 'Start Agents',
      description: 'Start selected agents',
      icon: <PlayArrow />,
      color: '#4CAF50',
    },
    stop: {
      name: 'Stop Agents',
      description: 'Stop selected agents',
      icon: <Pause />,
      color: '#FF9800',
    },
    update_version: {
      name: 'Update Version',
      description: 'Update agent version for selected agents',
      icon: <Info />,
      color: '#9C27B0',
    },
    apply_template: {
      name: 'Apply Template',
      description: 'Apply configuration template to selected agents',
      icon: <Group />,
      color: '#FF5722',
    },
  };

  // Add configuration change
  const addConfigChange = useCallback(() => {
    setConfigChanges(prev => [...prev, {
      path: '',
      operation: 'set',
      value: '',
    }]);
  }, []);

  // Remove configuration change
  const removeConfigChange = useCallback((index: number) => {
    setConfigChanges(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Update configuration change
  const updateConfigChange = useCallback((index: number, change: Partial<ConfigurationChange>) => {
    setConfigChanges(prev => prev.map((item, i) => 
      i === index ? { ...item, ...change } : item
    ));
  }, []);

  // Create bulk operation
  const createOperation = useCallback(() => {
    if (!operationName || selectedAgents.length === 0) return;

    const operation: Omit<BulkOperation, 'id' | 'status' | 'progress' | 'createdAt'> = {
      type: operationType,
      name: operationName,
      description: operationDescription,
      targetAgents: selectedAgents,
      parameters: {
        configChanges: operationType === 'update_config' ? configChanges : undefined,
      },
      schedule: scheduleType === 'immediate' ? undefined : {
        type: scheduleType,
        startTime: scheduleType === 'scheduled' ? scheduledTime : undefined,
        batchSize: scheduleType === 'rolling' ? batchSize : undefined,
        batchDelay: scheduleType === 'rolling' ? batchDelay : undefined,
      },
    };

    onCreateOperation?.(operation);
    
    // Reset form
    setOperationName('');
    setOperationDescription('');
    setConfigChanges([]);
    setActiveStep(0);
  }, [
    operationType,
    operationName,
    operationDescription,
    selectedAgents,
    configChanges,
    scheduleType,
    scheduledTime,
    batchSize,
    batchDelay,
    onCreateOperation,
  ]);

  // Render configuration changes step
  const renderConfigChangesStep = () => {
    if (operationType !== 'update_config') {
      return (
        <Alert severity="info">
          <AlertTitle>Operation Configuration</AlertTitle>
          This operation type does not require additional configuration.
        </Alert>
      );
    }

    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Configuration Changes</Typography>
          <Button startIcon={<Add />} onClick={addConfigChange}>
            Add Change
          </Button>
        </Box>

        {configChanges.length === 0 ? (
          <Alert severity="info">
            No configuration changes defined. Click "Add Change" to start.
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {configChanges.map((change, index) => (
              <Grid item xs={12} key={index}>
                <Card>
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          label="Configuration Path"
                          value={change.path}
                          onChange={(e) => updateConfigChange(index, { path: e.target.value })}
                          placeholder="e.g., logging.level"
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Operation</InputLabel>
                          <Select
                            value={change.operation}
                            label="Operation"
                            onChange={(e) => updateConfigChange(index, { operation: e.target.value as any })}
                          >
                            <MenuItem value="set">Set</MenuItem>
                            <MenuItem value="unset">Unset</MenuItem>
                            <MenuItem value="merge">Merge</MenuItem>
                            <MenuItem value="append">Append</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          label="Value"
                          value={change.value}
                          onChange={(e) => updateConfigChange(index, { value: e.target.value })}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          label="Condition (optional)"
                          placeholder="field=value"
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={1}>
                        <IconButton onClick={() => removeConfigChange(index)} color="error">
                          <Delete />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    );
  };

  // Render schedule step
  const renderScheduleStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Execution Schedule
      </Typography>

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Schedule Type</InputLabel>
        <Select
          value={scheduleType}
          label="Schedule Type"
          onChange={(e) => setScheduleType(e.target.value as any)}
        >
          <MenuItem value="immediate">Execute Immediately</MenuItem>
          <MenuItem value="scheduled">Schedule for Later</MenuItem>
          <MenuItem value="rolling">Rolling Deployment</MenuItem>
        </Select>
      </FormControl>

      {scheduleType === 'scheduled' && (
        <TextField
          fullWidth
          label="Scheduled Time"
          type="datetime-local"
          value={scheduledTime.toISOString().slice(0, 16)}
          onChange={(e) => setScheduledTime(new Date(e.target.value))}
          sx={{ mb: 2 }}
        />
      )}

      {scheduleType === 'rolling' && (
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Batch Size"
              type="number"
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              inputProps={{ min: 1, max: selectedAgents.length }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Batch Delay (seconds)"
              type="number"
              value={batchDelay}
              onChange={(e) => setBatchDelay(Number(e.target.value))}
              inputProps={{ min: 0 }}
            />
          </Grid>
        </Grid>
      )}

      <Alert severity="info" sx={{ mt: 2 }}>
        <AlertTitle>Schedule Information</AlertTitle>
        {scheduleType === 'immediate' && 'Operation will be executed immediately after creation.'}
        {scheduleType === 'scheduled' && `Operation will be executed at ${scheduledTime.toLocaleString()}.`}
        {scheduleType === 'rolling' && `Operation will be executed in batches of ${batchSize} agents with ${batchDelay} seconds delay between batches.`}
      </Alert>
    </Box>
  );

  // Render review step
  const renderReviewStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Operation Review
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Operation Details
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Type:</strong> {operationTypeConfig[operationType].name}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Name:</strong> {operationName}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Description:</strong> {operationDescription || 'No description'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Target Agents:</strong> {selectedAgents.length}
              </Typography>
              <Typography variant="body2">
                <strong>Schedule:</strong> {scheduleType === 'immediate' ? 'Immediate' : 
                                          scheduleType === 'scheduled' ? `Scheduled for ${scheduledTime.toLocaleString()}` :
                                          `Rolling (${batchSize} agents per batch)`}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Target Agents
              </Typography>
              <List dense>
                {selectedAgentObjects.slice(0, 5).map(agent => (
                  <ListItem key={agent.id}>
                    <ListItemText
                      primary={agent.name}
                      secondary={`${agent.type} - ${agent.location}`}
                    />
                  </ListItem>
                ))}
                {selectedAgentObjects.length > 5 && (
                  <ListItem>
                    <ListItemText
                      primary={`... and ${selectedAgentObjects.length - 5} more agents`}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {operationType === 'update_config' && configChanges.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Configuration Changes
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Path</TableCell>
                        <TableCell>Operation</TableCell>
                        <TableCell>Value</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {configChanges.map((change, index) => (
                        <TableRow key={index}>
                          <TableCell>{change.path}</TableCell>
                          <TableCell>
                            <Chip label={change.operation} size="small" />
                          </TableCell>
                          <TableCell>{String(change.value)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );

  // Render operation status
  const renderOperationStatus = (operation: BulkOperation) => {
    const config = operationTypeConfig[operation.type];
    const progressPercentage = operation.progress.total > 0 
      ? (operation.progress.completed / operation.progress.total) * 100 
      : 0;

    return (
      <Card key={operation.id} sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              {config.icon}
              <Box>
                <Typography variant="h6">{operation.name}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {operation.description}
                </Typography>
              </Box>
            </Box>
            <Chip
              label={operation.status}
              color={
                operation.status === 'completed' ? 'success' :
                operation.status === 'failed' ? 'error' :
                operation.status === 'running' ? 'warning' : 'default'
              }
            />
          </Box>

          <Box mb={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2">
                Progress: {operation.progress.completed}/{operation.progress.total}
              </Typography>
              <Typography variant="body2">
                {progressPercentage.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={progressPercentage} />
          </Box>

          {operation.progress.failed > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <AlertTitle>Errors ({operation.progress.failed})</AlertTitle>
              {operation.progress.errors.slice(0, 3).map((error, index) => (
                <Typography key={index} variant="body2">
                  {error.agentId}: {error.error}
                </Typography>
              ))}
              {operation.progress.errors.length > 3 && (
                <Typography variant="body2">
                  ... and {operation.progress.errors.length - 3} more errors
                </Typography>
              )}
            </Alert>
          )}

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="textSecondary">
              Created: {operation.createdAt.toLocaleString()}
              {operation.completedAt && ` | Completed: ${operation.completedAt.toLocaleString()}`}
            </Typography>
            <Box>
              <IconButton
                size="small"
                onClick={() => {
                  setSelectedOperation(operation);
                  setPreviewDialogOpen(true);
                }}
              >
                <Visibility />
              </IconButton>
              {operation.status === 'pending' && (
                <>
                  <IconButton
                    size="small"
                    onClick={() => onExecuteOperation?.(operation.id)}
                    color="primary"
                  >
                    <PlayArrow />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => onDeleteOperation?.(operation.id)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </>
              )}
              {operation.status === 'running' && (
                <IconButton
                  size="small"
                  onClick={() => onCancelOperation?.(operation.id)}
                  color="warning"
                >
                  <Pause />
                </IconButton>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const steps = ['Operation Type', 'Configuration', 'Schedule', 'Review'];

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Bulk Agent Configuration
      </Typography>

      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Create Operation" />
        <Tab label="Active Operations" />
        <Tab label="History" />
      </Tabs>

      {/* Create Operation Tab */}
      {activeTab === 0 && (
        <Box>
          {selectedAgents.length === 0 ? (
            <Alert severity="warning">
              <AlertTitle>No Agents Selected</AlertTitle>
              Please select agents from the overview to create bulk operations.
            </Alert>
          ) : (
            <>
              <Alert severity="info" sx={{ mb: 3 }}>
                <AlertTitle>Selected Agents ({selectedAgents.length})</AlertTitle>
                Creating bulk operation for {selectedAgents.length} selected agents.
              </Alert>

              <Stepper activeStep={activeStep} orientation="vertical">
                {/* Step 1: Operation Type */}
                <Step>
                  <StepLabel>Select Operation Type</StepLabel>
                  <StepContent>
                    <Grid container spacing={2}>
                      {Object.entries(operationTypeConfig).map(([type, config]) => (
                        <Grid item xs={12} md={6} key={type}>
                          <Card
                            sx={{
                              cursor: 'pointer',
                              border: operationType === type ? 2 : 1,
                              borderColor: operationType === type ? 'primary.main' : 'divider',
                            }}
                            onClick={() => setOperationType(type as BulkOperationType)}
                          >
                            <CardContent>
                              <Box display="flex" alignItems="center" gap={1} mb={1}>
                                {config.icon}
                                <Typography variant="h6">{config.name}</Typography>
                              </Box>
                              <Typography variant="body2" color="textSecondary">
                                {config.description}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>

                    <Box mt={2}>
                      <TextField
                        fullWidth
                        label="Operation Name"
                        value={operationName}
                        onChange={(e) => setOperationName(e.target.value)}
                        sx={{ mb: 2 }}
                      />
                      <TextField
                        fullWidth
                        label="Description (optional)"
                        multiline
                        rows={2}
                        value={operationDescription}
                        onChange={(e) => setOperationDescription(e.target.value)}
                      />
                    </Box>

                    <Box mt={2}>
                      <Button
                        variant="contained"
                        onClick={() => setActiveStep(1)}
                        disabled={!operationType || !operationName}
                      >
                        Next
                      </Button>
                    </Box>
                  </StepContent>
                </Step>

                {/* Step 2: Configuration */}
                <Step>
                  <StepLabel>Configure Operation</StepLabel>
                  <StepContent>
                    {renderConfigChangesStep()}
                    <Box mt={2}>
                      <Button onClick={() => setActiveStep(0)} sx={{ mr: 1 }}>
                        Back
                      </Button>
                      <Button variant="contained" onClick={() => setActiveStep(2)}>
                        Next
                      </Button>
                    </Box>
                  </StepContent>
                </Step>

                {/* Step 3: Schedule */}
                <Step>
                  <StepLabel>Schedule Execution</StepLabel>
                  <StepContent>
                    {renderScheduleStep()}
                    <Box mt={2}>
                      <Button onClick={() => setActiveStep(1)} sx={{ mr: 1 }}>
                        Back
                      </Button>
                      <Button variant="contained" onClick={() => setActiveStep(3)}>
                        Next
                      </Button>
                    </Box>
                  </StepContent>
                </Step>

                {/* Step 4: Review */}
                <Step>
                  <StepLabel>Review & Create</StepLabel>
                  <StepContent>
                    {renderReviewStep()}
                    <Box mt={2}>
                      <Button onClick={() => setActiveStep(2)} sx={{ mr: 1 }}>
                        Back
                      </Button>
                      <Button variant="contained" onClick={createOperation}>
                        Create Operation
                      </Button>
                    </Box>
                  </StepContent>
                </Step>
              </Stepper>
            </>
          )}
        </Box>
      )}

      {/* Active Operations Tab */}
      {activeTab === 1 && (
        <Box>
          {operations.filter(op => ['pending', 'running'].includes(op.status)).length === 0 ? (
            <Alert severity="info">
              No active operations. Create a new operation to get started.
            </Alert>
          ) : (
            operations
              .filter(op => ['pending', 'running'].includes(op.status))
              .map(renderOperationStatus)
          )}
        </Box>
      )}

      {/* History Tab */}
      {activeTab === 2 && (
        <Box>
          {operations.filter(op => ['completed', 'failed', 'cancelled'].includes(op.status)).length === 0 ? (
            <Alert severity="info">
              No completed operations.
            </Alert>
          ) : (
            operations
              .filter(op => ['completed', 'failed', 'cancelled'].includes(op.status))
              .map(renderOperationStatus)
          )}
        </Box>
      )}

      {/* Operation Details Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Operation Details: {selectedOperation?.name}
        </DialogTitle>
        <DialogContent>
          {selectedOperation && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Configuration
              </Typography>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                {JSON.stringify(selectedOperation.parameters, null, 2)}
              </pre>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default BulkAgentConfiguration;