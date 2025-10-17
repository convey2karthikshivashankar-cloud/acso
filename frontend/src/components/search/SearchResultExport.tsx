import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Typography,
  Alert,
  LinearProgress,
  Chip,
  Divider,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Share as ShareIcon,
  Email as EmailIcon,
  Link as LinkIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { SearchResult } from './SearchResultRanking';

interface ExportConfig {
  format: 'csv' | 'json' | 'pdf' | 'excel';
  fields: string[];
  includeMetadata: boolean;
  includeHighlights: boolean;
  groupBy?: string;
  sortBy?: string;
  maxResults?: number;
}

interface ShareConfig {
  method: 'email' | 'link' | 'download';
  recipients?: string[];
  message?: string;
  expiresIn?: number; // hours
  password?: string;
}

interface SearchResultExportProps {
  results: SearchResult[];
  query: string;
  filters?: any;
  onExport?: (config: ExportConfig) => Promise<void>;
  onShare?: (config: ShareConfig, exportConfig: ExportConfig) => Promise<string>;
}

const availableFields = [
  { key: 'title', label: 'Title', default: true },
  { key: 'description', label: 'Description', default: true },
  { key: 'type', label: 'Type', default: true },
  { key: 'category', label: 'Category', default: true },
  { key: 'url', label: 'URL', default: false },
  { key: 'relevanceScore', label: 'Relevance Score', default: false },
  { key: 'timestamp', label: 'Timestamp', default: true },
  { key: 'userRating', label: 'User Rating', default: false },
  { key: 'clickCount', label: 'Click Count', default: false },
  { key: 'viewDuration', label: 'View Duration', default: false },
];

const SearchResultExport: React.FC<SearchResultExportProps> = ({
  results,
  query,
  filters,
  onExport,
  onShare,
}) => {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'csv',
    fields: availableFields.filter(f => f.default).map(f => f.key),
    includeMetadata: true,
    includeHighlights: false,
    maxResults: 1000,
  });

  const [shareConfig, setShareConfig] = useState<ShareConfig>({
    method: 'download',
    expiresIn: 24,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!onExport) return;

    setLoading(true);
    setError(null);

    try {
      await onExport(exportConfig);
      setExportDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!onShare) return;

    setLoading(true);
    setError(null);

    try {
      const shareUrl = await onShare(shareConfig, exportConfig);
      
      if (shareConfig.method === 'link') {
        // Copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        alert('Share link copied to clipboard!');
      } else if (shareConfig.method === 'email') {
        // Open email client
        const subject = `Search Results: ${query}`;
        const body = `Here are the search results for "${query}":\n\n${shareUrl}`;
        window.open(`mailto:${shareConfig.recipients?.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
      }
      
      setShareDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Share failed');
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = () => {
    const limitedResults = results.slice(0, Math.min(exportConfig.maxResults || 1000, results.length));
    const selectedFields = availableFields.filter(f => exportConfig.fields.includes(f.key));
    
    return {
      resultCount: limitedResults.length,
      fields: selectedFields,
      estimatedSize: estimateFileSize(limitedResults, exportConfig),
    };
  };

  const estimateFileSize = (data: SearchResult[], config: ExportConfig): string => {
    const avgRowSize = config.fields.length * 50; // Rough estimate
    const totalSize = data.length * avgRowSize;
    
    if (totalSize < 1024) return `${totalSize} B`;
    if (totalSize < 1024 * 1024) return `${(totalSize / 1024).toFixed(1)} KB`;
    return `${(totalSize / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFormatDescription = (format: string): string => {
    switch (format) {
      case 'csv': return 'Comma-separated values, compatible with Excel and other spreadsheet applications';
      case 'json': return 'JavaScript Object Notation, suitable for programmatic processing';
      case 'pdf': return 'Portable Document Format, ideal for reports and presentations';
      case 'excel': return 'Microsoft Excel format with formatting and multiple sheets';
      default: return '';
    }
  };

  const preview = generatePreview();

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => setExportDialogOpen(true)}
          disabled={results.length === 0}
        >
          Export
        </Button>
        <Button
          variant="outlined"
          startIcon={<ShareIcon />}
          onClick={() => setShareDialogOpen(true)}
          disabled={results.length === 0 || !onShare}
        >
          Share
        </Button>
        <Button
          variant="outlined"
          startIcon={<ScheduleIcon />}
          onClick={() => setScheduleDialogOpen(true)}
          disabled={results.length === 0}
        >
          Schedule
        </Button>
      </Box>

      {/* Export Dialog */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Export Search Results</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Export Format
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Format</InputLabel>
              <Select
                value={exportConfig.format}
                onChange={(e) => setExportConfig(prev => ({ ...prev, format: e.target.value as any }))}
                label="Format"
              >
                <MenuItem value="csv">CSV</MenuItem>
                <MenuItem value="json">JSON</MenuItem>
                <MenuItem value="pdf">PDF</MenuItem>
                <MenuItem value="excel">Excel</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary">
              {getFormatDescription(exportConfig.format)}
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Fields to Include
            </Typography>
            <FormGroup>
              {availableFields.map(field => (
                <FormControlLabel
                  key={field.key}
                  control={
                    <Checkbox
                      checked={exportConfig.fields.includes(field.key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setExportConfig(prev => ({
                            ...prev,
                            fields: [...prev.fields, field.key],
                          }));
                        } else {
                          setExportConfig(prev => ({
                            ...prev,
                            fields: prev.fields.filter(f => f !== field.key),
                          }));
                        }
                      }}
                    />
                  }
                  label={field.label}
                />
              ))}
            </FormGroup>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Additional Options
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={exportConfig.includeMetadata}
                  onChange={(e) => setExportConfig(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                />
              }
              label="Include metadata"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={exportConfig.includeHighlights}
                  onChange={(e) => setExportConfig(prev => ({ ...prev, includeHighlights: e.target.checked }))}
                />
              }
              label="Include search highlights"
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Limits and Grouping
            </Typography>
            <TextField
              label="Maximum Results"
              type="number"
              value={exportConfig.maxResults || ''}
              onChange={(e) => setExportConfig(prev => ({ 
                ...prev, 
                maxResults: parseInt(e.target.value) || undefined 
              }))}
              sx={{ mb: 2, mr: 2, width: 200 }}
            />
            <FormControl sx={{ mb: 2, mr: 2, width: 200 }}>
              <InputLabel>Group By</InputLabel>
              <Select
                value={exportConfig.groupBy || ''}
                onChange={(e) => setExportConfig(prev => ({ ...prev, groupBy: e.target.value || undefined }))}
                label="Group By"
              >
                <MenuItem value="">None</MenuItem>
                <MenuItem value="type">Type</MenuItem>
                <MenuItem value="category">Category</MenuItem>
                <MenuItem value="date">Date</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ mb: 2, width: 200 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={exportConfig.sortBy || ''}
                onChange={(e) => setExportConfig(prev => ({ ...prev, sortBy: e.target.value || undefined }))}
                label="Sort By"
              >
                <MenuItem value="">Default</MenuItem>
                <MenuItem value="relevance">Relevance</MenuItem>
                <MenuItem value="date">Date</MenuItem>
                <MenuItem value="title">Title</MenuItem>
                <MenuItem value="rating">Rating</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box>
            <Typography variant="h6" gutterBottom>
              Export Preview
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Chip label={`${preview.resultCount} results`} />
              <Chip label={`${preview.fields.length} fields`} />
              <Chip label={`~${preview.estimatedSize}`} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Query: "{query}"
            </Typography>
          </Box>

          {loading && <LinearProgress sx={{ mt: 2 }} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleExport}
            variant="contained"
            disabled={loading || exportConfig.fields.length === 0}
          >
            Export
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Dialog */}
      <Dialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Share Search Results</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Share Method</InputLabel>
            <Select
              value={shareConfig.method}
              onChange={(e) => setShareConfig(prev => ({ ...prev, method: e.target.value as any }))}
              label="Share Method"
            >
              <MenuItem value="download">Download Link</MenuItem>
              <MenuItem value="link">Shareable Link</MenuItem>
              <MenuItem value="email">Email</MenuItem>
            </Select>
          </FormControl>

          {shareConfig.method === 'email' && (
            <TextField
              fullWidth
              label="Recipients (comma-separated)"
              value={shareConfig.recipients?.join(', ') || ''}
              onChange={(e) => setShareConfig(prev => ({
                ...prev,
                recipients: e.target.value.split(',').map(email => email.trim()).filter(email => email),
              }))}
              sx={{ mb: 2 }}
            />
          )}

          {shareConfig.method !== 'download' && (
            <>
              <TextField
                fullWidth
                label="Expires In (hours)"
                type="number"
                value={shareConfig.expiresIn || ''}
                onChange={(e) => setShareConfig(prev => ({ 
                  ...prev, 
                  expiresIn: parseInt(e.target.value) || undefined 
                }))}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Password (optional)"
                type="password"
                value={shareConfig.password || ''}
                onChange={(e) => setShareConfig(prev => ({ ...prev, password: e.target.value }))}
                sx={{ mb: 2 }}
              />
            </>
          )}

          <TextField
            fullWidth
            label="Message (optional)"
            multiline
            rows={3}
            value={shareConfig.message || ''}
            onChange={(e) => setShareConfig(prev => ({ ...prev, message: e.target.value }))}
            sx={{ mb: 2 }}
          />

          {loading && <LinearProgress sx={{ mt: 2 }} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleShare}
            variant="contained"
            disabled={loading}
          >
            Share
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Schedule Export</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Scheduled exports will run automatically and send results via email.
          </Alert>
          
          <TextField
            fullWidth
            label="Schedule Name"
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Frequency</InputLabel>
            <Select label="Frequency">
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="Email Recipients"
            sx={{ mb: 2 }}
          />
          
          <FormControlLabel
            control={<Checkbox />}
            label="Only send if results have changed"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
          <Button variant="contained">Schedule</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SearchResultExport;