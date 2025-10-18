import { LoginCredentials, User, AuthProvider } from '../types';
import { apiClient } from './apiClient';

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

class AuthService {
  private tokenKey = 'acso_token';
  private refreshTokenKey = 'acso_refresh_token';
  private userKey = 'acso_user';

  // Login with credentials
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    
    if (response.success && response.data) {
      this.setTokens(response.data.access_token, response.data.refresh_token);
      this.setUser(response.data.user);
      return {
        user: response.data.user,
        token: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in
      };
    }
    
    throw new Error(response.error?.message || 'Login failed');
  }

  // OAuth login (placeholder - not implemented in backend yet)
  async loginWithOAuth(provider: string, code: string, state?: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/oauth/callback', {
      provider,
      code,
      state,
    });
    
    if (response.success && response.data) {
      this.setTokens(response.data.access_token, response.data.refresh_token);
      this.setUser(response.data.user);
      return {
        user: response.data.user,
        token: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in
      };
    }
    
    throw new Error(response.error?.message || 'OAuth login failed');
  }

  // SAML login (placeholder - not implemented in backend yet)
  async loginWithSAML(samlResponse: string, relayState?: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/saml/callback', {
      samlResponse,
      relayState,
    });
    
    if (response.success && response.data) {
      this.setTokens(response.data.access_token, response.data.refresh_token);
      this.setUser(response.data.user);
      return {
        user: response.data.user,
        token: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in
      };
    }
    
    throw new Error(response.error?.message || 'SAML login failed');
  }

  // Logout
  async logout(): Promise<void> {
    try {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        await apiClient.post('/auth/logout', { 
          refresh_token: refreshToken,
          logout_all_devices: false 
        });
      }
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      this.clearTokens();
      this.clearUser();
    }
  }

  // Refresh token
  async refreshToken(): Promise<RefreshTokenResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<{ access_token: string; expires_in: number }>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    
    if (response.success && response.data) {
      // Keep the same refresh token, only update access token
      this.setTokens(response.data.access_token, refreshToken);
      return {
        token: response.data.access_token,
        refreshToken: refreshToken,
        expiresIn: response.data.expires_in
      };
    }
    
    throw new Error(response.error?.message || 'Token refresh failed');
  }

  // Get current user
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    
    if (response.success && response.data) {
      this.setUser(response.data);
      return response.data;
    }
    
    throw new Error(response.error?.message || 'Failed to get current user');
  }

  // Update user profile
  async updateProfile(updates: Partial<User>): Promise<User> {
    const response = await apiClient.put<User>('/auth/me', updates);
    
    if (response.success && response.data) {
      this.setUser(response.data);
      return response.data;
    }
    
    throw new Error(response.error?.message || 'Failed to update profile');
  }

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await apiClient.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: newPassword,
    });
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to change password');
    }
  }

  // Reset password
  async resetPassword(email: string): Promise<void> {
    const response = await apiClient.post('/auth/reset-password', { email });
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to send reset email');
    }
  }

  // Confirm password reset
  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    const response = await apiClient.post('/auth/reset-password/confirm', {
      token,
      new_password: newPassword,
      confirm_password: newPassword,
    });
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to reset password');
    }
  }

  // Get available auth providers (placeholder - not implemented in backend yet)
  async getAuthProviders(): Promise<AuthProvider[]> {
    try {
      const response = await apiClient.get<AuthProvider[]>('/auth/providers');
      
      if (response.success && response.data) {
        return response.data;
      }
    } catch (error) {
      console.warn('Auth providers endpoint not available:', error);
    }
    
    return [];
  }

  // Two-Factor Authentication methods
  async setupTwoFactor(): Promise<{ qr_code_url: string; secret_key: string; backup_codes: string[] }> {
    const response = await apiClient.post<{ qr_code_url: string; secret_key: string; backup_codes: string[] }>('/auth/setup-2fa');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error?.message || 'Failed to setup two-factor authentication');
  }

  async verifyTwoFactor(code: string): Promise<void> {
    const response = await apiClient.post('/auth/verify-2fa', { code });
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to verify two-factor authentication');
    }
  }

  async disableTwoFactor(code: string): Promise<void> {
    const response = await apiClient.post('/auth/disable-2fa', { code });
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to disable two-factor authentication');
    }
  }

  // Token management
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  setTokens(token: string, refreshToken: string): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.refreshTokenKey, refreshToken);
  }

  clearTokens(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
  }

  // User management
  getUser(): User | null {
    const userStr = localStorage.getItem(this.userKey);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  setUser(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  clearUser(): void {
    localStorage.removeItem(this.userKey);
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  isTokenExpired(token?: string): boolean {
    const tokenToCheck = token || this.getToken();
    if (!tokenToCheck) return true;

    try {
      const payload = JSON.parse(atob(tokenToCheck.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  }

  hasPermission(resource: string, action: string): boolean {
    const user = this.getUser();
    if (!user) return false;

    return user.permissions.some(permission => {
      const resourceMatch = permission.resource === '*' || permission.resource === resource;
      const actionMatch = permission.actions.includes(action as any) || permission.actions.includes('admin' as any);
      return resourceMatch && actionMatch;
    });
  }

  hasRole(roleName: string): boolean {
    const user = this.getUser();
    if (!user) return false;

    return user.roles.some(role => role.name === roleName);
  }

  // Session management
  startSessionTimer(): void {
    // Check token expiration every minute
    setInterval(() => {
      if (this.isTokenExpired()) {
        this.handleTokenExpiration();
      }
    }, 60000);
  }

  private async handleTokenExpiration(): Promise<void> {
    try {
      await this.refreshToken();
    } catch (error) {
      console.warn('Token refresh failed:', error);
      await this.logout();
      // Redirect to login page
      window.location.href = '/login';
    }
  }
}

export const authService = new AuthService();