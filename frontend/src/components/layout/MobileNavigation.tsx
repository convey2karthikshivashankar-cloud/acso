import React, { useState } from 'react';
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  Divider,
  Collapse,
  Badge,
  Avatar,
  Chip,
  SwipeableDrawer,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  ExpandLess,
  ExpandMore,
  Dashboard as DashboardIcon,
  Security as SecurityIcon,
  Psychology as AgentIcon,
  AccountTree as WorkflowIcon,
  Warning as IncidentIcon,
  AttachMoney as FinancialIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Notifications as NotificationIcon,
  Analytics as AnalyticsIcon,
  AdminPanelSettings as AdminIcon,
  Home as HomeIcon,
  Person as PersonIcon,
  Help as HelpIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { User } from '../../types';

interface MobileNavigationProps {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: NavigationItem[];
  badge?: {
    count: number;
    color: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  };
  roles?: string[];
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  open,
  onClose,
  onOpen,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Mock badge data
  const badges = {
    incidents: 5,
    notifications: 12,
  };

  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/',
    },
    {
      id: 'agents',
      label: 'Agents',
      icon: <AgentIcon />,
      path: '/agents',
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
        },
      ],
    },
    {
      id: 'incidents',
      label: 'Incidents',
      icon: <IncidentIcon />,
      path: '/incidents',
      badge: {
        count: badges.incidents,
        color: 'error',
      },
    },
    {
      id: 'workflows',
      label: 'Workflows',
      icon: <WorkflowIcon />,
      path: '/workflows',
    },
    {
      id: 'financial',
      label: 'Financial',
      icon: <FinancialIcon />,
      path: '/financial',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <AnalyticsIcon />,
      path: '/reports',
    },
  ];

  const quickActions = [
    {
      id: 'search',
      label: 'Global Search',
      icon: <SearchIcon />,
      path: '/search',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <NotificationIcon />,
      path: '/notifications',
      badge: {
        count: badges.notifications,
        color: 'primary' as const,
      },
    },
  ];

  const userActions = [
    {
      id: 'profile',
      label: 'Profile',
      icon: <PersonIcon />,
      path: '/profile',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <SettingsIcon />,
      path: '/settings',
    },
    {
      id: 'help',
      label: 'Help & Support',
      icon: <HelpIcon />,
      path: '/help',
    },
  ];

  const handleItemClick = (item: NavigationItem) => {
    if (item.children && item.children.length > 0) {
      const isExpanded = expandedItems.includes(item.id);
      if (isExpanded) {
        setExpandedItems(prev => prev.filter(id => id !== item.id));
      } else {
        setExpandedItems(prev => [...prev, item.id]);
      }
    } else if (item.path) {
      navigate(item.path);
      onClose();
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    onClose();
    navigate('/login');
  };

  const isActive = (path?: string): boolean => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const getUserInitials = (user: User | null): string => {
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    const isExpanded = expandedItems.includes(item.id);
    const active = isActive(item.path);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <React.Fragment key={item.id}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => handleItemClick(item)}
            selected={active}
            sx={{
              pl: 2 + level * 2,
              pr: 2,
              py: 1.5,
              borderRadius: 1,
              mx: 1,
              mb: 0.5,
              '&.Mui-selected': {
                backgroundColor: alpha(theme.palette.primary.main, 0.12),
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.16),
                },
                '& .MuiListItemIcon-root': {
                  color: 'primary.main',
                },
              },
              '&:hover': {
                backgroundColor: alpha(theme.palette.action.hover, 0.08),
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 40,
                color: active ? 'primary.main' : 'text.secondary',
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

            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontSize: level > 0 ? '0.875rem' : '1rem',
                fontWeight: active ? 600 : 400,
              }}
            />

            {hasChildren && (isExpanded ? <ExpandLess /> : <ExpandMore />)}
          </ListItemButton>
        </ListItem>

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

  const drawerContent = (
    <Box
      sx={{
        width: 280,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              color: 'primary.main',
            }}
          >
            🛡️ ACSO
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* User Info */}
      {user && (
        <Box
          sx={{
            p: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.primary.main, 0.04),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.main',
                fontSize: '1rem',
                fontWeight: 600,
              }}
              src={user.avatar}
            >
              {getUserInitials(user)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle2"
                fontWeight="600"
                noWrap
                sx={{ color: 'text.primary' }}
              >
                {user.name}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                sx={{ display: 'block' }}
              >
                {user.email}
              </Typography>
            </Box>
          </Box>
          
          {user.roles && user.roles.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {user.roles.slice(0, 2).map((role) => (
                <Chip
                  key={role}
                  label={role.replace('_', ' ').toUpperCase()}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 18 }}
                />
              ))}
              {user.roles.length > 2 && (
                <Chip
                  label={`+${user.roles.length - 2}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 18 }}
                />
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Quick Actions */}
      <Box sx={{ px: 1, py: 1 }}>
        <Typography
          variant="overline"
          sx={{
            px: 2,
            py: 1,
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'text.secondary',
            display: 'block',
          }}
        >
          Quick Actions
        </Typography>
        <List dense>
          {quickActions.map(action => renderNavigationItem(action))}
        </List>
      </Box>

      <Divider />

      {/* Main Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 1, py: 1 }}>
        <Typography
          variant="overline"
          sx={{
            px: 2,
            py: 1,
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'text.secondary',
            display: 'block',
          }}
        >
          Navigation
        </Typography>
        <List>
          {navigationItems.map(item => renderNavigationItem(item))}
        </List>
      </Box>

      <Divider />

      {/* User Actions */}
      <Box sx={{ px: 1, py: 1 }}>
        <List dense>
          {userActions.map(action => renderNavigationItem(action))}
          
          {user?.roles?.includes('admin') && (
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate('/admin');
                  onClose();
                }}
                sx={{
                  borderRadius: 1,
                  mx: 1,
                  mb: 0.5,
                }}
              >
                <ListItemIcon>
                  <AdminIcon />
                </ListItemIcon>
                <ListItemText primary="Administration" />
              </ListItemButton>
            </ListItem>
          )}
          
          <ListItem disablePadding>
            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: 1,
                mx: 1,
                mb: 0.5,
                color: 'error.main',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.error.main, 0.08),
                },
              }}
            >
              <ListItemIcon>
                <LogoutIcon sx={{ color: 'error.main' }} />
              </ListItemIcon>
              <ListItemText primary="Sign Out" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Box>
  );

  return (
    <SwipeableDrawer
      anchor="left"
      open={open}
      onClose={onClose}
      onOpen={onOpen}
      disableBackdropTransition
      disableDiscovery
      ModalProps={{
        keepMounted: true, // Better open performance on mobile
      }}
      PaperProps={{
        sx: {
          backgroundImage: 'none',
        },
      }}
    >
      {drawerContent}
    </SwipeableDrawer>
  );
};

// Mobile navigation trigger button
export const MobileNavigationTrigger: React.FC<{
  onClick: () => void;
}> = ({ onClick }) => {
  return (
    <IconButton
      color="inherit"
      aria-label="open navigation"
      edge="start"
      onClick={onClick}
      sx={{
        mr: 2,
        display: { md: 'none' },
      }}
    >
      <MenuIcon />
    </IconButton>
  );
};

export default MobileNavigation;