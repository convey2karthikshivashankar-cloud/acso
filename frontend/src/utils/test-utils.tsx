import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { configureStore } from '@reduxjs/toolkit';

// Import reducers
import authReducer from '@store/slices/authSlice';
import uiReducer from '@store/slices/uiSlice';
import { apiSlice } from '@store/api/apiSlice';

// Create a test theme
const testTheme = createTheme({
  palette: {
    mode: 'light',
  },
});

// Create a test store
const createTestStore = (preloadedState?: any) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
      [apiSlice.reducerPath]: apiSlice.reducer,
    },
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }).concat(apiSlice.middleware),
  });
};

// Create a test query client
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

interface AllTheProvidersProps {
  children: React.ReactNode;
  initialState?: any;
  queryClient?: QueryClient;
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ 
  children, 
  initialState,
  queryClient = createTestQueryClient()
}) => {
  const store = createTestStore(initialState);
  
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider theme={testTheme}>
            {children}
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: any;
  queryClient?: QueryClient;
}

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialState, queryClient, ...renderOptions } = options;
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders 
        initialState={initialState} 
        queryClient={queryClient}
      >
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  });
};

// Mock user data for testing
export const mockUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@acso.com',
  firstName: 'Test',
  lastName: 'User',
  roles: [
    {
      id: 'role-1',
      name: 'Test Role',
      description: 'Test role for testing',
      permissions: [
        {
          resource: '*',
          actions: ['read', 'write'],
        },
      ],
    },
  ],
  permissions: [
    {
      resource: '*',
      actions: ['read', 'write'],
    },
  ],
  preferences: {
    theme: 'light' as const,
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    notifications: {
      email: true,
      push: true,
      inApp: true,
      channels: ['email'],
      frequency: 'immediate' as const,
    },
    dashboard: {
      defaultView: 'overview',
      refreshInterval: 30000,
      widgetSettings: {},
    },
  },
  lastLogin: new Date('2024-01-15T10:30:00Z'),
  isActive: true,
};

// Mock authenticated state
export const mockAuthenticatedState = {
  auth: {
    isAuthenticated: true,
    user: mockUser,
    token: 'mock-token',
    refreshToken: 'mock-refresh-token',
    isLoading: false,
    error: null,
  },
};

// Mock unauthenticated state
export const mockUnauthenticatedState = {
  auth: {
    isAuthenticated: false,
    user: null,
    token: null,
    refreshToken: null,
    isLoading: false,
    error: null,
  },
};

// Helper function to create mock API responses
export const createMockApiResponse = <T>(data: T) => ({
  data,
  success: true,
  message: 'Success',
  pagination: {
    page: 1,
    limit: 10,
    total: 1,
    hasNext: false,
    hasPrevious: false,
  },
  metadata: {
    requestId: 'test-request-id',
    timestamp: new Date(),
    version: '1.0.0',
  },
});

// Helper function to wait for async operations
export const waitFor = (ms: number) => 
  new Promise(resolve => setTimeout(resolve, ms));

// Helper function to create mock intersection observer
export const createMockIntersectionObserver = () => {
  const mockIntersectionObserver = jest.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.IntersectionObserver = mockIntersectionObserver;
  return mockIntersectionObserver;
};

// Helper function to create mock resize observer
export const createMockResizeObserver = () => {
  const mockResizeObserver = jest.fn();
  mockResizeObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.ResizeObserver = mockResizeObserver;
  return mockResizeObserver;
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
export { createTestStore, createTestQueryClient, AllTheProviders };