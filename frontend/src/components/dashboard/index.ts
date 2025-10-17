import React from 'react';
import { DashboardWidget, DashboardTemplate } from './DashboardLayoutEngine';

// Dashboard Layout Engine
export { DashboardLayoutEngine } from './DashboardLayoutEngine';
export type { 
  DashboardWidget, 
  DashboardTemplate, 
  DashboardLayoutEngineProps 
} from './DashboardLayoutEngine';

// Dashboard Templates
export { DashboardTemplates } from './DashboardTemplates';
export type { DashboardTemplatesProps } from './DashboardTemplates';

// Widget Container
export { default as WidgetContainer } from './WidgetContainer';
export type { WidgetContainerProps } from './WidgetContainer';

// Sample Widgets
export {
  MetricWidget,
  SystemHealthWidget,
  ActivityFeedWidget,
  ChartWidget,
  AgentStatusWidget,
  PerformanceMetricsWidget,
} from './widgets/SampleWidgets';

// Enhanced Widget Framework
export {
  SingleMetricWidget,
  MultiMetricWidget,
  SystemHealthMetricWidget,
  PerformanceMetricWidget,
  SecurityMetricWidget,
} from './widgets/MetricWidgets';

export {
  ChartWidget as EnhancedChartWidget,
  SystemMetricsChartWidget,
  ThreatDetectionChartWidget,
  PerformanceRadarWidget,
} from './widgets/ChartWidgets';

export {
  ListWidget,
  TableWidget,
  ActivityListWidget,
  AgentStatusTableWidget,
} from './widgets/ListTableWidgets';

export {
  WidgetRegistry,
  WidgetFactory,
  WidgetConfigHelper,
} from './widgets/WidgetRegistry';
export type { WidgetDefinition } from './widgets/WidgetRegistry';

export { BaseWidget, FunctionalWidget } from './widgets/BaseWidget';
export type { BaseWidgetProps, WidgetState } from './widgets/BaseWidget';

// Dashboard Example
export { DashboardExample } from './DashboardExample';

// Role-Based Dashboard System
export { RoleBasedDashboard } from './RoleBasedDashboard';
export { RoleDashboardManager } from './RoleDashboardManager';
export { DashboardSharingDialog } from './DashboardSharingDialog';

// Dashboard Templates and Utilities
export { 
  createRoleDashboardTemplates, 
  getDefaultDashboardForRole, 
  getDashboardsForRole,
  validateDashboardPermissions 
} from './RoleDashboardTemplates';

// Export additional types
export type { UserRole, DashboardUser, DashboardShare } from './RoleBasedDashboard';

// Dashboard utilities and helpers
export const createDashboardWidget = (
  type: string,
  title: string,
  component: React.ComponentType<any>,
  layout: { x: number; y: number; w: number; h: number },
  props?: Record<string, any>,
  config?: Record<string, any>
): DashboardWidget => ({
  id: `widget-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
  type,
  title,
  component,
  props: props || {},
  layout,
  config: {
    allowResize: true,
    allowRemove: true,
    allowFullscreen: true,
    refreshInterval: 60,
    ...config,
  },
});

export const createDashboardTemplate = (
  name: string,
  description: string,
  widgets: DashboardWidget[],
  role?: string,
  settings?: Partial<DashboardTemplate['settings']>
): Omit<DashboardTemplate, 'id'> => ({
  name,
  description,
  role,
  widgets,
  layouts: {},
  settings: {
    cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
    rowHeight: 60,
    margin: [16, 16],
    containerPadding: [16, 16],
    compactType: 'vertical',
    preventCollision: false,
    ...settings,
  },
});

// Dashboard layout utilities
export const calculateOptimalLayout = (
  widgets: DashboardWidget[],
  containerWidth: number,
  cols: number = 12
) => {
  let currentX = 0;
  let currentY = 0;
  let maxHeightInRow = 0;

  return widgets.map(widget => {
    const widgetWidth = widget.layout.w;
    const widgetHeight = widget.layout.h;

    // Check if widget fits in current row
    if (currentX + widgetWidth > cols) {
      // Move to next row
      currentX = 0;
      currentY += maxHeightInRow;
      maxHeightInRow = 0;
    }

    const layout = {
      ...widget.layout,
      x: currentX,
      y: currentY,
    };

    currentX += widgetWidth;
    maxHeightInRow = Math.max(maxHeightInRow, widgetHeight);

    return {
      ...widget,
      layout,
    };
  });
};

// Widget size presets
export const widgetSizePresets = {
  small: { w: 3, h: 3 },
  medium: { w: 4, h: 4 },
  large: { w: 6, h: 4 },
  wide: { w: 8, h: 3 },
  tall: { w: 4, h: 6 },
  fullWidth: { w: 12, h: 4 },
};

// Dashboard themes
export const dashboardThemes = {
  default: {
    backgroundColor: '#f5f5f5',
    widgetBackground: '#ffffff',
    headerBackground: '#1976d2',
    textColor: '#333333',
  },
  dark: {
    backgroundColor: '#121212',
    widgetBackground: '#1e1e1e',
    headerBackground: '#333333',
    textColor: '#ffffff',
  },
  minimal: {
    backgroundColor: '#ffffff',
    widgetBackground: '#fafafa',
    headerBackground: '#f0f0f0',
    textColor: '#333333',
  },
};// D
ashboard Customization Components
export { DashboardCustomizer } from './DashboardCustomizer';
export { DashboardThemeProvider, DashboardCustomizationProvider, useDashboardCustomization, createDefaultCustomization } from './DashboardThemeProvider';
export { DashboardPresetBrowser } from './DashboardPresetBrowser';
export { EnhancedDashboard } from './EnhancedDashboard';

// Customization Types
export type { DashboardCustomization } from './DashboardCustomizer';
export type { DashboardPreset, UserPersonalization } from '../services/dashboardPersonalizationService';