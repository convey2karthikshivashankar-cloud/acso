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
} from '@mui/material';
import {
  Palette,
  GridView,
  Settings,
  Star,
  Download,
  Upload,
  Refresh,
  Fullscreen,
  Share,
} from '@mui/icons-material';
import { EnhancedDashboard } from './EnhancedDashboard';
import { DashboardTemplate } from './DashboardLayoutEngine';
import { UserRole } from './RoleBasedDashboard';
import { createRoleDashboardTemplates } from './RoleDashboardTemplates';

export const DashboardCustomizationExample: React.FC = () => {
  const [selectedDashboard, setSelectedDashboard] = React.useState<DashboardTemplate | null>(null);
  const [selectedRole, setSelectedRole] = React.useState<UserRole>('admin');
  const [showDemo, setShowDemo] = React.useState(false);

  // Create sample dashboards for different roles
  const dashboardTemplates = React.useMemo(() => {
    return createRoleDashboardTemplates();
  }, []);

  const currentDashboard = React.useMemo(() => {
    return dashboardTemplates.find(d => d.role === selectedRole) || dashboardTemplates[0];
  }, [dashboardTemplates, selectedRole]);

  const features = [
    {
      icon: <Palette />,
      title: 'Theme Customization',
      description: 'Customize colors, typography, card styles, and visual density',
      items: [
        'Light, dark, and auto themes',
        'Custom color palettes',
        'Card style options (elevated, outlined, filled)',
        'Adjustable border radius and density',
      ],
    },
    {
      icon: <GridView />,
      title: 'Layout Configuration',
      description: 'Adjust grid settings, spacing, and layout behavior',
      items: [
        'Configurable grid columns (6-24)',
        'Adjustable row height and margins',
        'Compact layout options',
        'Auto-resize and snap-to-grid',
      ],
    },
    {
      icon: <Settings />,
      title: 'Widget Management',
      description: 'Control widget visibility, order, and individual styling',
      items: [
        'Drag-and-drop widget reordering',
        'Show/hide individual widgets',
        'Custom widget titles',
        'Per-widget color customization',
      ],
    },
    {
      icon: <Star />,
      title: 'Preset System',
      description: 'Browse and apply pre-built customization presets',
      items: [
        'Built-in theme and layout presets',
        'User-created custom presets',
        'Preset categories and search',
        'Popularity-based recommendations',
      ],
    },
  ];

  const capabilities = [
    'Real-time preview of customizations',
    'Auto-save functionality',
    'Export/import customization settings',
    'Role-based default configurations',
    'Fullscreen dashboard mode',
    'Responsive design adaptation',
    'Accessibility-compliant themes',
    'Performance-optimized rendering',
  ];

  if (showDemo && currentDashboard) {
    return (
      <Box sx={{ minHeight: '100vh' }}>
        <EnhancedDashboard
          dashboard={currentDashboard}
          userId="demo-user"
          userRole={selectedRole}
        />
        <Button
          variant="contained"
          onClick={() => setShowDemo(false)}
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: 1400,
          }}
        >
          Back to Overview
        </Button>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Dashboard Customization System
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Comprehensive dashboard personalization with themes, layouts, and presets
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => setShowDemo(true)}
            startIcon={<Settings />}
          >
            Try Interactive Demo
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

      {/* Role Selection */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Select User Role for Demo
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {(['admin', 'analyst', 'operator', 'viewer'] as UserRole[]).map((role) => (
              <Chip
                key={role}
                label={role.charAt(0).toUpperCase() + role.slice(1)}
                onClick={() => setSelectedRole(role)}
                color={selectedRole === role ? 'primary' : 'default'}
                variant={selectedRole === role ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
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
        <AlertTitle>How to Use Dashboard Customization</AlertTitle>
        <Typography variant="body2" sx={{ mb: 2 }}>
          The dashboard customization system provides multiple ways to personalize your experience:
        </Typography>
        
        <List dense>
          <ListItem>
            <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
            <ListItemText primary="Use the floating action button to access customization options" />
          </ListItem>
          <ListItem>
            <ListItemIcon><Palette fontSize="small" /></ListItemIcon>
            <ListItemText primary="Browse preset themes and layouts for quick setup" />
          </ListItem>
          <ListItem>
            <ListItemIcon><Download fontSize="small" /></ListItemIcon>
            <ListItemText primary="Export your customizations to share or backup" />
          </ListItem>
          <ListItem>
            <ListItemIcon><Fullscreen fontSize="small" /></ListItemIcon>
            <ListItemText primary="Enable fullscreen mode for distraction-free viewing" />
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
            The dashboard customization system is built with the following technologies and patterns:
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
                  <ListItemText primary="React Grid Layout" secondary="Drag-and-drop grid system" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="React Beautiful DnD" secondary="Accessible drag-and-drop" />
                </ListItem>
              </List>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Architecture Patterns
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="Context API" secondary="Global customization state" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Service Layer" secondary="Personalization data management" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Theme Provider" secondary="Dynamic theme application" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Preset System" secondary="Reusable configuration templates" />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
};