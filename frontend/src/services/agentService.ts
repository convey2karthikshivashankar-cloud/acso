/**
 * Agent management service for ACSO frontend.
 */

import { apiClient } from './apiClient';
import {
  APIResponse,
  PaginatedResponse,
  Agent,
  AgentConfiguration,
  AgentMetrics,
  Task,
  AgentStatus,
  AgentType
} from '../types/api';

export interface LogQueryParams {
  level?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  start_time?: Date;
  end_time?: Date;
  limit?: number;
  stream?: boolean;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  source: string;
  metadata?: Record<string, any>;
}

export interface TaskQueryParams {
  status?: string;
  limit?: number;
  offset?: number;
}

export interface MetricsQueryParams {
  start_time?: Date;
  end_time?: Date;
  granularity?: '1m' | '5m' | '1h' | '1d';
}

class AgentService {
  private readonly basePath = '/agents';

  /**
   * Get all agents with optional filtering
   */
  async getAgents(params?: {
    status?: AgentStatus;
    agent_type?: AgentType;
  }): Promise<APIResponse<Agent[]>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.agent_type) queryParams.append('agent_type', params.agent_type);
    
    const url = `${this.basePath}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get<Agent[]>(url);
  }

  /**
   * Get detailed information about a specific agent
   */
  async getAgent(agentId: string): Promise<APIResponse<Agent>> {
    return apiClient.get<Agent>(`${this.basePath}/${agentId}`);
  }

  /**
   * Update agent configuration
   */
  async updateAgentConfiguration(
    agentId: string,
    config: Record<string, any>
  ): Promise<APIResponse<AgentConfiguration>> {
    return apiClient.put<AgentConfiguration>(
      `${this.basePath}/${agentId}/configuration`,
      config
    );
  }

  /**
   * Start an agent
   */
  async startAgent(agentId: string): Promise<APIResponse<{ message: string; result: any }>> {
    return apiClient.post<{ message: string; result: any }>(
      `${this.basePath}/${agentId}/start`
    );
  }

  /**
   * Stop an agent
   */
  async stopAgent(agentId: string): Promise<APIResponse<{ message: string; result: any }>> {
    return apiClient.post<{ message: string; result: any }>(
      `${this.basePath}/${agentId}/stop`
    );
  }

  /**
   * Restart an agent
   */
  async restartAgent(agentId: string): Promise<APIResponse<{ message: string; result: any }>> {
    return apiClient.post<{ message: string; result: any }>(
      `${this.basePath}/${agentId}/restart`
    );
  }

  /**
   * Get agent logs with optional filtering
   */
  async getAgentLogs(
    agentId: string,
    params?: LogQueryParams
  ): Promise<APIResponse<LogEntry[]> | EventSource> {
    const queryParams = new URLSearchParams();
    if (params?.level) queryParams.append('level', params.level);
    if (params?.start_time) queryParams.append('start_time', params.start_time.toISOString());
    if (params?.end_time) queryParams.append('end_time', params.end_time.toISOString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.stream) queryParams.append('stream', 'true');

    const url = `${this.basePath}/${agentId}/logs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    if (params?.stream) {
      // Return EventSource for streaming logs
      return new EventSource(`${apiClient['baseURL']}${url}`, {
        withCredentials: true
      });
    } else {
      return apiClient.get<LogEntry[]>(url);
    }
  }

  /**
   * Get agent performance metrics
   */
  async getAgentMetrics(
    agentId: string,
    params?: MetricsQueryParams
  ): Promise<APIResponse<AgentMetrics[]>> {
    const queryParams = new URLSearchParams();
    if (params?.start_time) queryParams.append('start_time', params.start_time.toISOString());
    if (params?.end_time) queryParams.append('end_time', params.end_time.toISOString());
    if (params?.granularity) queryParams.append('granularity', params.granularity);

    const url = `${this.basePath}/${agentId}/metrics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get<AgentMetrics[]>(url);
  }

  /**
   * Get tasks assigned to an agent
   */
  async getAgentTasks(
    agentId: string,
    params?: TaskQueryParams
  ): Promise<APIResponse<PaginatedResponse<Task>>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const url = `${this.basePath}/${agentId}/tasks${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get<PaginatedResponse<Task>>(url);
  }

  /**
   * Assign a new task to an agent
   */
  async assignTaskToAgent(
    agentId: string,
    taskData: Record<string, any>
  ): Promise<APIResponse<Task>> {
    return apiClient.post<Task>(`${this.basePath}/${agentId}/tasks`, taskData);
  }

  /**
   * Get agent health status
   */
  async getAgentHealth(agentId: string): Promise<APIResponse<Record<string, any>>> {
    return apiClient.get<Record<string, any>>(`${this.basePath}/${agentId}/health`);
  }

  /**
   * Get real-time agent status updates via WebSocket
   */
  createAgentStatusStream(agentId: string): WebSocket {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/agents/${agentId}/status`;
    return new WebSocket(wsUrl);
  }

  /**
   * Get aggregated metrics for all agents
   */
  async getSystemMetrics(params?: MetricsQueryParams): Promise<APIResponse<Record<string, any>>> {
    const queryParams = new URLSearchParams();
    if (params?.start_time) queryParams.append('start_time', params.start_time.toISOString());
    if (params?.end_time) queryParams.append('end_time', params.end_time.toISOString());
    if (params?.granularity) queryParams.append('granularity', params.granularity);

    const url = `${this.basePath}/system/metrics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get<Record<string, any>>(url);
  }

  /**
   * Get agent topology and relationships
   */
  async getAgentTopology(): Promise<APIResponse<Record<string, any>>> {
    return apiClient.get<Record<string, any>>(`${this.basePath}/topology`);
  }

  /**
   * Execute a command on an agent
   */
  async executeAgentCommand(
    agentId: string,
    command: string,
    params?: Record<string, any>
  ): Promise<APIResponse<any>> {
    return apiClient.post<any>(`${this.basePath}/${agentId}/execute`, {
      command,
      params: params || {}
    });
  }

  /**
   * Get agent configuration schema
   */
  async getAgentConfigurationSchema(agentType: AgentType): Promise<APIResponse<Record<string, any>>> {
    return apiClient.get<Record<string, any>>(`${this.basePath}/schema/${agentType}`);
  }

  /**
   * Validate agent configuration
   */
  async validateAgentConfiguration(
    agentType: AgentType,
    config: Record<string, any>
  ): Promise<APIResponse<{ valid: boolean; errors?: string[] }>> {
    return apiClient.post<{ valid: boolean; errors?: string[] }>(
      `${this.basePath}/validate/${agentType}`,
      config
    );
  }
}

export const agentService = new AgentService();