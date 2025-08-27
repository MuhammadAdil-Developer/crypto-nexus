import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Lock, Mail, Shield, Crown, Database, Server, Key } from "lucide-react";
import authService from "@/services/authService";

export default function AdminSignIn() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await authService.login(formData);
      console.log('🔐 Admin login response:', response);
      
      if (response.success) {
        // Check if user is actually admin
        if (response.data?.user?.user_type === 'admin' || response.data?.user?.is_superuser === true) {
          console.log('✅ Admin login successful, redirecting to /admin');
          navigate('/admin');
        } else {
          setErrors({ 
            general: 'Access denied. This login is for administrators only.' 
          });
          // Clear stored data since non-admin tried to access admin login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
        }
      } else {
        setErrors({ general: response.message || 'Login failed. Please try again.' });
      }
    } catch (error: any) {
      console.error('❌ Admin login error:', error);
      setErrors({ 
        general: error.message || 'An unexpected error occurred. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Left Side - Admin Theme */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=2074&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')`
          }}
        ></div>
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/70"></div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/80 via-purple-900/70 to-black/80"></div>

        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 text-center">
          {/* Floating Elements */}
          <div className="absolute top-20 right-20 w-16 h-16 bg-red-400/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-bounce border border-red-400/30">
            <Crown className="w-8 h-8 text-red-400" />
          </div>
          <div className="absolute bottom-32 left-20 w-12 h-12 bg-purple-400/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-pulse border border-purple-400/30">
            <Database className="w-6 h-6 text-purple-400" />
          </div>
          <div className="absolute top-1/3 left-16 w-14 h-14 bg-blue-400/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-bounce delay-300 border border-blue-400/30">
            <Server className="w-7 h-7 text-blue-400" />
          </div>

          <div className="max-w-lg mx-auto text-center">
            <h1 className="text-4xl lg:text-6xl font-black mb-6 bg-gradient-to-r from-white via-red-100 to-purple-200 bg-clip-text text-transparent leading-none tracking-tight font-sans">
              Admin<br />
              <span className="bg-gradient-to-r from-red-400 via-purple-500 to-blue-600 bg-clip-text text-transparent">
                Control Center
              </span>
            </h1>
            <p className="text-lg text-purple-100/90 leading-relaxed font-medium font-sans">
              Secure administrative access to manage the entire crypto marketplace ecosystem
            </p>
          </div>
          <div className="flex flex-col space-y-4 text-purple-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-red-500/30">
                <Crown className="w-5 h-5 text-red-400" />
              </div>
              <span className="text-lg">Administrative Control</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-purple-500/30">
                <Shield className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-lg">System Management</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-blue-500/30">
                <Database className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-lg">Full System Access</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Admin Sign In Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Admin Access</h2>
            <p className="text-gray-400">Administrative login only</p>
          </div>

          <Card className="border border-gray-700 bg-gray-800/50 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Key className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-white">Administrative Login</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">Admin Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter admin email"
                      className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 transition-colors"
                      required
                      disabled={isLoading}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-300">Admin Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter admin password"
                      className="pl-10 pr-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 transition-colors"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-gray-600 bg-gray-700 text-red-500 focus:ring-red-500" />
                    <span className="text-sm text-gray-300">Remember access</span>
                  </label>
                  <span className="text-sm text-red-400 hover:text-red-300 transition-colors cursor-pointer">
                    Reset access
                  </span>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105"
                  disabled={isLoading}
                >
                  {isLoading ? 'Authenticating...' : 'Access Admin Panel'}
                </Button>

                {errors.general && <p className="text-red-500 text-center">{errors.general}</p>}

                <div className="text-center">
                  <span className="text-gray-400">Need regular access? </span>
                  <span 
                    onClick={() => navigate('/sign-in')}
                    className="text-blue-400 hover:text-blue-300 transition-colors cursor-pointer font-semibold"
                  >
                    User Login
                  </span>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="mt-6 text-center text-xs text-gray-500">
            <div className="flex items-center justify-center space-x-2">
              <Shield className="w-4 h-4 text-red-400" />
              <span>Restricted administrative access only</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 