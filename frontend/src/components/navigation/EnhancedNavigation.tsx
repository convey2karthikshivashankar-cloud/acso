import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Badge,
  Box,
  Typography,
  Divider,
  IconButton,
  Tooltip,
  Avatar,
  Chip,
  TextField,
  InputAdornment,
  alpha,
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Search,
  Star,
  StarBorder,
  ChevronLeft,
  ChevronRight,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

export interface NavigationItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  route?: string;
  badge?: {
    count?: number;
    color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
    variant?: 'standard' | 'dot';
  };
  children?: NavigationItem[];
  disabled?: boolean;
  divider?: boolean;
  category?: string;
  description?: string;
  favorite?: boolean;
  permissions?: string[];
}

export interface EnhancedNavigationProps {
  items: NavigationItem[];
  activeRoute?: string;
  collapsed?: boolean;
  width?: number;
  collapsedWidth?: number;
  searchable?: boolean;
  favoritable?: boolean;
  categorized?: boolean;
  onNavigate?: (item: NavigationItem) => void;
  onToggleCollapse?: () => void;
  onToggleFavorite?: (itemId: string) => void;
  onSearch?: (searchTerm: string) => void;
  userPermissions?: string[];
  variant?: 'permanent' | 'persistent' | 'temporary';
  anchor?: 'left' | 'right';
  sx?: object;
}

export const EnhancedNavigation: React.FC<EnhancedNavigationProps> = ({
  items,
  activeRoute,
  collapsed = false,
  width = 280,
  collapsedWidth = 64,
  searchable = true,
  favoritable = true,
  categorized = false,
  onNavigate,
  onToggleCollapse,
  onToggleFavorite,
  onSearch,
  userPermissions = [],
  variant = 'permanent',
  anchor = 'left',
  sx = {},
}) => {
  const theme = useTheme();
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = React.useState('');
  const [favorites, setFavorites] = React.useState<Set<string>>(new Set());

  const hasPermission = (item: NavigationItem): boolean => {
    if (!item.permissions || item.permissions.length === 0) return true;
    return item.permissions.some(permission => userPermissions.includes(permission));
  };

  const filterItems = (items: NavigationItem[]): NavigationItem[] => {
    return items
      .filter(item => hasPermission(item))
      .filter(item => {
        if (!searchTerm) return true;
        const matchesSearch = item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const hasMatchingChildren = item.children?.some(child => 
          child.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return matchesSearch || hasMatchingChildren;
      })
      .map(item => ({
        ...item,
        children: item.children ? filterItems(item.children) : undefined
      }));
  };

  const handleItemClick = (item: NavigationItem) => {
    if (item.children && item.children.length > 0) {
      handleToggleExpand(item.id);
    } else if (item.route) {
      onNavigate?.(item);
    }
  };

  const handleToggleExpand = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleToggleFavorite = (itemId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newFavorites = new Set(favorites);
    if (newFavorites.has(itemId)) {
      newFavorites.delete(itemId);
    } else {
      newFavorites.add(itemId);
    }
    setFavorites(newFavorites);
    onToggleFavorite?.(itemId);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
    onSearch?.(value);
  };

  const isActive = (item: NavigationItem): boolean => {
    return item.route === activeRoute;
  };

  const isParentActive = (item: NavigationItem): boolean => {
    if (!item.children) return false;
    return item.children.some(child => isActive(child) || isParentActive(child));
  };

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    const isItemActive = isActive(item);
    const isParentItemActive = isParentActive(item);
    const isExpanded = expandedItems.has(item.id);
    const isFavorite = favorites.has(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <React.Fragment key={item.id}>
        {item.divider && <Divider sx={{ my: 1 }} />}
        
        <ListItem
          disablePadding
          sx={{
            display: 'block',
            pl: level * 2,
          }}
        >
          <ListItemButton
            onClick={() => handleItemClick(item)}
            disabled={item.disabled}
            selected={isItemActive}
            sx={{
              minHeight: 48,
              justifyContent: collapsed ? 'center' : 'initial',
              px: 2.5,
              borderRadius: 1,
              mx: 1,
              mb: 0.5,
              backgroundColor: isItemActive 
                ? alpha(theme.palette.primary.main, 0.12)
                : isParentItemActive 
                ? alpha(theme.palette.primary.main, 0.04)
                : 'transparent',
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
              },
              '&.Mui-selected': {
                backgroundColor: alpha(theme.palette.primary.main, 0.12),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.16),
                },
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: collapsed ? 'auto' : 3,
                justifyContent: 'center',
                color: isItemActive ? theme.palette.primary.main : 'inherit',
              }}
            >
              {item.badge ? (
                <Badge
                  badgeContent={item.badge.count}
                  color={item.badge.color || 'primary'}
                  variant={item.badge.variant || 'standard'}
                  invisible={item.badge.variant === 'dot' && !item.badge.count}
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
                  secondary={item.description}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: isItemActive ? 600 : 400,
                    color: isItemActive ? theme.palette.primary.main : 'inherit',
                  }}
                  secondaryTypographyProps={{
                    fontSize: '0.75rem',
                    noWrap: true,
                  }}
                />
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {favoritable && (
                    <IconButton
                      size="small"
                      onClick={(e) => handleToggleFavorite(item.id, e)}
                      sx={{ opacity: isFavorite ? 1 : 0.3 }}
                    >
                      {isFavorite ? (
                        <Star fontSize="small" color="warning" />
                      ) : (
                        <StarBorder fontSize="small" />
                      )}
                    </IconButton>
                  )}
                  
                  {hasChildren && (
                    <IconButton size="small">
                      {isExpanded ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  )}
                </Box>
              </>
            )}
          </ListItemButton>
        </ListItem>

        {hasChildren && !collapsed && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map(child => renderNavigationItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const renderCategorizedItems = (items: NavigationItem[]) => {
    const categories = items.reduce((acc, item) => {
      const category = item.category || 'General';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {} as Record<string, NavigationItem[]>);

    return Object.entries(categories).map(([category, categoryItems]) => (
      <React.Fragment key={category}>
        {!collapsed && (
          <Typography
            variant="overline"
            sx={{
              px: 2,
              py: 1,
              display: 'block',
              color: 'text.secondary',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
            }}
          >
            {category}
          </Typography>
        )}
        {categoryItems.map(item => renderNavigationItem(item))}
        <Divider sx={{ my: 1 }} />
      </React.Fragment>
    ));
  };

  const renderFavorites = () => {
    const favoriteItems = items.filter(item => favorites.has(item.id));
    if (favoriteItems.length === 0) return null;

    return (
      <>
        {!collapsed && (
          <Typography
            variant="overline"
            sx={{
              px: 2,
              py: 1,
              display: 'block',
              color: 'text.secondary',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
            }}
          >
            Favorites
          </Typography>
        )}
        {favoriteItems.map(item => renderNavigationItem(item))}
        <Divider sx={{ my: 1 }} />
      </>
    );
  };

  const filteredItems = filterItems(items);

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          p: 2,
          minHeight: 64,
        }}
      >
        {!collapsed && (
          <Typography variant="h6" noWrap component="div">
            ACSO
          </Typography>
        )}
        
        {onToggleCollapse && (
          <IconButton onClick={onToggleCollapse}>
            {collapsed ? (
              anchor === 'left' ? <ChevronRight /> : <ChevronLeft />
            ) : (
              anchor === 'left' ? <ChevronLeft /> : <ChevronRight />
            )}
          </IconButton>
        )}
      </Box>

      <Divider />

      {/* Search */}
      {searchable && !collapsed && (
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search navigation..."
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      )}

      {/* Navigation Items */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <List>
          {favoritable && renderFavorites()}
          {categorized ? renderCategorizedItems(filteredItems) : filteredItems.map(item => renderNavigationItem(item))}
        </List>
      </Box>

      {/* Footer */}
      {!collapsed && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 32, height: 32 }}>U</Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                User Name
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                user@example.com
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );

  return (
    <Drawer
      variant={variant}
      anchor={anchor}
      open={!collapsed || variant !== 'permanent'}
      sx={{
        width: collapsed ? collapsedWidth : width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: collapsed ? collapsedWidth : width,
          boxSizing: 'border-box',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          overflowX: 'hidden',
        },
        ...sx,
      }}
    >
      {drawerContent}
    </Drawer>
  );
};