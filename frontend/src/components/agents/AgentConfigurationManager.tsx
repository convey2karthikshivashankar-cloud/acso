import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Chip,
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
  ListItemSecondaryAction,
  Divider,
  Alert,
  AlertTitle,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Badge,
  LinearProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Settings,
  Save,
  Cancel,
  Edit,
  Delete,
  Add,
  History,
  RestoreFromTrash,
  FileCopy,
  Download,
  Upload,
  Refresh,
  CheckCircle,
  Error,
  Warning,
  Info,
  ExpandMore,
  Visibility,
  VisibilityOff,
  PlayArrow,
  Stop,
  Schedule,
} from '@mui/icons-material';
import { Agent } from '../../types';

// Configuration interfaces
export interface AgentConfiguration {
  id: string;
  agentId: string;
  name: string;
  version: string;
  description?: string;
  config: {
    general: {
      enabled: boolean;
      logLevel: 'debug' | 'info' | 'warn' | 'error';
      maxRetries: number;
      timeout: number;
      heartbeatInterval: number;
    };
    security: {
      encryptionEnabled: boolean;
      authenticationRequired: boolean;
      allowedHosts: string[];
      certificatePath?: string;
    };
    performance: {
      maxConcurrentTasks: number;
      memoryLimit: number;
      cpuLimit: number;
      diskSpaceLimit: number;
    };
    monitoring: {
      metricsEnabled: boolean;
      healthCheckInterval: number;
      alertThresholds: {
        cpuUsage: number;
        memoryUsage: number;
        errorRate: number;
      };
    };
    custom: Record<string, any>;
  };
  status: 'draft' | 'active' | 'inactive' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  appliedAt?: Date;
  rollbackAvailable: boolean;
}

export interface ConfigurationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'security' | 'performance' | 'monitoring' | 'general';
  config: Partial<AgentConfiguration['config']>;
  tags: string[];
  isBuiltIn: boolean;
  usageCount: number;
  createdAt: Date;
}

export interface ConfigurationValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

interface AgentConfigurationManagerProps {
  agent: Agent;
  onConfigurationChange?: (config: AgentConfiguration) => void;
  onClose?: () => void;
}

interface ConfigurationFormProps {
  configuration: AgentConfiguration;
  onChange: (config: AgentConfiguration) => void;
  validation: ConfigurationValidationResult;
  readOnly?: boolean;
}

const ConfigurationForm: React.FC<ConfigurationFormProps> = ({
  configuration,
  onChange,
  validation,
  readOnly = false,
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = React.useState(0);

  const updateConfig = (section: keyof AgentConfiguration['config'], updates: any) => {
    onChange({
      ...configuration,
      config: {
        ...configuration.config,
        [section]: {
          ...configuration.config[section],
          ...updates,
        },
      },
      updatedAt: new Date(),
    });
  };

  const getFieldError = (field: string) => {
    return validation.errors.find(error => error.field === field);
  };

  const getFieldWarning = (field: string) => {
    return validation.warnings.find(warning => warning.field === field);
  };

  const renderGeneralConfig = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <FormControlLabel
          control={
            <Switch
              checked={configuration.config.general.enabled}
              onChange={(e) => updateConfig('general', { enabled: e.target.checked })}
              disabled={readOnly}
            />
          }
          label="Agent Enabled"
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth error={!!getFieldError('general.logLevel')}>
          <InputLabel>Log Level</InputLabel>
          <Select
            value={configuration.config.general.logLevel}
            onChange={(e) => updateConfig('general', { logLevel: e.target.value })}
            disabled={readOnly}
          >
            <MenuItem value="debug">Debug</MenuItem>
            <MenuItem value="info">Info</MenuItem>
            <MenuItem value="warn">Warning</MenuItem>
            <MenuItem value="error">Error</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Max Retries"
          type="number"
          value={configuration.config.general.maxRetries}
          onChange={(e) => updateConfig('general', { maxRetries: parseInt(e.target.value) })}
          error={!!getFieldError('general.maxRetries')}
          helperText={getFieldError('general.maxRetries')?.message}
          disabled={readOnly}
          inputProps={{ min: 0, max: 10 }}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Timeout (seconds)"
          type="number"
          value={configuration.config.general.timeout}
          onChange={(e) => updateConfig('general', { timeout: parseInt(e.target.value) })}
          error={!!getFieldError('general.timeout')}
          helperText={getFieldError('general.timeout')?.message}
          disabled={readOnly}
          inputProps={{ min: 1, max: 3600 }}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Heartbeat Interval (ms)"
          type="number"
          value={configuration.config.general.heartbeatInterval}
          onChange={(e) => updateConfig('general', { heartbeatInterval: parseInt(e.target.value) })}
          error={!!getFieldError('general.heartbeatInterval')}
          helperText={getFieldError('general.heartbeatInterval')?.message}
          disabled={readOnly}
          inputProps={{ min: 1000, max: 300000 }}
        />
      </Grid>
    </Grid>
  );

  const renderSecurityConfig = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <FormControlLabel
          control={
            <Switch
              checked={configuration.config.security.encryptionEnabled}
              onChange={(e) => updateConfig('security', { encryptionEnabled: e.target.checked })}
              disabled={readOnly}
            />
          }
          label="Encryption Enabled"
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControlLabel
          control={
            <Switch
              checked={configuration.config.security.authenticationRequired}
              onChange={(e) => updateConfig('security', { authenticationRequired: e.target.checked })}
              disabled={readOnly}
            />
          }
          label="Authentication Required"
        />
      </Grid>

      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Allowed Hosts (comma-separated)"
          value={configuration.config.security.allowedHosts.join(', ')}
          onChange={(e) => updateConfig('security', { 
            allowedHosts: e.target.value.split(',').map(host => host.trim()).filter(Boolean)
          })}
          error={!!getFieldError('security.allowedHosts')}
          helperText={getFieldError('security.allowedHosts')?.message || 'Enter allowed host addresses separated by commas'}
          disabled={readOnly}
          multiline
          rows={2}
        />
      </Grid>

      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Certificate Path"
          value={configuration.config.security.certificatePath || ''}
          onChange={(e) => updateConfig('security', { certificatePath: e.target.value })}
          error={!!getFieldError('security.certificatePath')}
          helperText={getFieldError('security.certificatePath')?.message}
          disabled={readOnly}
        />
      </Grid>
    </Grid>
  );

  const renderPerformanceConfig = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Max Concurrent Tasks"
          type="number"
          value={configuration.config.performance.maxConcurrentTasks}
          onChange={(e) => updateConfig('performance', { maxConcurrentTasks: parseInt(e.target.value) })}
          error={!!getFieldError('performance.maxConcurrentTasks')}
          helperText={getFieldError('performance.maxConcurrentTasks')?.message}
          disabled={readOnly}
          inputProps={{ min: 1, max: 100 }}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Memory Limit (MB)"
          type="number"
          value={configuration.config.performance.memoryLimit}
          onChange={(e) => updateConfig('performance', { memoryLimit: parseInt(e.target.value) })}
          error={!!getFieldError('performance.memoryLimit')}
          helperText={getFieldError('performance.memoryLimit')?.message}
          disabled={readOnly}
          inputProps={{ min: 128, max: 8192 }}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="CPU Limit (%)"
          type="number"
          value={configuration.config.performance.cpuLimit}
          onChange={(e) => updateConfig('performance', { cpuLimit: parseInt(e.target.value) })}
          error={!!getFieldError('performance.cpuLimit')}
          helperText={getFieldError('performance.cpuLimit')?.message}
          disabled={readOnly}
          inputProps={{ min: 10, max: 100 }}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Disk Space Limit (MB)"
          type="number"
          value={configuration.config.performance.diskSpaceLimit}
          onChange={(e) => updateConfig('performance', { diskSpaceLimit: parseInt(e.target.value) })}
          error={!!getFieldError('performance.diskSpaceLimit')}
          helperText={getFieldError('performance.diskSpaceLimit')?.message}
          disabled={readOnly}
          inputProps={{ min: 100, max: 10240 }}
        />
      </Grid>
    </Grid>
  );

  const renderMonitoringConfig = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <FormControlLabel
          control={
            <Switch
              checked={configuration.config.monitoring.metricsEnabled}
              onChange={(e) => updateConfig('monitoring', { metricsEnabled: e.target.checked })}
              disabled={readOnly}
            />
          }
          label="Metrics Enabled"
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Health Check Interval (ms)"
          type="number"
          value={configuration.config.monitoring.healthCheckInterval}
          onChange={(e) => updateConfig('monitoring', { healthCheckInterval: parseInt(e.target.value) })}
          error={!!getFieldError('monitoring.healthCheckInterval')}
          helperText={getFieldError('monitoring.healthCheckInterval')?.message}
          disabled={readOnly}
          inputProps={{ min: 5000, max: 300000 }}
        />
      </Grid>

      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Alert Thresholds
        </Typography>
      </Grid>

      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          label="CPU Usage (%)"
          type="number"
          value={configuration.config.monitoring.alertThresholds.cpuUsage}
          onChange={(e) => updateConfig('monitoring', { 
            alertThresholds: {
              ...configuration.config.monitoring.alertThresholds,
              cpuUsage: parseInt(e.target.value)
            }
          })}
          disabled={readOnly}
          inputProps={{ min: 50, max: 95 }}
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          label="Memory Usage (%)"
          type="number"
          value={configuration.config.monitoring.alertThresholds.memoryUsage}
          onChange={(e) => updateConfig('monitoring', { 
            alertThresholds: {
              ...configuration.config.monitoring.alertThresholds,
              memoryUsage: parseInt(e.target.value)
            }
          })}
          disabled={readOnly}
          inputProps={{ min: 50, max: 95 }}
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          label="Error Rate (%)"
          type="number"
          value={configuration.config.monitoring.alertThresholds.errorRate}
          onChange={(e) => updateConfig('monitoring', { 
            alertThresholds: {
              ...configuration.config.monitoring.alertThresholds,
              errorRate: parseInt(e.target.value)
            }
          })}
          disabled={readOnly}
          inputProps={{ min: 1, max: 50 }}
        />
      </Grid>
    </Grid>
  );

  const tabs = [
    { label: 'General', content: renderGeneralConfig },
    { label: 'Security', content: renderSecurityConfig },
    { label: 'Performance', content: renderPerformanceConfig },
    { label: 'Monitoring', content: renderMonitoringConfig },
  ];

  return (
    <Box>
      {/* Configuration Header */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Configuration Name"
              value={configuration.name}
              onChange={(e) => onChange({ ...configuration, name: e.target.value })}
              disabled={readOnly}
              error={!!getFieldError('name')}
              helperText={getFieldError('name')?.message}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Version"
              value={configuration.version}
              onChange={(e) => onChange({ ...configuration, version: e.target.value })}
              disabled={readOnly}
              error={!!getFieldError('version')}
              helperText={getFieldError('version')?.message}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={configuration.description || ''}
              onChange={(e) => onChange({ ...configuration, description: e.target.value })}
              disabled={readOnly}
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Validation Summary */}
      {validation.errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Configuration Errors</AlertTitle>
          {validation.errors.length} error{validation.errors.length !== 1 ? 's' : ''} found. Please fix them before saving.
        </Alert>
      )}

      {validation.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Configuration Warnings</AlertTitle>
          {validation.warnings.length} warning{validation.warnings.length !== 1 ? 's' : ''} found. Review recommended.
        </Alert>
      )}

      {/* Configuration Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {tab.label}
                  {validation.errors.some(error => error.field.startsWith(tab.label.toLowerCase())) && (
                    <Error color="error" fontSize="small" />
                  )}
                  {validation.warnings.some(warning => warning.field.startsWith(tab.label.toLowerCase())) && (
                    <Warning color="warning" fontSize="small" />
                  )}
                </Box>
              }
            />
          ))}
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Paper sx={{ p: 3 }}>
        {tabs[activeTab]?.content()}
      </Paper>
    </Box>
  );
};

export const AgentConfigurationManager: React.FC<AgentConfigurationManagerProps> = ({
  agent,
  onConfigurationChange,
  onClose,
}) => {
  const theme = useTheme();
  const [configurations, setConfigurations] = React.useState<AgentConfiguration[]>([]);
  const [templates, setTemplates] = React.useState<ConfigurationTemplate[]>([]);
  const [selectedConfig, setSelectedConfig] = React.useState<AgentConfiguration | null>(null);
  const [editingConfig, setEditingConfig] = React.useState<AgentConfiguration | null>(null);
  const [validation, setValidation] = React.useState<ConfigurationValidationResult>({
    isValid: true,
    errors: [],
    warnings: [],
  });
  const [showTemplates, setShowTemplates] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    loadConfigurations();
    loadTemplates();
  }, [agent.id]);

  const loadConfigurations = async () => {
    setLoading(true);
    try {
      // Mock data - in real app, fetch from API
      const mockConfigs: AgentConfiguration[] = [
        {
          id: 'config-1',
          agentId: agent.id,
          name: 'Production Configuration',
          version: '1.2.0',
          description: 'Optimized configuration for production environment',
          config: {
            general: {
              enabled: true,
              logLevel: 'info',
              maxRetries: 3,
              timeout: 30,
              heartbeatInterval: 30000,
            },
            security: {
              encryptionEnabled: true,
              authenticationRequired: true,
              allowedHosts: ['10.0.0.0/8', '192.168.0.0/16'],
              certificatePath: '/etc/ssl/certs/agent.pem',
            },
            performance: {
              maxConcurrentTasks: 10,
              memoryLimit: 1024,
              cpuLimit: 80,
              diskSpaceLimit: 2048,
            },
            monitoring: {
              metricsEnabled: true,
              healthCheckInterval: 60000,
              alertThresholds: {
                cpuUsage: 85,
                memoryUsage: 90,
                errorRate: 5,
              },
            },
            custom: {},
          },
          status: 'active',
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-20'),
          createdBy: 'admin',
          appliedAt: new Date('2024-01-20'),
          rollbackAvailable: true,
        },
      ];
      setConfigurations(mockConfigs);
      setSelectedConfig(mockConfigs[0]);
    } catch (error) {
      console.error('Failed to load configurations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      // Mock templates - in real app, fetch from API
      const mockTemplates: ConfigurationTemplate[] = [
        {
          id: 'template-1',
          name: 'High Security',
          description: 'Maximum security configuration with encryption and strict access controls',
          category: 'security',
          config: {
            security: {
              encryptionEnabled: true,
              authenticationRequired: true,
              allowedHosts: ['127.0.0.1'],
            },
            general: {
              logLevel: 'warn',
            },
          },
          tags: ['security', 'encryption', 'strict'],
          isBuiltIn: true,
          usageCount: 45,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'template-2',
          name: 'High Performance',
          description: 'Optimized for maximum performance and throughput',
          category: 'performance',
          config: {
            performance: {
              maxConcurrentTasks: 20,
              memoryLimit: 2048,
              cpuLimit: 95,
            },
            general: {
              logLevel: 'error',
              maxRetries: 1,
            },
          },
          tags: ['performance', 'throughput', 'optimized'],
          isBuiltIn: true,
          usageCount: 32,
          createdAt: new Date('2024-01-01'),
        },
      ];
      setTemplates(mockTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const validateConfiguration = (config: AgentConfiguration): ConfigurationValidationResult => {
    const errors: ConfigurationValidationResult['errors'] = [];
    const warnings: ConfigurationValidationResult['warnings'] = [];

    // Validate required fields
    if (!config.name.trim()) {
      errors.push({ field: 'name', message: 'Configuration name is required', severity: 'error' });
    }

    if (!config.version.trim()) {
      errors.push({ field: 'version', message: 'Version is required', severity: 'error' });
    }

    // Validate general config
    if (config.config.general.maxRetries < 0 || config.config.general.maxRetries > 10) {
      errors.push({ field: 'general.maxRetries', message: 'Max retries must be between 0 and 10', severity: 'error' });
    }

    if (config.config.general.timeout < 1 || config.config.general.timeout > 3600) {
      errors.push({ field: 'general.timeout', message: 'Timeout must be between 1 and 3600 seconds', severity: 'error' });
    }

    // Validate performance config
    if (config.config.performance.maxConcurrentTasks < 1) {
      errors.push({ field: 'performance.maxConcurrentTasks', message: 'Must allow at least 1 concurrent task', severity: 'error' });
    }

    if (config.config.performance.memoryLimit < 128) {
      errors.push({ field: 'performance.memoryLimit', message: 'Memory limit must be at least 128 MB', severity: 'error' });
    }

    // Add warnings
    if (config.config.general.logLevel === 'debug') {
      warnings.push({ field: 'general.logLevel', message: 'Debug logging may impact performance' });
    }

    if (config.config.performance.cpuLimit > 90) {
      warnings.push({ field: 'performance.cpuLimit', message: 'High CPU limit may affect system stability' });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  };

  const handleSaveConfiguration = async (config: AgentConfiguration) => {
    const validationResult = validateConfiguration(config);
    setValidation(validationResult);

    if (!validationResult.isValid) {
      return;
    }

    setLoading(true);
    try {
      // In real app, save to API
      const updatedConfigs = configurations.map(c => 
        c.id === config.id ? config : c
      );
      
      if (!configurations.find(c => c.id === config.id)) {
        updatedConfigs.push(config);
      }

      setConfigurations(updatedConfigs);
      setSelectedConfig(config);
      setEditingConfig(null);
      onConfigurationChange?.(config);
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTemplate = (template: ConfigurationTemplate) => {
    if (!selectedConfig) return;

    const updatedConfig: AgentConfiguration = {
      ...selectedConfig,
      config: {
        ...selectedConfig.config,
        ...template.config,
      },
      updatedAt: new Date(),
    };

    setEditingConfig(updatedConfig);
    setShowTemplates(false);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6">
              Agent Configuration - {agent.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage configuration settings and templates
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<Add />}
              onClick={() => setEditingConfig({
                id: `config-${Date.now()}`,
                agentId: agent.id,
                name: 'New Configuration',
                version: '1.0.0',
                config: {
                  general: {
                    enabled: true,
                    logLevel: 'info',
                    maxRetries: 3,
                    timeout: 30,
                    heartbeatInterval: 30000,
                  },
                  security: {
                    encryptionEnabled: false,
                    authenticationRequired: false,
                    allowedHosts: [],
                  },
                  performance: {
                    maxConcurrentTasks: 5,
                    memoryLimit: 512,
                    cpuLimit: 70,
                    diskSpaceLimit: 1024,
                  },
                  monitoring: {
                    metricsEnabled: true,
                    healthCheckInterval: 60000,
                    alertThresholds: {
                      cpuUsage: 80,
                      memoryUsage: 85,
                      errorRate: 10,
                    },
                  },
                  custom: {},
                },
                status: 'draft',
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'current-user',
                rollbackAvailable: false,
              })}
            >
              New Configuration
            </Button>
            <Button
              startIcon={<FileCopy />}
              onClick={() => setShowTemplates(true)}
            >
              Templates
            </Button>
            <Button
              startIcon={<History />}
              onClick={() => setShowHistory(true)}
            >
              History
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, p: 2 }}>
        {editingConfig ? (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                {editingConfig.id.startsWith('config-') && editingConfig.id.includes(Date.now().toString()) ? 'New' : 'Edit'} Configuration
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  startIcon={<Save />}
                  variant="contained"
                  onClick={() => handleSaveConfiguration(editingConfig)}
                  disabled={loading}
                >
                  Save
                </Button>
                <Button
                  startIcon={<Cancel />}
                  onClick={() => setEditingConfig(null)}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
            
            <ConfigurationForm
              configuration={editingConfig}
              onChange={setEditingConfig}
              validation={validation}
            />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Configuration List */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardHeader
                  title="Configurations"
                  action={
                    <IconButton onClick={loadConfigurations}>
                      <Refresh />
                    </IconButton>
                  }
                />
                <CardContent sx={{ p: 0 }}>
                  <List>
                    {configurations.map((config) => (
                      <ListItem
                        key={config.id}
                        button
                        selected={selectedConfig?.id === config.id}
                        onClick={() => setSelectedConfig(config)}
                      >
                        <ListItemText
                          primary={config.name}
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                Version: {config.version}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <Chip
                                  label={config.status}
                                  size="small"
                                  color={config.status === 'active' ? 'success' : 'default'}
                                />
                                {config.status === 'active' && (
                                  <CheckCircle color="success" fontSize="small" />
                                )}
                              </Box>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            size="small"
                            onClick={() => setEditingConfig(config)}
                          >
                            <Edit />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Configuration Details */}
            <Grid item xs={12} md={8}>
              {selectedConfig ? (
                <ConfigurationForm
                  configuration={selectedConfig}
                  onChange={() => {}} // Read-only
                  validation={{ isValid: true, errors: [], warnings: [] }}
                  readOnly
                />
              ) : (
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="text.secondary" align="center">
                      Select a configuration to view details
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Templates Dialog */}
      <Dialog
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Configuration Templates</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {templates.map((template) => (
              <Grid item xs={12} sm={6} key={template.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h6">{template.name}</Typography>
                      <Chip
                        label={template.category}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {template.description}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                      {template.tags.map((tag) => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" />
                      ))}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Used {template.usageCount} times
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => handleApplyTemplate(template)}
                      >
                        Apply
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTemplates(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Loading Overlay */}
      {loading && (
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
          <LinearProgress />
        </Box>
      )}
    </Box>
  );
};