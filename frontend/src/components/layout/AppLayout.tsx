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
  Search as SearchIcon,
} from '@mui/icons-material';
import { useTheme as useCustomTheme } from '../theme/ThemeProvider';
import { Navigation } from './Navigation';
import { UserMenu } from './UserMenu';
import { NotificationCenter } from './NotificationCenter';
import { Breadcrumbs } from '../navigation/Breadcrumbs';
import { GlobalSearch } from '../search/GlobalSearch';
import { ConnectionStatus } from '../common/ConnectionStatus';
import { useAppSelector } from '../../store/hooks';
import { useCurrentRoute } from '../../routes/AppRouter';

const DRAWER_WIDTH = 280;
const DRAWER_WIDTH_COLLAPSED = 64;

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const { themeMode, setThemeMode } = useCustomTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const currentRoute = useCurrentRoute();

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
        setThemeMode('light');
        break;
      default:
        setThemeMode('light');
    }
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+K or Cmd+K to open search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setShowSearch(true);
      }
      
      // Escape to close search
      if (event.key === 'Escape' && showSearch) {
        setShowSearch(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSearch]);

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

          {/* Page title and search */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: 2 }}>
            <Typography variant="h6" noWrap component="div">
              {currentRoute?.title || 'Dashboard'}
            </Typography>
            
            {/* Global Search */}
            {showSearch ? (
              <Box sx={{ flexGrow: 1, maxWidth: 400 }}>
                <GlobalSearch
                  placeholder="Search across ACSO..."
                  autoFocus={true}
                />
              </Box>
            ) : (
              <IconButton
                color="inherit"
                onClick={toggleSearch}
                aria-label="open search"
                title="Global Search (Ctrl+K)"
              >
                <SearchIcon />
              </IconButton>
            )}
          </Box>

          {/* Connection status */}
          <ConnectionStatus variant="chip" showDetails={true} />

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

        {/* Breadcrumbs */}
        <Box
          sx={{
            borderBottom: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
            px: { xs: 2, sm: 3 },
          }}
        >
          <Breadcrumbs />
        </Box>

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