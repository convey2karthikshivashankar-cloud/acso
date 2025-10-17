import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Paper,
  Divider,
  Tooltip,
  Badge,
  LinearProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Search,
  FilterList,
  Download,
  Refresh,
  PlayArrow,
  Pause,
  Clear,
  ExpandMore,
  ExpandLess,
  Error,
  Warning,
  Info,
  CheckCircle,
  Schedule,
  Code,
  Share,
  Fullscreen,
  FullscreenExit,
} from '@mui/icons-material';
import { Agent } from '../../types';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  source: string;
  agentId: string;
  metadata?: Record<string, any>;
  stackTrace?: string;
  correlationId?: string;
  tags: string[];
}

export interface LogFilter {
  level?: string[];
  source?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
  tags?: string[];
}

interface AgentLogViewerProps {
  agent: Agent;
  height?: number;
  autoRefresh?: boolean;
  onExport?: (logs: LogEntry[]) => void;
}

interface LogEntryComponentProps {
  entry: LogEntry;
  expanded: boolean;
  onToggleExpand: () => void;
  searchTerm?: string;
}

const LogEntryComponent: React.FC<LogEntryComponentProps> = ({
  entry,
  expanded,
  onToggleExpand,
  searchTerm,
}) => {
  const theme = useTheme();

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return theme.palette.error.main;
      case 'warn': return theme.palette.warning.main;
      case 'info': return theme.palette.info.main;
      case 'debug': return theme.palette.text.secondary;
      default: return theme.palette.text.primary;
    }
  };

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return <Error fontSize="small" />;
      case 'warn': return <Warning fontSize="small" />;
      case 'info': return <Info fontSize="small" />;
      case 'debug': return <Code fontSize="small" />;
      default: return <Schedule fontSize="small" />;
    }
  };

  const highlightText = (text: string, term?: string) => {
    if (!term) return text;
    const regex = new RegExp(`(${term})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) =>
      regex.test(part) ? (
        <Box
          key={index}
          component="span"
          sx={{
            backgroundColor: theme.palette.warning.light,
            color: theme.palette.warning.contrastText,
            px: 0.5,
            borderRadius: 0.5,
          }}
        >
          {part}
        </Box>
      ) : (
        part
      )
    );
  };

  return (
    <Paper
      sx={{
        mb: 1,
        border: 1,
        borderColor: 'divider',
        '&:hover': {
          borderColor: 'primary.main',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          p: 1,
          cursor: 'pointer',
        }}
        onClick={onToggleExpand}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            color: getLevelColor(entry.level),
            mr: 1,
            minWidth: 24,
          }}
        >
          {getLevelIcon(entry.level)}
        </Box>
        
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'monospace',
                color: 'text.secondary',
                minWidth: 80,
              }}
            >
              {entry.timestamp.toLocaleTimeString()}
            </Typography>
            
            <Chip
              label={entry.level.toUpperCase()}
              size="small"
              sx={{
                backgroundColor: alpha(getLevelColor(entry.level), 0.1),
                color: getLevelColor(entry.level),
                fontWeight: 'bold',
                minWidth: 60,
              }}
            />
            
            <Typography variant="caption" color="text.secondary">
              {entry.source}
            </Typography>
            
            {entry.correlationId && (
              <Chip
                label={`ID: ${entry.correlationId.slice(0, 8)}`}
                size="small"
                variant="outlined"
              />
            )}
          </Box>
          
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
            }}
          >
            {highlightText(entry.message, searchTerm)}
          </Typography>
          
          {entry.tags.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
              {entry.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              ))}
            </Box>
          )}
        </Box>
        
        <IconButton size="small">
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>
      
      {expanded && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Divider sx={{ mb: 2 }} />
          
          {entry.metadata && Object.keys(entry.metadata).length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Metadata
              </Typography>
              <Paper
                sx={{
                  p: 1,
                  backgroundColor: 'grey.50',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  overflow: 'auto',
                }}
              >
                <pre>{JSON.stringify(entry.metadata, null, 2)}</pre>
              </Paper>
            </Box>
          )}
          
          {entry.stackTrace && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Stack Trace
              </Typography>
              <Paper
                sx={{
                  p: 1,
                  backgroundColor: 'error.light',
                  color: 'error.contrastText',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  overflow: 'auto',
                  maxHeight: 200,
                }}
              >
                <pre>{entry.stackTrace}</pre>
              </Paper>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};

export const AgentLogViewer: React.FC<AgentLogViewerProps> = ({
  agent,
  height = 600,
  autoRefresh = false,
  onExport,
}) => {
  const theme = useTheme();
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = React.useState<LogEntry[]>([]);
  const [filter, setFilter] = React.useState<LogFilter>({});
  const [searchTerm, setSearchTerm] = React.useState('');
  const [expandedEntries, setExpandedEntries] = React.useState<Set<string>>(new Set());
  const [isStreaming, setIsStreaming] = React.useState(autoRefresh);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    loadLogs();
  }, [agent.id]);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStreaming) {
      interval = setInterval(loadLogs, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStreaming, agent.id]);

  React.useEffect(() => {
    applyFilters();
  }, [logs, filter, searchTerm]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      // Mock data - in real app, fetch from API
      const mockLogs: LogEntry[] = [
        {
          id: 'log-1',
          timestamp: new Date(Date.now() - 30000),
          level: 'info',
          message: 'Agent started successfully',
          source: 'agent.core',
          agentId: agent.id,
          metadata: {
            version: '2.1.0',
            pid: 12345,
            memory: '256MB',
          },
          tags: ['startup', 'system'],
        },
        {
          id: 'log-2',
          timestamp: new Date(Date.now() - 25000),
          level: 'debug',
          message: 'Initializing threat detection module',
          source: 'threat.detector',
          agentId: agent.id,
          metadata: {
            module: 'threat-detection',
            config: { sensitivity: 'high' },
          },
          tags: ['initialization', 'threat-detection'],
        },
        {
          id: 'log-3',
          timestamp: new Date(Date.now() - 20000),
          level: 'warn',
          message: 'High memory usage detected: 85%',
          source: 'monitor.memory',
          agentId: agent.id,
          metadata: {
            memoryUsage: 85,
            threshold: 80,
            available: '128MB',
          },
          tags: ['performance', 'memory'],
        },
        {
          id: 'log-4',
          timestamp: new Date(Date.now() - 15000),
          level: 'error',
          message: 'Failed to connect to external API',
          source: 'api.client',
          agentId: agent.id,
          metadata: {
            endpoint: 'https://api.example.com/v1/data',
            statusCode: 503,
            retryCount: 3,
          },
          stackTrace: `Error: Connection timeout
    at APIClient.connect (/app/src/api/client.js:45:12)
    at Agent.initialize (/app/src/agent/core.js:123:8)
    at processTicksAndRejections (internal/process/task_queues.js:95:5)`,
          correlationId: 'req-abc123',
          tags: ['api', 'error', 'network'],
        },
        {
          id: 'log-5',
          timestamp: new Date(Date.now() - 10000),
          level: 'info',
          message: 'Successfully processed 150 events',
          source: 'event.processor',
          agentId: agent.id,
          metadata: {
            eventsProcessed: 150,
            duration: '2.3s',
            averageTime: '15ms',
          },
          tags: ['processing', 'performance'],
        },
      ];
      
      setLogs(mockLogs);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Level filter
    if (filter.level && filter.level.length > 0) {
      filtered = filtered.filter(log => filter.level!.includes(log.level));
    }

    // Source filter
    if (filter.source && filter.source.length > 0) {
      filtered = filtered.filter(log => filter.source!.includes(log.source));
    }

    // Time range filter
    if (filter.timeRange) {
      filtered = filtered.filter(log =>
        log.timestamp >= filter.timeRange!.start &&
        log.timestamp <= filter.timeRange!.end
      );
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(term) ||
        log.source.toLowerCase().includes(term) ||
        log.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Tag filter
    if (filter.tags && filter.tags.length > 0) {
      filtered = filtered.filter(log =>
        filter.tags!.some(tag => log.tags.includes(tag))
      );
    }

    setFilteredLogs(filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
  };

  const handleToggleExpand = (entryId: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  const handleExport = () => {
    if (onExport) {
      onExport(filteredLogs);
    } else {
      // Default export as JSON
      const dataStr = JSON.stringify(filteredLogs, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${agent.name}-logs-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const clearFilters = () => {
    setFilter({});
    setSearchTerm('');
  };

  const levelCounts = React.useMemo(() => {
    const counts = { error: 0, warn: 0, info: 0, debug: 0 };
    filteredLogs.forEach(log => {
      counts[log.level]++;
    });
    return counts;
  }, [filteredLogs]);

  const uniqueSources = React.useMemo(() => {
    return Array.from(new Set(logs.map(log => log.source)));
  }, [logs]);

  const uniqueTags = React.useMemo(() => {
    return Array.from(new Set(logs.flatMap(log => log.tags)));
  }, [logs]);

  return (
    <Box
      sx={{
        height: isFullscreen ? '100vh' : height,
        display: 'flex',
        flexDirection: 'column',
        ...(isFullscreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1300,
          backgroundColor: 'background.default',
        }),
      }}
    >
      {/* Header */}
      <Card sx={{ mb: 1 }}>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6">
                Agent Logs - {agent.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {Object.entries(levelCounts).map(([level, count]) => (
                  <Chip
                    key={level}
                    label={`${level.toUpperCase()}: ${count}`}
                    size="small"
                    color={
                      level === 'error' ? 'error' :
                      level === 'warn' ? 'warning' :
                      level === 'info' ? 'info' : 'default'
                    }
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          }
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title={isStreaming ? 'Pause streaming' : 'Start streaming'}>
                <IconButton
                  onClick={() => setIsStreaming(!isStreaming)}
                  color={isStreaming ? 'primary' : 'default'}
                >
                  {isStreaming ? <Pause /> : <PlayArrow />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Refresh logs">
                <IconButton onClick={loadLogs}>
                  <Refresh />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export logs">
                <IconButton onClick={handleExport}>
                  <Download />
                </IconButton>
              </Tooltip>
              <Tooltip title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                <IconButton onClick={() => setIsFullscreen(!isFullscreen)}>
                  {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
                </IconButton>
              </Tooltip>
            </Box>
          }
        />
        <CardContent sx={{ pt: 0 }}>
          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{ minWidth: 200 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Level</InputLabel>
              <Select
                multiple
                value={filter.level || []}
                onChange={(e) => setFilter({ ...filter, level: e.target.value as string[] })}
              >
                <MenuItem value="error">Error</MenuItem>
                <MenuItem value="warn">Warning</MenuItem>
                <MenuItem value="info">Info</MenuItem>
                <MenuItem value="debug">Debug</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Source</InputLabel>
              <Select
                multiple
                value={filter.source || []}
                onChange={(e) => setFilter({ ...filter, source: e.target.value as string[] })}
              >
                {uniqueSources.map(source => (
                  <MenuItem key={source} value={source}>{source}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Tags</InputLabel>
              <Select
                multiple
                value={filter.tags || []}
                onChange={(e) => setFilter({ ...filter, tags: e.target.value as string[] })}
              >
                {uniqueTags.map(tag => (
                  <MenuItem key={tag} value={tag}>{tag}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Button
              startIcon={<Clear />}
              onClick={clearFilters}
              disabled={!searchTerm && Object.keys(filter).length === 0}
            >
              Clear
            </Button>
          </Box>
          
          {loading && <LinearProgress />}
        </CardContent>
      </Card>

      {/* Log Entries */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          px: 1,
        }}
      >
        {filteredLogs.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No logs found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your filters or check back later
            </Typography>
          </Paper>
        ) : (
          filteredLogs.map((entry) => (
            <LogEntryComponent
              key={entry.id}
              entry={entry}
              expanded={expandedEntries.has(entry.id)}
              onToggleExpand={() => handleToggleExpand(entry.id)}
              searchTerm={searchTerm}
            />
          ))
        )}
      </Box>
    </Box>
  );
};