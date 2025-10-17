import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { APIResponse } from '../types/api';

interface APIError {
  code: string;
  message: string;
  timestamp: Date;
  requestId: string;
  status: number;
  details?: any;
}

class APIClient {
  private instance: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = (import.meta as any).env?.VITE_API_BASE_URL || '/api';
    
    this.instance = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('acso_token');
        if (token && !this.isTokenExpired(token)) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for tracking
        config.headers['X-Request-ID'] = this.generateRequestId();

        // Add CSRF token if available
        const csrfToken = this.getCSRFToken();
        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle token expiration
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('acso_refresh_token');
            if (refreshToken) {
              const response = await this.refreshToken(refreshToken);
              const { token } = response.data;
              
              localStorage.setItem('acso_token', token);
              originalRequest.headers.Authorization = `Bearer ${token}`;
              
              return this.instance(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.handleAuthFailure();
            return Promise.reject(refreshError);
          }
        }

        // Handle other errors
        return Promise.reject(this.transformError(error));
      }
    );
  }

  private async refreshToken(refreshToken: string): Promise<AxiosResponse> {
    return axios.post(`${this.baseURL}/auth/refresh`, {
      refreshToken,
    });
  }

  private handleAuthFailure(): void {
    localStorage.removeItem('acso_token');
    localStorage.removeItem('acso_refresh_token');
    localStorage.removeItem('acso_user');
    
    // Dispatch logout event
    window.dispatchEvent(new CustomEvent('auth:logout'));
    
    // Redirect to login if not already there
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }

  private transformError(error: any): APIError {
    const apiError: APIError = {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date(),
      requestId: error.config?.headers?.['X-Request-ID'] || 'unknown',
      status: error.response?.status || 0,
    };

    if (error.response?.data) {
      const errorData = error.response.data;
      apiError.code = errorData.code || `HTTP_${error.response.status}`;
      apiError.message = errorData.message || error.message;
      apiError.details = errorData.details;
    } else if (error.request) {
      apiError.code = 'NETWORK_ERROR';
      apiError.message = 'Network error - please check your connection';
    } else {
      apiError.message = error.message;
    }

    return apiError;
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCSRFToken(): string | null {
    // Get CSRF token from meta tag or cookie
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
      return metaTag.getAttribute('content');
    }

    // Fallback to cookie
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : null;
  }

  // HTTP methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    const response = await this.instance.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    const response = await this.instance.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    const response = await this.instance.put(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    const response = await this.instance.patch(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    const response = await this.instance.delete(url, config);
    return response.data;
  }

  // File upload
  async upload<T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<APIResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };

    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        const progress = progressEvent.total 
          ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
          : 0;
        onProgress(progress);
      };
    }

    const response = await this.instance.post(url, formData, config);
    return response.data;
  }

  // Download file
  async download(url: string, filename?: string): Promise<void> {
    const response = await this.instance.get(url, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Utility methods
  setBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
    this.instance.defaults.baseURL = baseURL;
  }

  setTimeout(timeout: number): void {
    this.instance.defaults.timeout = timeout;
  }

  setDefaultHeaders(headers: Record<string, string>): void {
    Object.assign(this.instance.defaults.headers.common, headers);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health');
      return response.success;
    } catch {
      return false;
    }
  }
}

export const apiClient = new APIClient();