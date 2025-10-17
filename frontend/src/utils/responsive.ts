import { Theme, Breakpoint } from '@mui/material/styles';

// Mobile-first breakpoint utilities
export const breakpoints = {
  xs: 0,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536,
} as const;

export type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>;

export const getResponsiveValue = <T>(
  value: ResponsiveValue<T>,
  currentBreakpoint: Breakpoint,
  theme: Theme
): T => {
  if (typeof value !== 'object' || value === null) {
    return value as T;
  }

  const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);

  // Look for exact match first
  if ((value as Record<Breakpoint, T>)[currentBreakpoint] !== undefined) {
    return (value as Record<Breakpoint, T>)[currentBreakpoint];
  }

  // Fallback to smaller breakpoints
  for (let i = currentIndex - 1; i >= 0; i--) {
    const breakpoint = breakpointOrder[i];
    if ((value as Record<Breakpoint, T>)[breakpoint] !== undefined) {
      return (value as Record<Breakpoint, T>)[breakpoint];
    }
  }

  // Fallback to any available value
  for (const breakpoint of breakpointOrder) {
    if ((value as Record<Breakpoint, T>)[breakpoint] !== undefined) {
      return (value as Record<Breakpoint, T>)[breakpoint];
    }
  }

  throw new Error('No responsive value found');
};

// Grid system utilities
export const createResponsiveColumns = (
  itemsPerRow: ResponsiveValue<number>
): Partial<Record<Breakpoint, number>> => {
  if (typeof itemsPerRow === 'number') {
    const columns = 12 / itemsPerRow;
    return {
      xs: 12,
      sm: Math.max(6, columns),
      md: Math.max(4, columns),
      lg: columns,
      xl: columns,
    };
  }

  const result: Partial<Record<Breakpoint, number>> = {};
  Object.entries(itemsPerRow).forEach(([breakpoint, items]) => {
    if (typeof items === 'number') {
      result[breakpoint as Breakpoint] = 12 / items;
    }
  });

  return result;
};

// Spacing utilities
export const createResponsiveSpacing = (
  base: number,
  mobile?: number,
  tablet?: number
): Partial<Record<Breakpoint, number>> => ({
  xs: mobile ?? Math.max(1, base - 1),
  sm: tablet ?? base,
  md: base,
  lg: base,
  xl: base,
});

// Typography utilities
export const createResponsiveFontSize = (
  base: string,
  mobile?: string,
  tablet?: string
): Partial<Record<Breakpoint, string>> => ({
  xs: mobile ?? base,
  sm: tablet ?? base,
  md: base,
  lg: base,
  xl: base,
});

// Layout utilities
export const createFlexLayout = (
  direction: ResponsiveValue<'row' | 'column'> = 'row',
  justify: ResponsiveValue<'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly'> = 'flex-start',
  align: ResponsiveValue<'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline'> = 'stretch'
) => ({
  display: 'flex',
  flexDirection: direction,
  justifyContent: justify,
  alignItems: align,
});

// Media query utilities
export const createMediaQuery = (breakpoint: Breakpoint, direction: 'up' | 'down' | 'only' = 'up') => {
  const value = breakpoints[breakpoint];
  
  switch (direction) {
    case 'up':
      return `@media (min-width: ${value}px)`;
    case 'down':
      return `@media (max-width: ${value - 0.05}px)`;
    case 'only':
      const nextBreakpoint = getNextBreakpoint(breakpoint);
      if (nextBreakpoint) {
        return `@media (min-width: ${value}px) and (max-width: ${breakpoints[nextBreakpoint] - 0.05}px)`;
      }
      return `@media (min-width: ${value}px)`;
    default:
      return `@media (min-width: ${value}px)`;
  }
};

const getNextBreakpoint = (breakpoint: Breakpoint): Breakpoint | null => {
  const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  return currentIndex < breakpointOrder.length - 1 ? breakpointOrder[currentIndex + 1] : null;
};

// Touch target utilities
export const createTouchTarget = (minSize: number = 44) => ({
  minHeight: minSize,
  minWidth: minSize,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  touchAction: 'manipulation',
  userSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
});

// Safe area utilities (for mobile devices with notches)
export const createSafeArea = () => ({
  paddingTop: 'env(safe-area-inset-top)',
  paddingRight: 'env(safe-area-inset-right)',
  paddingBottom: 'env(safe-area-inset-bottom)',
  paddingLeft: 'env(safe-area-inset-left)',
});

// Responsive container utilities
export const createResponsiveContainer = (
  maxWidth: ResponsiveValue<string | number> = '100%',
  padding: ResponsiveValue<number> = 2
) => ({
  width: '100%',
  maxWidth,
  padding,
  marginLeft: 'auto',
  marginRight: 'auto',
  boxSizing: 'border-box' as const,
});

// Aspect ratio utilities
export const createAspectRatio = (ratio: string = '16/9') => ({
  position: 'relative' as const,
  width: '100%',
  aspectRatio: ratio,
  '&::before': {
    content: '""',
    display: 'block',
    paddingTop: `${(1 / parseFloat(ratio.replace('/', '/'))) * 100}%`,
  },
  '& > *': {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
});

// Responsive image utilities
export const createResponsiveImage = () => ({
  width: '100%',
  height: 'auto',
  objectFit: 'cover' as const,
  objectPosition: 'center',
});

// Scroll utilities
export const createScrollContainer = (direction: 'horizontal' | 'vertical' | 'both' = 'vertical') => {
  const overflowX = direction === 'horizontal' || direction === 'both' ? 'auto' : 'hidden';
  const overflowY = direction === 'vertical' || direction === 'both' ? 'auto' : 'hidden';
  
  return {
    overflowX,
    overflowY,
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'thin',
    '&::-webkit-scrollbar': {
      width: 8,
      height: 8,
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
      borderRadius: 4,
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      borderRadius: 4,
      '&:hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      },
    },
  };
};

// Animation utilities for responsive design
export const createResponsiveAnimation = (
  property: string,
  duration: ResponsiveValue<string> = '0.3s',
  easing: string = 'ease-out'
) => ({
  transition: `${property} ${duration} ${easing}`,
  willChange: property,
});

// Responsive visibility utilities
export const createResponsiveVisibility = (
  visible: Partial<Record<Breakpoint, boolean>>
) => {
  const styles: any = {};
  
  Object.entries(visible).forEach(([breakpoint, isVisible]) => {
    const mediaQuery = createMediaQuery(breakpoint as Breakpoint, 'up');
    styles[mediaQuery] = {
      display: isVisible ? 'block' : 'none',
    };
  });
  
  return styles;
};

// Performance optimization utilities
export const createPerformanceOptimizations = () => ({
  // Enable hardware acceleration
  transform: 'translateZ(0)',
  // Optimize repaints
  willChange: 'transform',
  // Optimize scrolling
  WebkitOverflowScrolling: 'touch',
  // Prevent layout shifts
  containIntrinsicSize: 'auto',
});