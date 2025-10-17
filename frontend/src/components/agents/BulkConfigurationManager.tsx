import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Chip,
  Alert,
  AlertTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  IconButton,
  Badge,
  useTheme,
  alpha,
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Stop,
  CheckCircle,
  Error,
  Warning,
  Schedule,
  Settings,
  Group,
  FilterList,
  ExpandMore,
  Visibility,
  Edit,
  Delete,
  Download,
  Upload,
  Refresh,
  Close,
  Save,
  Cancel,
} from '@mui/icons-material';
import { Agent } from '../../types';
import { AgentConfiguration, ConfigurationTemplate } from './AgentConfigurationManager';

export interface BulkOperation {
  id: string;
  name: string;
  description: string;
  type: 'apply_template' | 'update_config' | 'rollback' | 'enable_disable';
  targetAgents: string[];
  configuration?: Partial<AgentConfiguration['config']>;
  templateId?: string;
  rollbackToVersion?: string;
  enableAgent?: boolean;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  results: BulkOperationResult[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;
  estimatedDuration?: number;
  actualDuration?: number;
}

export interface BulkOperationResult {
  agentId: string;
  agentName: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  message?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  rollbackAvailable?: boolean;
}

interface BulkConfigurationManagerProps {
  agents: Agent[];
  templates: ConfigurationTemplate[];
  open: boolean;
  onClose: () => void;
  onExecuteOperation?: (operation: BulkOperation) => Promise<void>;
}

interface AgentSelectionProps {
  agents: Agent[];
  selectedAgents: string[];
  onSelectionChange: (agentIds: string[]) => void;
  filters: {
    status?: string;
    type?: string;
    group?: string;
  };
  onFiltersChange: (filters: any) => void;
}

interface OperationConfigurationProps {
  operationType: BulkOperation['type'];
  templates: ConfigurationTemplate[];
  selectedTemplate?: string;
  customConfig?: Partial<AgentConfiguration['config']>;
  onTemplateChange: (templateId: string) => void;
  onConfigChange: (config: Partial<AgentConfiguration['config']>) => void;
}

interface OperationProgressProps {
  operation: BulkOperation;
  onCancel: () => void;
  onRetry: (agentIds: string[]) => void;
}

const AgentSelection: React.FC<AgentSelectionProps> = ({
  agents,
  selectedAgents,
  onSelectionChange,
  filters,
  onFiltersChange,
}) => {
  const [selectAll, setSelectAll] = React.useState(false);

  const filteredAgents = React.useMemo(() => {
    return agents.filter(agent => {
      if (filters.status && agent.status !== filters.status) return false;
      if (filters.type && agent.type !== filters.type) return false;
      if (filters.group && agent.group !== filters.group) return false;
      return true;
    });
  }, [agents, filters]);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      onSelectionChange(filteredAgents.map(agent => agent.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleAgentToggle = (agentId: string) => {
    const newSelection = selectedAgents.includes(agentId)
      ? selectedAgents.filter(id => id !== agentId)
      : [...selectedAgents, agentId];
    onSelectionChange(newSelection);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'success';
      case 'offline': return 'error';
      case 'warning': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box>
      {/* Filters */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filter Agents
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status || ''}
                  onChange={(e) => onFiltersChange({ ...filters, status: e.target.value || undefined })}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="online">Online</MenuItem>
                  <MenuItem value="offline">Offline</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={filters.type || ''}
                  onChange={(e) => onFiltersChange({ ...filters, type: e.target.value || undefined })}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="threat-hunter">Threat Hunter</MenuItem>
                  <MenuItem value="incident-response">Incident Response</MenuItem>
                  <MenuItem value="service-orchestration">Service Orchestration</MenuItem>
                  <MenuItem value="financial-intelligence">Financial Intelligence</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Group</InputLabel>
                <Select
                  value={filters.group || ''}
                  onChange={(e) => onFiltersChange({ ...filters, group: e.target.value || undefined })}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="production">Production</MenuItem>
                  <MenuItem value="staging">Staging</MenuItem>
                  <MenuItem value="development">Development</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Agent Selection */}
      <Card>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">
                Select Agents ({selectedAgents.length} of {filteredAgents.length})
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectAll}
                    indeterminate={selectedAgents.length > 0 && selectedAgents.length < filteredAgents.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                }
                label="Select All"
              />
            </Box>
          }
        />
        <CardContent sx={{ p: 0 }}>
          <List>
            {filteredAgents.map((agent) => (
              <ListItem key={agent.id} divider>
                <ListItemIcon>
                  <Checkbox
                    checked={selectedAgents.includes(agent.id)}
                    onChange={() => handleAgentToggle(agent.id)}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={agent.name}
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Chip
                        label={agent.status}
                        size="small"
                        color={getStatusColor(agent.status) as any}
                        variant="outlined"
                      />
                      <Chip
                        label={agent.type}
                        size="small"
                        variant="outlined"
                      />
                      {agent.group && (
                        <Chip
                          label={agent.group}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Typography variant="caption" color="text.secondary">
                    Last seen: {agent.lastSeen?.toLocaleString() || 'Never'}
                  </Typography>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};

const OperationConfiguration: React.FC<OperationConfigurationProps> = ({
  operationType,
  templates,
  selectedTemplate,
  customConfig,
  onTemplateChange,
  onConfigChange,
}) => {
  const renderTemplateSelection = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select Template
      </Typography>
      <Grid container spacing={2}>
        {templates.map((template) => (
          <Grid item xs={12} sm={6} md={4} key={template.id}>
            <Card
              sx={{
                cursor: 'pointer',
                border: selectedTemplate === template.id ? 2 : 1,
                borderColor: selectedTemplate === template.id ? 'primary.main' : 'divider',
              }}
              onClick={() => onTemplateChange(template.id)}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {template.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {template.description}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Chip
                    label={template.category}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <Typography variant="caption" color="text.secondary">
                    Used {template.usageCount} times
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderCustomConfiguration = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Custom Configuration
      </Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        <AlertTitle>Configuration Override</AlertTitle>
        Specify the configuration values you want to update. Only the fields you specify will be changed.
      </Alert>
      <TextField
        fullWidth
        multiline
        rows={10}
        label="Configuration JSON"
        value={JSON.stringify(customConfig || {}, null, 2)}
        onChange={(e) => {
          try {
            const config = JSON.parse(e.target.value);
            onConfigChange(config);
          } catch (error) {
            // Invalid JSON, don't update
          }
        }}
        helperText="Enter valid JSON configuration"
        sx={{ fontFamily: 'monospace' }}
      />
    </Box>
  );

  switch (operationType) {
    case 'apply_template':
      return renderTemplateSelection();
    case 'update_config':
      return renderCustomConfiguration();
    case 'enable_disable':
      return (
        <Box>
          <Typography variant="h6" gutterBottom>
            Agent Control
          </Typography>
          <FormControlLabel
            control={<Checkbox />}
            label="Enable selected agents"
          />
        </Box>
      );
    default:
      return null;
  }
};

const OperationProgress: React.FC<OperationProgressProps> = ({
  operation,
  onCancel,
  onRetry,
}) => {
  const theme = useTheme();

  const getStatusColor = (status: BulkOperationResult['status']) => {
    switch (status) {
      case 'success': return theme.palette.success.main;
      case 'failed': return theme.palette.error.main;
      case 'running': return theme.palette.info.main;
      case 'skipped': return theme.palette.warning.main;
      default: return theme.palette.grey[500];
    }
  };

  const getStatusIcon = (status: BulkOperationResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle color="success" />;
      case 'failed': return <Error color="error" />;
      case 'running': return <Schedule color="info" />;
      case 'skipped': return <Warning color="warning" />;
      default: return <Schedule color="disabled" />;
    }
  };

  const successCount = operation.results.filter(r => r.status === 'success').length;
  const failedCount = operation.results.filter(r => r.status === 'failed').length;
  const runningCount = operation.results.filter(r => r.status === 'running').length;
  const pendingCount = operation.results.filter(r => r.status === 'pending').length;

  return (
    <Box>
      {/* Progress Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">
              {operation.name}
            </Typography>
            <Chip
              label={operation.status}
              color={
                operation.status === 'completed' ? 'success' :
                operation.status === 'failed' ? 'error' :
                operation.status === 'running' ? 'info' : 'default'
              }
            />
          </Box>
          
          <LinearProgress
            variant="determinate"
            value={operation.progress}
            sx={{ mb: 2, height: 8, borderRadius: 4 }}
          />
          
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {successCount}
                </Typography>
                <Typography variant="caption">Success</Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="error.main">
                  {failedCount}
                </Typography>
                <Typography variant="caption">Failed</Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">
                  {runningCount}
                </Typography>
                <Typography variant="caption">Running</Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="text.secondary">
                  {pendingCount}
                </Typography>
                <Typography variant="caption">Pending</Typography>
              </Box>
            </Grid>
          </Grid>
          
          {operation.status === 'running' && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button
                startIcon={<Stop />}
                color="error"
                onClick={onCancel}
              >
                Cancel Operation
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <Card>
        <CardHeader
          title="Operation Results"
          action={
            failedCount > 0 && (
              <Button
                startIcon={<Refresh />}
                onClick={() => onRetry(operation.results.filter(r => r.status === 'failed').map(r => r.agentId))}
              >
                Retry Failed
              </Button>
            )
          }
        />
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Agent</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {operation.results.map((result) => (
                  <TableRow key={result.agentId}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusIcon(result.status)}
                        {result.agentName}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={result.status}
                        size="small"
                        sx={{
                          bgcolor: alpha(getStatusColor(result.status), 0.1),
                          color: getStatusColor(result.status),
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {result.error ? (
                        <Typography variant="body2" color="error">
                          {result.error}
                        </Typography>
                      ) : (
                        <Typography variant="body2">
                          {result.message || 'No message'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {result.duration ? `${result.duration}ms` : '-'}
                    </TableCell>
                    <TableCell>
                      {result.rollbackAvailable && (
                        <Button size="small" startIcon={<Refresh />}>
                          Rollback
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export const BulkConfigurationManager: React.FC<BulkConfigurationManagerProps> = ({
  agents,
  templates,
  open,
  onClose,
  onExecuteOperation,
}) => {
  const [activeStep, setActiveStep] = React.useState(0);
  const [selectedAgents, setSelectedAgents] = React.useState<string[]>([]);
  const [operationType, setOperationType] = React.useState<BulkOperation['type']>('apply_template');
  const [selectedTemplate, setSelectedTemplate] = React.useState<string>('');
  const [customConfig, setCustomConfig] = React.useState<Partial<AgentConfiguration['config']>>({});
  const [operationName, setOperationName] = React.useState('');
  const [operationDescription, setOperationDescription] = React.useState('');
  const [currentOperation, setCurrentOperation] = React.useState<BulkOperation | null>(null);
  const [filters, setFilters] = React.useState({});

  const steps = [
    'Select Agents',
    'Configure Operation',
    'Review & Execute',
    'Monitor Progress',
  ];

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleExecute = async () => {
    const operation: BulkOperation = {
      id: `bulk-op-${Date.now()}`,
      name: operationName || `Bulk ${operationType}`,
      description: operationDescription,
      type: operationType,
      targetAgents: selectedAgents,
      configuration: operationType === 'update_config' ? customConfig : undefined,
      templateId: operationType === 'apply_template' ? selectedTemplate : undefined,
      status: 'pending',
      progress: 0,
      results: selectedAgents.map(agentId => ({
        agentId,
        agentName: agents.find(a => a.id === agentId)?.name || 'Unknown',
        status: 'pending',
      })),
      createdAt: new Date(),
      createdBy: 'current-user',
      estimatedDuration: selectedAgents.length * 5000, // 5 seconds per agent
    };

    setCurrentOperation(operation);
    handleNext();

    if (onExecuteOperation) {
      await onExecuteOperation(operation);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <AgentSelection
            agents={agents}
            selectedAgents={selectedAgents}
            onSelectionChange={setSelectedAgents}
            filters={filters}
            onFiltersChange={setFilters}
          />
        );
      case 1:
        return (
          <Box>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Operation Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Operation Name"
                      value={operationName}
                      onChange={(e) => setOperationName(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Operation Type</InputLabel>
                      <Select
                        value={operationType}
                        onChange={(e) => setOperationType(e.target.value as BulkOperation['type'])}
                      >
                        <MenuItem value="apply_template">Apply Template</MenuItem>
                        <MenuItem value="update_config">Update Configuration</MenuItem>
                        <MenuItem value="rollback">Rollback</MenuItem>
                        <MenuItem value="enable_disable">Enable/Disable</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Description"
                      value={operationDescription}
                      onChange={(e) => setOperationDescription(e.target.value)}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            
            <OperationConfiguration
              operationType={operationType}
              templates={templates}
              selectedTemplate={selectedTemplate}
              customConfig={customConfig}
              onTemplateChange={setSelectedTemplate}
              onConfigChange={setCustomConfig}
            />
          </Box>
        );
      case 2:
        return (
          <Box>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <AlertTitle>Review Operation</AlertTitle>
              Please review the operation details before executing. This action will affect {selectedAgents.length} agents.
            </Alert>
            
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Operation Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Operation Type
                    </Typography>
                    <Typography variant="body1">
                      {operationType.replace('_', ' ').toUpperCase()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Target Agents
                    </Typography>
                    <Typography variant="body1">
                      {selectedAgents.length} agents
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Description
                    </Typography>
                    <Typography variant="body1">
                      {operationDescription || 'No description provided'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader title="Target Agents" />
              <CardContent sx={{ p: 0 }}>
                <List>
                  {selectedAgents.map((agentId) => {
                    const agent = agents.find(a => a.id === agentId);
                    return (
                      <ListItem key={agentId} divider>
                        <ListItemText
                          primary={agent?.name || 'Unknown Agent'}
                          secondary={`${agent?.type} - ${agent?.status}`}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </CardContent>
            </Card>
          </Box>
        );
      case 3:
        return currentOperation ? (
          <OperationProgress
            operation={currentOperation}
            onCancel={() => {
              // Cancel operation logic
              setCurrentOperation(null);
              onClose();
            }}
            onRetry={(agentIds) => {
              // Retry logic
              console.log('Retrying for agents:', agentIds);
            }}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { height: '90vh' } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Bulk Configuration Management</Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
              <StepContent>
                {renderStepContent(index)}
                <Box sx={{ mb: 2, mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={index === steps.length - 2 ? handleExecute : handleNext}
                    sx={{ mr: 1 }}
                    disabled={
                      (index === 0 && selectedAgents.length === 0) ||
                      (index === 1 && operationType === 'apply_template' && !selectedTemplate)
                    }
                  >
                    {index === steps.length - 2 ? 'Execute' : 'Continue'}
                  </Button>
                  <Button
                    disabled={index === 0}
                    onClick={handleBack}
                    sx={{ mr: 1 }}
                  >
                    Back
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </DialogContent>
    </Dialog>
  );
};