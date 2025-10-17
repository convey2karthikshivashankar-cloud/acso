import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../index';
import { APIResponse } from '../../types/api';

// Base query with authentication
const baseQuery = fetchBaseQuery({
  baseUrl: '/api/v1',
  prepareHeaders: (headers, { getState }) => {
    // Add auth token if available
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }

    // Add request ID for tracking
    headers.set('X-Request-ID', `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

    // Add CSRF token if available
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }

    return headers;
  },
});

// Base query with re-auth logic
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);

  // Handle token expiration
  if (result.error && result.error.status === 401) {
    // Try to refresh token
    const refreshToken = (api.getState() as RootState).auth.refreshToken;
    if (refreshToken) {
      const refreshResult = await baseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
          body: { refreshToken },
        },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        // Update token in store
        const { token } = (refreshResult.data as any).data;
        api.dispatch({ type: 'auth/updateToken', payload: { token } });
        
        // Retry original request
        result = await baseQuery(args, api, extraOptions);
      } else {
        // Refresh failed, logout user
        api.dispatch({ type: 'auth/logout' });
      }
    } else {
      // No refresh token, logout user
      api.dispatch({ type: 'auth/logout' });
    }
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Agent',
    'Workflow',
    'Incident',
    'User',
    'Dashboard',
    'Notification',
    'System',
    'Financial',
  ],
  endpoints: (builder) => ({
    // System endpoints
    getSystemHealth: builder.query<APIResponse<any>, void>({
      query: () => '/system/health',
      providesTags: ['System'],
    }),

    getSystemStatus: builder.query<APIResponse<any>, void>({
      query: () => '/system/status',
      providesTags: ['System'],
    }),

    // Agent endpoints
    getAgents: builder.query<APIResponse<any[]>, void>({
      query: () => '/agents',
      providesTags: ['Agent'],
    }),

    getAgent: builder.query<APIResponse<any>, string>({
      query: (id) => `/agents/${id}`,
      providesTags: (result, error, id) => [{ type: 'Agent', id }],
    }),

    updateAgentConfig: builder.mutation<APIResponse<any>, { id: string; config: any }>({
      query: ({ id, config }) => ({
        url: `/agents/${id}/config`,
        method: 'PUT',
        body: config,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Agent', id }],
    }),

    // Workflow endpoints
    getWorkflows: builder.query<APIResponse<any[]>, { status?: string; limit?: number; offset?: number }>({
      query: (params) => ({
        url: '/workflows',
        params,
      }),
      providesTags: ['Workflow'],
    }),

    getWorkflow: builder.query<APIResponse<any>, string>({
      query: (id) => `/workflows/${id}`,
      providesTags: (result, error, id) => [{ type: 'Workflow', id }],
    }),

    createWorkflow: builder.mutation<APIResponse<any>, any>({
      query: (workflow) => ({
        url: '/workflows',
        method: 'POST',
        body: workflow,
      }),
      invalidatesTags: ['Workflow'],
    }),

    executeWorkflow: builder.mutation<APIResponse<any>, { id: string; parameters?: any }>({
      query: ({ id, parameters }) => ({
        url: `/workflows/${id}/execute`,
        method: 'POST',
        body: { parameters },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Workflow', id }],
    }),

    // Incident endpoints
    getIncidents: builder.query<APIResponse<any[]>, { status?: string; severity?: string; limit?: number }>({
      query: (params) => ({
        url: '/incidents',
        params,
      }),
      providesTags: ['Incident'],
    }),

    getIncident: builder.query<APIResponse<any>, string>({
      query: (id) => `/incidents/${id}`,
      providesTags: (result, error, id) => [{ type: 'Incident', id }],
    }),

    createIncident: builder.mutation<APIResponse<any>, any>({
      query: (incident) => ({
        url: '/incidents',
        method: 'POST',
        body: incident,
      }),
      invalidatesTags: ['Incident'],
    }),

    updateIncident: builder.mutation<APIResponse<any>, { id: string; updates: any }>({
      query: ({ id, updates }) => ({
        url: `/incidents/${id}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Incident', id }],
    }),

    // Financial endpoints
    getCostAnalysis: builder.query<APIResponse<any>, { period?: string; granularity?: string }>({
      query: (params) => ({
        url: '/financial/cost-analysis',
        params,
      }),
      providesTags: ['Financial'],
    }),

    getROICalculation: builder.query<APIResponse<any>, any>({
      query: (params) => ({
        url: '/financial/roi-calculation',
        params,
      }),
      providesTags: ['Financial'],
    }),

    // Dashboard endpoints
    getDashboardConfigs: builder.query<APIResponse<any[]>, void>({
      query: () => '/dashboard/configs',
      providesTags: ['Dashboard'],
    }),

    saveDashboardConfig: builder.mutation<APIResponse<any>, any>({
      query: (config) => ({
        url: '/dashboard/configs',
        method: 'POST',
        body: config,
      }),
      invalidatesTags: ['Dashboard'],
    }),

    // Notification endpoints
    getNotifications: builder.query<APIResponse<any[]>, { limit?: number; unread?: boolean }>({
      query: (params) => ({
        url: '/notifications',
        params,
      }),
      providesTags: ['Notification'],
    }),

    markNotificationAsRead: builder.mutation<APIResponse<any>, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'POST',
      }),
      invalidatesTags: ['Notification'],
    }),

    // User endpoints
    getCurrentUser: builder.query<APIResponse<any>, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),

    updateUserProfile: builder.mutation<APIResponse<any>, any>({
      query: (updates) => ({
        url: '/auth/profile',
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useGetSystemHealthQuery,
  useGetSystemStatusQuery,
  useGetAgentsQuery,
  useGetAgentQuery,
  useUpdateAgentConfigMutation,
  useGetWorkflowsQuery,
  useGetWorkflowQuery,
  useCreateWorkflowMutation,
  useExecuteWorkflowMutation,
  useGetIncidentsQuery,
  useGetIncidentQuery,
  useCreateIncidentMutation,
  useUpdateIncidentMutation,
  useGetCostAnalysisQuery,
  useGetROICalculationQuery,
  useGetDashboardConfigsQuery,
  useSaveDashboardConfigMutation,
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useGetCurrentUserQuery,
  useUpdateUserProfileMutation,
} = apiSlice;