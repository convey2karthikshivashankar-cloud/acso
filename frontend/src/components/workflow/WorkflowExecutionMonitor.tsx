import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  AlertTitle,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Stop,
  Refresh,
  CheckCircle,
  Error,
  Warning,
  Schedule,
  Timeline as TimelineIcon,
  Speed,
  Memory,
  Storage,
  ExpandMore,
  Visibility,
  Download,
  BugReport,
  RestartAlt,
} from '@mui/icons-material';
import { Workflow, WorkflowNode } from './WorkflowDesigner';

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  progress: number;
  currentNode?: string;
  nodeExecutions: NodeExecution[];
  variables: Record<string, any>;
  metadata: {
    triggeredBy: string;
    triggerType: 'manual' | 'scheduled' | 'event';
    environment: string;
    version: string;
  };
  metrics: {
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
    skippedNodes: number;
    averageNodeDuration: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  logs: ExecutionLog[];
}

export interface NodeExecution {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'retrying';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  retryCount: number;
  maxRetries: number;
  input?: any;
  output?: any;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  metrics?: {
    memoryUsed: number;
    cpuTime: number;
    ioOperations: number;
  };
}

export interface ExecutionLog {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  nodeId?: string;
  metadata?: Record<string, any>;
}

interface WorkflowExecutionMonitorProps {
  execution: WorkflowExecution;
  workflow?: Workflow;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onRestart?: () => void;
  onRetryNode?: (nodeId: string) => void;
  autoRefresh?: boolean;
}

interface ExecutionTimelineProps {
  execution: WorkflowExecution;
  onNodeClick?: (nodeExecution: NodeExecution) => void;
}

interface NodeExecutionDetailsProps {
  nodeExecution: NodeExecution | null;
  onClose: () => void;
  onRetry?: () => void;
}

interface ExecutionMetricsProps {
  execution: WorkflowExecution;
}

const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({
  execution,
  onNodeClick,
}) => {
  const theme = useTheme();

  const getStatusColor = (status: NodeExecution['status']) => {
    switch (status) {
      case 'completed': return theme.palette.success.main;
      case 'failed': return theme.palette.error.main;
      case 'running': return theme.palette.info.main;
      case 'retrying': return theme.palette.warning.main;
      case 'skipped': return theme.palette.grey[500];
      default: return theme.palette.grey[300];
    }
  };

  const getStatusIcon = (status: NodeExecution['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle />;
      case 'failed': return <Error />;
      case 'running': return <CircularProgress size={20} />;
      case 'retrying': return <RestartAlt />;
      case 'skipped': return <Warning />;
      default: return <Schedule />;
    }
  };

  return (
    <List>
      {execution.nodeExecutions
        .sort((a, b) => (a.startTime?.getTime() || 0) - (b.startTime?.getTime() || 0))
        .map((nodeExecution, index) => (
          <ListItem key={nodeExecution.id} sx={{ flexDirection: 'column', alignItems: 'stretch', py: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Box sx={{ 
                width: 32, 
                height: 32, 
                borderRadius: '50%', 
                bgcolor: getStatusColor(nodeExecution.status),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2
              }}>
                {getStatusIcon(nodeExecution.status)}
              </Box>
              <Typography variant="body2" color="text.secondary">
                {nodeExecution.startTime?.toLocaleTimeString() || 'Pending'}
              </Typography>
            </Box>
            
            <Box sx={{ ml: 5 }}>
              <Card
                sx={{
                  cursor: onNodeClick ? 'pointer' : 'default',
                  '&:hover': onNodeClick ? {
                    boxShadow: theme.shadows[4],
                  } : {},
                }}
                onClick={() => onNodeClick?.(nodeExecution)}
              >
                <CardContent sx={{ pb: '16px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6">
                      {nodeExecution.nodeName}
                    </Typography>
                    <Chip
                      label={nodeExecution.status}
                      size="small"
                      sx={{
                        backgroundColor: alpha(getStatusColor(nodeExecution.status), 0.1),
                        color: getStatusColor(nodeExecution.status),
                      }}
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Type: {nodeExecution.nodeType}
                  </Typography>
                  
                  {nodeExecution.duration && (
                    <Typography variant="body2" color="text.secondary">
                      Duration: {nodeExecution.duration}ms
                    </Typography>
                  )}
                  
                  {nodeExecution.retryCount > 0 && (
                    <Typography variant="body2" color="warning.main">
                      Retries: {nodeExecution.retryCount}/{nodeExecution.maxRetries}
                    </Typography>
                  )}
                  
                  {nodeExecution.error && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      {nodeExecution.error.message}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Box>
          </ListItem>
        ))}
    </List>
  );
};

const NodeExecutionDetails: React.FC<NodeExecutionDetailsProps> = ({
  nodeExecution,
  onClose,
  onRetry,
}) => {
  if (!nodeExecution) return null;

  return (
    <Dialog open={!!nodeExecution} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Node Execution Details - {nodeExecution.nodeName}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Status Information
          </Typography>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>
                  <Chip label={nodeExecution.status} size="small" />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Start Time</TableCell>
                <TableCell>{nodeExecution.startTime?.toLocaleString() || 'Not started'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>End Time</TableCell>
                <TableCell>{nodeExecution.endTime?.toLocaleString() || 'Not completed'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Duration</TableCell>
                <TableCell>{nodeExecution.duration ? `${nodeExecution.duration}ms` : 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Retry Count</TableCell>
                <TableCell>{nodeExecution.retryCount}/{nodeExecution.maxRetries}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>

        {nodeExecution.input && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Input Data
            </Typography>
            <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
              <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                {JSON.stringify(nodeExecution.input, null, 2)}
              </pre>
            </Paper>
          </Box>
        )}

        {nodeExecution.output && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Output Data
            </Typography>
            <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
              <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                {JSON.stringify(nodeExecution.output, null, 2)}
              </pre>
            </Paper>
          </Box>
        )}

        {nodeExecution.error && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Error Details
            </Typography>
            <Alert severity="error">
              <AlertTitle>{nodeExecution.error.code || 'Error'}</AlertTitle>
              {nodeExecution.error.message}
            </Alert>
            {nodeExecution.error.stack && (
              <Paper sx={{ p: 2, mt: 2, backgroundColor: 'error.light' }}>
                <pre style={{ margin: 0, fontSize: '0.75rem', color: 'white' }}>
                  {nodeExecution.error.stack}
                </pre>
              </Paper>
            )}
          </Box>
        )}

        {nodeExecution.metrics && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Performance Metrics
            </Typography>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell>Memory Used</TableCell>
                  <TableCell>{nodeExecution.metrics.memoryUsed} MB</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>CPU Time</TableCell>
                  <TableCell>{nodeExecution.metrics.cpuTime} ms</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>I/O Operations</TableCell>
                  <TableCell>{nodeExecution.metrics.ioOperations}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {nodeExecution.status === 'failed' && onRetry && (
          <Button
            startIcon={<RestartAlt />}
            onClick={onRetry}
            color="warning"
          >
            Retry Node
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

const ExecutionMetrics: React.FC<ExecutionMetricsProps> = ({ execution }) => {
  const theme = useTheme();

  const getProgressColor = (value: number, threshold: number = 80) => {
    return value > threshold ? 'error' : value > 60 ? 'warning' : 'primary';
  };

  return (
    <Card>
      <CardHeader title="Execution Metrics" />
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Progress Overview */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Progress Overview
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" gutterBottom>
                  Overall Progress: {Math.round(execution.progress)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={execution.progress}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Typography variant="h6">
                {execution.metrics.completedNodes}/{execution.metrics.totalNodes}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Chip
                label={`${execution.metrics.completedNodes} Completed`}
                color="success"
                size="small"
              />
              <Chip
                label={`${execution.metrics.failedNodes} Failed`}
                color="error"
                size="small"
              />
              <Chip
                label={`${execution.metrics.skippedNodes} Skipped`}
                color="default"
                size="small"
              />
            </Box>
          </Box>

          {/* Performance Metrics */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Performance Metrics
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Memory color="primary" />
                  <Typography variant="body2">
                    Memory Usage: {execution.metrics.memoryUsage}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={execution.metrics.memoryUsage}
                  color={getProgressColor(execution.metrics.memoryUsage)}
                />
              </Box>
              
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Speed color="primary" />
                  <Typography variant="body2">
                    CPU Usage: {execution.metrics.cpuUsage}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={execution.metrics.cpuUsage}
                  color={getProgressColor(execution.metrics.cpuUsage)}
                />
              </Box>
            </Box>
          </Box>

          {/* Timing Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Timing Information
            </Typography>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell>Start Time</TableCell>
                  <TableCell>{execution.startTime.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>End Time</TableCell>
                  <TableCell>{execution.endTime?.toLocaleString() || 'Running'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Duration</TableCell>
                  <TableCell>
                    {execution.duration ? `${Math.round(execution.duration / 1000)}s` : 'In progress'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Average Node Duration</TableCell>
                  <TableCell>{Math.round(execution.metrics.averageNodeDuration)}ms</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export const WorkflowExecutionMonitor: React.FC<WorkflowExecutionMonitorProps> = ({
  execution,
  workflow,
  onPause,
  onResume,
  onStop,
  onRestart,
  onRetryNode,
  autoRefresh = true,
}) => {
  const theme = useTheme();
  const [selectedNodeExecution, setSelectedNodeExecution] = React.useState<NodeExecution | null>(null);
  const [showLogs, setShowLogs] = React.useState(false);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && (execution.status === 'running' || execution.status === 'pending')) {
      interval = setInterval(() => {
        // In real app, refresh execution data
        console.log('Refreshing execution data...');
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, execution.status]);

  const getStatusColor = (status: WorkflowExecution['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'running': return 'info';
      case 'paused': return 'warning';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: WorkflowExecution['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle />;
      case 'failed': return <Error />;
      case 'running': return <CircularProgress size={20} />;
      case 'paused': return <Pause />;
      case 'cancelled': return <Stop />;
      default: return <Schedule />;
    }
  };

  const handleRetryNode = (nodeExecution: NodeExecution) => {
    if (onRetryNode) {
      onRetryNode(nodeExecution.nodeId);
    }
    setSelectedNodeExecution(null);
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, borderRadius: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {getStatusIcon(execution.status)}
            <Box>
              <Typography variant="h6">
                {execution.workflowName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Execution ID: {execution.id}
              </Typography>
            </Box>
            <Chip
              label={execution.status.toUpperCase()}
              color={getStatusColor(execution.status) as any}
              variant="outlined"
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {execution.status === 'running' && onPause && (
              <Button startIcon={<Pause />} onClick={onPause}>
                Pause
              </Button>
            )}
            {execution.status === 'paused' && onResume && (
              <Button startIcon={<PlayArrow />} onClick={onResume}>
                Resume
              </Button>
            )}
            {(execution.status === 'running' || execution.status === 'paused') && onStop && (
              <Button startIcon={<Stop />} onClick={onStop} color="error">
                Stop
              </Button>
            )}
            {(execution.status === 'completed' || execution.status === 'failed' || execution.status === 'cancelled') && onRestart && (
              <Button startIcon={<RestartAlt />} onClick={onRestart}>
                Restart
              </Button>
            )}
            <Button startIcon={<Visibility />} onClick={() => setShowLogs(true)}>
              Logs
            </Button>
            <Button startIcon={<Download />}>
              Export
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Content */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Timeline */}
        <Box sx={{ flex: 2, overflow: 'auto', p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Execution Timeline
          </Typography>
          <ExecutionTimeline
            execution={execution}
            onNodeClick={setSelectedNodeExecution}
          />
        </Box>

        {/* Metrics */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2, borderLeft: 1, borderColor: 'divider' }}>
          <ExecutionMetrics execution={execution} />
        </Box>
      </Box>

      {/* Node Details Dialog */}
      <NodeExecutionDetails
        nodeExecution={selectedNodeExecution}
        onClose={() => setSelectedNodeExecution(null)}
        onRetry={() => handleRetryNode(selectedNodeExecution!)}
      />

      {/* Logs Dialog */}
      <Dialog
        open={showLogs}
        onClose={() => setShowLogs(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { height: '80vh' } }}
      >
        <DialogTitle>Execution Logs</DialogTitle>
        <DialogContent>
          <List>
            {execution.logs.map((log) => (
              <ListItem key={log.id} divider>
                <ListItemIcon>
                  {log.level === 'error' ? <Error color="error" /> :
                   log.level === 'warn' ? <Warning color="warning" /> :
                   <CheckCircle color="success" />}
                </ListItemIcon>
                <ListItemText
                  primary={log.message}
                  secondary={`${log.timestamp.toLocaleString()} - ${log.level.toUpperCase()}`}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLogs(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};