import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, AuthState } from '../../types';

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const loginAsync = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string; rememberMe?: boolean }) => {
    // Mock login - in real app, this would call the API
    const mockUsers = [
      {
        id: '1',
        email: 'admin@acso.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        roles: ['admin'],
        permissions: [{ resource: '*', actions: ['*'] }],
      },
      {
        id: '2',
        email: 'security@acso.com',
        password: 'security123',
        firstName: 'Security',
        lastName: 'Manager',
        roles: ['security_manager'],
        permissions: [{ resource: 'security', actions: ['*'] }],
      },
      {
        id: '3',
        email: 'operator@acso.com',
        password: 'operator123',
        firstName: 'System',
        lastName: 'Operator',
        roles: ['operator'],
        permissions: [{ resource: 'agents', actions: ['read'] }],
      },
    ];

    const user = mockUsers.find(
      (u) => u.email === credentials.email && u.password === credentials.password
    );

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const token = 'mock-jwt-token-' + user.id;
    const refreshToken = 'mock-refresh-token-' + user.id;

    // Store in localStorage
    localStorage.setItem('acso-auth-token', token);
    localStorage.setItem('acso-refresh-token', refreshToken);
    localStorage.setItem('acso-user', JSON.stringify(user));

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        permissions: user.permissions,
      },
      token,
      refreshToken,
    };
  }
);

export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async () => {
    const token = localStorage.getItem('acso-auth-token');
    const userStr = localStorage.getItem('acso-user');

    if (!token || !userStr) {
      throw new Error('No authentication found');
    }

    const user = JSON.parse(userStr);
    const refreshToken = localStorage.getItem('acso-refresh-token');

    return {
      user,
      token,
      refreshToken: refreshToken || '',
    };
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isLoading = false;
      state.error = null;
      
      // Clear localStorage
      localStorage.removeItem('acso-auth-token');
      localStorage.removeItem('acso-refresh-token');
      localStorage.removeItem('acso-user');
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    updateToken: (state, action: PayloadAction<{ token: string; refreshToken?: string }>) => {
      state.token = action.payload.token;
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isLoading = false;
        state.error = action.error.message || 'Login failed';
      })
      // Check auth status
      .addCase(checkAuthStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isLoading = false;
        state.error = null;
      });
  },
});

export const {
  logout,
  updateUser,
  updateToken,
  clearError,
} = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectToken = (state: { auth: AuthState }) => state.auth.token;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;