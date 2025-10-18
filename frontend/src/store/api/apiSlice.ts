import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import { logout, setCredentials } from '../slices/authSlice';
import { APIResponse } from '../../types/api';

// Enhanced base query with automatic token refresh
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const baseQuery = fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      
      // Add request ID for tracking
      headers.set('X-Request-ID', `rtk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
      
      // Add timestamp
      headers.set('X-Request-Time', new Date().toISOString());
      
      return headers;
    },
  });

  let result = await baseQuery(args, api, extraOptions);

  // Handle token refresh on 401
  if (result.error && result.error.status === 401) {
    const refreshToken = (api.getState() as RootState).auth.refreshToken;
    
    if (refreshToken) {
      // Try to refresh the token
      const refreshResult = await baseQuery(
        {
          url: 'auth/refresh',
          method: 'POST',
          body: { refresh_token: refreshToken },
        },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        const response = refreshResult.data as APIResponse<{
          access_token: string;
          expires_in: number;
          user: any;
        }>;
        
        if (response.success && response.data) {
          // Store the new token
          api.dispatch(setCredentials({
            user: response.data.user,
            token: response.data.access_token,
            refreshToken: refreshToken, // Keep the same refresh token
          }));

          // Retry the original query with new token
          result = await baseQuery(args, api, extraOptions);
        } else {
          api.dispatch(logout());
        }
      } else {
        api.dispatch(logout());
      }
    } else {
      api.dispatch(logout());
    }
  }

  return result;
};

// Define a service using a base URL and expected endpoints
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Agent', 'Workflow', 'Incident', 'User', 'Financial', 'System'],
  endpoints: (builder) => ({
    // Auth endpoints
    login: builder.mutation<APIResponse<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
      user: any;
      permissions: string[];
      must_change_password: boolean;
    }>, {
      username: string;
      password: string;
      remember_me?: boolean;
      two_factor_code?: string;
    }>({
      query: (credentials) => ({
        url: 'auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    
    logout: builder.mutation<APIResponse<{ message: string }>, {
      refresh_token?: string;
      logout_all_devices?: boolean;
    }>({
      query: (body) => ({
        url: 'auth/logout',
        method: 'POST',
        body,
      }),
    }),
    
    refreshToken: builder.mutation<APIResponse<{
      access_token: string;
      expires_in: number;
    }>, {
      refresh_token: string;
    }>({
      query: (body) => ({
        url: 'auth/refresh',
        method: 'POST',
        body,
      }),
    }),
    
    changePassword: builder.mutation<APIResponse<{ message: string }>, {
      current_password: string;
      new_password: string;
      confirm_password: string;
    }>({
      query: (body) => ({
        url: 'auth/change-password',
        method: 'POST',
        body,
      }),
    }),
    
    setupTwoFactor: builder.mutation<APIResponse<{
      secret_key: string;
      qr_code_url: string;
      backup_codes: string[];
    }>, void>({
      query: () => ({
        url: 'auth/setup-2fa',
        method: 'POST',
      }),
    }),
    
    verifyTwoFactor: builder.mutation<APIResponse<{ message: string }>, {
      code: string;
    }>({
      query: (body) => ({
        url: 'auth/verify-2fa',
        method: 'POST',
        body,
      }),
    }),
    
    // User management endpoints
    getUsers: builder.query<APIResponse<any[]>, {
      role?: string;
      status?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }>({
      query: (params) => ({
        url: 'auth/users',
        params,
      }),
      providesTags: ['User'],
    }),
    
    getUser: builder.query<APIResponse<any>, string>({
      query: (id) => `auth/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
    
    createUser: builder.mutation<APIResponse<any>, {
      username: string;
      email: string;
      full_name: string;
      password: string;
      role: string;
      permissions?: string[];
      send_welcome_email?: boolean;
      must_change_password?: boolean;
    }>({
      query: (body) => ({
        url: 'auth/users',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    
    updateUser: builder.mutation<APIResponse<any>, {
      id: string;
      email?: string;
      full_name?: string;
      role?: string;
      permissions?: string[];
      status?: string;
      preferences?: Record<string, any>;
      metadata?: Record<string, any>;
    }>({
      query: ({ id, ...body }) => ({
        url: `auth/users/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }],
    }),
    
    deleteUser: builder.mutation<APIResponse<{ message: string }>, string>({
      query: (id) => ({
        url: `auth/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
    
    // Agent endpoints
    getAgents: builder.query<APIResponse<any[]>, {
      type?: string;
      status?: string;
      tags?: string[];
      healthy?: boolean;
      name_contains?: string;
      limit?: number;
      offset?: number;
    }>({
      query: (params) => ({
        url: 'agents',
        params,
      }),
      providesTags: ['Agent'],
    }),
    
    getAgent: builder.query<APIResponse<any>, string>({
      query: (id) => `agents/${id}`,
      providesTags: (result, error, id) => [{ type: 'Agent', id }],
    }),
    
    createAgent: builder.mutation<APIResponse<any>, {
      name: string;
      type: string;
      description?: string;
      configuration?: any;
      tags?: string[];
      auto_start?: boolean;
    }>({
      query: (body) => ({
        url: 'agents',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Agent'],
    }),
    
    updateAgent: builder.mutation<APIResponse<any>, {
      id: string;
      name?: string;
      description?: string;
      configuration?: any;
      tags?: string[];
    }>({
      query: ({ id, ...body }) => ({
        url: `agents/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Agent', id }],
    }),
    
    deleteAgent: builder.mutation<APIResponse<{ message: string }>, string>({
      query: (id) => ({
        url: `agents/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Agent'],
    }),
    
    startAgent: builder.mutation<APIResponse<{
      action: string;
      success: boolean;
      message: string;
      execution_time: number;
    }>, string>({
      query: (id) => ({
        url: `agents/${id}/start`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Agent', id }],
    }),
    
    stopAgent: builder.mutation<APIResponse<{
      action: string;
      success: boolean;
      message: string;
      execution_time: number;
    }>, string>({
      query: (id) => ({
        url: `agents/${id}/stop`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Agent', id }],
    }),
    
    restartAgent: builder.mutation<APIResponse<{
      action: string;
      success: boolean;
      message: string;
      execution_time: number;
    }>, string>({
      query: (id) => ({
        url: `agents/${id}/restart`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Agent', id }],
    }),
    
    executeAgentAction: builder.mutation<APIResponse<{
      action: string;
      success: boolean;
      message: string;
      data?: any;
      execution_time: number;
    }>, {
      id: string;
      action: string;
      parameters?: Record<string, any>;
      timeout?: number;
    }>({
      query: ({ id, ...body }) => ({
        url: `agents/${id}/actions`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Agent', id }],
    }),
    
    getAgentLogs: builder.query<APIResponse<any[]>, {
      id: string;
      limit?: number;
      level?: string;
      start_time?: string;
      end_time?: string;
    }>({
      query: ({ id, ...params }) => ({
        url: `agents/${id}/logs`,
        params,
      }),
    }),
    
    getAgentTasks: builder.query<APIResponse<any[]>, {
      id: string;
      status?: string;
      limit?: number;
    }>({
      query: ({ id, ...params }) => ({
        url: `agents/${id}/tasks`,
        params,
      }),
    }),
    
    getAgentStatistics: builder.query<APIResponse<{
      total_agents: number;
      running_agents: number;
      healthy_agents: number;
      agents_by_type: Record<string, number>;
      agents_by_status: Record<string, number>;
      total_tasks_completed: number;
      average_error_rate: number;
      system_uptime: number;
    }>, void>({
      query: () => 'agents/statistics',
      providesTags: ['Agent'],
    }),
    
    // Workflow endpoints
    getWorkflows: builder.query<APIResponse<any[]>, {
      status?: string;
      type?: string;
      limit?: number;
      offset?: number;
    }>({
      query: (params) => ({
        url: 'workflows',
        params,
      }),
      providesTags: ['Workflow'],
    }),
    
    getWorkflow: builder.query<APIResponse<any>, string>({
      query: (id) => `workflows/${id}`,
      providesTags: (result, error, id) => [{ type: 'Workflow', id }],
    }),
    
    createWorkflow: builder.mutation<APIResponse<any>, {
      name: string;
      description?: string;
      definition: any;
      tags?: string[];
    }>({
      query: (body) => ({
        url: 'workflows',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Workflow'],
    }),
    
    updateWorkflow: builder.mutation<APIResponse<any>, {
      id: string;
      name?: string;
      description?: string;
      definition?: any;
      tags?: string[];
    }>({
      query: ({ id, ...body }) => ({
        url: `workflows/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Workflow', id }],
    }),
    
    deleteWorkflow: builder.mutation<APIResponse<{ message: string }>, string>({
      query: (id) => ({
        url: `workflows/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Workflow'],
    }),
    
    executeWorkflow: builder.mutation<APIResponse<{
      execution_id: string;
      status: string;
      started_at: string;
    }>, {
      id: string;
      parameters?: Record<string, any>;
    }>({
      query: ({ id, ...body }) => ({
        url: `workflows/${id}/execute`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Workflow', id }],
    }),
    
    // Incident endpoints
    getIncidents: builder.query<APIResponse<any[]>, {
      status?: string;
      severity?: string;
      assigned_to?: string;
      limit?: number;
      offset?: number;
    }>({
      query: (params) => ({
        url: 'incidents',
        params,
      }),
      providesTags: ['Incident'],
    }),
    
    getIncident: builder.query<APIResponse<any>, string>({
      query: (id) => `incidents/${id}`,
      providesTags: (result, error, id) => [{ type: 'Incident', id }],
    }),
    
    createIncident: builder.mutation<APIResponse<any>, {
      title: string;
      description: string;
      severity: string;
      type?: string;
      assigned_to?: string;
      tags?: string[];
    }>({
      query: (body) => ({
        url: 'incidents',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Incident'],
    }),
    
    updateIncident: builder.mutation<APIResponse<any>, {
      id: string;
      title?: string;
      description?: string;
      status?: string;
      severity?: string;
      assigned_to?: string;
      tags?: string[];
    }>({
      query: ({ id, ...body }) => ({
        url: `incidents/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Incident', id }],
    }),
    
    // Financial endpoints
    getFinancialData: builder.query<APIResponse<any>, {
      start_date?: string;
      end_date?: string;
      granularity?: string;
    }>({
      query: (params) => ({
        url: 'financial/data',
        params,
      }),
      providesTags: ['Financial'],
    }),
    
    calculateROI: builder.mutation<APIResponse<{
      roi_percentage: number;
      total_investment: number;
      total_return: number;
      payback_period: number;
      net_present_value: number;
    }>, {
      investment_amount: number;
      time_period: number;
      expected_savings: number;
      discount_rate?: number;
    }>({
      query: (body) => ({
        url: 'financial/roi',
        method: 'POST',
        body,
      }),
    }),
    
    getBudgetData: builder.query<APIResponse<any>, {
      year?: number;
      quarter?: number;
      category?: string;
    }>({
      query: (params) => ({
        url: 'financial/budget',
        params,
      }),
      providesTags: ['Financial'],
    }),
    
    // System endpoints
    getSystemHealth: builder.query<APIResponse<{
      status: string;
      uptime: number;
      version: string;
      components: Record<string, any>;
    }>, void>({
      query: () => 'system/health',
      providesTags: ['System'],
    }),
    
    getSystemMetrics: builder.query<APIResponse<{
      cpu_usage: number;
      memory_usage: number;
      disk_usage: number;
      network_io: any;
      active_connections: number;
    }>, void>({
      query: () => 'system/metrics',
      providesTags: ['System'],
    }),
    
    // Current user endpoints
    getCurrentUser: builder.query<APIResponse<any>, void>({
      query: () => 'auth/me',
      providesTags: ['User'],
    }),
    
    updateProfile: builder.mutation<APIResponse<any>, {
      email?: string;
      full_name?: string;
      preferences?: Record<string, any>;
    }>({
      query: (body) => ({
        url: 'auth/me',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  // Auth hooks
  useLoginMutation,
  useLogoutMutation,
  useRefreshTokenMutation,
  useChangePasswordMutation,
  useSetupTwoFactorMutation,
  useVerifyTwoFactorMutation,
  
  // User management hooks
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  
  // Agent hooks
  useGetAgentsQuery,
  useGetAgentQuery,
  useCreateAgentMutation,
  useUpdateAgentMutation,
  useDeleteAgentMutation,
  useStartAgentMutation,
  useStopAgentMutation,
  useRestartAgentMutation,
  useExecuteAgentActionMutation,
  useGetAgentLogsQuery,
  useGetAgentTasksQuery,
  useGetAgentStatisticsQuery,
  
  // Workflow hooks
  useGetWorkflowsQuery,
  useGetWorkflowQuery,
  useCreateWorkflowMutation,
  useUpdateWorkflowMutation,
  useDeleteWorkflowMutation,
  useExecuteWorkflowMutation,
  
  // Incident hooks
  useGetIncidentsQuery,
  useGetIncidentQuery,
  useCreateIncidentMutation,
  useUpdateIncidentMutation,
  
  // Financial hooks
  useGetFinancialDataQuery,
  useCalculateROIMutation,
  useGetBudgetDataQuery,
  
  // System hooks
  useGetSystemHealthQuery,
  useGetSystemMetricsQuery,
  
  // Current user hooks
  useGetCurrentUserQuery,
  useUpdateProfileMutation,
} = apiSlice;