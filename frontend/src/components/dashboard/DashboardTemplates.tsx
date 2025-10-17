import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Grid,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem as SelectMenuItem,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Dashboard,
  Security,
  Analytics,
  AccountBalance,
  Settings,
  MoreVert,
  Edit,
  Delete,
  FileCopy,
  Share,
  Visibility,
  Add,
  Save,
  Cancel,
} from '@mui/icons-material';
import { DashboardTemplate, DashboardWidget } from './DashboardLayoutEngine';

export interface DashboardTemplatesProps {
  templates: DashboardTemplate[];
  currentTemplate?: DashboardTemplate;
  userRole?: string;
  onTemplateSelect?: (template: DashboardTemplate) => void;
  onTemplateCreate?: (template: Omit<DashboardTemplate, 'id'>) => void;
  onTemplateUpdate?: (templateId: string, updates: Partial<DashboardTemplate>) => void;
  onTemplateDelete?: (templateId: string) => void;
  onTemplateDuplicate?: (templateId: string) => void;
  onTemplateShare?: (templateId: string) => void;
}

const roleIcons = {
  admin: <Settings />,
  security: <Security />,
  operations: <Dashboard />,
  financial: <AccountBalance />,
  analyst: <Analytics />,
  default: <Dashboard />,
};

const roleColors = {
  admin: 'error',
  security: 'warning',
  operations: 'primary',
  financial: 'success',
  analyst: 'info',
  default: 'default',
} as const;

export const DashboardTemplates: React.FC<DashboardTemplatesProps> = ({
  templates,
  currentTemplate,
  userRole,
  onTemplateSelect,
  onTemplateCreate,
  onTemplateUpdate,
  onTemplateDelete,
  onTemplateDuplicate,
  onTemplateShare,
}) => {
  const [templateMenus, setTemplateMenus] = React.useState<Record<string, HTMLElement | null>>({});
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState<DashboardTemplate | null>(null);
  const [templateForm, setTemplateForm] = React.useState({
    name: '',
    description: '',
    role: '',
  });

  const handleTemplateMenuOpen = (templateId: string, event: React.MouseEvent<HTMLElement>) => {
    setTemplateMenus(prev => ({ ...prev, [templateId]: event.currentTarget }));
  };

  const handleTemplateMenuClose = (templateId: string) => {
    setTemplateMenus(prev => ({ ...prev, [templateId]: null }));
  };

  const handleCreateTemplate = () => {
    setTemplateForm({ name: '', description: '', role: userRole || '' });
    setCreateDialogOpen(true);
  };

  const handleEditTemplate = (template: DashboardTemplate) => {
    setSelectedTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description,
      role: template.role || '',
    });
    setEditDialogOpen(true);
    handleTemplateMenuClose(template.id);
  };

  const handleSaveTemplate = () => {
    if (selectedTemplate && onTemplateUpdate) {
      onTemplateUpdate(selectedTemplate.id, {
        name: templateForm.name,
        description: templateForm.description,
        role: templateForm.role,
      });
    } else if (onTemplateCreate) {
      const newTemplate: Omit<DashboardTemplate, 'id'> = {
        name: templateForm.name,
        description: templateForm.description,
        role: templateForm.role,
        widgets: [],
        layouts: {},
        settings: {
          cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
          rowHeight: 60,
          margin: [16, 16],
          containerPadding: [16, 16],
          compactType: 'vertical',
          preventCollision: false,
        },
      };
      onTemplateCreate(newTemplate);
    }
    
    setCreateDialogOpen(false);
    setEditDialogOpen(false);
    setSelectedTemplate(null);
  };

  const handleDeleteTemplate = (templateId: string) => {
    onTemplateDelete?.(templateId);
    handleTemplateMenuClose(templateId);
  };

  const handleDuplicateTemplate = (templateId: string) => {
    onTemplateDuplicate?.(templateId);
    handleTemplateMenuClose(templateId);
  };

  const handleShareTemplate = (templateId: string) => {
    onTemplateShare?.(templateId);
    handleTemplateMenuClose(templateId);
  };

  const filteredTemplates = templates.filter(template => 
    !userRole || !template.role || template.role === userRole || template.role === 'public'
  );

  const renderTemplateCard = (template: DashboardTemplate) => {
    const isActive = currentTemplate?.id === template.id;
    const roleColor = roleColors[template.role as keyof typeof roleColors] || roleColors.default;
    const roleIcon = roleIcons[template.role as keyof typeof roleIcons] || roleIcons.default;

    return (
      <Card
        key={template.id}
        elevation={isActive ? 4 : 1}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          border: isActive ? 2 : 0,
          borderColor: 'primary.main',
          '&:hover': {
            elevation: 3,
            transform: 'translateY(-2px)',
          },
        }}
        onClick={() => onTemplateSelect?.(template)}
      >
        <CardContent sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Avatar
              sx={{
                bgcolor: `${roleColor}.main`,
                color: `${roleColor}.contrastText`,
                width: 40,
                height: 40,
              }}
            >
              {roleIcon}
            </Avatar>
            
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleTemplateMenuOpen(template.id, e);
              }}
            >
              <MoreVert />
            </IconButton>

            <Menu
              anchorEl={templateMenus[template.id]}
              open={Boolean(templateMenus[template.id])}
              onClose={() => handleTemplateMenuClose(template.id)}
              onClick={(e) => e.stopPropagation()}
            >
              <MenuItem onClick={() => onTemplateSelect?.(template)}>
                <Visibility sx={{ mr: 1 }} />
                View
              </MenuItem>
              <MenuItem onClick={() => handleEditTemplate(template)}>
                <Edit sx={{ mr: 1 }} />
                Edit
              </MenuItem>
              <MenuItem onClick={() => handleDuplicateTemplate(template.id)}>
                <FileCopy sx={{ mr: 1 }} />
                Duplicate
              </MenuItem>
              <MenuItem onClick={() => handleShareTemplate(template.id)}>
                <Share sx={{ mr: 1 }} />
                Share
              </MenuItem>
              <Divider />
              <MenuItem 
                onClick={() => handleDeleteTemplate(template.id)}
                sx={{ color: 'error.main' }}
              >
                <Delete sx={{ mr: 1 }} />
                Delete
              </MenuItem>
            </Menu>
          </Box>

          <Typography variant="h6" gutterBottom noWrap>
            {template.name}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {template.description}
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {template.role && (
              <Chip
                label={template.role.charAt(0).toUpperCase() + template.role.slice(1)}
                color={roleColor}
                size="small"
              />
            )}
            <Chip
              label={`${template.widgets.length} widgets`}
              variant="outlined"
              size="small"
            />
          </Box>

          <Typography variant="caption" color="text.secondary">
            Widgets: {template.widgets.map(w => w.title).join(', ') || 'None'}
          </Typography>
        </CardContent>

        <CardActions>
          <Button
            size="small"
            variant={isActive ? 'contained' : 'outlined'}
            onClick={(e) => {
              e.stopPropagation();
              onTemplateSelect?.(template);
            }}
            fullWidth
          >
            {isActive ? 'Active' : 'Use Template'}
          </Button>
        </CardActions>
      </Card>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Dashboard Templates
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateTemplate}
        >
          Create Template
        </Button>
      </Box>

      {/* Templates Grid */}
      <Grid container spacing={3}>
        {filteredTemplates.map((template) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={template.id}>
            {renderTemplateCard(template)}
          </Grid>
        ))}
        
        {filteredTemplates.length === 0 && (
          <Grid item xs={12}>
            <Card sx={{ textAlign: 'center', py: 4 }}>
              <CardContent>
                <Dashboard sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Templates Available
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Create your first dashboard template to get started
                </Typography>
                <Button variant="contained" onClick={handleCreateTemplate}>
                  Create Template
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Create Template Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Template</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Template Name"
              value={templateForm.name}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
            />
            
            <TextField
              label="Description"
              value={templateForm.description}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
            />
            
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={templateForm.role}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, role: e.target.value }))}
                label="Role"
              >
                <SelectMenuItem value="">Public</SelectMenuItem>
                <SelectMenuItem value="admin">Administrator</SelectMenuItem>
                <SelectMenuItem value="security">Security Analyst</SelectMenuItem>
                <SelectMenuItem value="operations">Operations Manager</SelectMenuItem>
                <SelectMenuItem value="financial">Financial Analyst</SelectMenuItem>
                <SelectMenuItem value="analyst">Data Analyst</SelectMenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveTemplate}
            variant="contained"
            disabled={!templateForm.name.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Template</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Template Name"
              value={templateForm.name}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
            />
            
            <TextField
              label="Description"
              value={templateForm.description}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
            />
            
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={templateForm.role}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, role: e.target.value }))}
                label="Role"
              >
                <SelectMenuItem value="">Public</SelectMenuItem>
                <SelectMenuItem value="admin">Administrator</SelectMenuItem>
                <SelectMenuItem value="security">Security Analyst</SelectMenuItem>
                <SelectMenuItem value="operations">Operations Manager</SelectMenuItem>
                <SelectMenuItem value="financial">Financial Analyst</SelectMenuItem>
                <SelectMenuItem value="analyst">Data Analyst</SelectMenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveTemplate}
            variant="contained"
            disabled={!templateForm.name.trim()}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};