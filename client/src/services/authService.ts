import axios from 'axios';
import { API_BASE_URL } from '@/config/api';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;
    const url: string = originalRequest.url || '';

    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh');

    const hasToken =
      !!localStorage.getItem('accessToken') ||
      !!localStorage.getItem('refreshToken');

    // If this is an auth request or there is no token at all,
    // don't try refresh or show session modal (normal login errors)
    if (status === 401 && (isAuthEndpoint || !hasToken)) {
      return Promise.reject(error);
    }

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      console.log('🔐 401 Unauthorized - attempting token refresh');

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          console.log('🔐 Refreshing token...');
          const response = await api.post('/auth/refresh/', {
            refresh: refreshToken
          });

          if (response.data.success) {
            const { access, refresh } = response.data.data.tokens;
            localStorage.setItem('accessToken', access);
            localStorage.setItem('refreshToken', refresh);

            console.log('🔐 Token refreshed successfully');

            // Retry the original request with new token
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${access}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        console.log('🔐 Token refresh failed');
        // Clear tokens
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('userId');

        // Trigger token expiration modal
        window.dispatchEvent(
          new CustomEvent('token_expired', {
            detail: { userType: user.user_type },
          })
        );

        return Promise.reject(refreshError);
      }
    }

    // Log other errors for debugging
    if (status === 401 && hasToken && !isAuthEndpoint) {
      console.log('🔐 401 Error - Token might be invalid:', {
        url: originalRequest.url,
        hasToken: !!localStorage.getItem('accessToken'),
        tokenPreview:
          localStorage.getItem('accessToken')?.substring(0, 20) + '...',
      });

      // If no retry attempted and token exists, try refresh first
      // Otherwise, show expiration modal
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!originalRequest._retry) {
        // Will be handled by retry logic above
      } else {
        // Refresh failed, show modal
        window.dispatchEvent(
          new CustomEvent('token_expired', {
            detail: { userType: user.user_type },
          })
        );
      }
    }

    return Promise.reject(error);
  }
);

export interface UserRegistrationData {
  username: string;
  password: string;
  confirm_password: string;
  captcha_token?: string;
  cloudflare_token?: string;
}

export interface UserLoginData {
  username: string;
  password: string;
  captcha_token?: string;
  cloudflare_token?: string;
}

export interface User {
  id: string;
  username: string;
  user_type: string;
  is_verified: boolean;
  two_factor_enabled: boolean;
  is_active: boolean;
  date_joined: string;
  recovery_phrase?: string;
}

export interface AuthResponse {
  user: User;
  tokens: {
    access: string;
    refresh: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: any;
  captcha_required?: boolean;
  requires_2fa?: boolean;
  session_token?: string;
  error_code?: string;
}

class AuthService {
  // User Registration
  async register(userData: UserRegistrationData): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/register/', userData);

      if (response.data.success) {
        // Store tokens and user data
        localStorage.setItem('accessToken', response.data.data.tokens.access);
        localStorage.setItem('refreshToken', response.data.data.tokens.refresh);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }

      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // User Login
  async login(userData: UserLoginData): Promise<ApiResponse<AuthResponse>> {
    try {
      console.log('🔍 AuthService login called with data:', {
        username: userData.username,
        password: '***',
        captcha_token: userData.captcha_token
      });

      const response = await api.post<ApiResponse<AuthResponse>>('/auth/login/', userData);

      if (response.data.success) {
        // Store tokens and user data
        localStorage.setItem('accessToken', response.data.data.tokens.access);
        localStorage.setItem('refreshToken', response.data.data.tokens.refresh);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        localStorage.setItem('userId', response.data.data.user.id.toString());

        // Dispatch event to trigger WebSocket connection
        window.dispatchEvent(new CustomEvent('user_logged_in', {
          detail: { userId: response.data.data.user.id.toString() }
        }));
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ AuthService login error:', error);
      console.error('❌ Error response data:', error.response?.data);
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
      }
    }
    return null;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = localStorage.getItem('accessToken');
    const user = localStorage.getItem('user');
    return !!(token && user);
  }

  // Get access token
  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  // Get user profile
  async getProfile(): Promise<ApiResponse<User>> {
    try {
      const response = await api.get<ApiResponse<User>>('/profile/');
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Validate token (check if it's expired)
  isTokenValid(): boolean {
    const token = localStorage.getItem('accessToken');
    if (!token) return false;

    try {
      // Decode JWT token to check expiration
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }

  // Refresh token manually (single implementation)
  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return false;

      const response = await api.post('/auth/refresh/', {
        refresh: refreshToken
      });

      if (response.data.success) {
        const { access, refresh } = response.data.data.tokens ?? response.data.data ?? {};
        if (access) localStorage.setItem('accessToken', access);
        if (refresh) localStorage.setItem('refreshToken', refresh);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }


  // Get auth token
  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  // (removed duplicate refreshToken implementation)

  // Update user profile
  async updateProfile(profileData: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const response = await api.put<ApiResponse<User>>('/profile/update/', profileData);
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    try {
      const response = await api.post<ApiResponse<void>>('/auth/change-password/', {
        current_password: currentPassword,
        new_password: newPassword
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Recover account using recovery phrase
  async recoverAccount(username: string, recoveryPhrase: string, newPassword: string): Promise<ApiResponse<void>> {
    try {
      const response = await api.post<ApiResponse<void>>('/auth/recover/', {
        username,
        recovery_phrase: recoveryPhrase,
        new_password: newPassword
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<void>> {
    try {
      const response = await api.post<ApiResponse<void>>('/auth/reset-password/', {
        token,
        new_password: newPassword
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Enable 2FA
  async enable2FA(): Promise<ApiResponse<{ qr_code: string; secret: string }>> {
    try {
      const response = await api.post<ApiResponse<{ qr_code: string; secret: string }>>('/auth/enable-2fa/');
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Disable 2FA
  async disable2FA(password: string): Promise<ApiResponse<void>> {
    try {
      const response = await api.post<ApiResponse<void>>('/auth/disable-2fa/', {
        password
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Verify 2FA
  async verify2FA(token: string): Promise<ApiResponse<void>> {
    try {
      const response = await api.post<ApiResponse<void>>('/auth/verify-2fa/', {
        token
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Verify email
  async verifyEmail(token: string): Promise<ApiResponse<void>> {
    try {
      const response = await api.post<ApiResponse<void>>('/auth/verify-email/', {
        token
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Resend verification email
  async resendVerificationEmail(): Promise<ApiResponse<void>> {
    try {
      const response = await api.post<ApiResponse<void>>('/auth/resend-verification/');
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Get user statistics
  async getUserStats(): Promise<ApiResponse<any>> {
    try {
      const response = await api.get<ApiResponse<any>>('/auth/stats/');
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Check username availability
  async checkUsernameAvailability(username: string): Promise<ApiResponse<{ available: boolean }>> {
    try {
      const response = await api.get<ApiResponse<{ available: boolean }>>(`/auth/check-username/${username}/`);
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Check vendor status and application status
  async checkVendorStatus(): Promise<{
    isVendor: boolean;
    isApproved: boolean;
    hasApplication: boolean;
    applicationStatus?: string;
  }> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        return { isVendor: false, isApproved: false, hasApplication: false };
      }

      // Check if user is already a vendor
      if (currentUser.user_type === 'vendor') {
        return { isVendor: true, isApproved: true, hasApplication: true, applicationStatus: 'approved' };
      }

      // Check if user has pending vendor application
      try {
        const response = await api.get(`/vendors/applications/check/${currentUser.username}/`);
        if (response.data.success) {
          const { has_application, status } = response.data.data;
          return {
            isVendor: false,
            isApproved: false,
            hasApplication: has_application,
            applicationStatus: status
          };
        }
      } catch (error) {
        // If endpoint doesn't exist or error, assume no application
        console.log('Vendor application check failed, assuming no application');
      }

      return { isVendor: false, isApproved: false, hasApplication: false };
    } catch (error) {
      console.error('Error checking vendor status:', error);
      return { isVendor: false, isApproved: false, hasApplication: false };
    }
  }

  // Delete account
  async deleteAccount(password: string): Promise<ApiResponse<void>> {
    try {
      const response = await api.delete<ApiResponse<void>>('/auth/delete-account/', {
        data: { password }
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Impersonate user (Admin only)
  async impersonateUser(userId: string): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>(`/users/${userId}/login-as/`);

      if (response.data.success) {
        // Store tokens and user data
        localStorage.setItem('accessToken', response.data.data.tokens.access);
        localStorage.setItem('refreshToken', response.data.data.tokens.refresh);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        localStorage.setItem('userId', response.data.data.user.id.toString());

        // Dispatch event to trigger WebSocket connection
        window.dispatchEvent(new CustomEvent('user_logged_in', {
          detail: { userId: response.data.data.user.id.toString() }
        }));
      }

      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }
}

export const authService = new AuthService();
export { api };
export default authService; 
