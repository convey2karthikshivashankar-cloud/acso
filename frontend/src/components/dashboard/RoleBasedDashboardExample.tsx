import React from 'react';
import { Box, Container, Typography, Alert } from '@mui/material';
import { RoleBasedDashboard, UserRole, DashboardUser, DashboardShare } from './RoleBasedDashboard';
import { createRoleDashboardTemplates } from './RoleDashboardTemplates';
import { dashboardCollaborationService, ShareRequest } from '../../services/dashboardCollaborationService';

// Mock data for demonstration
const mockUser: DashboardUser = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john.doe@example.com',
  avatar: 'https://i.pravatar.cc/150?img=1',
  roles: ['admin', 'security', 'operations'],
  activeRole: 'admin',
  preferences: {
    defaultDashboard: 'admin-overview',
    autoRefresh: true,
    refreshInterval: 30000,
    theme: 'light',
    density: 'comfortable',
  },
};

const mockRoles: UserRole[] = [
  {
    id: 'admin',
    name: 'admin',
    displayName: 'System Administrator',
    description: 'Full system access and management capabilities',
    permissions: ['*'],
    color: '#f44336',
    icon: React.createElement('span', {}, '⚙️'),
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
    icon: React.createElement('span', {}, '🔒'),
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
    icon: React.createElement('span', {}, '📊'),
    allowedWidgets: ['system-health-metric', 'performance-metric', 'system-metrics-chart', 'agent-status-table'],
    dashboardPermissions: {
      canCreate: true,
      canEdit: true,
      canDelete: false,
      canShare: true,
      canExport: true,
    },
  },
];

export const RoleBasedDashboardExample: React.FC = () => {
  const [currentUser, setCurrentUser] = React.useState<DashboardUser>(mockUser);
  const [dashboards] = React.useState(() => createRoleDashboardTemplates());
  const [shares, setShares] = React.useState<DashboardShare[]>([]);

  React.useEffect(() => {
    // Initialize with some mock shares
    const mockShares: DashboardShare[] = [
      {
        id: 'share-1',
        dashboardId: 'security-overview',
        sharedBy: 'admin-user',
        sharedWith: ['user-1'],
        permissions: ['view', 'comment'],
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
      },
    ];
    setShares(mockShares);
  }, []);

  const handleRoleChange = (roleId: string) => {
    setCurrentUser(prev => ({
      ...prev,
      activeRole: roleId,
    }));
  };

  const handleDashboardChange = (dashboardId: string) => {
    console.log('Dashboard changed to:', dashboardId);
  };

  const handleDashboardSave = (dashboard: any) => {
    console.log('Dashboard saved:', dashboard);
  };

  const handleDashboardShare = async (dashboardId: string, shareWith: string[], permissions: string[]) => {
    try {
      const shareRequest: ShareRequest = {
        dashboardId,
        sharedWith: shareWith,
        permissions,
        message: 'Sharing dashboard for collaboration',
      };

      const newShare = await dashboardCollaborationService.shareDashboard(shareRequest, currentUser);
      setShares(prev => [...prev, newShare]);
      
      console.log('Dashboard shared successfully:', newShare);
    } catch (error) {
      console.error('Failed to share dashboard:', error);
    }
  };

  const handleUserPreferencesChange = (preferences: Partial<DashboardUser['preferences']>) => {
    setCurrentUser(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        ...preferences,
      },
    }));
  };

  return (
    <Container maxWidth={false} sx={{ height: '100vh', p: 0 }}>
      <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h4" gutterBottom>
          Role-Based Dashboard System Demo
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          This demo showcases the role-based dashboard system with different user roles, 
          dashboard templates, and collaboration features. Switch between roles to see 
          different dashboard configurations and permissions.
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Current User: {currentUser.name} ({currentUser.email}) | 
          Active Role: {mockRoles.find(r => r.id === currentUser.activeRole)?.displayName} |
          Available Roles: {currentUser.roles.map(roleId => 
            mockRoles.find(r => r.id === roleId)?.displayName
          ).join(', ')}
        </Typography>
      </Box>

      <RoleBasedDashboard
        user={currentUser}
        roles={mockRoles}
        dashboards={dashboards}
        shares={shares}
        onRoleChange={handleRoleChange}
        onDashboardChange={handleDashboardChange}
        onDashboardSave={handleDashboardSave}
        onDashboardShare={handleDashboardShare}
        onUserPreferencesChange={handleUserPreferencesChange}
      />
    </Container>
  );
};

export default RoleBasedDashboardExample;