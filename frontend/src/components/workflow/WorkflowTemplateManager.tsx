import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Typography,
  Button,
  Grid,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Rating,
  Badge,
  Avatar,
  Tooltip,
  Paper,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  FileCopy,
  Download,
  Upload,
  Share,
  Favorite,
  FavoriteBorder,
  Visibility,
  Star,
  TrendingUp,
  Schedule,
  AccountTree,
  Security,
  Speed,
  IntegrationInstructions,
  Close,
  Search,
  FilterList,
} from '@mui/icons-material';
import { Workflow } from './WorkflowDesigner';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'security' | 'automation' | 'integration' | 'monitoring' | 'custom';
  tags: string[];
  workflow: Workflow;
  metadata: {
    version: string;
    author: string;
    createdAt: Date;
    updatedAt: Date;
    usageCount: number;
    rating: number;
    ratingCount: number;
    isPublic: boolean;
    isFeatured: boolean;
  };
  preview?: string;
  documentation?: string;
  requirements?: string[];
  compatibility: {
    minVersion: string;
    maxVersion?: string;
    dependencies: string[];
  };
}

interface WorkflowTemplateManagerProps {
  templates?: WorkflowTemplate[];
  onCreateFromTemplate?: (template: WorkflowTemplate) => void;
  onSaveAsTemplate?: (workflow: Workflow, metadata: Partial<WorkflowTemplate>) => void;
  onDeleteTemplate?: (templateId: string) => void;
  onUpdateTemplate?: (templateId: string, updates: Partial<WorkflowTemplate>) => void;
}

interface TemplateCardProps {
  template: WorkflowTemplate;
  isFavorite: boolean;
  onToggleFavorite: (templateId: string) => void;
  onUse: (template: WorkflowTemplate) => void;
  onEdit: (template: WorkflowTemplate) => void;
  onDelete: (template: WorkflowTemplate) => void;
  onPreview: (template: WorkflowTemplate) => void;
}

interface TemplateDetailsProps {
  template: WorkflowTemplate | null;
  onClose: () => void;
  onUse: (template: WorkflowTemplate) => void;
  onEdit: (template: WorkflowTemplate) => void;
}

interface CreateTemplateDialogProps {
  open: boolean;
  workflow?: Workflow;
  onClose: () => void;
  onSave: (metadata: Partial<WorkflowTemplate>) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  isFavorite,
  onToggleFavorite,
  onUse,
  onEdit,
  onDelete,
  onPreview,
}) => {
  const theme = useTheme();

  const getCategoryColor = (category: WorkflowTemplate['category']) => {
    switch (category) {
      case 'security': return 'error';
      case 'automation': return 'primary';
      case 'integration': return 'info';
      case 'monitoring': return 'warning';
      case 'custom': return 'secondary';
      default: return 'default';
    }
  };

  const getCategoryIcon = (category: WorkflowTemplate['category']) => {
    switch (category) {
      case 'security': return <Security />;
      case 'automation': return <AccountTree />;
      case 'integration': return <Integration />;
      case 'monitoring': return <Speed />;
      case 'custom': return <Star />;
      default: return <AccountTree />;
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4],
        },
      }}
    >
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: getCategoryColor(template.category) + '.main' }}>
            {getCategoryIcon(template.category)}
          </Avatar>
        }
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" noWrap>
              {template.name}
            </Typography>
            {template.metadata.isFeatured && (
              <Chip label="Featured" size="small" color="primary" />
            )}
          </Box>
        }
        subheader={`v${template.metadata.version} by ${template.metadata.author}`}
        action={
          <IconButton
            onClick={() => onToggleFavorite(template.id)}
            color={isFavorite ? 'error' : 'default'}
          >
            {isFavorite ? <Favorite /> : <FavoriteBorder />}
          </IconButton>
        }
      />
      
      <CardContent sx={{ flex: 1, pt: 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {template.description}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Chip
            icon={getCategoryIcon(template.category)}
            label={template.category}
            size="small"
            color={getCategoryColor(template.category) as any}
            variant="outlined"
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Rating value={template.metadata.rating} size="small" readOnly />
            <Typography variant="caption" color="text.secondary">
              ({template.metadata.ratingCount})
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
          {template.tags.slice(0, 3).map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          ))}
          {template.tags.length > 3 && (
            <Chip
              label={`+${template.tags.length - 3}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TrendingUp sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {template.metadata.usageCount} uses
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Schedule sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {template.metadata.updatedAt.toLocaleDateString()}
            </Typography>
          </Box>
        </Box>
      </CardContent>
      
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Box>
          <Button size="small" startIcon={<Visibility />} onClick={() => onPreview(template)}>
            Preview
          </Button>
          <Button size="small" startIcon={<Edit />} onClick={() => onEdit(template)}>
            Edit
          </Button>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<FileCopy />}
          onClick={() => onUse(template)}
        >
          Use Template
        </Button>
      </CardActions>
    </Card>
  );
};

const TemplateDetails: React.FC<TemplateDetailsProps> = ({
  template,
  onClose,
  onUse,
  onEdit,
}) => {
  if (!template) return null;

  return (
    <Dialog open={!!template} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">{template.name}</Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" gutterBottom>
            {template.description}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Chip label={template.category} color="primary" />
            <Chip label={`v${template.metadata.version}`} variant="outlined" />
            <Chip label={template.metadata.author} variant="outlined" />
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Rating value={template.metadata.rating} readOnly />
            <Typography variant="body2">
              {template.metadata.rating}/5 ({template.metadata.ratingCount} reviews)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {template.metadata.usageCount} uses
            </Typography>
          </Box>
        </Box>
        
        {template.documentation && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Documentation
            </Typography>
            <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
              <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                {template.documentation}
              </Typography>
            </Paper>
          </Box>
        )}
        
        {template.requirements && template.requirements.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Requirements
            </Typography>
            <List dense>
              {template.requirements.map((req, index) => (
                <ListItem key={index}>
                  <ListItemText primary={req} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Workflow Structure
          </Typography>
          <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
            <Typography variant="body2">
              Nodes: {template.workflow.nodes.length}
            </Typography>
            <Typography variant="body2">
              Connections: {template.workflow.connections.length}
            </Typography>
            <Typography variant="body2">
              Variables: {Object.keys(template.workflow.variables).length}
            </Typography>
          </Paper>
        </Box>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {template.tags.map((tag) => (
            <Chip key={tag} label={tag} size="small" variant="outlined" />
          ))}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button startIcon={<Edit />} onClick={() => onEdit(template)}>
          Edit
        </Button>
        <Button
          variant="contained"
          startIcon={<FileCopy />}
          onClick={() => onUse(template)}
        >
          Use Template
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const CreateTemplateDialog: React.FC<CreateTemplateDialogProps> = ({
  open,
  workflow,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    category: 'custom' as WorkflowTemplate['category'],
    tags: '',
    version: '1.0.0',
    documentation: '',
    requirements: '',
    isPublic: false,
  });

  const handleSave = () => {
    const metadata: Partial<WorkflowTemplate> = {
      name: formData.name,
      description: formData.description,
      category: formData.category,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      documentation: formData.documentation,
      requirements: formData.requirements.split('\n').map(req => req.trim()).filter(Boolean),
      metadata: {
        version: formData.version,
        author: 'current-user',
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
        rating: 0,
        ratingCount: 0,
        isPublic: formData.isPublic,
        isFeatured: false,
      },
    };
    
    onSave(metadata);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Save as Template</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Template Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          sx={{ mb: 2, mt: 1 }}
        />
        
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          sx={{ mb: 2 }}
        />
        
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as WorkflowTemplate['category'] })}
          >
            <MenuItem value="security">Security</MenuItem>
            <MenuItem value="automation">Automation</MenuItem>
            <MenuItem value="integration">Integration</MenuItem>
            <MenuItem value="monitoring">Monitoring</MenuItem>
            <MenuItem value="custom">Custom</MenuItem>
          </Select>
        </FormControl>
        
        <TextField
          fullWidth
          label="Tags (comma-separated)"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          sx={{ mb: 2 }}
          helperText="e.g., incident-response, automation, security"
        />
        
        <TextField
          fullWidth
          label="Version"
          value={formData.version}
          onChange={(e) => setFormData({ ...formData, version: e.target.value })}
          sx={{ mb: 2 }}
        />
        
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Documentation"
          value={formData.documentation}
          onChange={(e) => setFormData({ ...formData, documentation: e.target.value })}
          sx={{ mb: 2 }}
          helperText="Describe how to use this template"
        />
        
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Requirements (one per line)"
          value={formData.requirements}
          onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
          sx={{ mb: 2 }}
          helperText="List any prerequisites or dependencies"
        />
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!formData.name || !formData.description}
        >
          Save Template
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const WorkflowTemplateManager: React.FC<WorkflowTemplateManagerProps> = ({
  templates: initialTemplates = [],
  onCreateFromTemplate,
  onSaveAsTemplate,
  onDeleteTemplate,
  onUpdateTemplate,
}) => {
  const [templates, setTemplates] = React.useState<WorkflowTemplate[]>(initialTemplates);
  const [filteredTemplates, setFilteredTemplates] = React.useState<WorkflowTemplate[]>(initialTemplates);
  const [selectedTemplate, setSelectedTemplate] = React.useState<WorkflowTemplate | null>(null);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [sortBy, setSortBy] = React.useState<'name' | 'rating' | 'usage' | 'recent'>('rating');
  const [favorites, setFavorites] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    // Load mock templates if none provided
    if (initialTemplates.length === 0) {
      loadMockTemplates();
    }
  }, []);

  React.useEffect(() => {
    applyFilters();
  }, [templates, searchQuery, categoryFilter, sortBy, activeTab]);

  const loadMockTemplates = () => {
    const mockTemplates: WorkflowTemplate[] = [
      {
        id: 'template-1',
        name: 'Incident Response Workflow',
        description: 'Automated incident response with threat analysis and containment',
        category: 'security',
        tags: ['incident-response', 'security', 'automation'],
        workflow: {
          id: 'workflow-1',
          name: 'Incident Response',
          description: 'Automated incident response workflow',
          version: '1.0.0',
          nodes: [],
          connections: [],
          variables: {},
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'system',
            tags: [],
          },
        },
        metadata: {
          version: '2.1.0',
          author: 'Security Team',
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-20'),
          usageCount: 156,
          rating: 4.8,
          ratingCount: 23,
          isPublic: true,
          isFeatured: true,
        },
        documentation: 'This template provides a comprehensive incident response workflow...',
        requirements: ['Agent with security permissions', 'Network access to threat intelligence APIs'],
        compatibility: {
          minVersion: '2.0.0',
          dependencies: ['threat-intelligence', 'notification-service'],
        },
      },
      {
        id: 'template-2',
        name: 'System Health Check',
        description: 'Automated system monitoring and health verification',
        category: 'monitoring',
        tags: ['monitoring', 'health-check', 'automation'],
        workflow: {
          id: 'workflow-2',
          name: 'Health Check',
          description: 'System health monitoring workflow',
          version: '1.0.0',
          nodes: [],
          connections: [],
          variables: {},
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'system',
            tags: [],
          },
        },
        metadata: {
          version: '1.5.2',
          author: 'Operations Team',
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-18'),
          usageCount: 89,
          rating: 4.2,
          ratingCount: 15,
          isPublic: true,
          isFeatured: false,
        },
        documentation: 'Comprehensive system health monitoring workflow...',
        requirements: ['System monitoring permissions'],
        compatibility: {
          minVersion: '1.8.0',
          dependencies: ['monitoring-service'],
        },
      },
    ];
    
    setTemplates(mockTemplates);
  };

  const applyFilters = () => {
    let filtered = [...templates];

    // Apply tab filter
    if (activeTab === 1) {
      // Favorites
      filtered = filtered.filter(template => favorites.has(template.id));
    } else if (activeTab === 2) {
      // Featured
      filtered = filtered.filter(template => template.metadata.isFeatured);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(template => template.category === categoryFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return b.metadata.rating - a.metadata.rating;
        case 'usage':
          return b.metadata.usageCount - a.metadata.usageCount;
        case 'recent':
          return new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime();
        default:
          return 0;
      }
    });

    setFilteredTemplates(filtered);
  };

  const handleToggleFavorite = (templateId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(templateId)) {
      newFavorites.delete(templateId);
    } else {
      newFavorites.add(templateId);
    }
    setFavorites(newFavorites);
  };

  const handleUseTemplate = (template: WorkflowTemplate) => {
    if (onCreateFromTemplate) {
      onCreateFromTemplate(template);
    }
  };

  const handleSaveTemplate = (metadata: Partial<WorkflowTemplate>) => {
    if (onSaveAsTemplate) {
      // This would typically be called with a workflow from the designer
      const mockWorkflow: Workflow = {
        id: 'new-workflow',
        name: 'New Workflow',
        description: '',
        version: '1.0.0',
        nodes: [],
        connections: [],
        variables: {},
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'current-user',
          tags: [],
        },
      };
      onSaveAsTemplate(mockWorkflow, metadata);
    }
  };

  const tabs = [
    { label: 'All Templates', count: templates.length },
    { label: 'Favorites', count: favorites.size },
    { label: 'Featured', count: templates.filter(t => t.metadata.isFeatured).length },
  ];

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, borderRadius: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h5">Workflow Templates</Typography>
          <Button
            startIcon={<Add />}
            variant="contained"
            onClick={() => setShowCreateDialog(true)}
          >
            Save as Template
          </Button>
        </Box>
        
        {/* Tabs */}
        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {tab.label}
                  <Badge badgeContent={tab.count} color="primary" />
                </Box>
              }
            />
          ))}
        </Tabs>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 2, borderRadius: 0 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ minWidth: 250 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="security">Security</MenuItem>
              <MenuItem value="automation">Automation</MenuItem>
              <MenuItem value="integration">Integration</MenuItem>
              <MenuItem value="monitoring">Monitoring</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <MenuItem value="rating">Rating</MenuItem>
              <MenuItem value="usage">Usage</MenuItem>
              <MenuItem value="recent">Recent</MenuItem>
              <MenuItem value="name">Name</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Template Grid */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {filteredTemplates.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No templates found
            </Typography>
            <Typography color="text.secondary">
              Try adjusting your search or filters
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {filteredTemplates.map((template) => (
              <Grid item xs={12} sm={6} md={4} key={template.id}>
                <TemplateCard
                  template={template}
                  isFavorite={favorites.has(template.id)}
                  onToggleFavorite={handleToggleFavorite}
                  onUse={handleUseTemplate}
                  onEdit={(template) => setSelectedTemplate(template)}
                  onDelete={(template) => {
                    if (onDeleteTemplate) {
                      onDeleteTemplate(template.id);
                    }
                  }}
                  onPreview={(template) => setSelectedTemplate(template)}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Template Details Dialog */}
      <TemplateDetails
        template={selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
        onUse={handleUseTemplate}
        onEdit={(template) => {
          // Handle edit
          setSelectedTemplate(null);
        }}
      />

      {/* Create Template Dialog */}
      <CreateTemplateDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSave={handleSaveTemplate}
      />
    </Box>
  );
};