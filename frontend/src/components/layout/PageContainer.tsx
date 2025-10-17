import React from 'react';
import {
  Container,
  Box,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { PageHeader } from '../navigation/Breadcrumbs';

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  breadcrumbs?: Array<{
    label: string;
    path?: string;
    icon?: React.ReactNode;
  }>;
  actions?: React.ReactNode;
  status?: {
    label: string;
    color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  };
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  disableGutters?: boolean;
  paper?: boolean;
  elevation?: number;
  padding?: number | string;
  showBreadcrumbs?: boolean;
  fullHeight?: boolean;
  scrollable?: boolean;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  title,
  subtitle,
  breadcrumbs,
  actions,
  status,
  maxWidth = 'xl',
  disableGutters = false,
  paper = false,
  elevation = 0,
  padding,
  showBreadcrumbs = true,
  fullHeight = false,
  scrollable = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const containerProps = {
    maxWidth,
    disableGutters,
    sx: {
      py: padding || (isMobile ? 2 : 3),
      px: padding || (disableGutters ? 0 : undefined),
      height: fullHeight ? '100%' : 'auto',
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: scrollable ? 'auto' : 'visible',
    },
  };

  const content = (
    <>
      {/* Page Header */}
      {(title || subtitle || breadcrumbs || showBreadcrumbs) && (
        <PageHeader
          title={title}
          subtitle={subtitle}
          breadcrumbs={breadcrumbs}
          actions={actions}
          status={status}
          showBreadcrumbs={showBreadcrumbs}
        />
      )}

      {/* Page Content */}
      <Box
        sx={{
          flex: fullHeight ? 1 : 'none',
          overflow: scrollable ? 'auto' : 'visible',
        }}
      >
        {children}
      </Box>
    </>
  );

  if (paper) {
    return (
      <Container {...containerProps}>
        <Paper
          elevation={elevation}
          sx={{
            p: 3,
            height: fullHeight ? '100%' : 'auto',
            display: 'flex',
            flexDirection: 'column',
            overflow: scrollable ? 'hidden' : 'visible',
          }}
        >
          {content}
        </Paper>
      </Container>
    );
  }

  return <Container {...containerProps}>{content}</Container>;
};

// Split layout for forms and details
export const SplitLayout: React.FC<{
  left: React.ReactNode;
  right: React.ReactNode;
  leftWidth?: number; // 1-11, represents grid columns
  spacing?: number;
  direction?: 'row' | 'column';
  breakpoint?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}> = ({
  left,
  right,
  leftWidth = 8,
  spacing = 3,
  direction = 'row',
  breakpoint = 'md',
}) => {
  const { Grid } = require('@mui/material');
  const rightWidth = 12 - leftWidth;

  return (
    <Grid container spacing={spacing} direction={direction}>
      <Grid item xs={12} {...{ [breakpoint]: leftWidth }}>
        {left}
      </Grid>
      <Grid item xs={12} {...{ [breakpoint]: rightWidth }}>
        {right}
      </Grid>
    </Grid>
  );
};

// Centered layout for forms and modals
export const CenteredLayout: React.FC<{
  children: React.ReactNode;
  maxWidth?: number | string;
  paper?: boolean;
  elevation?: number;
  padding?: number;
}> = ({
  children,
  maxWidth = 600,
  paper = true,
  elevation = 3,
  padding = 4,
}) => {
  const content = (
    <Box
      sx={{
        maxWidth,
        width: '100%',
        p: paper ? 0 : padding,
      }}
    >
      {children}
    </Box>
  );

  if (paper) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          p: 2,
        }}
      >
        <Paper elevation={elevation} sx={{ p: padding, maxWidth, width: '100%' }}>
          {children}
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        p: 2,
      }}
    >
      {content}
    </Box>
  );
};