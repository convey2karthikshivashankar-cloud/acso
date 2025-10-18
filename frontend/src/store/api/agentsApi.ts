import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import type { 
  Agent, 
  AgentSummary, 
  AgentConfiguration, 
  AgentActionRequest,
  AgentActionResponse,
  AgentLogEntry,
  AgentTask,
  AgentStatistics,
  APIResponse 
} from '../../types/api';

// Agent API slice with WebSocket integration
export const agentsApi = createApi({
  reducerPath: 'agentsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/agents',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      headers.set('content-type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Agent', 'AgentLogs', 'AgentTasks', 'AgentStats'],
  endpoints: (builder) => ({
    // Get all agents with filtering
    getAgents: builder.query<APIResponse<AgentSummary[]>, {
      type?: string;
      status?: string;
      tags?: string[];
      healthy?: boolean;
      name_contains?: string;
      limit?: number;
      offset?: number;
    }>({
      query: (params = {}) => ({
        url: '',
        params,
      }),
      providesTags: ['Agent'],
      // Enable optimistic updates
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
        } catch (error) {
          // Handle error
          console.error('Failed to fetch agents:', error);
        }
      },
    }),

    // Get single agent
    getAgent: builder.query<APIResponse<Agent>, string>({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'Agent', id }],
    }),

    // Create new agent
    createAgent: builder.mutation<APIResponse<Agent>, {
      name: string;
      type: string;
      description?: string;
      configuration?: AgentConfiguration;
      tags?: string[];
      auto_start?: boolean;
    }>({
      query: (agentData) => ({
        url: '',
        method: 'POST',
        body: agentData,
      }),
      invalidatesTags: ['Agent'],
      // Optimistic update
      onQueryStarted: async (agentData, { dispatch, queryFulfilled }) => {
        const patchResult = dispatch(
          agentsApi.util.updateQueryData('getAgents', {}, (draft) => {
            // Add optimistic agent entry
            const optimisticAgent: AgentSummary = {
              id: `temp-${Date.now()}`,
              name: agentData.name,
              type: agentData.type,
              status: 'starting',
              healthy: false,
              tasks_completed: 0,
              error_rate: 0,
              uptime: 0,
              tags: agentData.tags || [],
            };
            if (draft.data) {
              draft.data.push(optimisticAgent);
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    // Update agent
    updateAgent: builder.mutation<APIResponse<Agent>, {
      id: string;
      name?: string;
      description?: string;
      configuration?: AgentConfiguration;
      tags?: string[];
    }>({
      query: ({ id, ...updateData }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: updateData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Agent', id },
        'Agent',
      ],
    }),

    // Delete agent
    deleteAgent: builder.mutation<APIResponse<{ message: string }>, string>({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Agent'],
      // Optimistic update
      onQueryStarted: async (id, { dispatch, queryFulfilled }) => {
        const patchResult = dispatch(
          agentsApi.util.updateQueryData('getAgents', {}, (draft) => {
            if (draft.data) {
              draft.data = draft.data.filter(agent => agent.id !== id);
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    // Agent control actions
    startAgent: builder.mutation<APIResponse<AgentActionResponse>, string>({
      query: (id) => ({
        url: `/${id}/start`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Agent', id }],
      // Optimistic update
      onQueryStarted: async (id, { dispatch, queryFulfilled }) => {
        const patchResult = dispatch(
          agentsApi.util.updateQueryData('getAgents', {}, (draft) => {
            const agent = draft.data?.find(a => a.id === id);
            if (agent) {
              agent.status = 'starting';
            }
          })
        );

        try {
          const { data } = await queryFulfilled;
          dispatch(
            agentsApi.util.updateQueryData('getAgents', {}, (draft) => {
              const agent = draft.data?.find(a => a.id === id);
              if (agent && data.data?.success) {
                agent.status = 'running';
                agent.healthy = true;
              }
            })
          );
        } catch {
          patchResult.undo();
        }
      },
    }),

    stopAgent: builder.mutation<APIResponse<AgentActionResponse>, string>({
      query: (id) => ({
        url: `/${id}/stop`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Agent', id }],
      // Optimistic update
      onQueryStarted: async (id, { dispatch, queryFulfilled }) => {
        const patchResult = dispatch(
          agentsApi.util.updateQueryData('getAgents', {}, (draft) => {
            const agent = draft.data?.find(a => a.id === id);
            if (agent) {
              agent.status = 'stopping';
            }
          })
        );

        try {
          const { data } = await queryFulfilled;
          dispatch(
            agentsApi.util.updateQueryData('getAgents', {}, (draft) => {
              const agent = draft.data?.find(a => a.id === id);
              if (agent && data.data?.success) {
                agent.status = 'stopped';
                agent.healthy = false;
              }
            })
          );
        } catch {
          patchResult.undo();
        }
      },
    }),

    restartAgent: builder.mutation<APIResponse<AgentActionResponse>, string>({
      query: (id) => ({
        url: `/${id}/restart`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Agent', id }],
    }),

    executeAgentAction: builder.mutation<APIResponse<AgentActionResponse>, {
      id: string;
      action: AgentActionRequest;
    }>({
      query: ({ id, action }) => ({
        url: `/${id}/actions`,
        method: 'POST',
        body: action,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Agent', id }],
    }),

    // Agent logs with real-time updates
    getAgentLogs: builder.query<APIResponse<AgentLogEntry[]>, {
      id: string;
      limit?: number;
      level?: string;
      start_time?: string;
      end_time?: string;
    }>({
      query: ({ id, ...params }) => ({
        url: `/${id}/logs`,
        params,
      }),
      providesTags: (result, error, { id }) => [{ type: 'AgentLogs', id }],
      // Keep data fresh
      keepUnusedDataFor: 30, // 30 seconds
    }),

    // Agent tasks
    getAgentTasks: builder.query<APIResponse<AgentTask[]>, {
      id: string;
      status?: string;
      limit?: number;
    }>({
      query: ({ id, ...params }) => ({
        url: `/${id}/tasks`,
        params,
      }),
      providesTags: (result, error, { id }) => [{ type: 'AgentTasks', id }],
    }),

    // System statistics
    getAgentStatistics: builder.query<APIResponse<AgentStatistics>, void>({
      query: () => '/statistics',
      providesTags: ['AgentStats'],
      // Refetch every 30 seconds
      pollingInterval: 30000,
    }),
  }),
});

// Export hooks
export const {
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
} = agentsApi;

// Export utility functions for manual cache updates
export const {
  updateQueryData: updateAgentsQueryData,
  invalidateTags: invalidateAgentsTags,
} = agentsApi.util;