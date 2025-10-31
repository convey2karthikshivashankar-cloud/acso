import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
  Chip,
  IconButton,
  Button,
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
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Paper,
  Tooltip,
  Badge,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Security,
  Warning,
  Error,
  Info,
  CheckCircle,
  Timeline as TimelineIcon,
  Add,
  Edit,
  Delete,
  Visibility,
  ExpandMore,
  ExpandLess,
  FilterList,
  Search,
  Download,
  Share,
  Comment,
  Attachment,
  Person,
  Computer,
  NetworkCheck,
} from '@mui/icons-material';

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: 'detection' | 'analysis' | 'response' | 'escalation' | 'resolution' | 'system' | 'user';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: string;
  actor?: {
    type: 'user' | 'system' | 'agent';
    name: string;
    id: string;
  };
  evidence?: {
    type: 'log' | 'file' | 'screenshot' | 'network' | 'memory';
    name: string;
    size?: number;
    url?: string;
  }[];
  correlatedEvents?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface TimelineFilter {
  types?: string[];
  severities?: string[];
  sources?: string[];
  actors?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
}

interface IncidentTimelineProps {
  incidentId: string;
  events: TimelineEvent[];
  onAddEvent?: (event: Omit<TimelineEvent, 'id' | 'timestamp'>) => void;
  onEditEvent?: (eventId: string, event: Partial<TimelineEvent>) => void;
  onDeleteEvent?: (eventId: string) => void;
  onViewEvidence?: (evidence: TimelineEvent['evidence']) => void;
  readonly?: boolean;
}

interface TimelineEventItemProps {
  event: TimelineEvent;
  onEdit?: (event: TimelineEvent) => void;
  onDelete?: (eventId: string) => void;
  onViewEvidence?: (evidence: TimelineEvent['evidence']) => void;
  readonly?: boolean;
}

interface AddEventDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (event: Omit<TimelineEvent, 'id' | 'timestamp'>) => void;
}

const TimelineEventItem: React.FC<TimelineEventItemProps> = ({
  event,
  onEdit,
  onDelete,
  onViewEvidence,
  readonly = false,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = React.useState(false);

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'detection':
        return <Security />;
      case 'analysis':
        return <Search />;
      case 'response':
        return <CheckCircle />;
      case 'escalation':
        return <Warning />;
      case 'resolution':
        return <CheckCircle />;
      case 'system':
        return <Computer />;
      case 'user':
        return <Person />;
      default:
        return <Info />;
    }
  };

  const getSeverityColor = (severity: TimelineEvent['severity']) => {
    switch (severity) {
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

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <TimelineItem>
      <TimelineOppositeContent sx={{ flex: 0.3, py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {formatTimestamp(event.timestamp)}
        </Typography>
        <Chip
          label={event.severity.toUpperCase()}
          size="small"
          sx={{
            backgroundColor: alpha(getSeverityColor(event.severity), 0.1),
            color: getSeverityColor(event.severity),
            fontWeight: 'bold',
            mt: 0.5,
          }}
        />
      </TimelineOppositeContent>
      
      <TimelineSeparator>
        <TimelineDot
          sx={{
            backgroundColor: getSeverityColor(event.severity),
            color: 'white',
          }}
        >
          {getEventIcon(event.type)}
        </TimelineDot>
        <TimelineConnector />
      </TimelineSeparator>
      
      <TimelineContent sx={{ py: 2 }}>
        <Card
          sx={{
            mb: 2,
            border: `1px solid ${alpha(getSeverityColor(event.severity), 0.3)}`,
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" gutterBottom>
                  {event.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {event.description}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Chip label={event.type} size="small" variant="outlined" />
                  <Chip label={event.source} size="small" variant="outlined" />
                  {event.actor && (
                    <Chip
                      icon={event.actor.type === 'user' ? <Person /> : <Computer />}
                      label={event.actor.name}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
                
                {event.tags && event.tags.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    {event.tags.map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        size="small"
                        variant="filled"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
              
              {!readonly && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton size="small" onClick={() => onEdit?.(event)}>
                    <Edit />
                  </IconButton>
                  <IconButton size="small" onClick={() => onDelete?.(event.id)}>
                    <Delete />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => setExpanded(!expanded)}
                  >
                    {expanded ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>
              )}
            </Box>
            
            {expanded && (
              <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                {event.evidence && event.evidence.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Evidence ({event.evidence.length})
                    </Typography>
                    <List dense>
                      {event.evidence.map((evidence, index) => (
                        <ListItem key={index} divider>
                          <ListItemIcon>
                            <Attachment />
                          </ListItemIcon>
                          <ListItemText
                            primary={evidence.name}
                            secondary={`${evidence.type}${evidence.size ? ` • ${(evidence.size / 1024).toFixed(1)} KB` : ''}`}
                          />
                          <ListItemSecondaryAction>
                            <IconButton
                              size="small"
                              onClick={() => onViewEvidence?.([evidence])}
                            >
                              <Visibility />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
                
                {event.correlatedEvents && event.correlatedEvents.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Correlated Events ({event.correlatedEvents.length})
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {event.correlatedEvents.map((eventId, index) => (
                        <Chip
                          key={index}
                          label={`Event ${eventId.substring(0, 8)}`}
                          size="small"
                          variant="outlined"
                          clickable
                        />
                      ))}
                    </Box>
                  </Box>
                )}
                
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Metadata
                    </Typography>
                    <Paper
                      sx={{
                        p: 1,
                        backgroundColor: 'grey.50',
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                      }}
                    >
                      <pre>{JSON.stringify(event.metadata, null, 2)}</pre>
                    </Paper>
                  </Box>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </TimelineContent>
    </TimelineItem>
  );
};

const AddEventDialog: React.FC<AddEventDialogProps> = ({
  open,
  onClose,
  onAdd,
}) => {
  const [formData, setFormData] = React.useState({
    type: 'analysis' as TimelineEvent['type'],
    severity: 'medium' as TimelineEvent['severity'],
    title: '',
    description: '',
    source: '',
    tags: [] as string[],
  });

  const handleSubmit = () => {
    if (formData.title && formData.description) {
      onAdd(formData);
      setFormData({
        type: 'analysis',
        severity: 'medium',
        title: '',
        description: '',
        source: '',
        tags: [],
      });
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add Timeline Event</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            fullWidth
            required
          />
          
          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
            multiline
            rows={3}
            required
          />
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl sx={{ flex: 1 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as TimelineEvent['type'] })}
              >
                <MenuItem value="detection">Detection</MenuItem>
                <MenuItem value="analysis">Analysis</MenuItem>
                <MenuItem value="response">Response</MenuItem>
                <MenuItem value="escalation">Escalation</MenuItem>
                <MenuItem value="resolution">Resolution</MenuItem>
                <MenuItem value="system">System</MenuItem>
                <MenuItem value="user">User</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl sx={{ flex: 1 }}>
              <InputLabel>Severity</InputLabel>
              <Select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as TimelineEvent['severity'] })}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <TextField
            label="Source"
            value={formData.source}
            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            fullWidth
            placeholder="e.g., SIEM, Agent, Manual Investigation"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!formData.title || !formData.description}
        >
          Add Event
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const IncidentTimeline: React.FC<IncidentTimelineProps> = ({
  incidentId,
  events,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  onViewEvidence,
  readonly = false,
}) => {
  const [filter, setFilter] = React.useState<TimelineFilter>({});
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [filteredEvents, setFilteredEvents] = React.useState(events);

  React.useEffect(() => {
    let filtered = [...events];

    if (filter.types && filter.types.length > 0) {
      filtered = filtered.filter(event => filter.types!.includes(event.type));
    }

    if (filter.severities && filter.severities.length > 0) {
      filtered = filtered.filter(event => filter.severities!.includes(event.severity));
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchLower) ||
        event.description.toLowerCase().includes(searchLower) ||
        event.source.toLowerCase().includes(searchLower)
      );
    }

    if (filter.dateRange) {
      filtered = filtered.filter(event =>
        event.timestamp >= filter.dateRange!.start &&
        event.timestamp <= filter.dateRange!.end
      );
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    setFilteredEvents(filtered);
  }, [events, filter]);

  const handleAddEvent = (eventData: Omit<TimelineEvent, 'id' | 'timestamp'>) => {
    onAddEvent?.(eventData);
  };

  return (
    <Box>
      {/* Timeline Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TimelineIcon />
          <Typography variant="h6">
            Incident Timeline
          </Typography>
          <Badge badgeContent={filteredEvents.length} color="primary" />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<FilterList />} variant="outlined" size="small">
            Filter
          </Button>
          <Button startIcon={<Download />} variant="outlined" size="small">
            Export
          </Button>
          {!readonly && (
            <Button
              startIcon={<Add />}
              variant="contained"
              size="small"
              onClick={() => setAddDialogOpen(true)}
            >
              Add Event
            </Button>
          )}
        </Box>
      </Box>

      {/* Timeline */}
      <Timeline position="right">
        {filteredEvents.map((event) => (
          <TimelineEventItem
            key={event.id}
            event={event}
            onEdit={onEditEvent ? (e) => onEditEvent(e.id, e) : undefined}
            onDelete={onDeleteEvent}
            onViewEvidence={onViewEvidence}
            readonly={readonly}
          />
        ))}
      </Timeline>

      {filteredEvents.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No timeline events found
          </Typography>
          {!readonly && (
            <Button
              startIcon={<Add />}
              variant="outlined"
              sx={{ mt: 2 }}
              onClick={() => setAddDialogOpen(true)}
            >
              Add First Event
            </Button>
          )}
        </Box>
      )}

      {/* Add Event Dialog */}
      <AddEventDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onAdd={handleAddEvent}
      />
    </Box>
  );
};