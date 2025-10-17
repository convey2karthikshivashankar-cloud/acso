import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Divider,
  Alert,
  Tabs,
  Tab,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
} from '@mui/material';
import {
  Save,
  Cancel,
  Restore,
  History,
  ContentCopy,
  Delete,
  Add,
  Edit,
  ExpandMore,
  Visibility,
  Code,
  Security,
  Speed,
  Storage,
  NetworkCheck,
} from '@mui/icons-material';
import { Agent } from './AgentOverview';

export interface AgentConfigSection {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  fields: AgentConfigField[];
}

export interface AgentConfigField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'json' | 'password';
  value: any;
  defaultValue: any;
  required?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: Array<{ value: any; label: string }>;
  };
  description?: string;
  sensitive?: boolean;
  category?: string;
}

export interface AgentConfigVersion {
  id: string;
  version: string;
  agentId: string;
  configuration: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  description?: string;
  tags?: string[];
  isActive: boolean;
}

export interface AgentConfigTemplate {
  id: string;
  name: string;
  description: string;
  agentType: Agent['type'];
  configuration: Record<string, any>;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  usageCount: number;
}

export interface AgentConfigurationProps {
  agent: Agent;
  configuration: Record<string, any>;
  configSections: AgentConfigSection[];
  versions: AgentConfigVersion[];
  templates: AgentConfigTemplate[];
  onSave: (configuration: Record<string, any>) => Promise<void>;
  onRevert: () => void;
  onLoadVersion: (versionId: string) => void;
  onCreateTemplate: (template: Omit<AgentConfigTemplate, 'id' | 'createdAt' | 'usageCount'>) => void;
  onLoadTemplate: (templateId: string) => void;
  readOnly?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`config-tabpanel-${index}`}
    aria-labelledby={`config-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

export const AgentConfiguration: React.FC<AgentConfigurationProps> = ({
  agent,
  configuration,
  configSections,
  versions,
  templates,
  onSave,
  onRevert,
  onLoadVersion,
  onCreateTemplate,
  onLoadTemplate,
  readOnly = false,
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = React.useState(0);
  const [currentConfig, setCurrentConfig] = React.useState(configuration);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = React.useState(false);
  const [versionDialogOpen, setVersionDialogOpen] = React.useState(false);
  const [jsonViewOpen, setJsonViewOpen] = React.useState(false);
  const [templateName, setTemplateName] = React.useState('');
  const [templateDescription, setTemplateDescription] = React.useState('');

  React.useEffect(() => {
    setCurrentConfig(configuration);
    setHasChanges(false);
  }, [configuration]);

  const handleFieldChange = (sectionId: string, fieldId: string, value: any) => {
    if (readOnly) return;

    setCurrentConfig(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [fieldId]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(currentConfig);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = () => {
    setCurrentConfig(configuration);
    setHasChanges(false);
    onRevert();
  };

  const handleCreateTemplate = () => {
    if (!templateName.trim()) return;

    onCreateTemplate({
      name: templateName,
      description: templateDescription,
      agentType: agent.type,
      configuration: currentConfig,
      tags: [],
      createdBy: 'current-user', // In real app, get from auth context
    });

    setTemplateDialogOpen(false);
    setTemplateName('');
    setTemplateDescription('');
  };

  const renderConfigField = (section: AgentConfigSection, field: AgentConfigField) => {
    const value = currentConfig[section.id]?.[field.id] ?? field.defaultValue;
    const hasError = field.required && (value === undefined || value === '');

    switch (field.type) {
      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(value)}
                onChange={(e) => handleFieldChange(section.id, field.id, e.target.checked)}
                disabled={readOnly}
              />
            }
            label={field.name}
          />
        );

      case 'select':
        return (
          <FormControl fullWidth error={hasError}>
            <InputLabel>{field.name}</InputLabel>
            <Select
              value={value || ''}
              onChange={(e) => handleFieldChange(section.id, field.id, e.target.value)}
              label={field.name}
              disabled={readOnly}
            >
              {field.validation?.options?.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'multiselect':
        return (
          <FormControl fullWidth error={hasError}>
            <InputLabel>{field.name}</InputLabel>
            <Select
              multiple
              value={Array.isArray(value) ? value : []}
              onChange={(e) => handleFieldChange(section.id, field.id, e.target.value)}
              label={field.name}
              disabled={readOnly}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((val) => (
                    <Chip key={val} label={val} size="small" />
                  ))}
                </Box>
              )}
            >
              {field.validation?.options?.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'json':
        return (
          <Box>
            <TextField
              label={field.name}
              value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleFieldChange(section.id, field.id, parsed);
                } catch {
                  // Invalid JSON, keep as string for now
                  handleFieldChange(section.id, field.id, e.target.value);
                }
              }}
              multiline
              rows={4}
              fullWidth
              error={hasError}
              disabled={readOnly}
              helperText={field.description}
            />
            <Button
              size="small"
              onClick={() => setJsonViewOpen(true)}
              sx={{ mt: 1 }}
            >
              <Code sx={{ mr: 1 }} />
              JSON Editor
            </Button>
          </Box>
        );

      case 'password':
        return (
          <TextField
            label={field.name}
            type="password"
            value={value || ''}
            onChange={(e) => handleFieldChange(section.id, field.id, e.target.value)}
            fullWidth
            error={hasError}
            disabled={readOnly}
            helperText={field.description}
            InputProps={{
              endAdornment: field.sensitive && (
                <Chip label="Encrypted" size="small" color="warning" />
              ),
            }}
          />
        );

      case 'number':
        return (
          <TextField
            label={field.name}
            type="number"
            value={value || ''}
            onChange={(e) => handleFieldChange(section.id, field.id, parseFloat(e.target.value) || 0)}
            fullWidth
            error={hasError}
            disabled={readOnly}
            helperText={field.description}
            inputProps={{
              min: field.validation?.min,
              max: field.validation?.max,
            }}
          />
        );

      default:
        return (
          <TextField
            label={field.name}
            value={value || ''}
            onChange={(e) => handleFieldChange(section.id, field.id, e.target.value)}
            fullWidth
            error={hasError}
            disabled={readOnly}
            helperText={field.description}
            inputProps={{
              pattern: field.validation?.pattern,
            }}
          />
        );
    }
  };

  const renderConfigSection = (section: AgentConfigSection) => (
    <Accordion key={section.id} defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {section.icon}
          <Box>
            <Typography variant="h6">{section.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {section.description}
            </Typography>
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={3}>
          {section.fields.map(field => (
            <Grid item xs={12} sm={6} md={4} key={field.id}>
              <Box sx={{ mb: 2 }}>
                {renderConfigField(section, field)}
                {field.required && (
                  <Typography variant="caption" color="error">
                    * Required
                  </Typography>
                )}
              </Box>
            </Grid>
          ))}
        </Grid>
      </AccordionDetails>
    </Accordion>
  );

  const renderConfigurationTab = () => (
    <Box>
      {!readOnly && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">
            Configuration for {agent.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<Code />}
              onClick={() => setJsonViewOpen(true)}
              variant="outlined"
            >
              JSON View
            </Button>
            <Button
              startIcon={<Restore />}
              onClick={handleRevert}
              disabled={!hasChanges}
            >
              Revert
            </Button>
            <Button
              startIcon={<Save />}
              onClick={handleSave}
              disabled={!hasChanges || saving}
              variant="contained"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Box>
      )}

      {hasChanges && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You have unsaved changes. Make sure to save before navigating away.
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {configSections.map(renderConfigSection)}
      </Box>
    </Box>
  );

  const renderVersionsTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Configuration Versions</Typography>
        <Button
          startIcon={<Add />}
          onClick={() => setVersionDialogOpen(true)}
          variant="contained"
          disabled={readOnly}
        >
          Create Version
        </Button>
      </Box>

      <List>
        {versions.map(version => (
          <Card key={version.id} sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Typography variant="h6">
                      Version {version.version}
                    </Typography>
                    {version.isActive && (
                      <Chip label="Active" color="success" size="small" />
                    )}
                    {version.tags?.map(tag => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {version.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Created by {version.createdBy} on {version.createdAt.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton
                    onClick={() => onLoadVersion(version.id)}
                    disabled={version.isActive || readOnly}
                  >
                    <Restore />
                  </IconButton>
                  <IconButton onClick={() => console.log('View version:', version)}>
                    <Visibility />
                  </IconButton>
                  <IconButton
                    onClick={() => console.log('Delete version:', version)}
                    disabled={version.isActive || readOnly}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </List>
    </Box>
  );

  const renderTemplatesTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Configuration Templates</Typography>
        <Button
          startIcon={<Add />}
          onClick={() => setTemplateDialogOpen(true)}
          variant="contained"
          disabled={readOnly}
        >
          Save as Template
        </Button>
      </Box>

      <Grid container spacing={3}>
        {templates.filter(t => t.agentType === agent.type).map(template => (
          <Grid item xs={12} sm={6} md={4} key={template.id}>
            <Card>
              <CardHeader
                title={template.name}
                subheader={`Used ${template.usageCount} times`}
                action={
                  <IconButton
                    onClick={() => onLoadTemplate(template.id)}
                    disabled={readOnly}
                  >
                    <ContentCopy />
                  </IconButton>
                }
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {template.description}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                  {template.tags.map(tag => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Created by {template.createdBy}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderTemplateDialog = () => (
    <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Save Configuration as Template</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Template Name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Description"
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            multiline
            rows={3}
            fullWidth
          />
          <Alert severity="info">
            This template will be available for all {agent.type.replace('_', ' ')} agents.
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
        <Button
          onClick={handleCreateTemplate}
          variant="contained"
          disabled={!templateName.trim()}
        >
          Create Template
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderJsonDialog = () => (
    <Dialog open={jsonViewOpen} onClose={() => setJsonViewOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>Configuration JSON</DialogTitle>
      <DialogContent>
        <TextField
          value={JSON.stringify(currentConfig, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              setCurrentConfig(parsed);
              setHasChanges(true);
            } catch {
              // Invalid JSON, ignore for now
            }
          }}
          multiline
          rows={20}
          fullWidth
          variant="outlined"
          disabled={readOnly}
          sx={{
            '& .MuiInputBase-input': {
              fontFamily: 'monospace',
              fontSize: '0.875rem',
            },
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setJsonViewOpen(false)}>Close</Button>
        {!readOnly && (
          <Button
            onClick={() => {
              setJsonViewOpen(false);
              setHasChanges(true);
            }}
            variant="contained"
          >
            Apply Changes
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Agent Configuration
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure {agent.name} ({agent.type.replace('_', ' ')})
          </Typography>
        </Box>
        
        {hasChanges && (
          <Alert severity="warning" sx={{ maxWidth: 300 }}>
            Unsaved changes
          </Alert>
        )}
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
        >
          <Tab icon={<Settings />} label="Configuration" />
          <Tab icon={<History />} label="Versions" />
          <Tab icon={<ContentCopy />} label="Templates" />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        {renderConfigurationTab()}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {renderVersionsTab()}
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {renderTemplatesTab()}
      </TabPanel>

      {/* Dialogs */}
      {renderTemplateDialog()}
      {renderJsonDialog()}
    </Box>
  );
};

export default AgentConfiguration;