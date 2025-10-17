import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Notification } from '../../types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  settings: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
    email: boolean;
  };
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  settings: {
    enabled: true,
    sound: true,
    desktop: true,
    email: true,
  },
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        read: false,
      };
      
      state.notifications.unshift(notification);
      state.unreadCount += 1;

      // Keep only last 100 notifications
      if (state.notifications.length > 100) {
        state.notifications = state.notifications.slice(0, 100);
      }
    },

    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },

    markAllAsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.read = true;
      });
      state.unreadCount = 0;
    },

    removeNotification: (state, action: PayloadAction<string>) => {
      const index = state.notifications.findIndex(n => n.id === action.payload);
      if (index !== -1) {
        const notification = state.notifications[index];
        if (!notification.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications.splice(index, 1);
      }
    },

    clearAllNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },

    updateSettings: (state, action: PayloadAction<Partial<NotificationState['settings']>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },

    // Bulk operations
    addMultipleNotifications: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>[]>) => {
      const notifications = action.payload.map(notif => ({
        ...notif,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        read: false,
      }));

      state.notifications.unshift(...notifications);
      state.unreadCount += notifications.length;

      // Keep only last 100 notifications
      if (state.notifications.length > 100) {
        state.notifications = state.notifications.slice(0, 100);
      }
    },

    markMultipleAsRead: (state, action: PayloadAction<string[]>) => {
      action.payload.forEach(id => {
        const notification = state.notifications.find(n => n.id === id);
        if (notification && !notification.read) {
          notification.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      });
    },

    removeMultiple: (state, action: PayloadAction<string[]>) => {
      action.payload.forEach(id => {
        const index = state.notifications.findIndex(n => n.id === id);
        if (index !== -1) {
          const notification = state.notifications[index];
          if (!notification.read) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
          state.notifications.splice(index, 1);
        }
      });
    },
  },
});

export const {
  addNotification,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearAllNotifications,
  updateSettings,
  addMultipleNotifications,
  markMultipleAsRead,
  removeMultiple,
} = notificationSlice.actions;

export default notificationSlice.reducer;

// Selectors
export const selectNotifications = (state: { notifications: NotificationState }) => 
  state.notifications.notifications;

export const selectUnreadCount = (state: { notifications: NotificationState }) => 
  state.notifications.unreadCount;

export const selectNotificationSettings = (state: { notifications: NotificationState }) => 
  state.notifications.settings;

export const selectUnreadNotifications = (state: { notifications: NotificationState }) => 
  state.notifications.notifications.filter(n => !n.read);

export const selectNotificationsByType = (state: { notifications: NotificationState }, type: string) => 
  state.notifications.notifications.filter(n => n.type === type);