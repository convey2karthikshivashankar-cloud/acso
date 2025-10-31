import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface WebSocketState {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastError: string | null;
  subscriptions: string[];
  messageQueue: any[];
  reconnectAttempts: number;
  lastHeartbeat: number | null;
}

const initialState: WebSocketState = {
  isConnected: false,
  connectionStatus: 'disconnected',
  lastError: null,
  subscriptions: [],
  messageQueue: [],
  reconnectAttempts: 0,
  lastHeartbeat: null
};

const websocketSlice = createSlice({
  name: 'websocket',
  initialState,
  reducers: {
    connectionStarted: (state) => {
      state.connectionStatus = 'connecting';
      state.lastError = null;
    },
    
    connectionEstablished: (state) => {
      state.isConnected = true;
      state.connectionStatus = 'connected';
      state.reconnectAttempts = 0;
      state.lastError = null;
      state.lastHeartbeat = Date.now();
    },
    
    connectionLost: (state, action: PayloadAction<string>) => {
      state.isConnected = false;
      state.connectionStatus = 'disconnected';
      state.lastError = action.payload;
      state.reconnectAttempts += 1;
    },
    
    connectionError: (state, action: PayloadAction<string>) => {
      state.isConnected = false;
      state.connectionStatus = 'error';
      state.lastError = action.payload;
    },
    
    subscriptionAdded: (state, action: PayloadAction<string>) => {
      if (!state.subscriptions.includes(action.payload)) {
        state.subscriptions.push(action.payload);
      }
    },
    
    subscriptionRemoved: (state, action: PayloadAction<string>) => {
      state.subscriptions = state.subscriptions.filter(
        sub => sub !== action.payload
      );
    },
    
    messageQueued: (state, action: PayloadAction<any>) => {
      state.messageQueue.push(action.payload);
    },
    
    messageQueueCleared: (state) => {
      state.messageQueue = [];
    },
    
    heartbeatReceived: (state) => {
      state.lastHeartbeat = Date.now();
    },
    
    resetReconnectAttempts: (state) => {
      state.reconnectAttempts = 0;
    }
  }
});

export const {
  connectionStarted,
  connectionEstablished,
  connectionLost,
  connectionError,
  subscriptionAdded,
  subscriptionRemoved,
  messageQueued,
  messageQueueCleared,
  heartbeatReceived,
  resetReconnectAttempts
} = websocketSlice.actions;

export default websocketSlice.reducer;