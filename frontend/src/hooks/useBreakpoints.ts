import { useTheme, useMediaQuery } from '@mui/material';
import { Breakpoint } from '@mui/material/styles';

export interface BreakpointValues {
  xs: boolean;
  sm: boolean;
  md: boolean;
  lg: boolean;
  xl: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  current: Breakpoint;
  width: number;
}

export const useBreakpoints = (): BreakpointValues => {
  const theme = useTheme();
  
  const xs = useMediaQuery(theme.breakpoints.only('xs'));
  const sm = useMediaQuery(theme.breakpoints.only('sm'));
  const md = useMediaQuery(theme.breakpoints.only('md'));
  const lg = useMediaQuery(theme.breakpoints.only('lg'));
  const xl = useMediaQuery(theme.breakpoints.only('xl'));
  
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.between('md', 'xl'));
  const isLargeDesktop = useMediaQuery(theme.breakpoints.up('xl'));
  
  const getCurrentBreakpoint = (): Breakpoint => {
    if (xs) return 'xs';
    if (sm) return 'sm';
    if (md) return 'md';
    if (lg) return 'lg';
    return 'xl';
  };
  
  const getWindowWidth = (): number => {
    if (typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return 1200; // Default fallback
  };
  
  return {
    xs,
    sm,
    md,
    lg,
    xl,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    current: getCurrentBreakpoint(),
    width: getWindowWidth(),
  };
};

export const useResponsiveValue = <T>(values: Partial<Record<Breakpoint, T>>): T | undefined => {
  const breakpoints = useBreakpoints();
  
  // Priority order: current breakpoint, then fallback to smaller breakpoints
  const breakpointOrder: Breakpoint[] = ['xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = breakpointOrder.indexOf(breakpoints.current);
  
  // Check current and smaller breakpoints
  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const breakpoint = breakpointOrder[i];
    if (values[breakpoint] !== undefined) {
      return values[breakpoint];
    }
  }
  
  return undefined;
};

export const useResponsiveSpacing = () => {
  const { isMobile, isTablet } = useBreakpoints();
  
  return {
    container: isMobile ? 1 : isTablet ? 2 : 3,
    section: isMobile ? 2 : isTablet ? 3 : 4,
    component: isMobile ? 1 : 2,
    element: isMobile ? 0.5 : 1,
  };
};

export const useResponsiveFontSize = () => {
  const { isMobile, isTablet } = useBreakpoints();
  
  return {
    h1: isMobile ? '1.75rem' : isTablet ? '2rem' : '2.5rem',
    h2: isMobile ? '1.5rem' : isTablet ? '1.75rem' : '2rem',
    h3: isMobile ? '1.25rem' : isTablet ? '1.5rem' : '1.75rem',
    h4: isMobile ? '1.125rem' : isTablet ? '1.25rem' : '1.5rem',
    h5: isMobile ? '1rem' : isTablet ? '1.125rem' : '1.25rem',
    h6: isMobile ? '0.875rem' : isTablet ? '1rem' : '1.125rem',
    body1: isMobile ? '0.875rem' : '1rem',
    body2: isMobile ? '0.75rem' : '0.875rem',
    caption: isMobile ? '0.625rem' : '0.75rem',
  };
};