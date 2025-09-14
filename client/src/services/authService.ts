import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

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
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/sign-in';
    }
    return Promise.reject(error);
  }
);

export interface UserRegistrationData {
  username: string;
  password: string;
  confirm_password: string;
}

export interface UserLoginData {
  username: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  user_type: string;
  is_verified: boolean;
  two_factor_enabled: boolean;
  is_active: boolean;
  date_joined: string;
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
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/login/', userData);
      
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
    return !!localStorage.getItem('accessToken');
  }

  // Get auth token
  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  // Refresh token
  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        return false;
      }

      const response = await api.post<ApiResponse<{ access: string }>>('/auth/refresh/', {
        refresh: refreshToken
      });

      if (response.data.success) {
        localStorage.setItem('accessToken', response.data.data.access);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  // Update user profile
  async updateProfile(profileData: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const response = await api.put<ApiResponse<User>>('/auth/profile/', profileData);
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Get user profile
  async getProfile(): Promise<ApiResponse<User>> {
    try {
      const response = await api.get<ApiResponse<User>>('/auth/profile/');
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

  // Forgot password
  async forgotPassword(email: string): Promise<ApiResponse<void>> {
    try {
      const response = await api.post<ApiResponse<void>>('/auth/forgot-password/', {
        email
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
}

export const authService = new AuthService();
export { api };
export default authService; 