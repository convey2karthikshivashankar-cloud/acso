import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
  Checkbox,
  Switch,
  Pagination,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Search,
  FilterList,
  Sort,
  MoreVert,
  Circle,
  CheckCircle,
  Warning,
  Error,
  Info,
  Refresh,
  ViewList,
  ViewModule,
} from '@mui/icons-material';
import { EnhancedDataTable, Column } from '../../data/EnhancedDataTable';
import { FunctionalWidget } from './BaseWidget';

export interface ListItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'warning' | 'error' | 'pending';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  timestamp?: Date;
  avatar?: string;
  icon?: React.ReactNode;
  tags?: string[];
  metadata?: Record<string, any>;
  actions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  }>;
}

export interface ListWidgetProps {
  id: string;
  title?: string;
  subtitle?: string;
  items: ListItem[];
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  paginated?: boolean;
  itemsPerPage?: number;
  showAvatars?: boolean;
  showStatus?: boolean;
  showTimestamp?: boolean;
  showActions?: boolean;
  dense?: boolean;
  maxHeight?: number;
  onItemClick?: (item: ListItem) => void;
  onRefresh?: () => void;
  refreshInterval?: number;
  autoRefresh?: boolean;
}

export const ListWidget: React.FC<ListWidgetProps> = ({
  id,
  title,
  subtitle,
  items,
  searchable = true,
  filterable = true,
  sortable = true,
  paginated = true,
  itemsPerPage = 10,
  showAvatars = true,
  showStatus = true,
  showTimestamp = true,
  showActions = true,
  dense = false,
  maxHeight = 400,
  onItemClick,
  onRefresh,
  refreshInterval,
  autoRefresh = false,
}) => {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all');
  const [sortBy, setSortBy] = React.useState<string>('timestamp');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const [page, setPage] = React.useState(1);

  const loadData = async () => {
    // Simulate API call - replace with actual data fetching
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(items);
      }, 500);
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return theme.palette.success.main;
      case 'warning': return theme.palette.warning.main;
      case 'error': return theme.palette.error.main;
      case 'pending': return theme.palette.info.main;
      default: return theme.palette.grey[500];
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active': return <CheckCircle />;
      case 'warning': return <Warning />;
      case 'error': return <Error />;
      case 'pending': return <Info />;
      default: return <Circle />;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'critical': return theme.palette.error.main;
      case 'high': return theme.palette.warning.main;
      case 'medium': return theme.palette.info.main;
      case 'low': return theme.palette.success.main;
      default: return theme.palette.grey[500];
    }
  };

  const filterAndSortItems = (itemList: ListItem[]) => {
    let filtered = itemList;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.subtitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(item => item.priority === priorityFilter);
    }

    // Apply sorting
    if (sortable) {
      filtered.sort((a, b) => {
        let aValue: any = a[sortBy as keyof ListItem];
        let bValue: any = b[sortBy as keyof ListItem];

        if (sortBy === 'timestamp') {
          aValue = a.timestamp?.getTime() || 0;
          bValue = b.timestamp?.getTime() || 0;
        }

        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue?.toLowerCase() || '';
        }

        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    }

    return filtered;
  };

  const formatTimestamp = (timestamp?: Date) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const renderFilters = () => (
    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {searchable && (
          <TextField
            size="small"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 200 }}
          />
        )}

        {filterable && (
          <>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                displayEmpty
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="error">Error</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                displayEmpty
              >
                <MenuItem value="all">All Priority</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </>
        )}

        {sortable && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order as 'asc' | 'desc');
              }}
              displayEmpty
            >
              <MenuItem value="timestamp-desc">Newest First</MenuItem>
              <MenuItem value="timestamp-asc">Oldest First</MenuItem>
              <MenuItem value="title-asc">Title A-Z</MenuItem>
              <MenuItem value="title-desc">Title Z-A</MenuItem>
              <MenuItem value="priority-desc">High Priority</MenuItem>
              <MenuItem value="priority-asc">Low Priority</MenuItem>
            </Select>
          </FormControl>
        )}
      </Box>
    </Box>
  );

  const renderContent = ({ data }: { data: ListItem[] }) => {
    const currentItems = data || items;
    const filteredItems = filterAndSortItems(currentItems);
    
    // Pagination
    const startIndex = paginated ? (page - 1) * itemsPerPage : 0;
    const endIndex = paginated ? startIndex + itemsPerPage : filteredItems.length;
    const paginatedItems = filteredItems.slice(startIndex, endIndex);
    const totalPages = paginated ? Math.ceil(filteredItems.length / itemsPerPage) : 1;

    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {(searchable || filterable || sortable) && renderFilters()}
        
        <Box sx={{ flex: 1, overflow: 'auto', maxHeight }}>
          <List dense={dense}>
            {paginatedItems.map((item, index) => (
              <React.Fragment key={item.id}>
                <ListItem
                  button={!!onItemClick}
                  onClick={() => onItemClick?.(item)}
                  sx={{
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                    },
                  }}
                >
                  {showAvatars && (
                    <ListItemIcon>
                      {item.avatar ? (
                        <Avatar src={item.avatar} sx={{ width: 32, height: 32 }} />
                      ) : item.icon ? (
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                          {item.icon}
                        </Avatar>
                      ) : (
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {item.title.charAt(0).toUpperCase()}
                        </Avatar>
                      )}
                    </ListItemIcon>
                  )}

                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" fontWeight="medium">
                          {item.title}
                        </Typography>
                        {showStatus && item.status && (
                          <Chip
                            label={item.status}
                            size="small"
                            sx={{
                              bgcolor: alpha(getStatusColor(item.status), 0.1),
                              color: getStatusColor(item.status),
                              fontSize: '0.75rem',
                            }}
                          />
                        )}
                        {item.priority && (
                          <Chip
                            label={item.priority}
                            size="small"
                            variant="outlined"
                            sx={{
                              borderColor: getPriorityColor(item.priority),
                              color: getPriorityColor(item.priority),
                              fontSize: '0.75rem',
                            }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        {item.subtitle && (
                          <Typography variant="body2" color="text.secondary">
                            {item.subtitle}
                          </Typography>
                        )}
                        {item.description && (
                          <Typography variant="caption" color="text.secondary">
                            {item.description}
                          </Typography>
                        )}
                        {showTimestamp && item.timestamp && (
                          <Typography variant="caption" color="text.secondary">
                            {formatTimestamp(item.timestamp)}
                          </Typography>
                        )}
                        {item.tags && item.tags.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                            {item.tags.map((tag, tagIndex) => (
                              <Chip
                                key={tagIndex}
                                label={tag}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: 20 }}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    }
                  />

                  {showActions && item.actions && item.actions.length > 0 && (
                    <ListItemSecondaryAction>
                      <IconButton size="small">
                        <MoreVert />
                      </IconButton>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
                {index < paginatedItems.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>

          {filteredItems.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No items found
              </Typography>
            </Box>
          )}
        </Box>

        {paginated && totalPages > 1 && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'center' }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, newPage) => setPage(newPage)}
              size="small"
            />
          </Box>
        )}
      </Box>
    );
  };

  return (
    <FunctionalWidget
      id={id}
      title={title}
      subtitle={subtitle}
      loadData={loadData}
      renderContent={renderContent}
      refreshInterval={refreshInterval}
      autoRefresh={autoRefresh}
      onRefresh={onRefresh}
    />
  );
};

export interface TableWidgetProps {
  id: string;
  title?: string;
  subtitle?: string;
  data: any[];
  columns: Column[];
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  paginated?: boolean;
  selectable?: boolean;
  exportable?: boolean;
  dense?: boolean;
  maxHeight?: number;
  onRowClick?: (row: any) => void;
  onSelectionChange?: (selectedRows: any[]) => void;
  onRefresh?: () => void;
  refreshInterval?: number;
  autoRefresh?: boolean;
}

export const TableWidget: React.FC<TableWidgetProps> = ({
  id,
  title,
  subtitle,
  data,
  columns,
  searchable = true,
  filterable = true,
  sortable = true,
  paginated = true,
  selectable = false,
  exportable = false,
  dense = false,
  maxHeight = 400,
  onRowClick,
  onSelectionChange,
  onRefresh,
  refreshInterval,
  autoRefresh = false,
}) => {
  const loadData = async () => {
    // Simulate API call - replace with actual data fetching
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(data);
      }, 500);
    });
  };

  const renderContent = ({ data: tableData }: { data: any[] }) => {
    const currentData = tableData || data;

    return (
      <Box sx={{ height: '100%' }}>
        <EnhancedDataTable
          columns={columns}
          data={currentData}
          searchable={searchable}
          filterable={filterable}
          exportable={exportable}
          pagination={paginated}
          selectable={selectable}
          dense={dense}
          stickyHeader={true}
          maxHeight={maxHeight}
          onRowClick={onRowClick}
          onRowSelect={onSelectionChange}
          refreshable={true}
          onRefresh={onRefresh}
        />
      </Box>
    );
  };

  return (
    <FunctionalWidget
      id={id}
      title={title}
      subtitle={subtitle}
      loadData={loadData}
      renderContent={renderContent}
      refreshInterval={refreshInterval}
      autoRefresh={autoRefresh}
      onRefresh={onRefresh}
    />
  );
};

// Predefined widgets for common use cases
export const ActivityListWidget: React.FC<{ id: string }> = ({ id }) => {
  const generateActivityData = (): ListItem[] => {
    const activities = [
      { title: 'Security scan completed', status: 'active', priority: 'medium', type: 'security' },
      { title: 'System backup finished', status: 'active', priority: 'low', type: 'system' },
      { title: 'High CPU usage detected', status: 'warning', priority: 'high', type: 'performance' },
      { title: 'Failed login attempt', status: 'error', priority: 'critical', type: 'security' },
      { title: 'Agent connection restored', status: 'active', priority: 'medium', type: 'network' },
    ];

    return activities.map((activity, index) => ({
      id: `activity-${index}`,
      title: activity.title,
      subtitle: `${activity.type} event`,
      status: activity.status as any,
      priority: activity.priority as any,
      timestamp: new Date(Date.now() - Math.random() * 86400000), // Random time in last 24h
      tags: [activity.type],
    }));
  };

  return (
    <ListWidget
      id={id}
      title="Recent Activity"
      items={generateActivityData()}
      searchable={true}
      filterable={true}
      sortable={true}
      paginated={true}
      itemsPerPage={5}
      showAvatars={false}
      showStatus={true}
      showTimestamp={true}
      dense={true}
      autoRefresh={true}
      refreshInterval={30}
    />
  );
};

export const AgentStatusTableWidget: React.FC<{ id: string }> = ({ id }) => {
  const generateAgentData = () => {
    const agents = [
      { name: 'Threat Hunter', type: 'Security', status: 'Active', cpu: 45, memory: 67, uptime: '2d 14h' },
      { name: 'Incident Response', type: 'Security', status: 'Active', cpu: 32, memory: 54, uptime: '1d 8h' },
      { name: 'Service Orchestrator', type: 'Operations', status: 'Warning', cpu: 78, memory: 89, uptime: '3h 22m' },
      { name: 'Financial Intelligence', type: 'Analytics', status: 'Inactive', cpu: 0, memory: 0, uptime: '0m' },
      { name: 'Supervisor', type: 'Core', status: 'Active', cpu: 23, memory: 34, uptime: '7d 12h' },
    ];

    return agents.map((agent, index) => ({
      id: index + 1,
      name: agent.name,
      type: agent.type,
      status: agent.status,
      cpu: agent.cpu,
      memory: agent.memory,
      uptime: agent.uptime,
    }));
  };

  const columns: Column[] = [
    {
      id: 'name',
      label: 'Agent Name',
      sortable: true,
      filterable: true,
    },
    {
      id: 'type',
      label: 'Type',
      sortable: true,
      filterable: true,
    },
    {
      id: 'status',
      label: 'Status',
      sortable: true,
      filterable: true,
      format: (value) => (
        <Chip
          label={value}
          color={
            value === 'Active' ? 'success' :
            value === 'Warning' ? 'warning' : 'error'
          }
          size="small"
        />
      ),
    },
    {
      id: 'cpu',
      label: 'CPU %',
      type: 'number',
      sortable: true,
      format: (value) => `${value}%`,
    },
    {
      id: 'memory',
      label: 'Memory %',
      type: 'number',
      sortable: true,
      format: (value) => `${value}%`,
    },
    {
      id: 'uptime',
      label: 'Uptime',
      sortable: true,
    },
  ];

  return (
    <TableWidget
      id={id}
      title="Agent Status"
      data={generateAgentData()}
      columns={columns}
      searchable={true}
      filterable={true}
      sortable={true}
      paginated={false}
      selectable={true}
      exportable={true}
      dense={true}
      autoRefresh={true}
      refreshInterval={15}
    />
  );
};