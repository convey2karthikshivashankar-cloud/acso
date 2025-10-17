// Enhanced UI Components Library
// This module exports all enhanced components for the ACSO UI Frontend

// Data Display Components
export { EnhancedDataTable } from '../data/EnhancedDataTable';
export type { Column, EnhancedDataTableProps } from '../data/EnhancedDataTable';

export { EnhancedDataCard } from '../data/EnhancedDataCard';
export type { 
  CardAction, 
  CardMetric, 
  EnhancedDataCardProps 
} from '../data/EnhancedDataCard';

// Navigation Components
export { EnhancedNavigation } from '../navigation/EnhancedNavigation';
export type { 
  NavigationItem, 
  EnhancedNavigationProps 
} from '../navigation/EnhancedNavigation';

// Layout Components
export { 
  ResponsiveGrid,
  GridItem,
  TwoColumnLayout,
  ThreeColumnLayout,
  CardGrid,
  MasonryGrid,
  FlexLayout,
  StickyLayout
} from '../layout/ResponsiveGrid';
export type { 
  GridItemProps, 
  ResponsiveGridProps 
} from '../layout/ResponsiveGrid';

export {
  ResponsiveContainer,
  ResponsiveSection,
  ResponsiveStack,
  ResponsiveHidden
} from '../layout/ResponsiveContainer';

export {
  ResponsiveShow,
  ResponsiveHide,
  ResponsiveValue,
  ResponsiveSpacing,
  ResponsiveColumns,
  ResponsiveAspectRatio,
  ResponsiveText
} from '../layout/ResponsiveBreakpoints';

// Touch Components
export {
  TouchOptimizedButton,
  SwipeableCard,
  TouchOptimizedFab,
  PullToRefresh
} from '../touch/TouchOptimized';

// Media Components
export {
  ResponsiveImage,
  ResponsiveBackgroundImage
} from '../media/ResponsiveImage';

export {
  ResponsiveContainer,
  ResponsiveSection,
  ResponsiveStack,
  ResponsiveHidden
} from '../layout/ResponsiveContainer';
export type { ResponsiveContainerProps } from '../layout/ResponsiveContainer';

// Touch-Optimized Components
export {
  TouchOptimizedButton,
  SwipeableCard,
  TouchOptimizedFab,
  PullToRefresh
} from '../touch/TouchOptimized';
export type {
  TouchOptimizedButtonProps,
  SwipeableCardProps,
  TouchOptimizedFabProps,
  PullToRefreshProps
} from '../touch/TouchOptimized';

// Common Components
export { EnhancedNotification, NotificationProvider, useNotifications } from '../common/EnhancedNotification';
export type { 
  NotificationAction, 
  NotificationProps, 
  NotificationContextType 
} from '../common/EnhancedNotification';

export { EnhancedButton, ActionButton, FloatingActionButton } from '../common/EnhancedButton';
export type { 
  ButtonAction, 
  EnhancedButtonProps 
} from '../common/EnhancedButton';

// Form Components (existing enhanced versions)
export {
  FormTextField,
  FormSelectField,
  FormAutocompleteField,
  FormCheckboxField,
  FormRadioField,
  FormSwitchField,
  FormDateField
} from '../forms/FormField';

// Dashboard Components
export {
  DashboardLayoutEngine,
  DashboardTemplates,
  WidgetContainer,
  MetricWidget,
  SystemHealthWidget,
  ActivityFeedWidget,
  ChartWidget,
  AgentStatusWidget,
  PerformanceMetricsWidget,
  DashboardExample,
  createDashboardWidget,
  createDashboardTemplate,
  calculateOptimalLayout,
  widgetSizePresets,
  dashboardThemes,
  // Enhanced Widget Framework
  SingleMetricWidget,
  MultiMetricWidget,
  SystemHealthMetricWidget,
  PerformanceMetricWidget,
  SecurityMetricWidget,
  EnhancedChartWidget,
  SystemMetricsChartWidget,
  ThreatDetectionChartWidget,
  PerformanceRadarWidget,
  ListWidget,
  TableWidget,
  ActivityListWidget,
  AgentStatusTableWidget,
  WidgetRegistry,
  WidgetFactory,
  WidgetConfigHelper,
  BaseWidget,
  FunctionalWidget,
} from '../dashboard';
export type {
  DashboardWidget,
  DashboardTemplate,
  DashboardLayoutEngineProps,
  DashboardTemplatesProps,
  WidgetContainerProps,
  WidgetDefinition,
  BaseWidgetProps,
  WidgetState,
} from '../dashboard';

// Re-export existing components with enhanced features
export { DataCard, DataCardGrid, MetricCard, StatusCard } from '../data/DataCard';
export { Form } from '../forms/Form';
export { DataTable } from '../data/DataTable';
export { Loading } from '../common/Loading';
export { LoadingSpinner } from '../common/LoadingSpinner';
export { Notification } from '../common/Notification';
export { StatusIndicator } from '../common/StatusIndicator';

// Layout components
export { PageContainer } from '../layout/PageContainer';
export { Breadcrumbs } from '../navigation/Breadcrumbs';

// Responsive Hooks
export { 
  useBreakpoints, 
  useResponsiveValue, 
  useResponsiveSpacing, 
  useResponsiveFontSize 
} from '../../hooks/useBreakpoints';
export type { BreakpointValues } from '../../hooks/useBreakpoints';

// Responsive Utilities
export {
  getResponsiveValue,
  createResponsiveColumns,
  createResponsiveSpacing,
  createResponsiveFontSize,
  createFlexLayout,
  createMediaQuery,
  createTouchTarget,
  createSafeArea,
  createResponsiveContainer,
  createAspectRatio,
  createResponsiveImage,
  createScrollContainer,
  createResponsiveAnimation,
  createResponsiveVisibility,
  createPerformanceOptimizations
} from '../../utils/responsive';
export type { ResponsiveValue } from '../../utils/responsive';

// Legacy utility functions (maintained for backward compatibility)
export const createResponsiveBreakpoints = (
  xs?: number,
  sm?: number,
  md?: number,
  lg?: number,
  xl?: number
) => ({
  xs: xs || 12,
  sm: sm || xs || 12,
  md: md || sm || xs || 12,
  lg: lg || md || sm || xs || 12,
  xl: xl || lg || md || sm || xs || 12,
});

export const createGridColumns = (itemsPerRow: number) => {
  const columns = 12 / itemsPerRow;
  return {
    xs: 12,
    sm: Math.max(6, columns),
    md: Math.max(4, columns),
    lg: columns,
    xl: columns,
  };
};

// Theme utilities for enhanced components
export const createGradient = (from: string, to: string, direction = '45deg') => 
  `linear-gradient(${direction}, ${from}, ${to})`;

export const createGlassEffect = (color: string, opacity = 0.1) => ({
  background: `rgba(${color}, ${opacity})`,
  backdropFilter: 'blur(10px)',
  border: `1px solid rgba(${color}, ${opacity * 2})`,
});

// Animation utilities
export const pulseAnimation = {
  '@keyframes pulse': {
    '0%': { transform: 'scale(1)' },
    '50%': { transform: 'scale(1.05)' },
    '100%': { transform: 'scale(1)' },
  },
  animation: 'pulse 2s infinite',
};

export const slideInAnimation = {
  '@keyframes slideIn': {
    '0%': { transform: 'translateX(-100%)', opacity: 0 },
    '100%': { transform: 'translateX(0)', opacity: 1 },
  },
  animation: 'slideIn 0.3s ease-out',
};

export const fadeInAnimation = {
  '@keyframes fadeIn': {
    '0%': { opacity: 0 },
    '100%': { opacity: 1 },
  },
  animation: 'fadeIn 0.3s ease-out',
};

// Component composition utilities
export const withLoading = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return (props: P & { loading?: boolean }) => {
    const { loading, ...rest } = props;
    
    if (loading) {
      return <Loading />;
    }
    
    return <Component {...(rest as P)} />;
  };
};

export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return class extends React.Component<P, { hasError: boolean }> {
    constructor(props: P) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
      return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      console.error('Component error:', error, errorInfo);
    }

    render() {
      if (this.state.hasError) {
        return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h3>Something went wrong</h3>
            <p>Please try refreshing the page</p>
          </div>
        );
      }

      return <Component {...this.props} />;
    }
  };
};// 
Responsive Utilities
export {
  getResponsiveValue,
  createResponsiveColumns,
  createResponsiveSpacing,
  createResponsiveFontSize,
  createFlexLayout,
  createMediaQuery,
  createTouchTarget,
  createSafeArea,
  createResponsiveContainer,
  createAspectRatio,
  createResponsiveImage,
  createScrollContainer,
  createResponsiveAnimation,
  createResponsiveVisibility,
  createPerformanceOptimizations
} from '../../utils/responsive';

// Hooks
export { useBreakpoints, useResponsiveValue, useResponsiveSpacing, useResponsiveFontSize } from '../../hooks/useBreakpoints';

// Mobile-first responsive design utilities
export const createMobileFirstStyles = (styles: {
  mobile?: object;
  tablet?: object;
  desktop?: object;
}) => ({
  // Mobile styles (default)
  ...styles.mobile,
  // Tablet styles
  '@media (min-width: 768px)': {
    ...styles.tablet,
  },
  // Desktop styles
  '@media (min-width: 1024px)': {
    ...styles.desktop,
  },
});

// Touch-optimized component utilities
export const createTouchOptimizedStyles = (isMobile: boolean) => ({
  minHeight: isMobile ? 44 : 32, // iOS minimum touch target
  minWidth: isMobile ? 44 : 32,
  padding: isMobile ? '12px 16px' : '8px 12px',
  fontSize: isMobile ? '16px' : '14px', // Prevents zoom on iOS
  touchAction: 'manipulation',
  userSelect: 'none' as const,
  WebkitTapHighlightColor: 'transparent',
});

// Responsive spacing system
export const responsiveSpacing = {
  xs: { container: 1, section: 2, component: 1, element: 0.5 },
  sm: { container: 2, section: 3, component: 2, element: 1 },
  md: { container: 3, section: 4, component: 2, element: 1 },
  lg: { container: 3, section: 4, component: 2, element: 1 },
  xl: { container: 3, section: 4, component: 2, element: 1 },
};

// Responsive breakpoint helpers
export const breakpointHelpers = {
  isMobile: (width: number) => width < 768,
  isTablet: (width: number) => width >= 768 && width < 1024,
  isDesktop: (width: number) => width >= 1024,
  getCurrentBreakpoint: (width: number) => {
    if (width < 600) return 'xs';
    if (width < 900) return 'sm';
    if (width < 1200) return 'md';
    if (width < 1536) return 'lg';
    return 'xl';
  },
};