import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Badge,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Attachment,
  Image,
  Description,
  Code,
  Storage,
  NetworkCheck,
  Memory,
  Search,
  Download,
  Share,
  Visibility,
  ExpandMore,
  Close,
  Fullscreen,
  FullscreenExit,
  ZoomIn,
  ZoomOut,
  RotateLeft,
  RotateRight,
  FilterList,
  Sort,
} from '@mui/icons-material';

export interface Evidence {
  id: string;
  name: string;
  type: 'log' | 'file' | 'screenshot' | 'network' | 'memory' | 'registry' | 'process';
  size: number;
  hash?: string;
  timestamp: Date;
  source: string;
  description?: string;
  metadata?: Record<string, any>;
  content?: string | ArrayBuffer;
  url?: string;
  tags?: string[];
  analysisResults?: {
    malicious: boolean;
    confidence: number;
    indicators: string[];
    recommendations: string[];
  };
}

interface EvidenceViewerProps {
  evidence: Evidence[];
  selectedEvidence?: Evidence;
  onEvidenceSelect?: (evidence: Evidence) => void;
  onDownload?: (evidence: Evidence) => void;
  onShare?: (evidence: Evidence) => void;
  onAnalyze?: (evidence: Evidence) => void;
}int
erface EvidenceListProps {
  evidence: Evidence[];
  selectedEvidence?: Evidence;
  onSelect: (evidence: Evidence) => void;
  onDownload?: (evidence: Evidence) => void;
  onAnalyze?: (evidence: Evidence) => void;
}

interface EvidenceDetailProps {
  evidence: Evidence;
  onClose: () => void;
  onDownload?: (evidence: Evidence) => void;
  onShare?: (evidence: Evidence) => void;
}

interface EvidenceContentProps {
  evidence: Evidence;
}

const EvidenceList: React.FC<EvidenceListProps> = ({
  evidence,
  selectedEvidence,
  onSelect,
  onDownload,
  onAnalyze,
}) => {
  const [filter, setFilter] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  const [sortBy, setSortBy] = React.useState<'name' | 'type' | 'size' | 'timestamp'>('timestamp');

  const getTypeIcon = (type: Evidence['type']) => {
    switch (type) {
      case 'log':
        return <Description />;
      case 'file':
        return <Attachment />;
      case 'screenshot':
        return <Image />;
      case 'network':
        return <NetworkCheck />;
      case 'memory':
        return <Memory />;
      case 'registry':
        return <Storage />;
      case 'process':
        return <Code />;
      default:
        return <Attachment />;
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getAnalysisColor = (evidence: Evidence) => {
    if (!evidence.analysisResults) return 'default';
    if (evidence.analysisResults.malicious) return 'error';
    if (evidence.analysisResults.confidence > 0.7) return 'warning';
    return 'success';
  };

  const filteredEvidence = React.useMemo(() => {
    let filtered = evidence;

    if (filter) {
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(filter.toLowerCase()) ||
        e.description?.toLowerCase().includes(filter.toLowerCase()) ||
        e.source.toLowerCase().includes(filter.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(e => e.type === typeFilter);
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'type':
          return a.type.localeCompare(b.type);
        case 'size':
          return b.size - a.size;
        case 'timestamp':
          return b.timestamp.getTime() - a.timestamp.getTime();
        default:
          return 0;
      }
    });
  }, [evidence, filter, typeFilter, sortBy]);

  const evidenceTypes = React.useMemo(() => {
    const types = new Set(evidence.map(e => e.type));
    return Array.from(types);
  }, [evidence]);

  return (
    <Box>
      {/* Filters and Search */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          placeholder="Search evidence..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          size="small"
          sx={{ flex: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
        
        <TextField
          select
          label="Type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          size="small"
          sx={{ minWidth: 120 }}
        >
          <option value="all">All Types</option>
          {evidenceTypes.map(type => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </TextField>
        
        <TextField
          select
          label="Sort by"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          size="small"
          sx={{ minWidth: 120 }}
        >
          <option value="timestamp">Date</option>
          <option value="name">Name</option>
          <option value="type">Type</option>
          <option value="size">Size</option>
        </TextField>
      </Box>

      {/* Evidence List */}
      <List>
        {filteredEvidence.map((item) => (
          <ListItem
            key={item.id}
            button
            selected={selectedEvidence?.id === item.id}
            onClick={() => onSelect(item)}
            divider
          >
            <ListItemIcon>
              <Badge
                color={getAnalysisColor(item) as any}
                variant="dot"
                invisible={!item.analysisResults}
              >
                {getTypeIcon(item.type)}
              </Badge>
            </ListItemIcon>
            
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1">{item.name}</Typography>
                  <Chip label={item.type} size="small" variant="outlined" />
                  {item.analysisResults?.malicious && (
                    <Chip label="Malicious" size="small" color="error" />
                  )}
                </Box>
              }
              secondary={
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {item.description || 'No description'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(item.size)} • {item.source} • {item.timestamp.toLocaleString()}
                  </Typography>
                  {item.tags && item.tags.length > 0 && (
                    <Box sx={{ mt: 0.5 }}>
                      {item.tags.map((tag, index) => (
                        <Chip
                          key={index}
                          label={tag}
                          size="small"
                          variant="filled"
                          sx={{ mr: 0.5, fontSize: '0.7rem', height: 20 }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              }
            />
            
            <ListItemSecondaryAction>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {onAnalyze && !item.analysisResults && (
                  <Tooltip title="Analyze">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAnalyze(item);
                      }}
                    >
                      <Search />
                    </IconButton>
                  </Tooltip>
                )}
                
                {onDownload && (
                  <Tooltip title="Download">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(item);
                      }}
                    >
                      <Download />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      {filteredEvidence.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No evidence found
          </Typography>
        </Box>
      )}
    </Box>
  );
};

const EvidenceContent: React.FC<EvidenceContentProps> = ({ evidence }) => {
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);

  const renderContent = () => {
    switch (evidence.type) {
      case 'screenshot':
      case 'image':
        return (
          <Box sx={{ textAlign: 'center', p: 2 }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
              <IconButton onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}>
                <ZoomOut />
              </IconButton>
              <Typography variant="body2" sx={{ alignSelf: 'center' }}>
                {Math.round(zoom * 100)}%
              </Typography>
              <IconButton onClick={() => setZoom(Math.min(3, zoom + 0.1))}>
                <ZoomIn />
              </IconButton>
              <IconButton onClick={() => setRotation((rotation - 90) % 360)}>
                <RotateLeft />
              </IconButton>
              <IconButton onClick={() => setRotation((rotation + 90) % 360)}>
                <RotateRight />
              </IconButton>
            </Box>
            
            {evidence.url && (
              <img
                src={evidence.url}
                alt={evidence.name}
                style={{
                  maxWidth: '100%',
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s',
                }}
              />
            )}
          </Box>
        );

      case 'log':
      case 'file':
        return (
          <Paper
            sx={{
              p: 2,
              backgroundColor: 'grey.50',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              maxHeight: 400,
              overflow: 'auto',
            }}
          >
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {evidence.content || 'Content not available'}
            </pre>
          </Paper>
        );

      case 'network':
        return (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Property</TableCell>
                  <TableCell>Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {evidence.metadata && Object.entries(evidence.metadata).map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell>{key}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );

      default:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              Preview not available for this file type
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Box>
      {renderContent()}
    </Box>
  );
};

const EvidenceDetail: React.FC<EvidenceDetailProps> = ({
  evidence,
  onClose,
  onDownload,
  onShare,
}) => {
  const [fullscreen, setFullscreen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState(0);

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const tabs = [
    { label: 'Content', content: () => <EvidenceContent evidence={evidence} /> },
    { label: 'Metadata', content: () => (
      <TableContainer component={Paper}>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell>{evidence.name}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell>{evidence.type}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Size</strong></TableCell>
              <TableCell>{formatFileSize(evidence.size)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Source</strong></TableCell>
              <TableCell>{evidence.source}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Timestamp</strong></TableCell>
              <TableCell>{evidence.timestamp.toLocaleString()}</TableCell>
            </TableRow>
            {evidence.hash && (
              <TableRow>
                <TableCell><strong>Hash</strong></TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{evidence.hash}</TableCell>
              </TableRow>
            )}
            {evidence.description && (
              <TableRow>
                <TableCell><strong>Description</strong></TableCell>
                <TableCell>{evidence.description}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    )},
    { label: 'Analysis', content: () => (
      evidence.analysisResults ? (
        <Box>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h6">Analysis Results</Typography>
                <Chip
                  label={evidence.analysisResults.malicious ? 'Malicious' : 'Clean'}
                  color={evidence.analysisResults.malicious ? 'error' : 'success'}
                />
                <Chip
                  label={`${Math.round(evidence.analysisResults.confidence * 100)}% confidence`}
                  variant="outlined"
                />
              </Box>
              
              {evidence.analysisResults.indicators.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Indicators of Compromise
                  </Typography>
                  <List dense>
                    {evidence.analysisResults.indicators.map((indicator, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={indicator} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
              
              {evidence.analysisResults.recommendations.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Recommendations
                  </Typography>
                  <List dense>
                    {evidence.analysisResults.recommendations.map((rec, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={rec} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No analysis results available
          </Typography>
        </Box>
      )
    )},
  ];

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth={fullscreen ? false : 'lg'}
      fullWidth
      fullScreen={fullscreen}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">{evidence.name}</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {onShare && (
              <IconButton onClick={() => onShare(evidence)}>
                <Share />
              </IconButton>
            )}
            {onDownload && (
              <IconButton onClick={() => onDownload(evidence)}>
                <Download />
              </IconButton>
            )}
            <IconButton onClick={() => setFullscreen(!fullscreen)}>
              {fullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
            <IconButton onClick={onClose}>
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
          {tabs.map((tab, index) => (
            <Tab key={index} label={tab.label} />
          ))}
        </Tabs>
      </Box>
      
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 3 }}>
          {tabs[activeTab]?.content()}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export const EvidenceViewer: React.FC<EvidenceViewerProps> = ({
  evidence,
  selectedEvidence,
  onEvidenceSelect,
  onDownload,
  onShare,
  onAnalyze,
}) => {
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false);
  const [currentEvidence, setCurrentEvidence] = React.useState<Evidence | null>(null);

  const handleEvidenceSelect = (item: Evidence) => {
    setCurrentEvidence(item);
    onEvidenceSelect?.(item);
  };

  const handleViewDetail = (item: Evidence) => {
    setCurrentEvidence(item);
    setDetailDialogOpen(true);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Evidence ({evidence.length})
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<FilterList />} variant="outlined" size="small">
            Filter
          </Button>
          <Button startIcon={<Download />} variant="outlined" size="small">
            Export All
          </Button>
        </Box>
      </Box>

      <EvidenceList
        evidence={evidence}
        selectedEvidence={selectedEvidence}
        onSelect={handleEvidenceSelect}
        onDownload={onDownload}
        onAnalyze={onAnalyze}
      />

      {selectedEvidence && (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            startIcon={<Visibility />}
            onClick={() => handleViewDetail(selectedEvidence)}
          >
            View Details
          </Button>
        </Box>
      )}

      {detailDialogOpen && currentEvidence && (
        <EvidenceDetail
          evidence={currentEvidence}
          onClose={() => setDetailDialogOpen(false)}
          onDownload={onDownload}
          onShare={onShare}
        />
      )}
    </Box>
  );
};