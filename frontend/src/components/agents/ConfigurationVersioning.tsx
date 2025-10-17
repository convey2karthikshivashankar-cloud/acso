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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
  Divider,
  Alert,
  AlertTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Badge,
  useTheme,
  alpha,
} from '@mui/material';
import {
  History,
  RestoreFromTrash,
  Visibility,
  Compare,
  Download,
  CheckCircle,
  Error,
  Warning,
  Schedule,
  Person,
  CalendarToday,
  Code,
  Backup,
  Close,
} from '@mui/icons-material';
import { AgentConfiguration } from './AgentConfigurationManager';
import { Agent } from '../../types';

export interface ConfigurationVersion {
  id: string;
  configurationId: string;
  version: string;
  config: AgentConfiguration['config'];
  status: 'active' | 'inactive' | 'rollback' | 'archived';
  changeType: 'created' | 'updated' | 'rollback' | 'template_applied';
  changeDescription: string;
  createdAt: Date;
  createdBy: string;
  appliedAt?: Date;
  rollbackFromVersion?: string;
  validationResult?: {
    isValid: boolean;
    errors: number;
    warnings: number;
  };
  performanceImpact?: 'low' | 'medium' | 'high';
  tags: string[];
}

export interface ConfigurationComparison {
  field: string;
  oldValue: any;
  newValue: any;
  changeType: 'added' | 'removed' | 'modified';
  section: string;
}

interface ConfigurationVersioningProps {
  agent: Agent;
  configuration: AgentConfiguration;
  open: boolean;
  onClose: () => void;
  onRollback?: (version: ConfigurationVersion) => Promise<void>;
  onCompare?: (version1: ConfigurationVersion, version2: ConfigurationVersion) => void;
}

interface VersionTimelineProps {
  versions: ConfigurationVersion[];
  onViewVersion: (version: ConfigurationVersion) => void;
  onRollback: (version: ConfigurationVersion) => void;
  onCompare: (version: ConfigurationVersion) => void;
  selectedVersions: string[];
  onSelectVersion: (versionId: string) => void;
}

interface ConfigurationDiffProps {
  version1: ConfigurationVersion;
  version2: ConfigurationVersion;
  comparison: ConfigurationComparison[];
}

const VersionTimeline: React.FC<VersionTimelineProps> = ({
  versions,
  onViewVersion,
  onRollback,
  onCompare,
  selectedVersions,
  onSelectVersion,
}) => {
  const theme = useTheme();

  const getChangeTypeIcon = (changeType: ConfigurationVersion['changeType']) => {
    switch (changeType) {
      case 'created':
        return <CheckCircle color="success" />;
      case 'updated':
        return <Code color="primary" />;
      case 'rollback':
        return <RestoreFromTrash color="warning" />;
      case 'template_applied':
        return <Backup color="info" />;
      default:
        return <Schedule />;
    }
  };

  const getStatusColor = (status: ConfigurationVersion['status']) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'rollback':
        return 'warning';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Timeline>
      {versions.map((version, index) => (
        <TimelineItem key={version.id}>
          <TimelineOppositeContent sx={{ m: 'auto 0' }} variant="body2" color="text.secondary">
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" display="block">
                {version.createdAt.toLocaleDateString()}
              </Typography>
              <Typography variant="caption" display="block">
                {version.createdAt.toLocaleTimeString()}
              </Typography>
            </Box>
          </TimelineOppositeContent>
          
          <TimelineSeparator>
            <TimelineDot
              sx={{
                bgcolor: version.status === 'active' ? 'success.main' : 'grey.400',
                cursor: 'pointer',
                border: selectedVersions.includes(version.id) ? 3 : 0,
                borderColor: 'primary.main',
                borderStyle: 'solid',
              }}
              onClick={() => onSelectVersion(version.id)}
            >
              {getChangeTypeIcon(version.changeType)}
            </TimelineDot>
            {index < versions.length - 1 && <TimelineConnector />}
          </TimelineSeparator>
          
          <TimelineContent sx={{ py: '12px', px: 2 }}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: theme.shadows[4],
                  transform: 'translateY(-1px)',
                },
                border: selectedVersions.includes(version.id) ? 2 : 1,
                borderColor: selectedVersions.includes(version.id) ? 'primary.main' : 'divider',
              }}
              onClick={() => onViewVersion(version)}
            >
              <CardContent sx={{ pb: '16px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6" component="h3">
                    Version {version.version}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      label={version.status}
                      size="small"
                      color={getStatusColor(version.status) as any}
                      variant={version.status === 'active' ? 'filled' : 'outlined'}
                    />
                    {version.status === 'active' && (
                      <Chip label="Current" size="small" color="success" />
                    )}
                  </Box>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {version.changeDescription}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Person fontSize="small" color="action" />
                    <Typography variant="caption">{version.createdBy}</Typography>
                  </Box>
                  
                  {version.validationResult && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {version.validationResult.errors > 0 ? (
                        <Error fontSize="small" color="error" />
                      ) : version.validationResult.warnings > 0 ? (
                        <Warning fontSize="small" color="warning" />
                      ) : (
                        <CheckCircle fontSize="small" color="success" />
                      )}
                      <Typography variant="caption">
                        {version.validationResult.errors > 0 
                          ? `${version.validationResult.errors} errors`
                          : version.validationResult.warnings > 0
                          ? `${version.validationResult.warnings} warnings`
                          : 'Valid'
                        }
                      </Typography>
                    </Box>
                  )}
                  
                  {version.performanceImpact && (
                    <Chip
                      label={`${version.performanceImpact} impact`}
                      size="small"
                      variant="outlined"
                      color={
                        version.performanceImpact === 'high' ? 'error' :
                        version.performanceImpact === 'medium' ? 'warning' : 'success'
                      }
                    />
                  )}
                </Box>
                
                {version.tags.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                    {version.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button
                    size="small"
                    startIcon={<Visibility />}
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewVersion(version);
                    }}
                  >
                    View
                  </Button>
                  
                  {version.status !== 'active' && (
                    <Button
                      size="small"
                      startIcon={<RestoreFromTrash />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRollback(version);
                      }}
                    >
                      Rollback
                    </Button>
                  )}
                  
                  <Button
                    size="small"
                    startIcon={<Compare />}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCompare(version);
                    }}
                    disabled={selectedVersions.length === 0}
                  >
                    Compare
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
};

const ConfigurationDiff: React.FC<ConfigurationDiffProps> = ({
  version1,
  version2,
  comparison,
}) => {
  const theme = useTheme();

  const getChangeColor = (changeType: ConfigurationComparison['changeType']) => {
    switch (changeType) {
      case 'added':
        return theme.palette.success.main;
      case 'removed':
        return theme.palette.error.main;
      case 'modified':
        return theme.palette.warning.main;
      default:
        return theme.palette.text.primary;
    }
  };

  const getChangeIcon = (changeType: ConfigurationComparison['changeType']) => {
    switch (changeType) {
      case 'added':
        return '+';
      case 'removed':
        return '-';
      case 'modified':
        return '~';
      default:
        return '';
    }
  };

  const formatValue = (value: any): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const groupedChanges = comparison.reduce((acc, change) => {
    if (!acc[change.section]) {
      acc[change.section] = [];
    }
    acc[change.section].push(change);
    return acc;
  }, {} as Record<string, ConfigurationComparison[]>);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h6">Version {version1.version}</Typography>
          <Typography variant="caption" color="text.secondary">
            {version1.createdAt.toLocaleString()} by {version1.createdBy}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="h6">Version {version2.version}</Typography>
          <Typography variant="caption" color="text.secondary">
            {version2.createdAt.toLocaleString()} by {version2.createdBy}
          </Typography>
        </Box>
      </Box>

      {Object.entries(groupedChanges).map(([section, changes]) => (
        <Card key={section} sx={{ mb: 2 }}>
          <CardHeader
            title={section.charAt(0).toUpperCase() + section.slice(1)}
            titleTypographyProps={{ variant: 'h6' }}
          />
          <CardContent sx={{ pt: 0 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Field</TableCell>
                    <TableCell>Change</TableCell>
                    <TableCell>Old Value</TableCell>
                    <TableCell>New Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {changes.map((change, index) => (
                    <TableRow key={index}>
                      <TableCell>{change.field}</TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            bgcolor: alpha(getChangeColor(change.changeType), 0.1),
                            color: getChangeColor(change.changeType),
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                          }}
                        >
                          {getChangeIcon(change.changeType)} {change.changeType}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box
                          component="pre"
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            whiteSpace: 'pre-wrap',
                            maxWidth: 200,
                            overflow: 'auto',
                            bgcolor: change.changeType === 'removed' ? alpha(theme.palette.error.main, 0.1) : 'transparent',
                            p: 0.5,
                            borderRadius: 0.5,
                          }}
                        >
                          {formatValue(change.oldValue)}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box
                          component="pre"
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            whiteSpace: 'pre-wrap',
                            maxWidth: 200,
                            overflow: 'auto',
                            bgcolor: change.changeType === 'added' ? alpha(theme.palette.success.main, 0.1) : 'transparent',
                            p: 0.5,
                            borderRadius: 0.5,
                          }}
                        >
                          {formatValue(change.newValue)}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      ))}

      {comparison.length === 0 && (
        <Alert severity="info">
          <AlertTitle>No Changes</AlertTitle>
          These versions have identical configurations.
        </Alert>
      )}
    </Box>
  );
};

export const ConfigurationVersioning: React.FC<ConfigurationVersioningProps> = ({
  agent,
  configuration,
  open,
  onClose,
  onRollback,
  onCompare,
}) => {
  const [versions, setVersions] = React.useState<ConfigurationVersion[]>([]);
  const [selectedVersions, setSelectedVersions] = React.useState<string[]>([]);
  const [viewingVersion, setViewingVersion] = React.useState<ConfigurationVersion | null>(null);
  const [comparingVersions, setComparingVersions] = React.useState<ConfigurationVersion[] | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      loadVersions();
    }
  }, [open, configuration.id]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      // Mock data - in real app, fetch from API
      const mockVersions: ConfigurationVersion[] = [
        {
          id: 'version-1',
          configurationId: configuration.id,
          version: '1.2.0',
          config: configuration.config,
          status: 'active',
          changeType: 'updated',
          changeDescription: 'Updated security settings and performance limits',
          createdAt: new Date('2024-01-20T10:30:00'),
          createdBy: 'admin',
          appliedAt: new Date('2024-01-20T10:35:00'),
          validationResult: {
            isValid: true,
            errors: 0,
            warnings: 1,
          },
          performanceImpact: 'low',
          tags: ['security', 'performance'],
        },
        {
          id: 'version-2',
          configurationId: configuration.id,
          version: '1.1.0',
          config: {
            ...configuration.config,
            security: {
              ...configuration.config.security,
              encryptionEnabled: false,
            },
          },
          status: 'inactive',
          changeType: 'template_applied',
          changeDescription: 'Applied high performance template',
          createdAt: new Date('2024-01-18T14:20:00'),
          createdBy: 'operator',
          validationResult: {
            isValid: true,
            errors: 0,
            warnings: 0,
          },
          performanceImpact: 'medium',
          tags: ['template', 'performance'],
        },
        {
          id: 'version-3',
          configurationId: configuration.id,
          version: '1.0.0',
          config: {
            ...configuration.config,
            general: {
              ...configuration.config.general,
              logLevel: 'debug',
            },
          },
          status: 'archived',
          changeType: 'created',
          changeDescription: 'Initial configuration created',
          createdAt: new Date('2024-01-15T09:00:00'),
          createdBy: 'admin',
          appliedAt: new Date('2024-01-15T09:05:00'),
          validationResult: {
            isValid: false,
            errors: 2,
            warnings: 3,
          },
          performanceImpact: 'high',
          tags: ['initial', 'debug'],
        },
      ];
      
      setVersions(mockVersions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVersion = (versionId: string) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId);
      } else if (prev.length < 2) {
        return [...prev, versionId];
      } else {
        return [prev[1], versionId]; // Replace oldest selection
      }
    });
  };

  const handleCompareVersions = () => {
    if (selectedVersions.length === 2) {
      const version1 = versions.find(v => v.id === selectedVersions[0])!;
      const version2 = versions.find(v => v.id === selectedVersions[1])!;
      
      // Generate comparison
      const comparison = generateComparison(version1.config, version2.config);
      setComparingVersions([version1, version2]);
    }
  };

  const generateComparison = (config1: any, config2: any): ConfigurationComparison[] => {
    const changes: ConfigurationComparison[] = [];
    
    const compareObjects = (obj1: any, obj2: any, path: string, section: string) => {
      const keys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);
      
      keys.forEach(key => {
        const fullPath = path ? `${path}.${key}` : key;
        const val1 = obj1?.[key];
        const val2 = obj2?.[key];
        
        if (val1 === undefined && val2 !== undefined) {
          changes.push({
            field: fullPath,
            oldValue: undefined,
            newValue: val2,
            changeType: 'added',
            section,
          });
        } else if (val1 !== undefined && val2 === undefined) {
          changes.push({
            field: fullPath,
            oldValue: val1,
            newValue: undefined,
            changeType: 'removed',
            section,
          });
        } else if (typeof val1 === 'object' && typeof val2 === 'object') {
          compareObjects(val1, val2, fullPath, section);
        } else if (val1 !== val2) {
          changes.push({
            field: fullPath,
            oldValue: val1,
            newValue: val2,
            changeType: 'modified',
            section,
          });
        }
      });
    };
    
    Object.keys(config1).forEach(section => {
      compareObjects(config1[section], config2[section], '', section);
    });
    
    return changes;
  };

  const handleRollback = async (version: ConfigurationVersion) => {
    if (onRollback) {
      await onRollback(version);
      onClose();
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { height: '90vh' } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6">Configuration History</Typography>
              <Typography variant="body2" color="text.secondary">
                {agent.name} - {configuration.name}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {selectedVersions.length === 2 && (
                <Button
                  startIcon={<Compare />}
                  onClick={handleCompareVersions}
                >
                  Compare Selected
                </Button>
              )}
              <IconButton onClick={onClose}>
                <Close />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedVersions.length > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <AlertTitle>Version Selection</AlertTitle>
              {selectedVersions.length === 1 
                ? 'Select another version to compare'
                : `Selected ${selectedVersions.length} versions for comparison`
              }
            </Alert>
          )}
          
          <VersionTimeline
            versions={versions}
            onViewVersion={setViewingVersion}
            onRollback={handleRollback}
            onCompare={(version) => {
              handleSelectVersion(version.id);
            }}
            selectedVersions={selectedVersions}
            onSelectVersion={handleSelectVersion}
          />
        </DialogContent>
      </Dialog>

      {/* Version Details Dialog */}
      <Dialog
        open={!!viewingVersion}
        onClose={() => setViewingVersion(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Version {viewingVersion?.version} Details
        </DialogTitle>
        <DialogContent>
          {viewingVersion && (
            <Box>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body1" gutterBottom>
                  <strong>Description:</strong> {viewingVersion.changeDescription}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Created by {viewingVersion.createdBy} on {viewingVersion.createdAt.toLocaleString()}
                </Typography>
                {viewingVersion.appliedAt && (
                  <Typography variant="body2" color="text.secondary">
                    Applied on {viewingVersion.appliedAt.toLocaleString()}
                  </Typography>
                )}
              </Box>
              
              <Box component="pre" sx={{ 
                bgcolor: 'grey.100', 
                p: 2, 
                borderRadius: 1, 
                overflow: 'auto',
                fontSize: '0.875rem',
                fontFamily: 'monospace',
              }}>
                {JSON.stringify(viewingVersion.config, null, 2)}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingVersion(null)}>Close</Button>
          {viewingVersion?.status !== 'active' && (
            <Button
              startIcon={<RestoreFromTrash />}
              onClick={() => {
                if (viewingVersion) {
                  handleRollback(viewingVersion);
                  setViewingVersion(null);
                }
              }}
            >
              Rollback to This Version
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Comparison Dialog */}
      <Dialog
        open={!!comparingVersions}
        onClose={() => setComparingVersions(null)}
        maxWidth="xl"
        fullWidth
        PaperProps={{ sx: { height: '90vh' } }}
      >
        <DialogTitle>
          Configuration Comparison
        </DialogTitle>
        <DialogContent>
          {comparingVersions && (
            <ConfigurationDiff
              version1={comparingVersions[0]}
              version2={comparingVersions[1]}
              comparison={generateComparison(comparingVersions[0].config, comparingVersions[1].config)}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setComparingVersions(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};