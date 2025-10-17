import React from 'react';
import {
  Breadcrumbs as MuiBreadcrumbs,
  Link,
  Typography,
  Box,
  Chip,
  useTheme,
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useLocation } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  separator?: React.ReactNode;
  maxItems?: number;
  showHome?: boolean;
  homeLabel?: string;
  homePath?: string;
  currentPageLabel?: string;
  actions?: React.ReactNode;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items = [],
  separator = <NavigateNextIcon fontSize="small" />,
  maxItems = 8,
  showHome = true,
  homeLabel = 'Home',
  homePath = '/',
  currentPageLabel,
  actions,
}) => {
  const theme = useTheme();
  const location = useLocation();

  // Auto-generate breadcrumbs from current path if no items provided
  const breadcrumbItems = React.useMemo(() => {
    if (items.length > 0) {
      return items;
    }

    const pathSegments = location.pathname.split('/').filter(Boolean);
    const generatedItems: BreadcrumbItem[] = [];

    pathSegments.forEach((segment, index) => {
      const path = '/' + pathSegments.slice(0, index + 1).join('/');
      const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      
      generatedItems.push({
        label,
        path: index === pathSegments.length - 1 ? undefined : path, // Last item is current page
      });
    });

    return generatedItems;
  }, [items, location.pathname]);

  // Add home breadcrumb if enabled
  const allItems = React.useMemo(() => {
    const result = [...breadcrumbItems];
    
    if (showHome && location.pathname !== homePath) {
      result.unshift({
        label: homeLabel,
        path: homePath,
        icon: <HomeIcon fontSize="small" />,
      });
    }

    return result;
  }, [breadcrumbItems, showHome, homeLabel, homePath, location.pathname]);

  // Use current page label if provided, otherwise use last item
  const displayItems = React.useMemo(() => {
    if (currentPageLabel && allItems.length > 0) {
      const items = [...allItems];
      items[items.length - 1] = {
        ...items[items.length - 1],
        label: currentPageLabel,
        path: undefined, // Current page should not be clickable
      };
      return items;
    }
    return allItems;
  }, [allItems, currentPageLabel]);

  if (displayItems.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 1,
        px: 0,
      }}
    >
      <MuiBreadcrumbs
        separator={separator}
        maxItems={maxItems}
        aria-label="breadcrumb"
        sx={{
          '& .MuiBreadcrumbs-separator': {
            color: theme.palette.text.secondary,
          },
        }}
      >
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isClickable = !isLast && item.path && !item.disabled;

          if (isClickable) {
            return (
              <Link
                key={index}
                component={RouterLink}
                to={item.path!}
                underline="hover"
                color="inherit"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          }

          return (
            <Typography
              key={index}
              color={isLast ? 'text.primary' : 'text.secondary'}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                fontWeight: isLast ? 600 : 400,
              }}
            >
              {item.icon}
              {item.label}
            </Typography>
          );
        })}
      </MuiBreadcrumbs>

      {actions && (
        <Box sx={{ ml: 2 }}>
          {actions}
        </Box>
      )}
    </Box>
  );
};

// Page header with breadcrumbs
export const PageHeader: React.FC<{
  title?: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  status?: {
    label: string;
    color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  };
  showBreadcrumbs?: boolean;
}> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  status,
  showBreadcrumbs = true,
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      {showBreadcrumbs && (
        <Breadcrumbs
          items={breadcrumbs}
          currentPageLabel={title}
          actions={actions}
        />
      )}
      
      {(title || subtitle || status) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            mt: showBreadcrumbs ? 2 : 0,
          }}
        >
          <Box>
            {title && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="h4" component="h1" fontWeight="bold">
                  {title}
                </Typography>
                {status && (
                  <Chip
                    label={status.label}
                    color={status.color}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            )}
            {subtitle && (
              <Typography variant="body1" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>

          {!showBreadcrumbs && actions && (
            <Box sx={{ ml: 2 }}>
              {actions}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};