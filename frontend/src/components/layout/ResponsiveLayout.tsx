import React from 'react';
import {
  Box,
  Container,
  Grid,
  useTheme,
  useMediaQuery,
  Breakpoint,
} from '@mui/material';
import { styled } from '@mui/material/styles';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  maxWidth?: Breakpoint | false;
  disableGutters?: boolean;
  spacing?: number;
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  sx?: any;
}

interface ResponsiveGridProps {
  children: React.ReactNode;
  spacing?: number;
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  sx?: any;
}

interface ResponsiveColumnProps {
  children: React.ReactNode;
  xs?: number | 'auto' | true;
  sm?: number | 'auto' | true;
  md?: number | 'auto' | true;
  lg?: number | 'auto' | true;
  xl?: number | 'auto' | true;
  order?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  sx?: any;
}

const ResponsiveContainer = styled(Container)(({ theme }) => ({
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    paddingLeft: theme.spacing(3),
    paddingRight: theme.spacing(3),
  },
  [theme.breakpoints.up('lg')]: {
    paddingLeft: theme.spacing(4),
    paddingRight: theme.spacing(4),
  },
}));

const ResponsiveBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    gap: theme.spacing(3),
  },
  [theme.breakpoints.up('md')]: {
    gap: theme.spacing(4),
  },
}));

// Main responsive layout component
export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  maxWidth = 'xl',
  disableGutters = false,
  spacing = 2,
  direction = 'column',
  justifyContent = 'flex-start',
  alignItems = 'stretch',
  sx = {},
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  return (
    <ResponsiveContainer
      maxWidth={maxWidth}
      disableGutters={disableGutters}
      sx={{
        display: 'flex',
        flexDirection: direction,
        justifyContent,
        alignItems,
        gap: spacing,
        minHeight: '100%',
        ...sx,
      }}
    >
      {children}
    </ResponsiveContainer>
  );
};

// Responsive grid system
export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  spacing = 2,
  columns = { xs: 1, sm: 2, md: 3, lg: 4, xl: 4 },
  sx = {},
}) => {
  const theme = useTheme();
  
  return (
    <Grid
      container
      spacing={spacing}
      sx={{
        '& .MuiGrid-item': {
          display: 'flex',
          flexDirection: 'column',
        },
        ...sx,
      }}
    >
      {React.Children.map(children, (child, index) => (
        <Grid
          item
          xs={12 / (columns.xs || 1)}
          sm={12 / (columns.sm || columns.xs || 1)}
          md={12 / (columns.md || columns.sm || columns.xs || 1)}
          lg={12 / (columns.lg || columns.md || columns.sm || columns.xs || 1)}
          xl={12 / (columns.xl || columns.lg || columns.md || columns.sm || columns.xs || 1)}
          key={index}
        >
          {child}
        </Grid>
      ))}
    </Grid>
  );
};

// Responsive column component
export const ResponsiveColumn: React.FC<ResponsiveColumnProps> = ({
  children,
  xs = 12,
  sm,
  md,
  lg,
  xl,
  order,
  sx = {},
}) => {
  return (
    <Grid
      item
      xs={xs}
      sm={sm}
      md={md}
      lg={lg}
      xl={xl}
      sx={{
        order: {
          xs: order?.xs,
          sm: order?.sm,
          md: order?.md,
          lg: order?.lg,
          xl: order?.xl,
        },
        ...sx,
      }}
    >
      {children}
    </Grid>
  );
};

// Responsive sidebar layout
export const ResponsiveSidebarLayout: React.FC<{
  sidebar: React.ReactNode;
  main: React.ReactNode;
  sidebarWidth?: {
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
  };
  sidebarPosition?: 'left' | 'right';
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}> = ({
  sidebar,
  main,
  sidebarWidth = { xs: '100%', sm: '300px', md: '320px', lg: '350px' },
  sidebarPosition = 'left',
  collapsible = false,
  collapsed = false,
  onToggle,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const sidebarContent = (
    <Box
      sx={{
        width: {
          xs: isMobile ? '100%' : sidebarWidth.xs,
          sm: sidebarWidth.sm,
          md: collapsed ? '60px' : sidebarWidth.md,
          lg: collapsed ? '60px' : sidebarWidth.lg,
          xl: collapsed ? '60px' : sidebarWidth.xl,
        },
        flexShrink: 0,
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
        overflow: 'hidden',
      }}
    >
      {sidebar}
    </Box>
  );
  
  const mainContent = (
    <Box
      sx={{
        flex: 1,
        minWidth: 0, // Prevent flex item from overflowing
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {main}
    </Box>
  );
  
  if (isMobile) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {sidebarContent}
        {mainContent}
      </Box>
    );
  }
  
  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {sidebarPosition === 'left' && sidebarContent}
      {mainContent}
      {sidebarPosition === 'right' && sidebarContent}
    </Box>
  );
};

// Responsive card layout
export const ResponsiveCardLayout: React.FC<{
  children: React.ReactNode;
  minCardWidth?: number;
  maxCardWidth?: number;
  spacing?: number;
  sx?: any;
}> = ({
  children,
  minCardWidth = 300,
  maxCardWidth = 400,
  spacing = 2,
  sx = {},
}) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, ${maxCardWidth}px))`,
        gap: spacing,
        justifyContent: 'center',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

// Responsive masonry layout
export const ResponsiveMasonryLayout: React.FC<{
  children: React.ReactNode;
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  spacing?: number;
  sx?: any;
}> = ({
  children,
  columns = { xs: 1, sm: 2, md: 3, lg: 4, xl: 5 },
  spacing = 2,
  sx = {},
}) => {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        columnCount: {
          xs: columns.xs,
          sm: columns.sm,
          md: columns.md,
          lg: columns.lg,
          xl: columns.xl,
        },
        columnGap: theme.spacing(spacing),
        '& > *': {
          breakInside: 'avoid',
          marginBottom: theme.spacing(spacing),
          display: 'block',
        },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

// Responsive flex layout with wrap
export const ResponsiveFlexLayout: React.FC<{
  children: React.ReactNode;
  direction?: 'row' | 'column';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  gap?: number;
  sx?: any;
}> = ({
  children,
  direction = 'row',
  wrap = 'wrap',
  justifyContent = 'flex-start',
  alignItems = 'stretch',
  gap = 2,
  sx = {},
}) => {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: direction,
        flexWrap: wrap,
        justifyContent,
        alignItems,
        gap: theme.spacing(gap),
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

// Hook for responsive values
export const useResponsiveValue = <T,>(values: {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
}): T | undefined => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.only('xs'));
  const isSm = useMediaQuery(theme.breakpoints.only('sm'));
  const isMd = useMediaQuery(theme.breakpoints.only('md'));
  const isLg = useMediaQuery(theme.breakpoints.only('lg'));
  const isXl = useMediaQuery(theme.breakpoints.up('xl'));
  
  if (isXl && values.xl !== undefined) return values.xl;
  if (isLg && values.lg !== undefined) return values.lg;
  if (isMd && values.md !== undefined) return values.md;
  if (isSm && values.sm !== undefined) return values.sm;
  if (isXs && values.xs !== undefined) return values.xs;
  
  // Fallback to the largest available value
  return values.xl || values.lg || values.md || values.sm || values.xs;
};

// Hook for responsive breakpoints
export const useResponsiveBreakpoints = () => {
  const theme = useTheme();
  
  return {
    isXs: useMediaQuery(theme.breakpoints.only('xs')),
    isSm: useMediaQuery(theme.breakpoints.only('sm')),
    isMd: useMediaQuery(theme.breakpoints.only('md')),
    isLg: useMediaQuery(theme.breakpoints.only('lg')),
    isXl: useMediaQuery(theme.breakpoints.up('xl')),
    isMobile: useMediaQuery(theme.breakpoints.down('md')),
    isTablet: useMediaQuery(theme.breakpoints.between('sm', 'lg')),
    isDesktop: useMediaQuery(theme.breakpoints.up('lg')),
    isSmallScreen: useMediaQuery(theme.breakpoints.down('sm')),
    isLargeScreen: useMediaQuery(theme.breakpoints.up('lg')),
  };
};

export default ResponsiveLayout;