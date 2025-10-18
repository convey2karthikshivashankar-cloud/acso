import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Agent, AgentSummary } from '../../types/api';

// WebSocket message types for agents
export interface AgentWebSocketMessage {
  type: 'agent_status_update' | 'agent_metrics_update' | 'agent_log_entry' | 'agent_task_update';
  data: {
    agent_id: string;
    [key: string]: any;
  };
}

// Agent slice state
export interface AgentsState {
  // Real-time data from WebSocket
  realTimeUpdates: {
    [agentId: string]: {
      lastUpdate: string;
      status?: string;
      metrics?: any;
      health?: any;
    };
  };
  
  // UI state
  selectedAgentId: string | null;
  viewMode: 'grid' | 'list' | 'topology';
  filters: {
    type?: string;
    status?: string;
    healthy?: boolean;
    search?: string;
    tags?: string[];
  };
  
  // WebSocket connection state
  wsConnected: boolean;
  wsSubscriptions: string[];
  
  // Agent management state
  bulkOperations: {
    selectedAgents: string[];
    operation: 'start' | 'stop' | 'restart' | 'delete' | null;
    inProgress: boolean;
  };
  
  // Configuration management
  configurationHistory: {
    [agentId: string]: {
      versions: Array<{
        version: number;
        timestamp: string;
        configuration: any;
        author: string;
      }>;
      currentVersion: number;
    };
  };
}

const initialState: AgentsState = {
  realTimeUpdates: {},
  selectedAgentId: null,
  viewMode: 'grid',
  filters: {},
  wsConnected: false,
  wsSubscriptions: [],
  bulkOperations: {
    selectedAgents: [],
    operation: null,
    inProgress: false,
  },
  configurationHistory: {},
};

const agentsSlice = createSlice({
  name: 'agents',
  initialState,
  reducers: {
    // WebSocket connection management
    setWebSocketConnected: (state, action: PayloadAction<boolean>) => {
      state.wsConnected = action.payload;
    },
    
    addWebSocketSubscription: (state, action: PayloadAction<string>) => {
      if (!state.wsSubscriptions.includes(action.payload)) {
        state.wsSubscriptions.push(action.payload);
      }
    },
    
    removeWebSocketSubscription: (state, action: PayloadAction<string>) => {
      state.wsSubscriptions = state.wsSubscriptions.filter(
        sub => sub !== action.payload
      );
    },
    
    // Real-time updates from WebSocket
    handleWebSocketMessage: (state, action: PayloadAction<AgentWebSocketMessage>) => {
      const { type, data } = action.payload;
      const { agent_id } = data;
      
      if (!state.realTimeUpdates[agent_id]) {
        state.realTimeUpdates[agent_id] = {
          lastUpdate: new Date().toISOString(),
        };
      }
      
      const agentUpdate = state.realTimeUpdates[agent_id];
      agentUpdate.lastUpdate = new Date().toISOString();
      
      switch (type) {
        case 'agent_status_update':
          agentUpdate.status = data.status;
          agentUpdate.health = data.health;
          break;
        case 'agent_metrics_update':
          agentUpdate.metrics = data.metrics;
          break;
        case 'agent_log_entry':
          // Log entries are handled separately, just update timestamp
          break;
        case 'agent_task_update':
          // Task updates are handled separately, just update timestamp
          break;
      }
    },
    
    // UI state management
    setSelectedAgent: (state, action: PayloadAction<string | null>) => {
      state.selectedAgentId = action.payload;
    },
    
    setViewMode: (state, action: PayloadAction<'grid' | 'list' | 'topology'>) => {
      state.viewMode = action.payload;
    },
    
    setFilters: (state, action: PayloadAction<Partial<AgentsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    clearFilters: (state) => {
      state.filters = {};
    },
    
    // Bulk operations
    setBulkSelectedAgents: (state, action: PayloadAction<string[]>) => {
      state.bulkOperations.selectedAgents = action.payload;
    },
    
    addToBulkSelection: (state, action: PayloadAction<string>) => {
      if (!state.bulkOperations.selectedAgents.includes(action.payload)) {
        state.bulkOperations.selectedAgents.push(action.payload);
      }
    },
    
    removeFromBulkSelection: (state, action: PayloadAction<string>) => {
      state.bulkOperations.selectedAgents = state.bulkOperations.selectedAgents.filter(
        id => id !== action.payload
      );
    },
    
    clearBulkSelection: (state) => {
      state.bulkOperations.selectedAgents = [];
    },
    
    setBulkOperation: (state, action: PayloadAction<{
      operation: 'start' | 'stop' | 'restart' | 'delete' | null;
      inProgress: boolean;
    }>) => {
      state.bulkOperations.operation = action.payload.operation;
      state.bulkOperations.inProgress = action.payload.inProgress;
    },
    
    // Configuration history management
    addConfigurationVersion: (state, action: PayloadAction<{
      agentId: string;
      configuration: any;
      author: string;
    }>) => {
      const { agentId, configuration, author } = action.payload;
      
      if (!state.configurationHistory[agentId]) {
        state.configurationHistory[agentId] = {
          versions: [],
          currentVersion: 0,
        };
      }
      
      const history = state.configurationHistory[agentId];
      const newVersion = history.versions.length + 1;
      
      history.versions.push({
        version: newVersion,
        timestamp: new Date().toISOString(),
        configuration,
        author,
      });
      
      history.currentVersion = newVersion;
    },
    
    revertToConfigurationVersion: (state, action: PayloadAction<{
      agentId: string;
      version: number;
    }>) => {
      const { agentId, version } = action.payload;
      const history = state.configurationHistory[agentId];
      
      if (history && history.versions.find(v => v.version === version)) {
        history.currentVersion = version;
      }
    },
    
    // Clear real-time data for disconnected agents
    clearRealTimeData: (state, action: PayloadAction<string>) => {
      delete state.realTimeUpdates[action.payload];
    },
    
    // Reset all state
    resetAgentsState: () => initialState,
  },
});

export const {
  setWebSocketConnected,
  addWebSocketSubscription,
  removeWebSocketSubscription,
  handleWebSocketMessage,
  setSelectedAgent,
  setViewMode,
  setFilters,
  clearFilters,
  setBulkSelectedAgents,
  addToBulkSelection,
  removeFromBulkSelection,
  clearBulkSelection,
  setBulkOperation,
  addConfigurationVersion,
  revertToConfigurationVersion,
  clearRealTimeData,
  resetAgentsState,
} = agentsSlice.actions;

export default agentsSlice.reducer;

// Selectors
export const selectAgentsState = (state: { agents: AgentsState }) => state.agents;
export const selectSelectedAgentId = (state: { agents: AgentsState }) => state.agents.selectedAgentId;
export const selectViewMode = (state: { agents: AgentsState }) => state.agents.viewMode;
export const selectFilters = (state: { agents: AgentsState }) => state.agents.filters;
export const selectWebSocketConnected = (state: { agents: AgentsState }) => state.agents.wsConnected;
export const selectBulkOperations = (state: { agents: AgentsState }) => state.agents.bulkOperations;
export const selectRealTimeUpdates = (state: { agents: AgentsState }) => state.agents.realTimeUpdates;
export const selectConfigurationHistory = (state: { agents: AgentsState }) => state.agents.configurationHistory;