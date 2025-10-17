import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DashboardConfig, WidgetConfig, GridLayout } from '../../types';

interface DashboardState {
  configs: Record<string, DashboardConfig>;
  activeConfig: string | null;
  widgets: Record<string, WidgetConfig>;
  layouts: Record<string, GridLayout[]>;
  loading: Record<string, boolean>;
  errors: Record<string, string>;
  lastUpdated: Record<string, Date>;
}

const initialState: DashboardState = {
  configs: {},
  activeConfig: null,
  widgets: {},
  layouts: {},
  loading: {},
  errors: {},
  lastUpdated: {},
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    // Dashboard config management
    setDashboardConfig: (state, action: PayloadAction<DashboardConfig>) => {
      const config = action.payload;
      state.configs[config.id] = config;
      
      // Set as active if it's the first config or marked as default
      if (!state.activeConfig || config.isDefault) {
        state.activeConfig = config.id;
      }
    },

    setActiveConfig: (state, action: PayloadAction<string>) => {
      if (state.configs[action.payload]) {
        state.activeConfig = action.payload;
      }
    },

    updateDashboardConfig: (state, action: PayloadAction<{ id: string; updates: Partial<DashboardConfig> }>) => {
      const { id, updates } = action.payload;
      if (state.configs[id]) {
        state.configs[id] = { ...state.configs[id], ...updates };
      }
    },

    removeDashboardConfig: (state, action: PayloadAction<string>) => {
      const configId = action.payload;
      delete state.configs[configId];
      
      // If this was the active config, switch to another one
      if (state.activeConfig === configId) {
        const remainingConfigs = Object.keys(state.configs);
        state.activeConfig = remainingConfigs.length > 0 ? remainingConfigs[0] : null;
      }
    },

    // Widget management
    addWidget: (state, action: PayloadAction<WidgetConfig>) => {
      const widget = action.payload;
      state.widgets[widget.id] = widget;
    },

    updateWidget: (state, action: PayloadAction<{ id: string; updates: Partial<WidgetConfig> }>) => {
      const { id, updates } = action.payload;
      if (state.widgets[id]) {
        state.widgets[id] = { ...state.widgets[id], ...updates };
      }
    },

    removeWidget: (state, action: PayloadAction<string>) => {
      delete state.widgets[action.payload];
    },

    // Layout management
    updateLayout: (state, action: PayloadAction<{ configId: string; layout: GridLayout[] }>) => {
      const { configId, layout } = action.payload;
      state.layouts[configId] = layout;
      
      // Update the config's layout as well
      if (state.configs[configId]) {
        state.configs[configId].layout = layout;
      }
    },

    resetLayout: (state, action: PayloadAction<string>) => {
      const configId = action.payload;
      if (state.configs[configId]) {
        // Reset to default layout
        state.layouts[configId] = state.configs[configId].layout;
      }
    },

    // Loading states
    setLoading: (state, action: PayloadAction<{ key: string; loading: boolean }>) => {
      const { key, loading } = action.payload;
      if (loading) {
        state.loading[key] = true;
      } else {
        delete state.loading[key];
      }
    },

    // Error handling
    setError: (state, action: PayloadAction<{ key: string; error: string }>) => {
      const { key, error } = action.payload;
      state.errors[key] = error;
    },

    clearError: (state, action: PayloadAction<string>) => {
      delete state.errors[action.payload];
    },

    clearAllErrors: (state) => {
      state.errors = {};
    },

    // Data refresh tracking
    setLastUpdated: (state, action: PayloadAction<{ key: string; timestamp: Date }>) => {
      const { key, timestamp } = action.payload;
      state.lastUpdated[key] = timestamp;
    },

    // Bulk operations
    setMultipleConfigs: (state, action: PayloadAction<DashboardConfig[]>) => {
      action.payload.forEach(config => {
        state.configs[config.id] = config;
      });
      
      // Set first config as active if none is set
      if (!state.activeConfig && action.payload.length > 0) {
        state.activeConfig = action.payload[0].id;
      }
    },

    setMultipleWidgets: (state, action: PayloadAction<WidgetConfig[]>) => {
      action.payload.forEach(widget => {
        state.widgets[widget.id] = widget;
      });
    },

    // Reset dashboard
    resetDashboard: (state) => {
      state.configs = {};
      state.activeConfig = null;
      state.widgets = {};
      state.layouts = {};
      state.loading = {};
      state.errors = {};
      state.lastUpdated = {};
    },
  },
});

export const {
  setDashboardConfig,
  setActiveConfig,
  updateDashboardConfig,
  removeDashboardConfig,
  addWidget,
  updateWidget,
  removeWidget,
  updateLayout,
  resetLayout,
  setLoading,
  setError,
  clearError,
  clearAllErrors,
  setLastUpdated,
  setMultipleConfigs,
  setMultipleWidgets,
  resetDashboard,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;

// Selectors
export const selectDashboardConfigs = (state: { dashboard: DashboardState }) => 
  state.dashboard.configs;

export const selectActiveConfig = (state: { dashboard: DashboardState }) => {
  const activeId = state.dashboard.activeConfig;
  return activeId ? state.dashboard.configs[activeId] : null;
};

export const selectWidgets = (state: { dashboard: DashboardState }) => 
  state.dashboard.widgets;

export const selectLayout = (state: { dashboard: DashboardState }, configId: string) => 
  state.dashboard.layouts[configId] || [];

export const selectDashboardLoading = (state: { dashboard: DashboardState }, key: string) => 
  state.dashboard.loading[key] || false;

export const selectDashboardError = (state: { dashboard: DashboardState }, key: string) => 
  state.dashboard.errors[key];

export const selectLastUpdated = (state: { dashboard: DashboardState }, key: string) => 
  state.dashboard.lastUpdated[key];

export const selectWidgetsByConfig = (state: { dashboard: DashboardState }, configId: string) => {
  const config = state.dashboard.configs[configId];
  if (!config) return [];
  
  return config.widgets.map(widgetConfig => ({
    ...widgetConfig,
    ...state.dashboard.widgets[widgetConfig.id],
  }));
};