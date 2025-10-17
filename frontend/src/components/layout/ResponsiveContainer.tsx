import React from 'react';
import {
  Container,
  Box,
  useTheme,
} from '@mui/material';
import { Breakpoint } from '@mui/material/styles';
import { useBreakpoints, useResponsiveSpacing } from '../../hooks/useBreakpoints';

export interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: Breakpoint | false;
  disableGutters?: boolean;
  fluid?: boolean;
  centerContent?: boolean;
  minHeight?: string | number;
  padding?: 'none' | 'small' | 'medium' | 'large' | 'responsive';
  margin?: 'none' | 'small' | 'medium' | 'large' | 'responsive';
  background?: 'transparent' | 'paper' | 'default';
  elevation?: number;
  rounded?: boolean;
  sx?: object;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth = 'lg',
  disableGutters = false,
  fluid = false,
  centerContent = false,
  minHeight,
  padding = 'responsive',
  margin = 'none',
  background = 'transparent',
  elevation = 0,
  rounded = false,
  sx = {},
}) => {
  const theme = useTheme();
  const { isMobile, isTablet } = useBreakpoints();
  const spacing = useResponsiveSpacing();

  const getPaddingValue = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'small':
        return theme.spacing(1);
      case 'medium':
        return theme.spacing(2);
      case 'large':
        return theme.spacing(3);
      case 'responsive':
        return theme.spacing(spacing.container);
      default:
        return 0;
    }
  };

  const getMarginValue = () => {
    switch (margin) {
      case 'none':
        return 0;
      case 'small':
        return theme.spacing(1);
      case 'medium':
        return theme.spacing(2);
      case 'large':
        return theme.spacing(3);
      case 'responsive':
        return theme.spacing(spacing.section);
      default:
        return 0;
    }
  };

  const getBackgroundColor = () => {
    switch (background) {
      case 'paper':
        return theme.palette.background.paper;
      case 'default':
        return theme.palette.background.default;
      default:
        return 'transparent';
    }
  };

  const containerSx = {
    backgroundColor: getBackgroundColor(),
    padding: getPaddingValue(),
    margin: getMarginValue(),
    minHeight,
    borderRadius: rounded ? theme.shape.borderRadius : 0,
    boxShadow: elevation > 0 ? theme.shadows[elevation] : 'none',
    display: centerContent ? 'flex' : 'block',
    alignItems: centerContent ? 'center' : 'stretch',
    justifyContent: centerContent ? 'center' : 'flex-start',
    flexDirection: centerContent ? 'column' : 'row',
    ...sx,
  };

  if (fluid) {
    return (
      <Box sx={containerSx}>
        {children}
      </Box>
    );
  }

  return (
    <Container
      maxWidth={maxWidth}
      disableGutters={disableGutters}
      sx={containerSx}
    >
      {children}
    </Container>
  );
};

export const ResponsiveSection: React.FC<{
  children: React.ReactNode;
  spacing?: 'none' | 'small' | 'medium' | 'large' | 'responsive';
  direction?: 'row' | 'column' | 'responsive';
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  wrap?: boolean;
  sx?: object;
}> = ({
  children,
  spacing = 'responsive',
  direction = 'responsive',
  align = 'stretch',
  justify = 'flex-start',
  wrap = true,
  sx = {},
}) => {
  const theme = useTheme();
  const { isMobile } = useBreakpoints();
  const responsiveSpacing = useResponsiveSpacing();

  const getSpacingValue = () => {
    switch (spacing) {
      case 'none':
        return 0;
      case 'small':
        return 1;
      case 'medium':
        return 2;
      case 'large':
        return 3;
      case 'responsive':
        return responsiveSpacing.section;
      default:
        return 2;
    }
  };

  const getDirection = () => {
    if (direction === 'responsive') {
      return isMobile ? 'column' : 'row';
    }
    return direction;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: getDirection(),
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap ? 'wrap' : 'nowrap',
        gap: theme.spacing(getSpacingValue()),
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

export const ResponsiveStack: React.FC<{
  children: React.ReactNode;
  spacing?: number | 'responsive';
  direction?: 'row' | 'column' | 'responsive';
  divider?: React.ReactElement;
  sx?: object;
}> = ({
  children,
  spacing = 'responsive',
  direction = 'column',
  divider,
  sx = {},
}) => {
  const theme = useTheme();
  const { isMobile } = useBreakpoints();
  const responsiveSpacing = useResponsiveSpacing();

  const getSpacingValue = () => {
    if (spacing === 'responsive') {
      return responsiveSpacing.component;
    }
    return spacing;
  };

  const getDirection = () => {
    if (direction === 'responsive') {
      return isMobile ? 'column' : 'row';
    }
    return direction;
  };

  const childrenArray = React.Children.toArray(children);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: getDirection(),
        gap: theme.spacing(getSpacingValue()),
        ...sx,
      }}
    >
      {childrenArray.map((child, index) => (
        <React.Fragment key={index}>
          {child}
          {divider && index < childrenArray.length - 1 && divider}
        </React.Fragment>
      ))}
    </Box>
  );
};

export const ResponsiveHidden: React.FC<{
  children: React.ReactNode;
  only?: Breakpoint | Breakpoint[];
  up?: Breakpoint;
  down?: Breakpoint;
}> = ({ children, only, up, down }) => {
  const theme = useTheme();
  const breakpoints = useBreakpoints();

  const shouldHide = () => {
    if (only) {
      const breakpointsToHide = Array.isArray(only) ? only : [only];
      return breakpointsToHide.includes(breakpoints.current);
    }

    if (up) {
      const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];
      const upIndex = breakpointOrder.indexOf(up);
      const currentIndex = breakpointOrder.indexOf(breakpoints.current);
      return currentIndex >= upIndex;
    }

    if (down) {
      const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];
      const downIndex = breakpointOrder.indexOf(down);
      const currentIndex = breakpointOrder.indexOf(breakpoints.current);
      return currentIndex <= downIndex;
    }

    return false;
  };

  if (shouldHide()) {
    return null;
  }

  return <>{children}</>;
};