import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, LogIn } from 'lucide-react';
import { useToast } from '../ui/ToastContainer';
import authService, { UserLoginData } from '../../services/authService';

const Login: React.FC = () => {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState<UserLoginData>({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState<Partial<UserLoginData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<UserLoginData> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name as keyof UserLoginData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await authService.login(formData);
      
      if (response.success) {
        showToast({
          type: 'success',
          title: 'Login Successful!',
          message: `Welcome back, ${response.data.user.username}!`,
          duration: 3000
        });
        
        // Smart routing based on user type and vendor status
        setTimeout(async () => {
          try {
          const userType = response.data.user.user_type;
            console.log('🔍 Login - User Type:', userType);
            console.log('🔍 Login - Full User Data:', response.data.user);
            
            if (userType === 'admin') {
              console.log('🚀 Redirecting to Admin Dashboard');
              window.location.href = '/admin/dashboard';
              return;
            }
            
            if (userType === 'vendor') {
              console.log('🚀 Redirecting to Vendor Dashboard');
              window.location.href = '/vendor/dashboard';
              return;
            }
            
            // For buyers, check if they have vendor application
            if (userType === 'buyer') {
              console.log('🔍 Checking vendor status for buyer...');
              const vendorStatus = await authService.checkVendorStatus();
              console.log('🔍 Vendor Status:', vendorStatus);
              
              if (vendorStatus.hasApplication) {
                if (vendorStatus.applicationStatus === 'approved') {
                  // User is now an approved vendor
                  console.log('🚀 Buyer has approved vendor application, redirecting to Vendor Dashboard');
                  window.location.href = '/vendor/dashboard';
                } else if (vendorStatus.applicationStatus === 'pending') {
                  // Application is pending, show success page
                  console.log('🚀 Buyer has pending vendor application, redirecting to Success Page');
                  window.location.href = '/vendor/apply/success';
                } else if (vendorStatus.applicationStatus === 'rejected') {
                  // Application was rejected, allow re-application
                  console.log('🚀 Buyer has rejected vendor application, redirecting to Apply Page');
                  window.location.href = '/vendor/apply';
                }
              } else {
                // No vendor application, go to buyer dashboard
                console.log('🚀 Buyer has no vendor application, redirecting to Buyer Dashboard');
                window.location.href = '/buyer';
              }
              return;
            }
            
            // Default fallback
            console.log('🚀 Default fallback, redirecting to Buyer Dashboard');
            window.location.href = '/buyer';
            
          } catch (error) {
            console.error('❌ Routing error:', error);
            // Fallback to buyer dashboard
            window.location.href = '/buyer';
          }
        }, 1500);
      } else {
        showToast({
          type: 'error',
          title: 'Login Failed',
          message: response.message || 'Invalid credentials. Please try again.',
          duration: 5000
        });
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Login Error',
        message: error.message || 'An unexpected error occurred. Please try again.',
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Welcome back to CryptoNexus
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`block w-full pl-10 pr-3 py-2 border rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="john@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`block w-full pl-10 pr-3 py-2 border rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              } transition-colors duration-200`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing In...
                </div>
              ) : (
                <div className="flex items-center">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </div>
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <a href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
                Sign up here
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login; 