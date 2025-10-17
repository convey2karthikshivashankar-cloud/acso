import React from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  useTheme,
} from '@mui/material';
import {
  Settings,
  History,
  Group,
  Security,
  Speed,
  Visibility,
  CheckCircle,
  Warning,
  Error,
  Schedule,
} from '@mui/icons-material';
import { AgentConfigurationManager } from './AgentConfigurationManager';
import { ConfigurationVersioning } from './ConfigurationVersioning';
import { BulkConfigurationManager } from './BulkConfigurationManager';
import { generateMockAgents } from './index';
import { Agent } from '../../types';

export const AgentConfigurationExample: React.FC = () => {
  const theme = useTheme();
  const [selectedAgent, setSelectedAgent] = React.useState<Agent | null>(null);
  const [showConfigManager, setShowConfigManager] = React.useState(false);
  const [showVersioning, setShowVersioning] = React.useState(false);
  const [showBulkManager, setShowBulkManager] = React.useState(false);
  const [agents] = React.useState<Agent[]>(generateMockAgents());

  const mockTemplates = [
    {
      id: 'template-1',
      name: 'High Security',
      description: 'Maximum security configuration with encryption and strict access controls',
      category: 'security' as const,
      config: {
        security: {
          encryptionEnabled: true,
          authenticationRequired: true,
          allowedHosts: ['127.0.0.1'],
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
      category: 'performance' as const,
      config: {
        performance: {
          maxConcurrentTasks: 20,
          memoryLimit: 2048,
          cpuLimit: 95,
        },
      },
      tags: ['performance', 'throughput', 'optimized'],
      isBuiltIn: true,
      usageCount: 32,
      createdAt: new Date('2024-01-01'),
    },
  ];

  const features = [
    {
      icon: <Settings />,
      title: 'Configuration Management',
      description: 'Comprehensive agent configuration with validation and templates',
      items: [
        'Form-based configuration editing',
        'Real-time validation and error checking',
        'Configuration templates and presets',
        'Security, performance, and monitoring settings',
      ],
    },
    {
      icon: <History />,
      title: 'Version Control',
      description: 'Track configuration changes with full version history',
      items: [
        'Complete configuration history',
        'Version comparison and diff viewing',
        'One-click rollback to previous versions',
        'Change tracking and audit trails',
      ],
    },
    {
      icon: <Group />,
      title: 'Bulk Operations',
      description: 'Manage multiple agents simultaneously with bulk operations',
      items: [
        'Multi-agent selection with filtering',
        'Bulk template application',
        'Progress monitoring and error handling',
        'Retry failed operations',
      ],
    },
    {
      icon: <Security />,
      title: 'Validation & Safety',
      description: 'Ensure configuration safety with comprehensive validation',
      items: [
        'Real-time configuration validation',
        'Error and warning detection',
        'Performance impact assessment',
        'Rollback safety mechanisms',
      ],
    },
  ];

  const capabilities = [
    'Multi-level configuration validation',
    'Template-based configuration management',
    'Version control with rollback support',
    'Bulk operations with progress tracking',
    'Real-time configuration preview',
    'Performance impact analysis',
    'Audit trail and change tracking',
    'Role-based configuration access',
  ];

  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowConfigManager(true);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Agent Configuration Management
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Comprehensive configuration management with versioning and bulk operations
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => setShowBulkManager(true)}
            startIcon={<Group />}
          >
            Bulk Configuration
          </Button>
          <Button
            variant="outlined"
            size="large"
            href="#features"
          >
            View Features
          </Button>
        </Box>
      </Box>

      {/* Agent Selection */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Select Agent for Configuration
          </Typography>
          <Grid container spacing={2}>
            {agents.slice(0, 6).map((agent) => (
              <Grid item xs={12} sm={6} md={4} key={agent.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: theme.shadows[4],
                      transform: 'translateY(-2px)',
                    },
                  }}
                  onClick={() => handleAgentSelect(agent)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h6">{agent.name}</Typography>
                      <Chip
                        label={agent.status}
                        size="small"
                        color={
                          agent.status === 'online' ? 'success' :
                          agent.status === 'warning' ? 'warning' :
                          agent.status === 'maintenance' ? 'info' : 'error'
                        }
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {agent.type.replace('_', ' ').toUpperCase()}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption">Health: {agent.health.score}%</Typography>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: agent.health.score > 80 ? 'success.main' : 
                                   agent.health.score > 60 ? 'warning.main' : 'error.main',
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Key Features */}
      <Box id="features" sx={{ mb: 6 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 4 }}>
          Key Features
        </Typography>
        
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ mr: 2, color: 'primary.main' }}>
                      {feature.icon}
                    </Box>
                    <Typography variant="h6" component="h3">
                      {feature.title}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {feature.description}
                  </Typography>
                  
                  <List dense>
                    {feature.items.map((item, itemIndex) => (
                      <ListItem key={itemIndex} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              bgcolor: 'primary.main',
                            }}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={item}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* System Capabilities */}
      <Card sx={{ mb: 6 }}>
        <CardContent>
          <Typography variant="h5" component="h3" gutterBottom>
            System Capabilities
          </Typography>
          
          <Grid container spacing={2}>
            {capabilities.map((capability, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'success.main',
                      mr: 2,
                    }}
                  />
                  <Typography variant="body2">
                    {capability}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Alert severity="info" sx={{ mb: 4 }}>
        <AlertTitle>How to Use Agent Configuration Management</AlertTitle>
        <Typography variant="body2" sx={{ mb: 2 }}>
          The agent configuration management system provides comprehensive tools for managing agent settings:
        </Typography>
        
        <List dense>
          <ListItem>
            <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
            <ListItemText primary="Click on any agent above to open the configuration manager" />
          </ListItem>
          <ListItem>
            <ListItemIcon><History fontSize="small" /></ListItemIcon>
            <ListItemText primary="View configuration history and rollback to previous versions" />
          </ListItem>
          <ListItem>
            <ListItemIcon><Group fontSize="small" /></ListItemIcon>
            <ListItemText primary="Use bulk operations to configure multiple agents simultaneously" />
          </ListItem>
          <ListItem>
            <ListItemIcon><Security fontSize="small" /></ListItemIcon>
            <ListItemText primary="Apply security templates for consistent configuration" />
          </ListItem>
        </List>
      </Alert>

      {/* Technical Details */}
      <Card>
        <CardContent>
          <Typography variant="h5" component="h3" gutterBottom>
            Technical Implementation
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 2 }}>
            The agent configuration management system is built with the following technologies and patterns:
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Frontend Technologies
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="React with TypeScript" secondary="Type-safe component development" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Material-UI (MUI)" secondary="Consistent design system" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Form Validation" secondary="Real-time configuration validation" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Stepper Components" secondary="Multi-step configuration workflows" />
                </ListItem>
              </List>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Architecture Patterns
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="Configuration Versioning" secondary="Complete change history tracking" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Template System" secondary="Reusable configuration patterns" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Bulk Operations" secondary="Multi-agent management workflows" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Validation Engine" secondary="Real-time configuration validation" />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Configuration Manager Dialog */}
      {selectedAgent && (
        <AgentConfigurationManager
          agent={selectedAgent}
          onConfigurationChange={(config) => {
            console.log('Configuration changed:', config);
          }}
          onClose={() => {
            setShowConfigManager(false);
            setSelectedAgent(null);
          }}
        />
      )}

      {/* Bulk Configuration Manager Dialog */}
      <BulkConfigurationManager
        agents={agents}
        templates={mockTemplates}
        open={showBulkManager}
        onClose={() => setShowBulkManager(false)}
        onExecuteOperation={async (operation) => {
          console.log('Executing bulk operation:', operation);
          // Mock execution
          await new Promise(resolve => setTimeout(resolve, 2000));
        }}
      />
    </Container>
  );
};