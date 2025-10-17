import React from 'react';
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Button,
  Chip,
  Avatar,
  Divider,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Alert,
  Snackbar,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Security,
  Analytics,
  AccountBalance,
  Settings,
  People,
  SwapHoriz,
  Share,
  Save,
  Restore,
  Visibility,
  VisibilityOff,
  Lock,
  LockOpen,
  PersonAdd,
  Group,
} from '@mui/icons-material';
import { DashboardLayoutEngine, DashboardWidget, DashboardTemplate } from './DashboardLayoutEngine';
import { WidgetFactory, WidgetRegistry } from './widgets/WidgetRegistry';

export interface UserRole {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  color: string;
  icon: React.ReactNode;
  defaultDashboard?: string;
  allowedWidgets?: string[];
  dashboardPermissions: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
    canExport: boolean;
  };
}

export interface DashboardUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  roles: string[];
  activeRole: string;
  preferences: {
    defaultDashboard?: string;
    autoRefresh: boolean;
    refreshInterval: number;
    theme: 'light' | 'dark' | 'auto';
    density: 'comfortable' | 'compact';
  };
}

export interface DashboardShare {
  id: string;
  dashboardId: string;
  sharedBy: string;
  sharedWith: string[];
  permissions: string[];
  expiresAt?: Date;
  createdAt: Date;
}

export interface RoleBasedDashboardProps {
  user: DashboardUser;
  roles: UserRole[];
  dashboards: DashboardTemplate[];
  shares: DashboardShare[];
  onRoleChange?: (roleId: string) => void;
  onDashboardChange?: (dashboardId: string) => void;
  onDashboardSave?: (dashboard: DashboardTemplate) => void;
  onDashboardShare?: (dashboardId: string, shareWith: string[], permissions: string[]) => void;
  onUserPreferencesChange?: (preferences: Partial<DashboardUser['preferences']>) => void;
}

const predefinedRoles: UserRole[] = [
  {
    id: 'admin',
    name: 'admin',
    displayName: 'System Administrator',
    description: 'Full system access and management capabilities',
    permissions: ['*'],
    color: '#f44336',
    icon: <Settings />,
    allowedWidgets: ['*'],
    dashboardPermissions: {
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canShare: true,
      canExport: true,
    },
  },
  {
    id: 'security',
    name: 'security',
    displayName: 'Security Analyst',
    description: 'Security monitoring and incident response',
    permissions: ['security.*', 'incidents.*', 'threats.*'],
    color: '#ff9800',
    icon: <Security />,
    allowedWidgets: ['security-metric', 'threat-detection-chart', 'activity-list', 'agent-status-table'],
    dashboardPermissions: {
      canCreate: true,
      canEdit: true,
      canDelete: false,
      canShare: true,
      canExport: true,
    },
  },
  {
    id: 'operations',
    name: 'operations',
    displayName: 'Operations Manager',
    description: 'System operations and workflow management',
    permissions: ['operations.*', 'workflows.*', 'agents.*'],
    color: '#2196f3',
    icon: <DashboardIcon />,
    allowedWidgets: ['system-health-metric', 'performance-metric', 'system-metrics-chart', 'agent-status-table'],
    dashboardPermissions: {
      canCreate: true,
      canEdit: true,
      canDelete: false,
      canShare: true,
      canExport: true,
    },
  },
  {
    id: 'financial',
    name: 'financial',
    displayName: 'Financial Analyst',
    description: 'Cost analysis and financial intelligence',
    permissions: ['financial.*', 'costs.*', 'reports.*'],
    color: '#4caf50',
    icon: <AccountBalance />,
    allowedWidgets: ['single-metric', 'multi-metric', 'chart', 'table'],
    dashboardPermissions: {
      canCreate: true,
      canEdit: true,
      canDelete: false,
      canShare: true,
      canExport: true,
    },
  },
  {
    id: 'analyst',
    name: 'analyst',
    displayName: 'Data Analyst',
    description: 'Data analysis and reporting',
    permissions: ['analytics.*', 'reports.*', 'data.*'],
    color: '#9c27b0',
    icon: <Analytics />,
    allowedWidgets: ['chart', 'table', 'performance-radar', 'multi-metric'],
    dashboardPermissions: {
      canCreate: true,
      canEdit: true,
      canDelete: false,
      canShare: true,
      canExport: true,
    },
  },
  {
    id: 'viewer',
    name: 'viewer',
    displayName: 'Viewer',
    description: 'Read-only access to dashboards',
    permissions: ['read.*'],
    color: '#607d8b',
    icon: <Visibility />,
    allowedWidgets: ['single-metric', 'multi-metric', 'chart', 'list'],
    dashboardPermissions: {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canShare: false,
      canExport: true,
    },
  },
];

export const RoleBasedDashboard: React.FC<RoleBasedDashboardProps> = ({
  user,
  roles = predefinedRoles,
  dashboards,
  shares,
  onRoleChange,
  onDashboardChange,
  onDashboardSave,
  onDashboardShare,
  onUserPreferencesChange,
}) => {
  const theme = useTheme();
  const [currentDashboard, setCurrentDashboard] = React.useState<DashboardTemplate | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [roleMenuAnchor, setRoleMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [dashboardMenuAnchor, setDashboardMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = React.useState(false);
  const [notification, setNotification] = React.useState<{ message: string; severity: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  const currentRole = roles.find(role => role.id === user.activeRole);
  const availableDashboards = getAvailableDashboards();
  const availableWidgets = getAvailableWidgets();

  React.useEffect(() => {
    // Set initial dashboard based on user preferences or role default
    const initialDashboard = dashboards.find(d => 
      d.id === user.preferences.defaultDashboard || 
      d.id === currentRole?.defaultDashboard
    ) || dashboards.find(d => d.role === user.activeRole) || dashboards[0];
    
    if (initialDashboard) {
      setCurrentDashboard(initialDashboard);
    }
  }, [user.activeRole, dashboards, currentRole]);

  function getAvailableDashboards(): DashboardTemplate[] {
    if (!currentRole) return [];

    return dashboards.filter(dashboard => {
      // Admin can see all dashboards
      if (currentRole.permissions.includes('*')) return true;
      
      // User can see dashboards for their role
      if (dashboard.role === user.activeRole) return true;
      
      // User can see public dashboards
      if (!dashboard.role || dashboard.role === 'public') return true;
      
      // User can see shared dashboards
      const sharedDashboard = shares.find(share => 
        share.dashboardId === dashboard.id && 
        share.sharedWith.includes(user.id)
      );
      if (sharedDashboard) return true;

      return false;
    });
  }

  function getAvailableWidgets() {
    if (!currentRole) return [];

    if (currentRole.allowedWidgets?.includes('*')) {
      return WidgetRegistry.getAll();
    }

    return WidgetRegistry.getAll().filter(widget => {
      // Check if widget is allowed for this role
      if (currentRole.allowedWidgets?.includes(widget.id)) return true;
      
      // Check widget permissions against user permissions
      if (widget.permissions) {
        return widget.permissions.some(permission => 
          currentRole.permissions.includes(permission) ||
          currentRole.permissions.includes('*')
        );
      }

      return true; // No specific permissions required
    });
  }

  const hasPermission = (permission: keyof UserRole['dashboardPermissions']): boolean => {
    return currentRole?.dashboardPermissions[permission] || false;
  };

  const handleRoleChange = (roleId: string) => {
    onRoleChange?.(roleId);
    setRoleMenuAnchor(null);
    
    // Find default dashboard for new role
    const newRole = roles.find(r => r.id === roleId);
    const roleDashboard = dashboards.find(d => d.role === roleId || d.id === newRole?.defaultDashboard);
    
    if (roleDashboard) {
      setCurrentDashboard(roleDashboard);
      onDashboardChange?.(roleDashboard.id);
    }
    
    setNotification({
      message: `Switched to ${newRole?.displayName} role`,
      severity: 'info',
    });
  };

  const handleDashboardChange = (dashboardId: string) => {
    const dashboard = dashboards.find(d => d.id === dashboardId);
    if (dashboard) {
      setCurrentDashboard(dashboard);
      onDashboardChange?.(dashboardId);
      setDashboardMenuAnchor(null);
    }
  };

  const handleSaveDashboard = () => {
    if (currentDashboard && hasPermission('canEdit')) {
      onDashboardSave?.(currentDashboard);
      setIsEditing(false);
      setNotification({
        message: 'Dashboard saved successfully',
        severity: 'success',
      });
    }
  };

  const handleShareDashboard = (shareWith: string[], permissions: string[]) => {
    if (currentDashboard && hasPermission('canShare')) {
      onDashboardShare?.(currentDashboard.id, shareWith, permissions);
      setShareDialogOpen(false);
      setNotification({
        message: 'Dashboard shared successfully',
        severity: 'success',
      });
    }
  };

  const canEditDashboard = (): boolean => {
    if (!currentDashboard || !currentRole) return false;
    
    // Check role permissions
    if (!hasPermission('canEdit')) return false;
    
    // Check if user owns the dashboard or has edit permissions
    const sharedDashboard = shares.find(share => 
      share.dashboardId === currentDashboard.id && 
      share.sharedWith.includes(user.id)
    );
    
    if (sharedDashboard) {
      return sharedDashboard.permissions.includes('edit');
    }
    
    // User can edit dashboards for their role or public dashboards
    return currentDashboard.role === user.activeRole || !currentDashboard.role;
  };

  const renderRoleSelector = () => {
    const userRoles = roles.filter(role => user.roles.includes(role.id));
    
    if (userRoles.length <= 1) return null;

    return (
      <>
        <Button
          startIcon={currentRole?.icon}
          endIcon={<SwapHoriz />}
          onClick={(e) => setRoleMenuAnchor(e.currentTarget)}
          sx={{ color: 'inherit' }}
        >
          {currentRole?.displayName}
        </Button>
        
        <Menu
          anchorEl={roleMenuAnchor}
          open={Boolean(roleMenuAnchor)}
          onClose={() => setRoleMenuAnchor(null)}
        >
          {userRoles.map((role) => (
            <MenuItem
              key={role.id}
              onClick={() => handleRoleChange(role.id)}
              selected={role.id === user.activeRole}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Avatar
                  sx={{
                    bgcolor: role.color,
                    width: 32,
                    height: 32,
                  }}
                >
                  {role.icon}
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    {role.displayName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {role.description}
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
          ))}
        </Menu>
      </>
    );
  };

  const renderDashboardSelector = () => (
    <>
      <Button
        startIcon={<DashboardIcon />}
        onClick={(e) => setDashboardMenuAnchor(e.currentTarget)}
        sx={{ color: 'inherit' }}
      >
        {currentDashboard?.name || 'Select Dashboard'}
      </Button>
      
      <Menu
        anchorEl={dashboardMenuAnchor}
        open={Boolean(dashboardMenuAnchor)}
        onClose={() => setDashboardMenuAnchor(null)}
        PaperProps={{ sx: { minWidth: 300 } }}
      >
        {availableDashboards.map((dashboard) => {
          const isShared = shares.some(share => 
            share.dashboardId === dashboard.id && 
            share.sharedWith.includes(user.id)
          );
          
          return (
            <MenuItem
              key={dashboard.id}
              onClick={() => handleDashboardChange(dashboard.id)}
              selected={dashboard.id === currentDashboard?.id}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Avatar
                  sx={{
                    bgcolor: dashboard.role ? 
                      roles.find(r => r.id === dashboard.role)?.color || theme.palette.primary.main :
                      theme.palette.grey[500],
                    width: 32,
                    height: 32,
                  }}
                >
                  {dashboard.role ? 
                    roles.find(r => r.id === dashboard.role)?.icon || <DashboardIcon /> :
                    <DashboardIcon />
                  }
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {dashboard.name}
                    </Typography>
                    {isShared && (
                      <Chip label="Shared" size="small" color="info" />
                    )}
                    {dashboard.role && (
                      <Chip 
                        label={roles.find(r => r.id === dashboard.role)?.displayName || dashboard.role} 
                        size="small" 
                        sx={{ bgcolor: alpha(roles.find(r => r.id === dashboard.role)?.color || theme.palette.primary.main, 0.1) }}
                      />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {dashboard.description}
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
          );
        })}
        
        {availableDashboards.length === 0 && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              No dashboards available for this role
            </Typography>
          </MenuItem>
        )}
      </Menu>
    </>
  );

  const renderToolbar = () => (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          {renderRoleSelector()}
          <Divider orientation="vertical" flexItem />
          {renderDashboardSelector()}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {currentDashboard && (
            <Chip
              label={`${currentDashboard.widgets.length} widgets`}
              size="small"
              variant="outlined"
            />
          )}

          {canEditDashboard() && (
            <FormControlLabel
              control={
                <Switch
                  checked={isEditing}
                  onChange={(e) => setIsEditing(e.target.checked)}
                  size="small"
                />
              }
              label="Edit"
              sx={{ ml: 1 }}
            />
          )}

          {isEditing && canEditDashboard() && (
            <>
              <Button
                startIcon={<Save />}
                onClick={handleSaveDashboard}
                variant="contained"
                size="small"
              >
                Save
              </Button>
              <Button
                startIcon={<Restore />}
                onClick={() => setIsEditing(false)}
                size="small"
              >
                Cancel
              </Button>
            </>
          )}

          {hasPermission('canShare') && currentDashboard && (
            <IconButton
              onClick={() => setShareDialogOpen(true)}
              size="small"
            >
              <Share />
            </IconButton>
          )}

          <IconButton
            onClick={() => setSettingsDialogOpen(true)}
            size="small"
          >
            <Settings />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );

  const renderShareDialog = () => (
    <Dialog
      open={shareDialogOpen}
      onClose={() => setShareDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Share Dashboard</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Share "{currentDashboard?.name}" with other users
        </Typography>
        
        <Typography variant="subtitle2" gutterBottom>
          Share with roles:
        </Typography>
        
        <List dense>
          {roles.filter(role => role.id !== user.activeRole).map((role) => (
            <ListItem key={role.id}>
              <ListItemIcon>
                <Avatar sx={{ bgcolor: role.color, width: 32, height: 32 }}>
                  {role.icon}
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={role.displayName}
                secondary={role.description}
              />
              <ListItemSecondaryAction>
                <Switch size="small" />
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShareDialogOpen(false)}>
          Cancel
        </Button>
        <Button
          onClick={() => handleShareDashboard(['security', 'operations'], ['view', 'edit'])}
          variant="contained"
        >
          Share
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderSettingsDialog = () => (
    <Dialog
      open={settingsDialogOpen}
      onClose={() => setSettingsDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Dashboard Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={user.preferences.autoRefresh}
                onChange={(e) => onUserPreferencesChange?.({ autoRefresh: e.target.checked })}
              />
            }
            label="Auto Refresh"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={user.preferences.density === 'compact'}
                onChange={(e) => onUserPreferencesChange?.({ 
                  density: e.target.checked ? 'compact' : 'comfortable' 
                })}
              />
            }
            label="Compact Layout"
          />

          <Typography variant="subtitle2" sx={{ mt: 2 }}>
            Current Role Permissions:
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {Object.entries(currentRole?.dashboardPermissions || {}).map(([permission, allowed]) => (
              <Chip
                key={permission}
                label={permission.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}
                color={allowed ? 'success' : 'default'}
                size="small"
                icon={allowed ? <LockOpen /> : <Lock />}
              />
            ))}
          </Box>

          <Typography variant="subtitle2" sx={{ mt: 2 }}>
            Available Widgets:
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            {availableWidgets.length} widget types available for your role
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setSettingsDialogOpen(false)}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (!currentDashboard) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {renderToolbar()}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Alert severity="info">
            <Typography variant="h6" gutterBottom>
              No Dashboard Available
            </Typography>
            <Typography variant="body2">
              No dashboards are available for your current role. Contact your administrator to get access.
            </Typography>
          </Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {renderToolbar()}
      
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <DashboardLayoutEngine
          widgets={currentDashboard.widgets}
          template={currentDashboard}
          editable={isEditing && canEditDashboard()}
          onLayoutChange={(layouts) => {
            if (currentDashboard) {
              setCurrentDashboard({
                ...currentDashboard,
                layouts,
              });
            }
          }}
          onWidgetAdd={(widget) => {
            if (currentDashboard) {
              const newWidget = WidgetFactory.createWidget(
                widget.type || 'single-metric',
                widget.id || `widget-${Date.now()}`,
                widget.props
              );
              
              setCurrentDashboard({
                ...currentDashboard,
                widgets: [...currentDashboard.widgets, newWidget],
              });
            }
          }}
          onWidgetRemove={(widgetId) => {
            if (currentDashboard) {
              setCurrentDashboard({
                ...currentDashboard,
                widgets: currentDashboard.widgets.filter(w => w.id !== widgetId),
              });
            }
          }}
          onWidgetUpdate={(widgetId, updates) => {
            if (currentDashboard) {
              setCurrentDashboard({
                ...currentDashboard,
                widgets: currentDashboard.widgets.map(w => 
                  w.id === widgetId ? { ...w, ...updates } : w
                ),
              });
            }
          }}
          availableWidgets={availableWidgets.map(widget => ({
            type: widget.id,
            name: widget.name,
            description: widget.description,
            component: widget.component,
            defaultSize: widget.defaultSize,
          }))}
        />
      </Box>

      {renderShareDialog()}
      {renderSettingsDialog()}

      {/* Notification Snackbar */}
      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={4000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {notification && (
          <Alert
            onClose={() => setNotification(null)}
            severity={notification.severity}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
};