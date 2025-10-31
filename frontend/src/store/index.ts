import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

// Import reducers
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import notificationReducer from './slices/notificationSlice';
import dashboardReducer from './slices/dashboardSlice';
import agentsReducer from './slices/agentsSlice';
import websocketReducer from './slices/websocketSlice';

// Import API slices
import { apiSlice } from './api/apiSlice';
import { agentsApi } from './api/agentsApi';

// Import middleware
import { websocketMiddleware } from './middleware/websocketMiddleware';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    notifications: notificationReducer,
    dashboard: dashboardReducer,
    agents: agentsReducer,
    websocket: websocketReducer,
    // Add the API slices
    [apiSlice.reducerPath]: apiSlice.reducer,
    [agentsApi.reducerPath]: agentsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST', 
          'persist/REHYDRATE',
          // Ignore RTK Query actions
          'agentsApi/executeQuery/pending',
          'agentsApi/executeQuery/fulfilled',
          'agentsApi/executeQuery/rejected',
        ],
        ignoredPaths: [
          'api', 
          'agentsApi',
          // Ignore WebSocket message timestamps
          'agents.realTimeUpdates',
        ],
      },
    })
    .concat(apiSlice.middleware)
    .concat(agentsApi.middleware)
    .concat(websocketMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

// Setup listeners for RTK Query
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export hooks
export { useAppDispatch, useAppSelector } from './hooks';