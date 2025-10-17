import React, { useState } from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Badge,
  Tooltip,
  Box,
  Divider,
  Typography,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Security as SecurityIcon,
  Psychology as AgentIcon,
  AccountTree as WorkflowIcon,
  Warning as IncidentIcon,
  AttachMoney as FinancialIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  Notifications as NotificationIcon,
  Analytics as AnalyticsIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { usePermissions } from '../../hooks/usePermissions';
import { UserRole } from '../../types';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  roles?: UserRole[];
  children?: NavigationItem[];
  badge?: {
    count: number;
    color: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  };
}

interface NavigationProps {
  collapsed: boolean;
  onItemClick?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ collapsed, onItemClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector((state) => state.auth.user);
  const { hasRole, hasPermission } = usePermissions();
  const [expandedItems, setExpandedItems] = useState<string[]>(['dashboard']);

  // Mock data for badges - in real app, this would come from Redux store
  const badges = {
    incidents: 5,
    notifications: 12,
    approvals: 3,
  };

  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
      children: [
        {
          id: 'overview',
          label: 'Overview',
          icon: <AnalyticsIcon />,
          path: '/dashboard/overview',
        },
        {
          id: 'system-health',
          label: 'System Health',
          icon: <SecurityIcon />,
          path: '/dashboard/system-health',
        },
      ],
    },
    {
      id: 'agents',
      label: 'Agent Management',
      icon: <AgentIcon />,
      path: '/agents',
      roles: ['admin', 'operator', 'security_manager'],
      children: [
        {
          id: 'agent-overview',
          label: 'Overview',
          icon: <DashboardIcon />,
          path: '/agents/overview',
        },
        {
          id: 'agent-config',
          label: 'Configuration',
          icon: <SettingsIcon />,
          path: '/agents/configuration',
          roles: ['admin'],
        },
        {
          id: 'agent-logs',
          label: 'Logs & Diagnostics',
          icon: <SearchIcon />,
          path: '/agents/logs',
        },
      ],
    },
    {
      id: 'workflows',
      label: 'Workflows',
      icon: <WorkflowIcon />,
      path: '/workflows',
      roles: ['admin', 'operator', 'operations_manager'],
      children: [
        {
          id: 'workflow-designer',
          label: 'Designer',
          icon: <WorkflowIcon />,
          path: '/workflows/designer',
        },
        {
          id: 'workflow-execution',
          label: 'Execution Monitor',
          icon: <AnalyticsIcon />,
          path: '/workflows/execution',
        },
        {
          id: 'workflow-templates',
          label: 'Templates',
          icon: <DashboardIcon />,
          path: '/workflows/templates',
        },
      ],
    },
    {
      id: 'incidents',
      label: 'Incident Response',
      icon: <IncidentIcon />,
      path: '/incidents',
      roles: ['admin', 'security_manager', 'operator'],
      badge: {
        count: badges.incidents,
        color: 'error',
      },
      children: [
        {
          id: 'incident-dashboard',
          label: 'Dashboard',
          icon: <DashboardIcon />,
          path: '/incidents/dashboard',
        },
        {
          id: 'incident-investigation',
          label: 'Investigation',
          icon: <SearchIcon />,
          path: '/incidents/investigation',
        },
        {
          id: 'incident-response',
          label: 'Response Actions',
          icon: <SecurityIcon />,
          path: '/incidents/response',
        },
      ],
    },
    {
      id: 'financial',
      label: 'Financial Intelligence',
      icon: <FinancialIcon />,
      path: '/financial',
      roles: ['admin', 'financial_analyst', 'operations_manager'],
      children: [
        {
          id: 'cost-analysis',
          label: 'Cost Analysis',
          icon: <AnalyticsIcon />,
          path: '/financial/cost-analysis',
        },
        {
          id: 'roi-calculator',
          label: 'ROI Calculator',
          icon: <FinancialIcon />,
          path: '/financial/roi-calculator',
        },
        {
          id: 'budget-tracking',
          label: 'Budget Tracking',
          icon: <DashboardIcon />,
          path: '/financial/budget-tracking',
        },
      ],
    },
    {
      id: 'search',
      label: 'Global Search',
      icon: <SearchIcon />,
      path: '/search',
    },
  ];

  const adminItems: NavigationItem[] = [
    {
      id: 'admin',
      label: 'Administration',
      icon: <AdminIcon />,
      path: '/admin',
      roles: ['admin'],
      children: [
        {
          id: 'user-management',
          label: 'User Management',
          icon: <AdminIcon />,
          path: '/admin/users',
        },
        {
          id: 'system-settings',
          label: 'System Settings',
          icon: <SettingsIcon />,
          path: '/admin/settings',
        },
        {
          id: 'audit-logs',
          label: 'Audit Logs',
          icon: <SearchIcon />,
          path: '/admin/audit',
        },
      ],
    },
  ];

  const hasNavigationPermission = (item: NavigationItem): boolean => {
    if (!item.roles) return true;
    return item.roles.some(role => hasRole(role));
  };

  const handleItemClick = (item: NavigationItem) => {
    if (item.path) {
      navigate(item.path);
      onItemClick?.();
    }

    if (item.children) {
      const isExpanded = expandedItems.includes(item.id);
      if (isExpanded) {
        setExpandedItems(prev => prev.filter(id => id !== item.id));
      } else {
        setExpandedItems(prev => [...prev, item.id]);
      }
    }
  };

  const isActive = (path?: string): boolean => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    if (!hasNavigationPermission(item)) return null;

    const isExpanded = expandedItems.includes(item.id);
    const active = isActive(item.path);
    const hasChildren = item.children && item.children.length > 0;

    const listItem = (
      <ListItem key={item.id} disablePadding>
        <ListItemButton
          onClick={() => handleItemClick(item)}
          selected={active}
          sx={{
            pl: collapsed ? 1.5 : 2 + level * 2,
            pr: 2,
            py: 1,
            minHeight: 48,
            borderRadius: 1,
            mx: 1,
            mb: 0.5,
            '&.Mui-selected': {
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
              '& .MuiListItemIcon-root': {
                color: 'primary.contrastText',
              },
            },
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: collapsed ? 0 : 40,
              mr: collapsed ? 0 : 1,
              justifyContent: 'center',
            }}
          >
            {item.badge ? (
              <Badge
                badgeContent={item.badge.count}
                color={item.badge.color}
                max={99}
              >
                {item.icon}
              </Badge>
            ) : (
              item.icon
            )}
          </ListItemIcon>

          {!collapsed && (
            <>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: level > 0 ? '0.875rem' : '1rem',
                  fontWeight: active ? 600 : 400,
                }}
              />
              {hasChildren && (isExpanded ? <ExpandLess /> : <ExpandMore />)}
            </>
          )}
        </ListItemButton>
      </ListItem>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.id} title={item.label} placement="right">
          {listItem}
        </Tooltip>
      );
    }

    return (
      <React.Fragment key={item.id}>
        {listItem}
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children?.map(child => renderNavigationItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <Box sx={{ py: 1 }}>
      {/* Main Navigation */}
      <List>
        {navigationItems.map(item => renderNavigationItem(item))}
      </List>

      {/* Divider */}
      {!collapsed && (
        <Box sx={{ px: 2, py: 1 }}>
          <Divider />
        </Box>
      )}

      {/* Admin Section */}
      {user?.roles?.includes('admin') && (
        <>
          {!collapsed && (
            <Box sx={{ px: 2, py: 1 }}>
              <Typography
                variant="overline"
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'text.secondary',
                }}
              >
                Administration
              </Typography>
            </Box>
          )}
          <List>
            {adminItems.map(item => renderNavigationItem(item))}
          </List>
        </>
      )}
    </Box>
  );
};