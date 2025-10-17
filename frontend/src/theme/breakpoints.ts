import { BreakpointsOptions } from '@mui/material/styles';

// Custom breakpoints for ACSO responsive design
export const breakpoints: BreakpointsOptions = {
  values: {
    xs: 0,      // Mobile phones (portrait)
    sm: 600,    // Mobile phones (landscape) and small tablets
    md: 960,    // Tablets and small laptops
    lg: 1280,   // Desktop and laptops
    xl: 1920,   // Large desktop screens
  },
};

// Utility functions for responsive design
export const mediaQueries = {
  up: (breakpoint: keyof typeof breakpoints.values) => 
    `@media (min-width:${breakpoints.values[breakpoint]}px)`,
  down: (breakpoint: keyof typeof breakpoints.values) => 
    `@media (max-width:${breakpoints.values[breakpoint] - 1}px)`,
  between: (
    start: keyof typeof breakpoints.values, 
    end: keyof typeof breakpoints.values
  ) => 
    `@media (min-width:${breakpoints.values[start]}px) and (max-width:${breakpoints.values[end] - 1}px)`,
  only: (breakpoint: keyof typeof breakpoints.values) => {
    const keys = Object.keys(breakpoints.values) as Array<keyof typeof breakpoints.values>;
    const index = keys.indexOf(breakpoint);
    const nextBreakpoint = keys[index + 1];
    
    if (nextBreakpoint) {
      return `@media (min-width:${breakpoints.values[breakpoint]}px) and (max-width:${breakpoints.values[nextBreakpoint] - 1}px)`;
    } else {
      return `@media (min-width:${breakpoints.values[breakpoint]}px)`;
    }
  },
};

// Container max widths for different breakpoints
export const containerMaxWidths = {
  xs: '100%',
  sm: '540px',
  md: '720px',
  lg: '960px',
  xl: '1140px',
};

// Grid system configuration
export const gridConfig = {
  columns: 12,
  spacing: {
    xs: 1,
    sm: 2,
    md: 3,
    lg: 3,
    xl: 3,
  },
};