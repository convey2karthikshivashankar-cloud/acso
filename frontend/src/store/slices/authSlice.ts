import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, AuthState } from '../../types';
import { apiClient } from '../../services/apiClient';

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
  async (credentials: { username: string; password: string; rememberMe?: boolean; twoFactorCode?: string }) => {
    const response = await apiClient.post('/auth/login', {
      username: credentials.username,
      password: credentials.password,
      remember_me: credentials.rememberMe || false,
      two_factor_code: credentials.twoFactorCode
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Login failed');
    }

    const { access_token, refresh_token, user, expires_in, must_change_password } = response.data;

    // Store in localStorage
    localStorage.setItem('acso-auth-token', access_token);
    localStorage.setItem('acso-refresh-token', refresh_token);
    localStorage.setItem('acso-user', JSON.stringify(user));

    return {
      user,
      token: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
      mustChangePassword: must_change_password
    };
  }
);

export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async () => {
    const token = localStorage.getItem('acso-auth-token');
    const refreshToken = localStorage.getItem('acso-refresh-token');

    if (!token) {
      throw new Error('No authentication found');
    }

    // Validate token with backend
    try {
      const response = await apiClient.get('/auth/me');
      
      if (!response.success || !response.data) {
        throw new Error('Token validation failed');
      }

      return {
        user: response.data,
        token,
        refreshToken: refreshToken || '',
      };
    } catch (error) {
      // Clear invalid tokens
      localStorage.removeItem('acso-auth-token');
      localStorage.removeItem('acso-refresh-token');
      localStorage.removeItem('acso-user');
      throw error;
    }
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
    setTokens: (state, action: PayloadAction<{ accessToken: string; refreshToken?: string; expiresIn?: number }>) => {
      state.token = action.payload.accessToken;
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
      }
      
      // Update localStorage
      localStorage.setItem('acso-auth-token', action.payload.accessToken);
      if (action.payload.refreshToken) {
        localStorage.setItem('acso-refresh-token', action.payload.refreshToken);
      }
    },
    setCredentials: (state, action: PayloadAction<{ user: User; token: string; refreshToken?: string }>) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
      }
      
      // Update localStorage
      localStorage.setItem('acso-auth-token', action.payload.token);
      localStorage.setItem('acso-user', JSON.stringify(action.payload.user));
      if (action.payload.refreshToken) {
        localStorage.setItem('acso-refresh-token', action.payload.refreshToken);
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
  setTokens,
  setCredentials,
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