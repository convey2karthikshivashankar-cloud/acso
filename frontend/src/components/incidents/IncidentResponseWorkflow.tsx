import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  StepButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Badge,
  LinearProgress,
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
  Info,
  Schedule,
  Person,
  Group,
  Security,
  Build,
  Assessment,
  Visibility,
  Edit,
  Delete,
  Add,
  ExpandMore,
  Approval,
  AutoMode,
  ManualMode,
  Timeline,
} from '@mui/icons-material';

export interface ResponseAction {
  id: string;
  name: string;
  description: string;
  type: 'manual' | 'automated' | 'approval';
  category: 'containment' | 'eradication' | 'recovery' | 'investigation' | 'communication';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped' | 'cancelled';
  assignee?: {
    id: string;
    name: string;
    role: string;
  };
  estimatedDuration?: number; // in minutes
  actualDuration?: number;
  startTime?: Date;
  endTime?: Date;
  dependencies?: string[]; // IDs of actions that must complete first
  approvals?: {
    required: boolean;
    approvers: string[];
    approved: boolean;
    approvedBy?: string;
    approvedAt?: Date;
    comments?: string;
  };
  automation?: {
    scriptId: string;
    parameters: Record<string, any>;
    logs?: string[];
  };
  evidence?: {
    type: string;
    name: string;
    url: string;
  }[];
  notes?: string;
}

export interface ResponsePlaybook {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
  actions: ResponseAction[];
  triggers?: {
    severity: string[];
    type: string[];
    tags: string[];
  };
  sla?: {
    containment: number; // minutes
    eradication: number;
    recovery: number;
  };
}

interface IncidentResponseWorkflowProps {
  incidentId: string;
  playbook?: ResponsePlaybook;
  actions: ResponseAction[];
  onSelectPlaybook?: (playbookId: string) => void;
  onExecuteAction?: (actionId: string) => void;
  onPauseAction?: (actionId: string) => void;
  onSkipAction?: (actionId: string) => void;
  onApproveAction?: (actionId: string, comments?: string) => void;
  onRejectAction?: (actionId: string, reason: string) => void;
  onAddAction?: (action: Omit<ResponseAction, 'id'>) => void;
  onEditAction?: (actionId: string, action: Partial<ResponseAction>) => void;
  onDeleteAction?: (actionId: string) => void;
  onUpdateNotes?: (actionId: string, notes: string) => void;
}

interface ActionItemProps {
  action: ResponseAction;
  canExecute: boolean;
  onExecute?: (actionId: string) => void;
  onPause?: (actionId: string) => void;
  onSkip?: (actionId: string) => void;
  onApprove?: (actionId: string, comments?: string) => void;
  onReject?: (actionId: string, reason: string) => void;
  onEdit?: (actionId: string, action: Partial<ResponseAction>) => void;
  onDelete?: (actionId: string) => void;
  onUpdateNotes?: (actionId: string, notes: string) => void;
}

interface PlaybookSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (playbookId: string) => void;
  playbooks: ResponsePlaybook[];
}

const ActionItem: React.FC<ActionItemProps> = ({
  action,
  canExecute,
  onExecute,
  onPause,
  onSkip,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  onUpdateNotes,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = React.useState(false);
  const [approvalDialog, setApprovalDialog] = React.useState(false);
  const [approvalComments, setApprovalComments] = React.useState('');
  const [rejectDialog, setRejectDialog] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState('');
  const [notesDialog, setNotesDialog] = React.useState(false);
  const [notes, setNotes] = React.useState(action.notes || '');

  const getStatusIcon = (status: ResponseAction['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'failed':
        return <Error color="error" />;
      case 'in_progress':
        return <Schedule color="info" />;
      case 'cancelled':
        return <Stop color="disabled" />;
      case 'skipped':
        return <Warning color="warning" />;
      default:
        return <Schedule color="disabled" />;
    }
  };

  const getStatusColor = (status: ResponseAction['status']) => {
    switch (status) {
      case 'completed':
        return theme.palette.success.main;
      case 'failed':
        return theme.palette.error.main;
      case 'in_progress':
        return theme.palette.info.main;
      case 'cancelled':
        return theme.palette.grey[500];
      case 'skipped':
        return theme.palette.warning.main;
      default:
        return theme.palette.grey[300];
    }
  };

  const getPriorityColor = (priority: ResponseAction['priority']) => {
    switch (priority) {
      case 'critical':
        return theme.palette.error.main;
      case 'high':
        return theme.palette.warning.main;
      case 'medium':
        return theme.palette.info.main;
      case 'low':
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getTypeIcon = (type: ResponseAction['type']) => {
    switch (type) {
      case 'automated':
        return <AutoMode />;
      case 'approval':
        return <Approval />;
      default:
        return <ManualMode />;
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleApprove = () => {
    onApprove?.(action.id, approvalComments);
    setApprovalDialog(false);
    setApprovalComments('');
  };

  const handleReject = () => {
    onReject?.(action.id, rejectReason);
    setRejectDialog(false);
    setRejectReason('');
  };

  const handleUpdateNotes = () => {
    onUpdateNotes?.(action.id, notes);
    setNotesDialog(false);
  };

  const progress = action.startTime && action.estimatedDuration ? 
    Math.min(100, ((Date.now() - action.startTime.getTime()) / (action.estimatedDuration * 60000)) * 100) : 0;

  return (
    <Card
      sx={{
        mb: 2,
        borderLeft: `4px solid ${getPriorityColor(action.priority)}`,
        opacity: action.status === 'skipped' || action.status === 'cancelled' ? 0.6 : 1,
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {getStatusIcon(action.status)}
              <Typography variant="h6">{action.name}</Typography>
              <Chip
                icon={getTypeIcon(action.type)}
                label={action.type}
                size="small"
                variant="outlined"
              />
              <Chip
                label={action.priority.toUpperCase()}
                size="small"
                sx={{
                  backgroundColor: alpha(getPriorityColor(action.priority), 0.1),
                  color: getPriorityColor(action.priority),
                }}
              />
              <Chip label={action.category} size="small" variant="outlined" />
            </Box>
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {action.description}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
              {action.assignee && (
                <Chip
                  icon={<Person />}
                  label={action.assignee.name}
                  size="small"
                  variant="outlined"
                />
              )}
              
              <Typography variant="caption" color="text.secondary">
                Est. Duration: {formatDuration(action.estimatedDuration)}
              </Typography>
              
              {action.actualDuration && (
                <Typography variant="caption" color="text.secondary">
                  Actual: {formatDuration(action.actualDuration)}
                </Typography>
              )}
              
              {action.startTime && (
                <Typography variant="caption" color="text.secondary">
                  Started: {action.startTime.toLocaleTimeString()}
                </Typography>
              )}
            </Box>
            
            {action.status === 'in_progress' && action.estimatedDuration && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{ height: 6, borderRadius: 3 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {Math.round(progress)}% complete
                </Typography>
              </Box>
            )}
            
            {action.approvals?.required && (
              <Box sx={{ mt: 1 }}>
                <Chip
                  label={action.approvals.approved ? 'Approved' : 'Pending Approval'}
                  color={action.approvals.approved ? 'success' : 'warning'}
                  size="small"
                />
                {action.approvals.approvedBy && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    by {action.approvals.approvedBy}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Action Buttons */}
            {action.status === 'pending' && canExecute && (
              <>
                {action.approvals?.required && !action.approvals.approved ? (
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      onClick={() => setApprovalDialog(true)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => setRejectDialog(true)}
                    >
                      Reject
                    </Button>
                  </Box>
                ) : (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<PlayArrow />}
                    onClick={() => onExecute?.(action.id)}
                  >
                    Execute
                  </Button>
                )}
              </>
            )}
            
            {action.status === 'in_progress' && (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Pause />}
                  onClick={() => onPause?.(action.id)}
                >
                  Pause
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={() => onSkip?.(action.id)}
                >
                  Skip
                </Button>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton size="small" onClick={() => setNotesDialog(true)}>
                <Edit />
              </IconButton>
              <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                <ExpandMore sx={{ transform: expanded ? 'rotate(180deg)' : 'none' }} />
              </IconButton>
            </Box>
          </Box>
        </Box>
        
        {expanded && (
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            {action.dependencies && action.dependencies.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Dependencies
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {action.dependencies.map((depId, index) => (
                    <Chip
                      key={index}
                      label={`Action ${depId.substring(0, 8)}`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}
            
            {action.automation && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Automation Details
                </Typography>
                <Paper sx={{ p: 1, backgroundColor: 'grey.50' }}>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                    Script: {action.automation.scriptId}
                  </Typography>
                  {action.automation.logs && action.automation.logs.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption">Recent Logs:</Typography>
                      {action.automation.logs.slice(-3).map((log, index) => (
                        <Typography
                          key={index}
                          variant="caption"
                          sx={{ display: 'block', fontFamily: 'monospace' }}
                        >
                          {log}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Paper>
              </Box>
            )}
            
            {action.evidence && action.evidence.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Evidence Generated
                </Typography>
                <List dense>
                  {action.evidence.map((evidence, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Visibility />
                      </ListItemIcon>
                      <ListItemText
                        primary={evidence.name}
                        secondary={evidence.type}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
            
            {action.notes && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Notes
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {action.notes}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </CardContent>
      
      {/* Approval Dialog */}
      <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)}>
        <DialogTitle>Approve Action</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to approve "{action.name}"?
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Comments (optional)"
            value={approvalComments}
            onChange={(e) => setApprovalComments(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog(false)}>Cancel</Button>
          <Button onClick={handleApprove} variant="contained" color="success">
            Approve
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onClose={() => setRejectDialog(false)}>
        <DialogTitle>Reject Action</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Please provide a reason for rejecting "{action.name}":
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason for rejection"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            required
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog(false)}>Cancel</Button>
          <Button
            onClick={handleReject}
            variant="contained"
            color="error"
            disabled={!rejectReason.trim()}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notes Dialog */}
      <Dialog open={notesDialog} onClose={() => setNotesDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Notes</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={6}
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this action..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotesDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdateNotes} variant="contained">
            Save Notes
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

const PlaybookSelector: React.FC<PlaybookSelectorProps> = ({
  open,
  onClose,
  onSelect,
  playbooks,
}) => {
  const [selectedPlaybook, setSelectedPlaybook] = React.useState<string>('');

  const handleSelect = () => {
    if (selectedPlaybook) {
      onSelect(selectedPlaybook);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Select Response Playbook</DialogTitle>
      <DialogContent>
        <List>
          {playbooks.map((playbook) => (
            <ListItem
              key={playbook.id}
              button
              selected={selectedPlaybook === playbook.id}
              onClick={() => setSelectedPlaybook(playbook.id)}
            >
              <ListItemText
                primary={playbook.name}
                secondary={
                  <Box>
                    <Typography variant="body2">{playbook.description}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {playbook.actions.length} actions • v{playbook.version} • by {playbook.author}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSelect}
          variant="contained"
          disabled={!selectedPlaybook}
        >
          Select Playbook
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const IncidentResponseWorkflow: React.FC<IncidentResponseWorkflowProps> = ({
  incidentId,
  playbook,
  actions,
  onSelectPlaybook,
  onExecuteAction,
  onPauseAction,
  onSkipAction,
  onApproveAction,
  onRejectAction,
  onAddAction,
  onEditAction,
  onDeleteAction,
  onUpdateNotes,
}) => {
  const [playbookSelectorOpen, setPlaybookSelectorOpen] = React.useState(false);
  const [filter, setFilter] = React.useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

  // Mock playbooks for selector
  const mockPlaybooks: ResponsePlaybook[] = [
    {
      id: 'pb-1',
      name: 'Malware Incident Response',
      description: 'Standard response for malware detection and containment',
      category: 'Security',
      version: '2.1',
      author: 'Security Team',
      createdAt: new Date(),
      updatedAt: new Date(),
      actions: [],
    },
    {
      id: 'pb-2',
      name: 'Data Breach Response',
      description: 'Comprehensive response for data breach incidents',
      category: 'Security',
      version: '1.5',
      author: 'Compliance Team',
      createdAt: new Date(),
      updatedAt: new Date(),
      actions: [],
    },
  ];

  const filteredActions = React.useMemo(() => {
    if (filter === 'all') return actions;
    return actions.filter(action => action.status === filter);
  }, [actions, filter]);

  const actionsByCategory = React.useMemo(() => {
    const categories = ['containment', 'eradication', 'recovery', 'investigation', 'communication'];
    return categories.reduce((acc, category) => {
      acc[category] = filteredActions.filter(action => action.category === category);
      return acc;
    }, {} as Record<string, ResponseAction[]>);
  }, [filteredActions]);

  const getWorkflowProgress = () => {
    const total = actions.length;
    const completed = actions.filter(a => a.status === 'completed').length;
    return total > 0 ? (completed / total) * 100 : 0;
  };

  const canExecuteAction = (action: ResponseAction) => {
    if (action.status !== 'pending') return false;
    if (action.approvals?.required && !action.approvals.approved) return false;
    
    // Check dependencies
    if (action.dependencies && action.dependencies.length > 0) {
      return action.dependencies.every(depId => {
        const dep = actions.find(a => a.id === depId);
        return dep?.status === 'completed';
      });
    }
    
    return true;
  };

  return (
    <Box>
      {/* Workflow Header */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="Incident Response Workflow"
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={() => setPlaybookSelectorOpen(true)}
                disabled={!!playbook}
              >
                {playbook ? 'Playbook Selected' : 'Select Playbook'}
              </Button>
              {onAddAction && (
                <Button variant="contained" startIcon={<Add />}>
                  Add Action
                </Button>
              )}
            </Box>
          }
        />
        
        <CardContent>
          {playbook && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">{playbook.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {playbook.description}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Chip label={`v${playbook.version}`} size="small" />
                <Chip label={playbook.author} size="small" variant="outlined" />
                <Chip label={`${actions.length} actions`} size="small" variant="outlined" />
              </Box>
            </Box>
          )}
          
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Overall Progress</Typography>
              <Typography variant="body2">{Math.round(getWorkflowProgress())}%</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={getWorkflowProgress()}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Filter</InputLabel>
              <Select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
              >
                <MenuItem value="all">All Actions</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Actions by Category */}
      {Object.entries(actionsByCategory).map(([category, categoryActions]) => (
        categoryActions.length > 0 && (
          <Accordion key={category} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6">
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Typography>
                <Badge badgeContent={categoryActions.length} color="primary" />
                <Chip
                  label={`${categoryActions.filter(a => a.status === 'completed').length}/${categoryActions.length} completed`}
                  size="small"
                  color={categoryActions.every(a => a.status === 'completed') ? 'success' : 'default'}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {categoryActions.map((action) => (
                <ActionItem
                  key={action.id}
                  action={action}
                  canExecute={canExecuteAction(action)}
                  onExecute={onExecuteAction}
                  onPause={onPauseAction}
                  onSkip={onSkipAction}
                  onApprove={onApproveAction}
                  onReject={onRejectAction}
                  onEdit={onEditAction}
                  onDelete={onDeleteAction}
                  onUpdateNotes={onUpdateNotes}
                />
              ))}
            </AccordionDetails>
          </Accordion>
        )
      ))}

      {filteredActions.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            {filter === 'all' ? 'No response actions defined' : `No ${filter} actions`}
          </Typography>
          {filter === 'all' && onSelectPlaybook && (
            <Button
              variant="outlined"
              sx={{ mt: 2 }}
              onClick={() => setPlaybookSelectorOpen(true)}
            >
              Select a Playbook to Get Started
            </Button>
          )}
        </Box>
      )}

      {/* Playbook Selector Dialog */}
      <PlaybookSelector
        open={playbookSelectorOpen}
        onClose={() => setPlaybookSelectorOpen(false)}
        onSelect={onSelectPlaybook || (() => {})}
        playbooks={mockPlaybooks}
      />
    </Box>
  );
};