import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Slider,
  Chip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  ExpandMore,
  Save,
  Restore,
  History,
  Validate,
  Warning,
  Error,
  CheckCircle,
  Settings,
  Security,
  Performance,
  Network,
  Storage,
  Code,
  Schedule,
  Notifications,
  Add,
  Delete,
  Edit,
  FileCopy,
} from '@mui/icons-material';

// Configuration schema types
export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'slider' | 'json' | 'password';
  required?: boolean;
  default?: any;
  options?: Array<{ value: any; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  validation?: {
    pattern?: string;
    message?: string;
    custom?: (value: any) => string | null;
  };
  description?: string;
  category?: string;
  dependencies?: Array<{
    field: string;
    value: any;
    condition: 'equals' | 'not_equals' | 'greater' | 'less';
  }>;
}

export interface ConfigSection {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  fields: ConfigField[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface ConfigTemplate {
  id: string;
  name: string;
  description: string;
  agentType: string;
  configuration: Record<string, any>;
  tags: string[];
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConfigVersion {
  id: string;
  version: string;
  configuration: Record<string, any>;
  timestamp: Date;
  author: string;
  comment?: string;
  isActive: boolean;
}

// Props interface
export interface AdvancedAgentConfigurationProps {
  agentId: string;
  agentType: string;
  currentConfiguration: Record<string, any>;
  configSchema: ConfigSection[];
  templates?: ConfigTemplate[];
  versions?: ConfigVersion[];
  onSave: (configuration: Record<string, any>, comment?: string) => Promise<void>;
  onValidate?: (configuration: Record<string, any>) => Promise<{ isValid: boolean; errors: string[] }>;
  onTemplateApply?: (templateId: string) => void;
  onVersionRestore?: (versionId: string) => void;
}

export const AdvancedAgentConfiguration: React.FC<AdvancedAgentConfigurationProps> = ({
  agentId,
  agentType,
  currentConfiguration,
  configSchema,
  templates = [],
  versions = [],
  onSave,
  onValidate,
  onTemplateApply,
  onVersionRestore,
}) => {
  const [configuration, setConfiguration] = useState<Record<string, any>>(currentConfiguration);
  const [activeTab, setActiveTab] = useState(0);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveComment, setSaveComment] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Check for changes
  useEffect(() => {
    const hasChanges = JSON.stringify(configuration) !== JSON.stringify(currentConfiguration);
    setHasChanges(hasChanges);
  }, [configuration, currentConfiguration]);

  // Get field value
  const getFieldValue = (field: ConfigField) => {
    return configuration[field.key] ?? field.default;
  };

  // Set field value
  const setFieldValue = (field: ConfigField, value: any) => {
    setConfiguration(prev => ({
      ...prev,
      [field.key]: value,
    }));
    
    // Clear validation error for this field
    if (validationErrors[field.key]) {
      setValidationErrors(prev => {
        const { [field.key]: removed, ...rest } = prev;
        return rest;
      });
    }
  };

  // Validate field
  const validateField = (field: ConfigField, value: any): string | null => {
    // Required validation
    if (field.required && (value === undefined || value === null || value === '')) {
      return `${field.label} is required`;
    }

    // Pattern validation
    if (field.validation?.pattern && value) {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(value)) {
        return field.validation.message || `${field.label} format is invalid`;
      }
    }

    // Custom validation
    if (field.validation?.custom) {
      return field.validation.custom(value);
    }

    // Type-specific validation
    if (field.type === 'number') {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return `${field.label} must be a number`;
      }
      if (field.min !== undefined && numValue < field.min) {
        return `${field.label} must be at least ${field.min}`;
      }
      if (field.max !== undefined && numValue > field.max) {
        return `${field.label} must be at most ${field.max}`;
      }
    }

    return null;
  };

  // Validate all fields
  const validateConfiguration = async () => {
    setIsValidating(true);
    const errors: Record<string, string> = {};

    // Client-side validation
    configSchema.forEach(section => {
      section.fields.forEach(field => {
        const value = getFieldValue(field);
        const error = validateField(field, value);
        if (error) {
          errors[field.key] = error;
        }
      });
    });

    setValidationErrors(errors);

    // Server-side validation
    if (onValidate && Object.keys(errors).length === 0) {
      try {
        const result = await onValidate(configuration);
        if (!result.isValid) {
          result.errors.forEach((error, index) => {
            errors[`server_${index}`] = error;
          });
        }
      } catch (error) {
        errors.server = 'Validation failed: ' + (error as Error).message;
      }
    }

    setValidationErrors(errors);
    setIsValidating(false);
    return Object.keys(errors).length === 0;
  };

  // Save configuration
  const handleSave = async () => {
    const isValid = await validateConfiguration();
    if (!isValid) {
      setSnackbar({
        open: true,
        message: 'Please fix validation errors before saving',
        severity: 'error',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(configuration, saveComment);
      setHasChanges(false);
      setSaveComment('');
      setSaveDialogOpen(false);
      setSnackbar({
        open: true,
        message: 'Configuration saved successfully',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to save configuration: ' + (error as Error).message,
        severity: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset configuration
  const handleReset = () => {
    setConfiguration(currentConfiguration);
    setValidationErrors({});
    setHasChanges(false);
  };

  // Apply template
  const handleApplyTemplate = (template: ConfigTemplate) => {
    setConfiguration(template.configuration);
    setTemplateDialogOpen(false);
    setSnackbar({
      open: true,
      message: `Template "${template.name}" applied`,
      severity: 'success',
    });
  };

  // Restore version
  const handleRestoreVersion = (version: ConfigVersion) => {
    setConfiguration(version.configuration);
    setVersionDialogOpen(false);
    setSnackbar({
      open: true,
      message: `Version ${version.version} restored`,
      severity: 'success',
    });
  };

  // Check if field should be visible based on dependencies
  const isFieldVisible = (field: ConfigField): boolean => {
    if (!field.dependencies) return true;

    return field.dependencies.every(dep => {
      const depValue = configuration[dep.field];
      switch (dep.condition) {
        case 'equals':
          return depValue === dep.value;
        case 'not_equals':
          return depValue !== dep.value;
        case 'greater':
          return depValue > dep.value;
        case 'less':
          return depValue < dep.value;
        default:
          return true;
      }
    });
  };

  // Render field based on type
  const renderField = (field: ConfigField) => {
    if (!isFieldVisible(field)) return null;

    const value = getFieldValue(field);
    const error = validationErrors[field.key];
    const hasError = Boolean(error);

    const commonProps = {
      fullWidth: true,
      error: hasError,
      helperText: error || field.description,
      required: field.required,
    };

    switch (field.type) {
      case 'text':
      case 'password':
        return (
          <TextField
            {...commonProps}
            label={field.label}
            type={field.type}
            value={value || ''}
            onChange={(e) => setFieldValue(field, e.target.value)}
          />
        );

      case 'number':
        return (
          <TextField
            {...commonProps}
            label={field.label}
            type="number"
            value={value || ''}
            onChange={(e) => setFieldValue(field, Number(e.target.value))}
            inputProps={{
              min: field.min,
              max: field.max,
              step: field.step,
            }}
          />
        );

      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(value)}
                onChange={(e) => setFieldValue(field, e.target.checked)}
              />
            }
            label={field.label}
          />
        );

      case 'select':
        return (
          <FormControl {...commonProps}>
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={value || ''}
              onChange={(e) => setFieldValue(field, e.target.value)}
              label={field.label}
            >
              {field.options?.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'multiselect':
        return (
          <FormControl {...commonProps}>
            <InputLabel>{field.label}</InputLabel>
            <Select
              multiple
              value={value || []}
              onChange={(e) => setFieldValue(field, e.target.value)}
              label={field.label}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((val) => (
                    <Chip key={val} label={val} size="small" />
                  ))}
                </Box>
              )}
            >
              {field.options?.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'slider':
        return (
          <Box>
            <Typography gutterBottom>{field.label}</Typography>
            <Slider
              value={value || field.min || 0}
              onChange={(_, newValue) => setFieldValue(field, newValue)}
              min={field.min}
              max={field.max}
              step={field.step}
              marks
              valueLabelDisplay="auto"
            />
            {field.description && (
              <Typography variant="caption" color="textSecondary">
                {field.description}
              </Typography>
            )}
          </Box>
        );

      case 'json':
        return (
          <TextField
            {...commonProps}
            label={field.label}
            multiline
            rows={4}
            value={JSON.stringify(value || {}, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setFieldValue(field, parsed);
              } catch {
                // Invalid JSON, don't update
              }
            }}
          />
        );

      default:
        return null;
    }
  };

  // Group sections by category for tabs
  const sectionsByCategory = useMemo(() => {
    const categories = new Map<string, ConfigSection[]>();
    
    configSchema.forEach(section => {
      const category = section.fields[0]?.category || 'General';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(section);
    });

    return Array.from(categories.entries());
  }, [configSchema]);

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Agent Configuration
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Configure {agentType.replace('_', ' ')} agent (ID: {agentId})
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<FileCopy />}
            onClick={() => setTemplateDialogOpen(true)}
          >
            Templates
          </Button>
          <Button
            startIcon={<History />}
            onClick={() => setVersionDialogOpen(true)}
          >
            Versions
          </Button>
          <Button
            startIcon={<Validate />}
            onClick={validateConfiguration}
            disabled={isValidating}
          >
            Validate
          </Button>
          <Button
            startIcon={<Restore />}
            onClick={handleReset}
            disabled={!hasChanges}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={() => setSaveDialogOpen(true)}
            disabled={!hasChanges || isSaving}
          >
            Save
          </Button>
        </Box>
      </Box>

      {/* Status indicators */}
      {(hasChanges || Object.keys(validationErrors).length > 0) && (
        <Box sx={{ mb: 2 }}>
          {hasChanges && (
            <Alert severity="info" sx={{ mb: 1 }}>
              You have unsaved changes
            </Alert>
          )}
          {Object.keys(validationErrors).length > 0 && (
            <Alert severity="error">
              {Object.keys(validationErrors).length} validation error(s) found
            </Alert>
          )}
        </Box>
      )}

      {/* Configuration tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          {sectionsByCategory.map(([category], index) => (
            <Tab
              key={category}
              label={
                <Badge
                  badgeContent={
                    configSchema
                      .filter(section => section.fields.some(field => field.category === category))
                      .reduce((count, section) => 
                        count + section.fields.filter(field => validationErrors[field.key]).length, 0
                      )
                  }
                  color="error"
                  invisible={
                    configSchema
                      .filter(section => section.fields.some(field => field.category === category))
                      .every(section => section.fields.every(field => !validationErrors[field.key]))
                  }
                >
                  {category}
                </Badge>
              }
            />
          ))}
        </Tabs>
      </Box>

      {/* Configuration sections */}
      {sectionsByCategory.map(([category, sections], categoryIndex) => (
        <Box
          key={category}
          sx={{ display: activeTab === categoryIndex ? 'block' : 'none' }}
        >
          {sections.map((section) => (
            <Accordion
              key={section.id}
              defaultExpanded={section.defaultExpanded !== false}
              sx={{ mb: 2 }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {section.icon}
                  <Typography variant="h6">{section.title}</Typography>
                  {section.fields.some(field => validationErrors[field.key]) && (
                    <Error color="error" />
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {section.description && (
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    {section.description}
                  </Typography>
                )}
                <Grid container spacing={3}>
                  {section.fields.map((field) => (
                    <Grid item xs={12} md={6} key={field.key}>
                      {renderField(field)}
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      ))}

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Save Configuration</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Comment (optional)"
            multiline
            rows={3}
            value={saveComment}
            onChange={(e) => setSaveComment(e.target.value)}
            placeholder="Describe the changes you made..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Templates Dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Configuration Templates</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {templates
              .filter(template => template.agentType === agentType)
              .map((template) => (
                <Grid item xs={12} md={6} key={template.id}>
                  <Card>
                    <CardHeader
                      title={template.name}
                      subheader={template.description}
                      action={
                        <Button
                          size="small"
                          onClick={() => handleApplyTemplate(template)}
                        >
                          Apply
                        </Button>
                      }
                    />
                    <CardContent>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                        {template.tags.map(tag => (
                          <Chip key={tag} label={tag} size="small" />
                        ))}
                      </Box>
                      <Typography variant="caption" color="textSecondary">
                        Updated: {template.updatedAt.toLocaleDateString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Versions Dialog */}
      <Dialog open={versionDialogOpen} onClose={() => setVersionDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Configuration Versions</DialogTitle>
        <DialogContent>
          <List>
            {versions.map((version) => (
              <ListItem key={version.id}>
                <ListItemIcon>
                  {version.isActive ? <CheckCircle color="primary" /> : <History />}
                </ListItemIcon>
                <ListItemText
                  primary={`Version ${version.version}`}
                  secondary={
                    <Box>
                      <Typography variant="body2">
                        {version.author} • {version.timestamp.toLocaleString()}
                      </Typography>
                      {version.comment && (
                        <Typography variant="caption" color="textSecondary">
                          {version.comment}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Button
                    size="small"
                    onClick={() => handleRestoreVersion(version)}
                    disabled={version.isActive}
                  >
                    {version.isActive ? 'Current' : 'Restore'}
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default AdvancedAgentConfiguration;