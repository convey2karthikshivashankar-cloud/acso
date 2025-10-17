import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Grid,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  Tooltip,
  Badge,
  Avatar,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  Refresh,
  Assignment,
  Schedule,
  Warning,
  Error,
  CheckCircle,
  Info,
  Visibility,
  Edit,
  Delete,
  Person,
  Group,
  Timeline,
  TrendingUp,
  Security,
  BugReport,
  NetworkCheck,
  Storage,
  Speed,
  Close,
} from '@mui/icons-material';

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  category: 'security' | 'performance' | 'availability' | 'data' | 'network';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  reporter: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  dueDate?: Date;
  tags: string[];
  affectedSystems: string[];
  impactLevel: 'minimal' | 'moderate' | 'significant' | 'severe';
  estimatedResolutionTime?: number;
  actualResolutionTime?: number;
  escalationLevel: number;
  relatedIncidents: string[];
  attachments: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
  }>;
}

interface IncidentManagementDashboardProps {
  incidents?: Incident[];
  onCreateIncident?: (incident: Partial<Incident>) => void;
  onUpdateIncident?: (incidentId: string, updates: Partial<Incident>) => void;
  onDeleteIncident?: (incidentId: string) => void;
  onAssignIncident?: (incidentId: string, assigneeId: string) => void;
  onBulkAction?: (incidentIds: string[], action: string) => void;
}

interface IncidentFilters {
  search: string;
  severity: string[];
  status: string[];
  category: string[];
  assignee: string[];
  dateRange: {
    start?: Date;
    end?: Date;
  };
}

interface IncidentStatsProps {
  incidents: Incident[];
}

interface IncidentTableProps {
  incidents: Incident[];
  selectedIncidents: string[];
  onSelectIncident: (incidentId: string) => void;
  onSelectAll: (selected: boolean) => void;
  onViewIncident: (incident: Incident) => void;
  onEditIncident: (incident: Incident) => void;
  onDeleteIncident: (incident: Incident) => void;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
}

const IncidentStats: React.FC<IncidentStatsProps> = ({ incidents }) => {
  const theme = useTheme();

  const stats = React.useMemo(() => {
    const total = incidents.length;
    const open = incidents.filter(i => i.status === 'open').length;
    const investigating = incidents.filter(i => i.status === 'investigating').length;
    const resolved = incidents.filter(i => i.status === 'resolved').length;
    const closed = incidents.filter(i => i.status === 'closed').length;
    
    const critical = incidents.filter(i => i.severity === 'critical').length;
    const high = incidents.filter(i => i.severity === 'high').length;
    const medium = incidents.filter(i => i.severity === 'medium').length;
    const low = incidents.filter(i => i.severity === 'low').length;
    
    const avgResolutionTime = incidents
      .filter(i => i.actualResolutionTime)
      .reduce((acc, i) => acc + (i.actualResolutionTime || 0), 0) / 
      incidents.filter(i => i.actualResolutionTime).length || 0;
    
    const overdue = incidents.filter(i => 
      i.dueDate && new Date() > i.dueDate && !['resolved', 'closed'].includes(i.status)
    ).length;

    return {
      total,
      open,
      investigating,
      resolved,
      closed,
      critical,
      high,
      medium,
      low,
      avgResolutionTime: Math.round(avgResolutionTime / (1000 * 60 * 60)), // Convert to hours
      overdue,
    };
  }, [incidents]);

  const statCards = [
    {
      title: 'Total Incidents',
      value: stats.total,
      icon: <BugReport />,
      color: theme.palette.info.main,
    },
    {
      title: 'Open',
      value: stats.open,
      icon: <Error />,
      color: theme.palette.error.main,
    },
    {
      title: 'Investigating',
      value: stats.investigating,
      icon: <Search />,
      color: theme.palette.warning.main,
    },
    {
      title: 'Resolved',
      value: stats.resolved,
      icon: <CheckCircle />,
      color: theme.palette.success.main,
    },
    {
      title: 'Critical',
      value: stats.critical,
      icon: <Warning />,
      color: theme.palette.error.main,
    },
    {
      title: 'Avg Resolution',
      value: `${stats.avgResolutionTime}h`,
      icon: <Schedule />,
      color: theme.palette.info.main,
    },
    {
      title: 'Overdue',
      value: stats.overdue,
      icon: <Timeline />,
      color: theme.palette.warning.main,
    },
  ];

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {statCards.map((stat, index) => (
        <Grid item xs={12} sm={6} md={3} lg={12/7} key={index}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2, '&:last-child': { pb: 2 } }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  backgroundColor: alpha(stat.color, 0.1),
                  color: stat.color,
                  mr: 2,
                }}
              >
                {stat.icon}
              </Box>
              <Box>
                <Typography variant="h6" component="div">
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.title}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

const IncidentTable: React.FC<IncidentTableProps> = ({
  incidents,
  selectedIncidents,
  onSelectIncident,
  onSelectAll,
  onViewIncident,
  onEditIncident,
  onDeleteIncident,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}) => {
  const theme = useTheme();

  const getSeverityColor = (severity: Incident['severity']) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status: Incident['status']) => {
    switch (status) {
      case 'open': return 'error';
      case 'investigating': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const getCategoryIcon = (category: Incident['category']) => {
    switch (category) {
      case 'security': return <Security />;
      case 'performance': return <Speed />;
      case 'availability': return <NetworkCheck />;
      case 'data': return <Storage />;
      case 'network': return <NetworkCheck />;
      default: return <BugReport />;
    }
  };

  const isOverdue = (incident: Incident) => {
    return incident.dueDate && 
           new Date() > incident.dueDate && 
           !['resolved', 'closed'].includes(incident.status);
  };

  const paginatedIncidents = incidents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Paper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <input
                  type="checkbox"
                  checked={selectedIncidents.length === incidents.length && incidents.length > 0}
                  onChange={(e) => onSelectAll(e.target.checked)}
                />
              </TableCell>
              <TableCell>ID</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Assignee</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedIncidents.map((incident) => (
              <TableRow
                key={incident.id}
                hover
                sx={{
                  backgroundColor: isOverdue(incident) ? alpha(theme.palette.error.main, 0.05) : 'inherit',
                }}
              >
                <TableCell padding="checkbox">
                  <input
                    type="checkbox"
                    checked={selectedIncidents.includes(incident.id)}
                    onChange={() => onSelectIncident(incident.id)}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontFamily="monospace">
                      {incident.id.slice(0, 8)}
                    </Typography>
                    {isOverdue(incident) && (
                      <Tooltip title="Overdue">
                        <Warning color="error" fontSize="small" />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ maxWidth: 200 }}>
                    <Typography variant="body2" noWrap>
                      {incident.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {incident.description}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={incident.severity.toUpperCase()}
                    size="small"
                    color={getSeverityColor(incident.severity) as any}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={incident.status.toUpperCase()}
                    size="small"
                    color={getStatusColor(incident.status) as any}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getCategoryIcon(incident.category)}
                    <Typography variant="body2">
                      {incident.category}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {incident.assignee ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24 }}>
                        {incident.assignee.name.charAt(0)}
                      </Avatar>
                      <Typography variant="body2">
                        {incident.assignee.name}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Unassigned
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {incident.createdAt.toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  {incident.dueDate ? (
                    <Typography
                      variant="body2"
                      color={isOverdue(incident) ? 'error' : 'inherit'}
                    >
                      {incident.dueDate.toLocaleDateString()}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No due date
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => onViewIncident(incident)}>
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => onEditIncident(incident)}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => onDeleteIncident(incident)}>
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={incidents.length}
        page={page}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </Paper>
  );
};

export const IncidentManagementDashboard: React.FC<IncidentManagementDashboardProps> = ({
  incidents: initialIncidents = [],
  onCreateIncident,
  onUpdateIncident,
  onDeleteIncident,
  onAssignIncident,
  onBulkAction,
}) => {
  const [incidents, setIncidents] = React.useState<Incident[]>(initialIncidents);
  const [filteredIncidents, setFilteredIncidents] = React.useState<Incident[]>(initialIncidents);
  const [selectedIncidents, setSelectedIncidents] = React.useState<string[]>([]);
  const [filters, setFilters] = React.useState<IncidentFilters>({
    search: '',
    severity: [],
    status: [],
    category: [],
    assignee: [],
    dateRange: {},
  });
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [selectedIncident, setSelectedIncident] = React.useState<Incident | null>(null);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);

  React.useEffect(() => {
    // Load mock incidents if none provided
    if (initialIncidents.length === 0) {
      loadMockIncidents();
    }
  }, []);

  React.useEffect(() => {
    applyFilters();
  }, [incidents, filters]);

  const loadMockIncidents = () => {
    const mockIncidents: Incident[] = [
      {
        id: 'INC-2024-001',
        title: 'Critical Security Breach Detected',
        description: 'Unauthorized access attempt detected on production servers',
        severity: 'critical',
        status: 'investigating',
        category: 'security',
        priority: 'urgent',
        assignee: {
          id: 'user-1',
          name: 'John Smith',
        },
        reporter: {
          id: 'user-2',
          name: 'Security System',
        },
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        updatedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
        tags: ['security', 'breach', 'urgent'],
        affectedSystems: ['web-server-01', 'database-prod'],
        impactLevel: 'severe',
        estimatedResolutionTime: 4 * 60 * 60 * 1000, // 4 hours
        escalationLevel: 2,
        relatedIncidents: [],
        attachments: [],
      },
      {
        id: 'INC-2024-002',
        title: 'Database Performance Degradation',
        description: 'Query response times have increased significantly',
        severity: 'high',
        status: 'open',
        category: 'performance',
        priority: 'high',
        reporter: {
          id: 'user-3',
          name: 'Monitoring System',
        },
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + 18 * 60 * 60 * 1000), // 18 hours from now
        tags: ['performance', 'database'],
        affectedSystems: ['database-prod', 'api-gateway'],
        impactLevel: 'significant',
        estimatedResolutionTime: 8 * 60 * 60 * 1000, // 8 hours
        escalationLevel: 1,
        relatedIncidents: [],
        attachments: [],
      },
      {
        id: 'INC-2024-003',
        title: 'Network Connectivity Issues',
        description: 'Intermittent network connectivity issues reported by users',
        severity: 'medium',
        status: 'resolved',
        category: 'network',
        priority: 'medium',
        assignee: {
          id: 'user-4',
          name: 'Network Team',
        },
        reporter: {
          id: 'user-5',
          name: 'Help Desk',
        },
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        resolvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        tags: ['network', 'connectivity'],
        affectedSystems: ['network-switch-01'],
        impactLevel: 'moderate',
        actualResolutionTime: 22 * 60 * 60 * 1000, // 22 hours
        escalationLevel: 0,
        relatedIncidents: [],
        attachments: [],
      },
    ];
    
    setIncidents(mockIncidents);
  };

  const applyFilters = () => {
    let filtered = [...incidents];

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(incident =>
        incident.title.toLowerCase().includes(search) ||
        incident.description.toLowerCase().includes(search) ||
        incident.id.toLowerCase().includes(search) ||
        incident.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }

    // Severity filter
    if (filters.severity.length > 0) {
      filtered = filtered.filter(incident => filters.severity.includes(incident.severity));
    }

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(incident => filters.status.includes(incident.status));
    }

    // Category filter
    if (filters.category.length > 0) {
      filtered = filtered.filter(incident => filters.category.includes(incident.category));
    }

    // Date range filter
    if (filters.dateRange.start) {
      filtered = filtered.filter(incident => incident.createdAt >= filters.dateRange.start!);
    }
    if (filters.dateRange.end) {
      filtered = filtered.filter(incident => incident.createdAt <= filters.dateRange.end!);
    }

    setFilteredIncidents(filtered);
    setPage(0); // Reset to first page when filters change
  };

  const handleSelectIncident = (incidentId: string) => {
    setSelectedIncidents(prev =>
      prev.includes(incidentId)
        ? prev.filter(id => id !== incidentId)
        : [...prev, incidentId]
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedIncidents(selected ? filteredIncidents.map(i => i.id) : []);
  };

  const handleBulkAction = (action: string) => {
    if (onBulkAction && selectedIncidents.length > 0) {
      onBulkAction(selectedIncidents, action);
      setSelectedIncidents([]);
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      severity: [],
      status: [],
      category: [],
      assignee: [],
      dateRange: {},
    });
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, borderRadius: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h5">Incident Management</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<Add />}
              variant="contained"
              onClick={() => setShowCreateDialog(true)}
            >
              Create Incident
            </Button>
            <Button startIcon={<Refresh />}>
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search incidents..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ minWidth: 250 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Severity</InputLabel>
            <Select
              multiple
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value as string[] })}
            >
              <MenuItem value="critical">Critical</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              multiple
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as string[] })}
            >
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="investigating">Investigating</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Category</InputLabel>
            <Select
              multiple
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value as string[] })}
            >
              <MenuItem value="security">Security</MenuItem>
              <MenuItem value="performance">Performance</MenuItem>
              <MenuItem value="availability">Availability</MenuItem>
              <MenuItem value="data">Data</MenuItem>
              <MenuItem value="network">Network</MenuItem>
            </Select>
          </FormControl>
          
          <Button onClick={clearFilters}>Clear Filters</Button>
        </Box>

        {/* Bulk Actions */}
        {selectedIncidents.length > 0 && (
          <Box sx={{ mt: 2, p: 1, backgroundColor: 'action.selected', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2">
                {selectedIncidents.length} incident(s) selected
              </Typography>
              <Button size="small" onClick={() => handleBulkAction('assign')}>
                Bulk Assign
              </Button>
              <Button size="small" onClick={() => handleBulkAction('close')}>
                Bulk Close
              </Button>
              <Button size="small" onClick={() => handleBulkAction('delete')}>
                Bulk Delete
              </Button>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {/* Statistics */}
        <IncidentStats incidents={filteredIncidents} />

        {/* Incident Table */}
        <IncidentTable
          incidents={filteredIncidents}
          selectedIncidents={selectedIncidents}
          onSelectIncident={handleSelectIncident}
          onSelectAll={handleSelectAll}
          onViewIncident={setSelectedIncident}
          onEditIncident={(incident) => {
            // Handle edit
            console.log('Edit incident:', incident);
          }}
          onDeleteIncident={(incident) => {
            if (onDeleteIncident) {
              onDeleteIncident(incident.id);
            }
          }}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
        />
      </Box>

      {/* Incident Details Dialog */}
      <Dialog
        open={!!selectedIncident}
        onClose={() => setSelectedIncident(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              Incident Details - {selectedIncident?.id}
            </Typography>
            <IconButton onClick={() => setSelectedIncident(null)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedIncident && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedIncident.title}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedIncident.description}
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Severity</Typography>
                  <Chip
                    label={selectedIncident.severity.toUpperCase()}
                    color={
                      selectedIncident.severity === 'critical' ? 'error' :
                      selectedIncident.severity === 'high' ? 'warning' :
                      selectedIncident.severity === 'medium' ? 'info' : 'success'
                    }
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Status</Typography>
                  <Chip label={selectedIncident.status.toUpperCase()} />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Category</Typography>
                  <Typography>{selectedIncident.category}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Priority</Typography>
                  <Typography>{selectedIncident.priority}</Typography>
                </Grid>
              </Grid>
              
              <Typography variant="subtitle2" gutterBottom>
                Affected Systems
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
                {selectedIncident.affectedSystems.map((system) => (
                  <Chip key={system} label={system} size="small" variant="outlined" />
                ))}
              </Box>
              
              <Typography variant="subtitle2" gutterBottom>
                Tags
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {selectedIncident.tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedIncident(null)}>Close</Button>
          <Button variant="contained">Edit Incident</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};