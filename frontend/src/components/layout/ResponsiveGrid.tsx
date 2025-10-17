import React from 'react';
import {
  Grid,
  Box,
  Container,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Breakpoint } from '@mui/material/styles';

export interface GridItemProps {
  xs?: number | 'auto' | true;
  sm?: number | 'auto' | true;
  md?: number | 'auto' | true;
  lg?: number | 'auto' | true;
  xl?: number | 'auto' | true;
  spacing?: number;
  children: React.ReactNode;
  sx?: object;
}

export interface ResponsiveGridProps {
  children: React.ReactNode;
  spacing?: number;
  container?: boolean;
  maxWidth?: Breakpoint | false;
  disableGutters?: boolean;
  sx?: object;
}

export const GridItem: React.FC<GridItemProps> = ({
  xs = 12,
  sm,
  md,
  lg,
  xl,
  children,
  sx = {},
}) => {
  return (
    <Grid item xs={xs} sm={sm} md={md} lg={lg} xl={xl} sx={sx}>
      {children}
    </Grid>
  );
};

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  spacing = 3,
  container = true,
  maxWidth = 'xl',
  disableGutters = false,
  sx = {},
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // Mobile-first responsive spacing
  const adjustedSpacing = React.useMemo(() => {
    if (isMobile) return Math.max(1, spacing - 1);
    if (isTablet) return spacing;
    return spacing;
  }, [isMobile, isTablet, spacing]);

  // Enhanced responsive styles
  const responsiveStyles = {
    // Ensure proper touch targets on mobile
    '& .MuiGrid-item': {
      minHeight: isMobile ? 44 : 'auto',
    },
    // Optimize for touch scrolling
    WebkitOverflowScrolling: 'touch',
    // Prevent horizontal overflow on mobile
    overflowX: isMobile ? 'hidden' : 'visible',
    ...sx,
  };

  if (maxWidth) {
    return (
      <Container
        maxWidth={maxWidth}
        disableGutters={disableGutters}
        sx={responsiveStyles}
      >
        <Grid
          container={container}
          spacing={adjustedSpacing}
        >
          {children}
        </Grid>
      </Container>
    );
  }

  return (
    <Grid
      container={container}
      spacing={adjustedSpacing}
      sx={responsiveStyles}
    >
      {children}
    </Grid>
  );
};

// Predefined responsive layouts
export const TwoColumnLayout: React.FC<{
  left: React.ReactNode;
  right: React.ReactNode;
  leftWidth?: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
  spacing?: number;
  sx?: object;
}> = ({
  left,
  right,
  leftWidth = { xs: 12, md: 8 },
  spacing = 3,
  sx = {},
}) => {
  const rightWidth = {
    xs: 12,
    md: 12 - (leftWidth.md || 8),
    lg: 12 - (leftWidth.lg || leftWidth.md || 8),
    xl: 12 - (leftWidth.xl || leftWidth.lg || leftWidth.md || 8),
  };

  return (
    <ResponsiveGrid spacing={spacing} sx={sx}>
      <GridItem {...leftWidth}>
        {left}
      </GridItem>
      <GridItem {...rightWidth}>
        {right}
      </GridItem>
    </ResponsiveGrid>
  );
};

export const ThreeColumnLayout: React.FC<{
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
  leftWidth?: number;
  rightWidth?: number;
  spacing?: number;
  sx?: object;
}> = ({
  left,
  center,
  right,
  leftWidth = 3,
  rightWidth = 3,
  spacing = 3,
  sx = {},
}) => {
  const centerWidth = 12 - leftWidth - rightWidth;

  return (
    <ResponsiveGrid spacing={spacing} sx={sx}>
      <GridItem xs={12} lg={leftWidth}>
        {left}
      </GridItem>
      <GridItem xs={12} lg={centerWidth}>
        {center}
      </GridItem>
      <GridItem xs={12} lg={rightWidth}>
        {right}
      </GridItem>
    </ResponsiveGrid>
  );
};

export const CardGrid: React.FC<{
  children: React.ReactNode;
  itemsPerRow?: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
  spacing?: number;
  sx?: object;
}> = ({
  children,
  itemsPerRow = { xs: 1, sm: 2, md: 3, lg: 4, xl: 4 },
  spacing = 3,
  sx = {},
}) => {
  const getGridSize = (breakpoint: keyof typeof itemsPerRow) => {
    const items = itemsPerRow[breakpoint];
    return items ? 12 / items : undefined;
  };

  return (
    <ResponsiveGrid spacing={spacing} sx={sx}>
      {React.Children.map(children, (child, index) => (
        <GridItem
          key={index}
          xs={getGridSize('xs')}
          sm={getGridSize('sm')}
          md={getGridSize('md')}
          lg={getGridSize('lg')}
          xl={getGridSize('xl')}
        >
          {child}
        </GridItem>
      ))}
    </ResponsiveGrid>
  );
};

export const MasonryGrid: React.FC<{
  children: React.ReactNode;
  columns?: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
  spacing?: number;
  sx?: object;
}> = ({
  children,
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
  spacing = 3,
  sx = {},
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  const getColumnCount = () => {
    if (isMobile) return columns.xs || 1;
    if (isTablet) return columns.sm || 2;
    if (isDesktop) return columns.lg || 4;
    return columns.md || 3;
  };

  const columnCount = getColumnCount();
  const columnArrays: React.ReactNode[][] = Array.from({ length: columnCount }, () => []);

  React.Children.forEach(children, (child, index) => {
    const columnIndex = index % columnCount;
    columnArrays[columnIndex].push(child);
  });

  return (
    <Box sx={{ display: 'flex', gap: spacing, ...sx }}>
      {columnArrays.map((column, index) => (
        <Box
          key={index}
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: spacing,
          }}
        >
          {column}
        </Box>
      ))}
    </Box>
  );
};

export const FlexLayout: React.FC<{
  children: React.ReactNode;
  direction?: 'row' | 'column';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  gap?: number;
  responsive?: {
    xs?: { direction?: 'row' | 'column'; justify?: string; align?: string };
    sm?: { direction?: 'row' | 'column'; justify?: string; align?: string };
    md?: { direction?: 'row' | 'column'; justify?: string; align?: string };
    lg?: { direction?: 'row' | 'column'; justify?: string; align?: string };
  };
  sx?: object;
}> = ({
  children,
  direction = 'row',
  justify = 'flex-start',
  align = 'stretch',
  wrap = 'wrap',
  gap = 2,
  responsive,
  sx = {},
}) => {
  const theme = useTheme();

  const getResponsiveStyles = () => {
    if (!responsive) return {};

    const styles: any = {};
    
    Object.entries(responsive).forEach(([breakpoint, config]) => {
      const mediaQuery = theme.breakpoints.up(breakpoint as Breakpoint);
      styles[mediaQuery] = {
        flexDirection: config.direction || direction,
        justifyContent: config.justify || justify,
        alignItems: config.align || align,
      };
    });

    return styles;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: direction,
        justifyContent: justify,
        alignItems: align,
        flexWrap: wrap,
        gap,
        ...getResponsiveStyles(),
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

export const StickyLayout: React.FC<{
  children: React.ReactNode;
  stickyElements?: React.ReactNode;
  stickyPosition?: 'top' | 'bottom';
  offset?: number;
  sx?: object;
}> = ({
  children,
  stickyElements,
  stickyPosition = 'top',
  offset = 0,
  sx = {},
}) => {
  return (
    <Box sx={{ position: 'relative', ...sx }}>
      {stickyElements && (
        <Box
          sx={{
            position: 'sticky',
            [stickyPosition]: offset,
            zIndex: theme => theme.zIndex.appBar - 1,
            backgroundColor: 'background.paper',
            borderBottom: stickyPosition === 'top' ? 1 : 0,
            borderTop: stickyPosition === 'bottom' ? 1 : 0,
            borderColor: 'divider',
          }}
        >
          {stickyElements}
        </Box>
      )}
      <Box>{children}</Box>
    </Box>
  );
};