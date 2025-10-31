import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  ButtonGroup,
  Chip,
  Card,
  CardContent,
  CardActions,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Slider,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search,
  FilterList,
  Sort,
  ViewList,
  ViewModule,
  AccountTree,
  Refresh,
  Add,
  MoreVert,
  Computer,
  Security,
  NetworkCheck,
  Storage,
  Cloud,
  Router,
  CheckCircle,
  Warning,
  Error,
  Pause,
  PlayArrow,
  Stop,
  Settings,
  Info,
  Compare,
} from '@mui/icons-material';

// Agent interface
export interface Agent {
  id: string;
  name: string;
  type: 'supervisor' | 'threat_hunter' | 'incident_response' | 'service_orchestration' | 'financial_intelligence';
  status: 'online' | 'offline' | 'warning' | 'error' | 'maintenance';
  location: string;
  performance: {
    cpu: number;
    memory: number;
    uptime: number;
    tasksCompleted: number;
    avgResponseTime: number;
  };
  capabilities: string[];
  lastSeen: string;
  version: string;
  metadata: Record<string, any>;
}

// View modes
type ViewMode = 'grid' | 'list' | 'topology';

// Sort options
type SortOption = 'name' | 'status' | 'type' | 'location' | 'performance' | 'lastSeen';

// Filter options
interface FilterOptions {
  types: string[];
  statuses: string[];
  locations: string[];
  performanceRange: [number, number];
  capabilities: string[];
}

// Props interface
interface EnhancedAgentOverviewProps {
  agents: Agent[];
  onAgentSelect?: (agent: Agent) => void;
  onAgentAction?: (action: string, agent: Agent) => void;
  onBulkAction?: (action: string, agents: Agent[]) => void;
  onRefresh?: () => void;
}

export const EnhancedAgentOverview: React.FC<EnhancedAgentOverviewProps> = ({
  agents,
  onAgentSelect,
  onAgentAction,
  onBulkAction,
  onRefresh,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const [agentMenuAnchor, setAgentMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    types: [],
    statuses: [],
    locations: [],
    performanceRange: [0, 100],
    capabilities: [],
  });

  // Get unique values for filters
  const filterOptions = useMemo(() => {
    const types = [...new Set(agents.map(agent => agent.type))];
    const statuses = [...new Set(agents.map(agent => agent.status))];
    const locations = [...new Set(agents.map(agent => agent.location))];
    const capabilities = [...new Set(agents.flatMap(agent => agent.capabilities))];

    return { types, statuses, locations, capabilities };
  }, [agents]);

  // Filter and sort agents
  const filteredAndSortedAgents = useMemo(() => {
    let filtered = agents.filter(agent => {
      // Search filter
      const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           agent.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           agent.location.toLowerCase().includes(searchTerm.toLowerCase());

      // Type filter
      const matchesType = filters.types.length === 0 || filters.types.includes(agent.type);

      // Status filter
      const matchesStatus = filters.statuses.length === 0 || filters.statuses.includes(agent.status);

      // Location filter
      const matchesLocation = filters.locations.length === 0 || filters.locations.includes(agent.location);

      // Performance filter
      const avgPerformance = (agent.performance.cpu + agent.performance.memory) / 2;
      const matchesPerformance = avgPerformance >= filters.performanceRange[0] && 
                                avgPerformance <= filters.performanceRange[1];

      // Capabilities filter
      const matchesCapabilities = filters.capabilities.length === 0 || 
                                 filters.capabilities.some(cap => agent.capabilities.includes(cap));

      return matchesSearch && matchesType && matchesStatus && matchesLocation && 
             matchesPerformance && matchesCapabilities;
    });

    // Sort agents
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'location':
          comparison = a.location.localeCompare(b.location);
          break;
        case 'performance':
          const aPerf = (a.performance.cpu + a.performance.memory) / 2;
          const bPerf = (b.performance.cpu + b.performance.memory) / 2;
          comparison = aPerf - bPerf;
          break;
        case 'lastSeen':
          comparison = new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [agents, searchTerm, sortBy, sortOrder, filters]);

  // Handle agent selection
  const handleAgentSelect = useCallback((agentId: string) => {
    if (compareMode) {
      setSelectedAgents(prev => 
        prev.includes(agentId) 
          ? prev.filter(id => id !== agentId)
          : [...prev, agentId]
      );
    } else {
      const agent = agents.find(a => a.id === agentId);
      if (agent) {
        onAgentSelect?.(agent);
      }
    }
  }, [compareMode, agents, onAgentSelect]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      case 'offline': return 'default';
      case 'maintenance': return 'info';
      default: return 'default';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle color="success" />;
      case 'warning': return <Warning color="warning" />;
      case 'error': return <Error color="error" />;
      case 'offline': return <Pause color="disabled" />;
      case 'maintenance': return <Settings color="info" />;
      default: return <CheckCircle />;
    }
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'supervisor': return <AccountTree />;
      case 'threat_hunter': return <Security />;
      case 'incident_response': return <Warning />;
      case 'service_orchestration': return <NetworkCheck />;
      case 'financial_intelligence': return <Storage />;
      default: return <Computer />;
    }
  };

  // Render agent card
  const renderAgentCard = (agent: Agent) => (
    <Card 
      key={agent.id}
      sx={{ 
        cursor: 'pointer',
        border: selectedAgents.includes(agent.id) ? 2 : 1,
        borderColor: selectedAgents.includes(agent.id) ? 'primary.main' : 'divider',
      }}
      onClick={() => handleAgentSelect(agent.id)}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Badge
              badgeContent={getStatusIcon(agent.status)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                {getTypeIcon(agent.type)}
              </Avatar>
            </Badge>
            <Box>
              <Typography variant="h6" noWrap>
                {agent.name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {agent.type.replace('_', ' ')}
              </Typography>
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedAgent(agent);
              setAgentMenuAnchor(e.currentTarget);
            }}
          >
            <MoreVert />
          </IconButton>
        </Box>

        <Box mb={2}>
          <Typography variant="body2" gutterBottom>
            Location: {agent.location}
          </Typography>
          <Typography variant="body2" gutterBottom>
            Version: {agent.version}
          </Typography>
          <Typography variant="body2">
            Last Seen: {new Date(agent.lastSeen).toLocaleString()}
          </Typography>
        </Box>

        <Box mb={2}>
          <Typography variant="body2" gutterBottom>
            Performance
          </Typography>
          <Box display="flex" gap={2}>
            <Box flex={1}>
              <Typography variant="caption">CPU: {agent.performance.cpu}%</Typography>
              <Box sx={{ width: '100%', bgcolor: 'grey.300', borderRadius: 1, height: 4 }}>
                <Box 
                  sx={{ 
                    width: `${agent.performance.cpu}%`, 
                    bgcolor: agent.performance.cpu > 80 ? 'error.main' : 'primary.main',
                    height: '100%',
                    borderRadius: 1,
                  }} 
                />
              </Box>
            </Box>
            <Box flex={1}>
              <Typography variant="caption">Memory: {agent.performance.memory}%</Typography>
              <Box sx={{ width: '100%', bgcolor: 'grey.300', borderRadius: 1, height: 4 }}>
                <Box 
                  sx={{ 
                    width: `${agent.performance.memory}%`, 
                    bgcolor: agent.performance.memory > 80 ? 'error.main' : 'primary.main',
                    height: '100%',
                    borderRadius: 1,
                  }} 
                />
              </Box>
            </Box>
          </Box>
        </Box>

        <Box display="flex" flexWrap="wrap" gap={0.5}>
          {agent.capabilities.slice(0, 3).map(capability => (
            <Chip key={capability} label={capability} size="small" />
          ))}
          {agent.capabilities.length > 3 && (
            <Chip label={`+${agent.capabilities.length - 3}`} size="small" variant="outlined" />
          )}
        </Box>
      </CardContent>

      <CardActions>
        <Button size="small" startIcon={<PlayArrow />}>
          Start
        </Button>
        <Button size="small" startIcon={<Settings />}>
          Configure
        </Button>
        <Button size="small" startIcon={<Info />}>
          Details
        </Button>
      </CardActions>
    </Card>
  );

  // Render agent list item
  const renderAgentListItem = (agent: Agent) => (
    <ListItem
      key={agent.id}
      button
      selected={selectedAgents.includes(agent.id)}
      onClick={() => handleAgentSelect(agent.id)}
      sx={{ border: 1, borderColor: 'divider', mb: 1, borderRadius: 1 }}
    >
      <ListItemIcon>
        <Badge
          badgeContent={getStatusIcon(agent.status)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            {getTypeIcon(agent.type)}
          </Avatar>
        </Badge>
      </ListItemIcon>
      <ListItemText
        primary={agent.name}
        secondary={
          <Box>
            <Typography variant="body2">
              {agent.type.replace('_', ' ')} • {agent.location}
            </Typography>
            <Typography variant="caption">
              CPU: {agent.performance.cpu}% • Memory: {agent.performance.memory}% • 
              Uptime: {Math.floor(agent.performance.uptime / 3600)}h
            </Typography>
          </Box>
        }
      />
      <Box display="flex" alignItems="center" gap={1}>
        <Chip 
          label={agent.status} 
          size="small" 
          color={getStatusColor(agent.status) as any}
        />
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedAgent(agent);
            setAgentMenuAnchor(e.currentTarget);
          }}
        >
          <MoreVert />
        </IconButton>
      </Box>
    </ListItem>
  );

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4">
          Agent Management
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Compare />}
            onClick={() => setCompareMode(!compareMode)}
            color={compareMode ? 'primary' : 'inherit'}
          >
            Compare Mode
          </Button>
          <Button variant="contained" startIcon={<Add />}>
            Add Agent
          </Button>
        </Box>
      </Box>

      {/* Toolbar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          {/* Search */}
          <TextField
            placeholder="Search agents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
          />

          {/* Filter */}
          <Button
            startIcon={<FilterList />}
            onClick={(e) => setFilterAnchorEl(e.currentTarget)}
            variant={Object.values(filters).some(f => Array.isArray(f) ? f.length > 0 : f !== filters.performanceRange) ? 'contained' : 'outlined'}
          >
            Filter
          </Button>

          {/* Sort */}
          <Button
            startIcon={<Sort />}
            onClick={(e) => setSortAnchorEl(e.currentTarget)}
            variant="outlined"
          >
            Sort: {sortBy}
          </Button>

          {/* View Mode */}
          <ButtonGroup>
            <IconButton
              color={viewMode === 'grid' ? 'primary' : 'default'}
              onClick={() => setViewMode('grid')}
            >
              <ViewModule />
            </IconButton>
            <IconButton
              color={viewMode === 'list' ? 'primary' : 'default'}
              onClick={() => setViewMode('list')}
            >
              <ViewList />
            </IconButton>
            <IconButton
              color={viewMode === 'topology' ? 'primary' : 'default'}
              onClick={() => setViewMode('topology')}
            >
              <AccountTree />
            </IconButton>
          </ButtonGroup>

          {/* Refresh */}
          <IconButton onClick={onRefresh}>
            <Refresh />
          </IconButton>
        </Box>

        {/* Active Filters */}
        {(filters.types.length > 0 || filters.statuses.length > 0 || filters.locations.length > 0) && (
          <Box mt={2} display="flex" flexWrap="wrap" gap={1}>
            {filters.types.map(type => (
              <Chip
                key={type}
                label={`Type: ${type}`}
                size="small"
                onDelete={() => setFilters(prev => ({
                  ...prev,
                  types: prev.types.filter(t => t !== type)
                }))}
              />
            ))}
            {filters.statuses.map(status => (
              <Chip
                key={status}
                label={`Status: ${status}`}
                size="small"
                onDelete={() => setFilters(prev => ({
                  ...prev,
                  statuses: prev.statuses.filter(s => s !== status)
                }))}
              />
            ))}
            {filters.locations.map(location => (
              <Chip
                key={location}
                label={`Location: ${location}`}
                size="small"
                onDelete={() => setFilters(prev => ({
                  ...prev,
                  locations: prev.locations.filter(l => l !== location)
                }))}
              />
            ))}
          </Box>
        )}

        {/* Bulk Actions */}
        {selectedAgents.length > 0 && (
          <Box mt={2} display="flex" alignItems="center" gap={2}>
            <Typography variant="body2">
              {selectedAgents.length} agent(s) selected
            </Typography>
            <Button size="small" onClick={() => onBulkAction?.('start', selectedAgents.map(id => agents.find(a => a.id === id)!))}>
              Start All
            </Button>
            <Button size="small" onClick={() => onBulkAction?.('stop', selectedAgents.map(id => agents.find(a => a.id === id)!))}>
              Stop All
            </Button>
            <Button size="small" onClick={() => onBulkAction?.('configure', selectedAgents.map(id => agents.find(a => a.id === id)!))}>
              Configure
            </Button>
            <Button size="small" onClick={() => setSelectedAgents([])}>
              Clear Selection
            </Button>
          </Box>
        )}
      </Paper>

      {/* Results Summary */}
      <Box mb={2}>
        <Typography variant="body2" color="textSecondary">
          Showing {filteredAndSortedAgents.length} of {agents.length} agents
        </Typography>
      </Box>

      {/* Agent Display */}
      {viewMode === 'grid' && (
        <Grid container spacing={3}>
          {filteredAndSortedAgents.map(agent => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={agent.id}>
              {renderAgentCard(agent)}
            </Grid>
          ))}
        </Grid>
      )}

      {viewMode === 'list' && (
        <List>
          {filteredAndSortedAgents.map(renderAgentListItem)}
        </List>
      )}

      {viewMode === 'topology' && (
        <Paper sx={{ p: 3, textAlign: 'center', minHeight: 400 }}>
          <Typography variant="h6" gutterBottom>
            Agent Topology View
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Interactive topology visualization would be implemented here
          </Typography>
        </Paper>
      )}

      {/* Filter Menu */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={() => setFilterAnchorEl(null)}
        PaperProps={{ sx: { width: 300, maxHeight: 500 } }}
      >
        <Box p={2}>
          <Typography variant="subtitle1" gutterBottom>
            Filter Agents
          </Typography>
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Agent Types</InputLabel>
            <Select
              multiple
              value={filters.types}
              onChange={(e) => setFilters(prev => ({ ...prev, types: e.target.value as string[] }))}
            >
              {filterOptions.types.map(type => (
                <MenuItem key={type} value={type}>
                  {type.replace('_', ' ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Status</InputLabel>
            <Select
              multiple
              value={filters.statuses}
              onChange={(e) => setFilters(prev => ({ ...prev, statuses: e.target.value as string[] }))}
            >
              {filterOptions.statuses.map(status => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Locations</InputLabel>
            <Select
              multiple
              value={filters.locations}
              onChange={(e) => setFilters(prev => ({ ...prev, locations: e.target.value as string[] }))}
            >
              {filterOptions.locations.map(location => (
                <MenuItem key={location} value={location}>
                  {location}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box mt={2}>
            <Typography gutterBottom>Performance Range</Typography>
            <Slider
              value={filters.performanceRange}
              onChange={(_, value) => setFilters(prev => ({ ...prev, performanceRange: value as [number, number] }))}
              valueLabelDisplay="auto"
              min={0}
              max={100}
            />
          </Box>

          <Box mt={2} display="flex" gap={1}>
            <Button
              size="small"
              onClick={() => setFilters({
                types: [],
                statuses: [],
                locations: [],
                performanceRange: [0, 100],
                capabilities: [],
              })}
            >
              Clear All
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => setFilterAnchorEl(null)}
            >
              Apply
            </Button>
          </Box>
        </Box>
      </Menu>

      {/* Sort Menu */}
      <Menu
        anchorEl={sortAnchorEl}
        open={Boolean(sortAnchorEl)}
        onClose={() => setSortAnchorEl(null)}
      >
        {(['name', 'status', 'type', 'location', 'performance', 'lastSeen'] as SortOption[]).map(option => (
          <MenuItem
            key={option}
            onClick={() => {
              if (sortBy === option) {
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              } else {
                setSortBy(option);
                setSortOrder('asc');
              }
              setSortAnchorEl(null);
            }}
          >
            {option.charAt(0).toUpperCase() + option.slice(1)}
            {sortBy === option && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
          </MenuItem>
        ))}
      </Menu>

      {/* Agent Action Menu */}
      <Menu
        anchorEl={agentMenuAnchor}
        open={Boolean(agentMenuAnchor)}
        onClose={() => setAgentMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          onAgentAction?.('start', selectedAgent!);
          setAgentMenuAnchor(null);
        }}>
          <ListItemIcon><PlayArrow /></ListItemIcon>
          Start Agent
        </MenuItem>
        <MenuItem onClick={() => {
          onAgentAction?.('stop', selectedAgent!);
          setAgentMenuAnchor(null);
        }}>
          <ListItemIcon><Stop /></ListItemIcon>
          Stop Agent
        </MenuItem>
        <MenuItem onClick={() => {
          onAgentAction?.('configure', selectedAgent!);
          setAgentMenuAnchor(null);
        }}>
          <ListItemIcon><Settings /></ListItemIcon>
          Configure
        </MenuItem>
        <MenuItem onClick={() => {
          setDetailsOpen(true);
          setAgentMenuAnchor(null);
        }}>
          <ListItemIcon><Info /></ListItemIcon>
          View Details
        </MenuItem>
      </Menu>

      {/* Agent Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Agent Details: {selectedAgent?.name}
        </DialogTitle>
        <DialogContent>
          {selectedAgent && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Type</Typography>
                  <Typography>{selectedAgent.type.replace('_', ' ')}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Status</Typography>
                  <Chip 
                    label={selectedAgent.status} 
                    color={getStatusColor(selectedAgent.status) as any}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Location</Typography>
                  <Typography>{selectedAgent.location}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Version</Typography>
                  <Typography>{selectedAgent.version}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                Performance Metrics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={3}>
                  <Typography variant="subtitle2">CPU Usage</Typography>
                  <Typography>{selectedAgent.performance.cpu}%</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="subtitle2">Memory Usage</Typography>
                  <Typography>{selectedAgent.performance.memory}%</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="subtitle2">Uptime</Typography>
                  <Typography>{Math.floor(selectedAgent.performance.uptime / 3600)}h</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="subtitle2">Tasks Completed</Typography>
                  <Typography>{selectedAgent.performance.tasksCompleted}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                Capabilities
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {selectedAgent.capabilities.map(capability => (
                  <Chip key={capability} label={capability} size="small" />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnhancedAgentOverview;