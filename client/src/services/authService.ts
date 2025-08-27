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
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
  phone?: string;
}

export interface UserLoginData {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  user_type: string;
  phone?: string;
  profile_picture?: string;
  is_verified: boolean;
  created_at: string;
  is_superuser?: boolean;
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
      throw new Error('Registration failed. Please try again.');
    }
  }

  // User Login
  async login(loginData: UserLoginData): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/login/', loginData);
      
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
      throw new Error('Login failed. Please try again.');
    }
  }

  // Refresh Token
  async refreshToken(): Promise<{ access: string }> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post<ApiResponse<{ access: string }>>('/auth/refresh/', {
        refresh: refreshToken
      });

      if (response.data.success) {
        localStorage.setItem('accessToken', response.data.data.access);
        return response.data.data;
      }
      
      throw new Error('Token refresh failed');
    } catch (error: any) {
      // Clear invalid tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
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
      // Clear all stored data
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  // Get Current User
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

  // Get access token
  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  // Check if user is admin
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.user_type === 'admin' || user?.is_superuser === true;
  }

  // Check if user is vendor
  isVendor(): boolean {
    const user = this.getCurrentUser();
    return user?.user_type === 'vendor';
  }

  // Check if user is buyer
  isBuyer(): boolean {
    const user = this.getCurrentUser();
    return user?.user_type === 'buyer';
  }

  // Check vendor application status
  async getVendorApplicationStatus(): Promise<'pending' | 'approved' | 'rejected' | 'none'> {
    try {
      const token = this.getAccessToken();
      if (!token) return 'none';

      const response = await fetch('http://localhost:8000/api/v1/applications/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const user = this.getCurrentUser();
        
        if (user && data.results) {
          // Find application for current user
          const application = data.results.find((app: any) => 
            app.vendor_username === user.username || app.email === user.email
          );
          
          if (application) {
            return application.status;
          }
        }
      }
      return 'none';
    } catch (error) {
      console.error('Error checking vendor application status:', error);
      return 'none';
    }
  }

  // Get smart redirect path based on user status (excludes admin users)
  async getSmartRedirectPath(): Promise<string> {
    const user = this.getCurrentUser();
    console.log('🔍 getSmartRedirectPath - Current user:', user);
    
    if (!user) {
      console.log('❌ No user found, redirecting to /sign-in');
      return '/sign-in';
    }

    console.log('👤 User type:', user.user_type);
    console.log('🔐 Is admin?', this.isAdmin());
    console.log('🏪 Is vendor?', this.isVendor());
    console.log('🛒 Is buyer?', this.isBuyer());

    // Admin users should not use this method - they have separate login
    if (this.isAdmin()) {
      console.log('⚠️ Admin user detected in regular redirect, redirecting to /admin');
      return '/admin';
    }

    // Check if user has vendor application
    const vendorStatus = await this.getVendorApplicationStatus();
    console.log('📋 Vendor application status:', vendorStatus);
    
    if (vendorStatus === 'pending') {
      // Vendor application pending - always show success page
      console.log('⏳ Vendor application pending, redirecting to /vendor/apply/success');
      return '/vendor/apply/success';
    } else if (vendorStatus === 'approved') {
      // Vendor application approved - go to vendor dashboard
      console.log('✅ Vendor application approved, redirecting to /vendor/dashboard');
      return '/vendor/dashboard';
    } else {
      // No vendor application or rejected - go to buyer dashboard
      console.log('🛒 No vendor application or rejected, redirecting to /buyer');
      return '/buyer';
    }
  }
}

export const authService = new AuthService();
export default authService; 