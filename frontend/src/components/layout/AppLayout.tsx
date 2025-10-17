import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
  Container,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  HighContrast as HighContrastIcon,
} from '@mui/icons-material';
import { useTheme as useCustomTheme } from '../theme/ThemeProvider';
import { Navigation } from './Navigation';
import { UserMenu } from './UserMenu';
import { NotificationCenter } from './NotificationCenter';
import { useAppSelector } from '../../store/hooks';

const DRAWER_WIDTH = 280;
const DRAWER_WIDTH_COLLAPSED = 64;

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const { themeMode, setThemeMode, toggleTheme } = useCustomTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setDesktopCollapsed(!desktopCollapsed);
    }
  };

  const handleMobileDrawerClose = () => {
    setMobileOpen(false);
  };

  const getThemeIcon = () => {
    switch (themeMode) {
      case 'light':
        return <DarkModeIcon />;
      case 'dark':
        return <LightModeIcon />;
      case 'highContrast':
        return <LightModeIcon />;
      default:
        return <DarkModeIcon />;
    }
  };

  const cycleTheme = () => {
    switch (themeMode) {
      case 'light':
        setThemeMode('dark');
        break;
      case 'dark':
        setThemeMode('auto');
        break;
      case 'auto':
        setThemeMode('light');
        break;
      default:
        setThemeMode('light');
    }
  };

  const drawerWidth = isMobile 
    ? DRAWER_WIDTH 
    : desktopCollapsed 
      ? DRAWER_WIDTH_COLLAPSED 
      : DRAWER_WIDTH;

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo and collapse button */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: desktopCollapsed ? 'center' : 'space-between',
          px: desktopCollapsed ? 1 : 2,
          py: 1,
          minHeight: 64,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        {!desktopCollapsed && (
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              color: theme.palette.primary.main,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            🛡️ ACSO
          </Typography>
        )}
        {!isMobile && (
          <IconButton
            onClick={handleDrawerToggle}
            size="small"
            sx={{
              transform: desktopCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: theme.transitions.create('transform'),
            }}
          >
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Navigation collapsed={desktopCollapsed} onItemClick={handleMobileDrawerClose} />
      </Box>
    </Box>
  );

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          zIndex: theme.zIndex.drawer + 1,
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          boxShadow: theme.shadows[1],
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Toolbar>
          {/* Mobile menu button */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Page title - will be updated by individual pages */}
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Dashboard
          </Typography>

          {/* Theme toggle */}
          <IconButton
            color="inherit"
            onClick={cycleTheme}
            aria-label="toggle theme"
            title={`Current: ${themeMode} theme`}
          >
            {getThemeIcon()}
          </IconButton>

          {/* Notification center */}
          <NotificationCenter />

          {/* User menu */}
          <UserMenu user={user} />
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleMobileDrawerClose}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              overflowX: 'hidden',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Toolbar spacer */}
        <Toolbar />

        {/* Page content */}
        <Container
          maxWidth={false}
          sx={{
            flex: 1,
            py: 3,
            px: { xs: 2, sm: 3 },
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </Container>
      </Box>
    </Box>
  );
};