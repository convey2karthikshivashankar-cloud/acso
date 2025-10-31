import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PerformanceMetric {
  id: string;
  phase: 'mount' | 'update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  interactions: Set<any>;
  timestamp?: number;
}

interface UIState {
  theme: 'light' | 'dark' | 'auto';
  sidebarCollapsed: boolean;
  sidebarOpen: boolean; // For mobile
  activeRoute: string;
  loading: Record<string, boolean>;
  errors: Record<string, string>;
  modals: Record<string, boolean>;
  notifications: {
    open: boolean;
    count: number;
  };
  search: {
    open: boolean;
    query: string;
    results: any[];
  };
  fullscreen: boolean;
  language: string;
  timezone: string;
  performance: {
    metrics: PerformanceMetric[];
    maxMetrics: number;
    enabled: boolean;
  };
}

const initialState: UIState = {
  theme: 'auto',
  sidebarCollapsed: false,
  sidebarOpen: false,
  activeRoute: '/',
  loading: {},
  errors: {},
  modals: {},
  notifications: {
    open: false,
    count: 0,
  },
  search: {
    open: false,
    query: '',
    results: [],
  },
  fullscreen: false,
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  performance: {
    metrics: [],
    maxMetrics: 100,
    enabled: process.env.NODE_ENV === 'development',
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'auto'>) => {
      state.theme = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setActiveRoute: (state, action: PayloadAction<string>) => {
      state.activeRoute = action.payload;
    },
    setLoading: (state, action: PayloadAction<{ key: string; loading: boolean }>) => {
      const { key, loading } = action.payload;
      if (loading) {
        state.loading[key] = true;
      } else {
        delete state.loading[key];
      }
    },
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
    openModal: (state, action: PayloadAction<string>) => {
      state.modals[action.payload] = true;
    },
    closeModal: (state, action: PayloadAction<string>) => {
      state.modals[action.payload] = false;
    },
    closeAllModals: (state) => {
      state.modals = {};
    },
    setNotificationsOpen: (state, action: PayloadAction<boolean>) => {
      state.notifications.open = action.payload;
    },
    setNotificationCount: (state, action: PayloadAction<number>) => {
      state.notifications.count = action.payload;
    },
    setSearchOpen: (state, action: PayloadAction<boolean>) => {
      state.search.open = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.search.query = action.payload;
    },
    setSearchResults: (state, action: PayloadAction<any[]>) => {
      state.search.results = action.payload;
    },
    clearSearch: (state) => {
      state.search.query = '';
      state.search.results = [];
    },
    setFullscreen: (state, action: PayloadAction<boolean>) => {
      state.fullscreen = action.payload;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    setTimezone: (state, action: PayloadAction<string>) => {
      state.timezone = action.payload;
    },
    addPerformanceMetric: (state, action: PayloadAction<PerformanceMetric>) => {
      if (!state.performance.enabled) return;
      
      const metric = {
        ...action.payload,
        timestamp: Date.now(),
      };
      
      state.performance.metrics.push(metric);
      
      // Keep only the last N metrics to prevent memory leaks
      if (state.performance.metrics.length > state.performance.maxMetrics) {
        state.performance.metrics = state.performance.metrics.slice(-state.performance.maxMetrics);
      }
    },
    clearPerformanceMetrics: (state) => {
      state.performance.metrics = [];
    },
    setPerformanceEnabled: (state, action: PayloadAction<boolean>) => {
      state.performance.enabled = action.payload;
      if (!action.payload) {
        state.performance.metrics = [];
      }
    },
  },
});

export const {
  setTheme,
  toggleSidebar,
  setSidebarCollapsed,
  setSidebarOpen,
  setActiveRoute,
  setLoading,
  setError,
  clearError,
  clearAllErrors,
  openModal,
  closeModal,
  closeAllModals,
  setNotificationsOpen,
  setNotificationCount,
  setSearchOpen,
  setSearchQuery,
  setSearchResults,
  clearSearch,
  setFullscreen,
  setLanguage,
  setTimezone,
  addPerformanceMetric,
  clearPerformanceMetrics,
  setPerformanceEnabled,
} = uiSlice.actions;

export default uiSlice.reducer;

// Selectors
export const selectUI = (state: { ui: UIState }) => state.ui;
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;
export const selectSidebarCollapsed = (state: { ui: UIState }) => state.ui.sidebarCollapsed;
export const selectSidebarOpen = (state: { ui: UIState }) => state.ui.sidebarOpen;
export const selectActiveRoute = (state: { ui: UIState }) => state.ui.activeRoute;
export const selectLoading = (state: { ui: UIState }) => (key: string) => state.ui.loading[key] || false;
export const selectError = (state: { ui: UIState }) => (key: string) => state.ui.errors[key];
export const selectModal = (state: { ui: UIState }) => (key: string) => state.ui.modals[key] || false;
export const selectNotifications = (state: { ui: UIState }) => state.ui.notifications;
export const selectSearch = (state: { ui: UIState }) => state.ui.search;
export const selectFullscreen = (state: { ui: UIState }) => state.ui.fullscreen;
export const selectLanguage = (state: { ui: UIState }) => state.ui.language;
export const selectTimezone = (state: { ui: UIState }) => state.ui.timezone;
export const selectPerformanceMetrics = (state: { ui: UIState }) => state.ui.performance.metrics;
export const selectPerformanceEnabled = (state: { ui: UIState }) => state.ui.performance.enabled;