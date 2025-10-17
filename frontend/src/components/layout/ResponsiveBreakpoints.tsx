import React from 'react';
import { Box, useTheme } from '@mui/material';
import { Breakpoint } from '@mui/material/styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';

export interface ResponsiveShowProps {
  children: React.ReactNode;
  above?: Breakpoint;
  below?: Breakpoint;
  only?: Breakpoint | Breakpoint[];
}

export const ResponsiveShow: React.FC<ResponsiveShowProps> = ({
  children,
  above,
  below,
  only,
}) => {
  const breakpoints = useBreakpoints();
  const theme = useTheme();

  const shouldShow = React.useMemo(() => {
    const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];
    const currentIndex = breakpointOrder.indexOf(breakpoints.current);

    if (only) {
      const targetBreakpoints = Array.isArray(only) ? only : [only];
      return targetBreakpoints.includes(breakpoints.current);
    }

    if (above) {
      const aboveIndex = breakpointOrder.indexOf(above);
      if (currentIndex < aboveIndex) return false;
    }

    if (below) {
      const belowIndex = breakpointOrder.indexOf(below);
      if (currentIndex > belowIndex) return false;
    }

    return true;
  }, [breakpoints.current, above, below, only]);

  if (!shouldShow) {
    return null;
  }

  return <>{children}</>;
};

export interface ResponsiveHideProps {
  children: React.ReactNode;
  above?: Breakpoint;
  below?: Breakpoint;
  only?: Breakpoint | Breakpoint[];
}

export const ResponsiveHide: React.FC<ResponsiveHideProps> = ({
  children,
  above,
  below,
  only,
}) => {
  const breakpoints = useBreakpoints();

  const shouldHide = React.useMemo(() => {
    const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];
    const currentIndex = breakpointOrder.indexOf(breakpoints.current);

    if (only) {
      const targetBreakpoints = Array.isArray(only) ? only : [only];
      return targetBreakpoints.includes(breakpoints.current);
    }

    if (above) {
      const aboveIndex = breakpointOrder.indexOf(above);
      if (currentIndex >= aboveIndex) return true;
    }

    if (below) {
      const belowIndex = breakpointOrder.indexOf(below);
      if (currentIndex <= belowIndex) return true;
    }

    return false;
  }, [breakpoints.current, above, below, only]);

  if (shouldHide) {
    return null;
  }

  return <>{children}</>;
};

export interface ResponsiveValueProps<T> {
  children: (value: T) => React.ReactNode;
  values: Partial<Record<Breakpoint, T>>;
  fallback?: T;
}

export function ResponsiveValue<T>({
  children,
  values,
  fallback,
}: ResponsiveValueProps<T>) {
  const breakpoints = useBreakpoints();

  const currentValue = React.useMemo(() => {
    const breakpointOrder: Breakpoint[] = ['xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = breakpointOrder.indexOf(breakpoints.current);

    // Look for exact match first
    if (values[breakpoints.current] !== undefined) {
      return values[breakpoints.current];
    }

    // Fallback to smaller breakpoints
    for (let i = currentIndex + 1; i < breakpointOrder.length; i++) {
      const breakpoint = breakpointOrder[i];
      if (values[breakpoint] !== undefined) {
        return values[breakpoint];
      }
    }

    return fallback;
  }, [breakpoints.current, values, fallback]);

  if (currentValue === undefined) {
    return null;
  }

  return <>{children(currentValue)}</>;
}

export interface ResponsiveSpacingProps {
  children: React.ReactNode;
  spacing?: Partial<Record<Breakpoint, number>>;
  direction?: 'horizontal' | 'vertical' | 'both';
}

export const ResponsiveSpacing: React.FC<ResponsiveSpacingProps> = ({
  children,
  spacing = { xs: 1, sm: 2, md: 3, lg: 4 },
  direction = 'both',
}) => {
  const theme = useTheme();
  const breakpoints = useBreakpoints();

  const currentSpacing = React.useMemo(() => {
    const breakpointOrder: Breakpoint[] = ['xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = breakpointOrder.indexOf(breakpoints.current);

    // Look for exact match first
    if (spacing[breakpoints.current] !== undefined) {
      return spacing[breakpoints.current];
    }

    // Fallback to smaller breakpoints
    for (let i = currentIndex + 1; i < breakpointOrder.length; i++) {
      const breakpoint = breakpointOrder[i];
      if (spacing[breakpoint] !== undefined) {
        return spacing[breakpoint];
      }
    }

    return 2; // Default spacing
  }, [breakpoints.current, spacing]);

  const getSpacingStyles = () => {
    const spacingValue = theme.spacing(currentSpacing!);
    
    switch (direction) {
      case 'horizontal':
        return { paddingLeft: spacingValue, paddingRight: spacingValue };
      case 'vertical':
        return { paddingTop: spacingValue, paddingBottom: spacingValue };
      case 'both':
      default:
        return { padding: spacingValue };
    }
  };

  return <Box sx={getSpacingStyles()}>{children}</Box>;
};

export interface ResponsiveColumnsProps {
  children: React.ReactNode;
  columns: Partial<Record<Breakpoint, number>>;
  gap?: number;
  minItemWidth?: number;
}

export const ResponsiveColumns: React.FC<ResponsiveColumnsProps> = ({
  children,
  columns,
  gap = 2,
  minItemWidth = 200,
}) => {
  const theme = useTheme();
  const breakpoints = useBreakpoints();

  const currentColumns = React.useMemo(() => {
    const breakpointOrder: Breakpoint[] = ['xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = breakpointOrder.indexOf(breakpoints.current);

    // Look for exact match first
    if (columns[breakpoints.current] !== undefined) {
      return columns[breakpoints.current];
    }

    // Fallback to smaller breakpoints
    for (let i = currentIndex + 1; i < breakpointOrder.length; i++) {
      const breakpoint = breakpointOrder[i];
      if (columns[breakpoint] !== undefined) {
        return columns[breakpoint];
      }
    }

    return 1; // Default to single column
  }, [breakpoints.current, columns]);

  const containerStyles = {
    display: 'grid',
    gridTemplateColumns: `repeat(${currentColumns}, minmax(${minItemWidth}px, 1fr))`,
    gap: theme.spacing(gap),
    width: '100%',
  };

  return <Box sx={containerStyles}>{children}</Box>;
};

export interface ResponsiveAspectRatioProps {
  children: React.ReactNode;
  ratio: Partial<Record<Breakpoint, string>> | string;
}

export const ResponsiveAspectRatio: React.FC<ResponsiveAspectRatioProps> = ({
  children,
  ratio,
}) => {
  const breakpoints = useBreakpoints();

  const currentRatio = React.useMemo(() => {
    if (typeof ratio === 'string') {
      return ratio;
    }

    const breakpointOrder: Breakpoint[] = ['xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = breakpointOrder.indexOf(breakpoints.current);

    // Look for exact match first
    if (ratio[breakpoints.current] !== undefined) {
      return ratio[breakpoints.current];
    }

    // Fallback to smaller breakpoints
    for (let i = currentIndex + 1; i < breakpointOrder.length; i++) {
      const breakpoint = breakpointOrder[i];
      if (ratio[breakpoint] !== undefined) {
        return ratio[breakpoint];
      }
    }

    return '16/9'; // Default aspect ratio
  }, [breakpoints.current, ratio]);

  const containerStyles = {
    position: 'relative' as const,
    width: '100%',
    aspectRatio: currentRatio,
    overflow: 'hidden',
  };

  const contentStyles = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  };

  return (
    <Box sx={containerStyles}>
      <Box sx={contentStyles}>{children}</Box>
    </Box>
  );
};

export interface ResponsiveTextProps {
  children: React.ReactNode;
  variant?: Partial<Record<Breakpoint, 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body1' | 'body2' | 'caption'>>;
  align?: Partial<Record<Breakpoint, 'left' | 'center' | 'right' | 'justify'>>;
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  variant = { xs: 'body1', md: 'h6' },
  align = { xs: 'left' },
}) => {
  const breakpoints = useBreakpoints();

  const getCurrentValue = <T,>(values: Partial<Record<Breakpoint, T>>, fallback: T): T => {
    const breakpointOrder: Breakpoint[] = ['xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = breakpointOrder.indexOf(breakpoints.current);

    // Look for exact match first
    if (values[breakpoints.current] !== undefined) {
      return values[breakpoints.current]!;
    }

    // Fallback to smaller breakpoints
    for (let i = currentIndex + 1; i < breakpointOrder.length; i++) {
      const breakpoint = breakpointOrder[i];
      if (values[breakpoint] !== undefined) {
        return values[breakpoint]!;
      }
    }

    return fallback;
  };

  const currentVariant = getCurrentValue(variant, 'body1');
  const currentAlign = getCurrentValue(align, 'left');

  return (
    <Box
      component="div"
      sx={{
        typography: currentVariant,
        textAlign: currentAlign,
      }}
    >
      {children}
    </Box>
  );
};