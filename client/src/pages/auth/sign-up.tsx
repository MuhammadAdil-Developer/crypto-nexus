import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Lock, User, Shield, TrendingUp, Zap, Globe } from "lucide-react";
import { authService } from "@/services/authService";

export default function SignUp() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirm_password: ""
  });
  const [errors, setErrors] = useState<{ username?: string; password?: string; confirm_password?: string; general?: string }>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: { username?: string; password?: string; confirm_password?: string } = {};

    if (!formData.username) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters long';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    if (!formData.confirm_password) {
      newErrors.confirm_password = 'Please confirm your password';
    } else if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
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
      const response = await authService.register(formData);
      
      if (response.success) {
        // Redirect based on user type
        const userType = response.data.user.user_type;
        if (userType === 'admin') {
          navigate('/admin/dashboard');
        } else if (userType === 'vendor') {
          navigate('/vendor/dashboard');
        } else {
          navigate('/buyer/');
        }
      } else {
        setErrors({ general: response.message || 'Registration failed' });
      }
    } catch (error: any) {
      setErrors({ 
        general: error.response?.data?.message || 'Registration failed. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
        {/* Header */}
          <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mr-3">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">CryptoNexus</h1>
          </div>
          <p className="text-gray-400">Create your secure account</p>
              </div>

        {/* Sign Up Card */}
        <Card className="border border-gray-700 bg-gray-900/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-semibold text-white">Create Account</CardTitle>
            <p className="text-gray-400 text-sm">Join the secure crypto marketplace</p>
            </CardHeader>
            <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Field */}
                <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-300">
                  Username
                </Label>
                  <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="username"
                      name="username"
                      type="text"
                    placeholder="Choose a username"
                      value={formData.username}
                      onChange={handleInputChange}
                    className={`pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 ${
                        errors.username ? 'border-red-500' : ''
                      }`}
                    disabled={isLoading}
                    />
                  </div>
                  {errors.username && (
                    <p className="text-red-400 text-sm">{errors.username}</p>
                  )}
                </div>

              {/* Password Field */}
                <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">
                  Password
                </Label>
                  <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                      value={formData.password}
                      onChange={handleInputChange}
                    className={`pl-10 pr-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 ${
                        errors.password ? 'border-red-500' : ''
                      }`}
                    disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    disabled={isLoading}
                    >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-400 text-sm">{errors.password}</p>
                  )}
                </div>

              {/* Confirm Password Field */}
                <div className="space-y-2">
                <Label htmlFor="confirm_password" className="text-gray-300">
                  Confirm Password
                </Label>
                  <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="confirm_password"
                      name="confirm_password"
                      type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                      value={formData.confirm_password}
                      onChange={handleInputChange}
                    className={`pl-10 pr-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 ${
                        errors.confirm_password ? 'border-red-500' : ''
                      }`}
                    disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    disabled={isLoading}
                    >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    </button>
                  </div>
                  {errors.confirm_password && (
                    <p className="text-red-400 text-sm">{errors.confirm_password}</p>
                  )}
                </div>

              {/* General Error */}
              {errors.general && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{errors.general}</p>
                </div>
              )}

              {/* Submit Button */}
                <Button
                  type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                  <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Account...
                    </div>
                  ) : (
                  "Create Account"
                  )}
                </Button>
            </form>

            {/* Links */}
            <div className="mt-6 text-center">
                  <p className="text-gray-400 text-sm">
                    Already have an account?{" "}
                <Link
                  to="/auth/sign-in"
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  Sign in
                    </Link>
                  </p>
                </div>
            </CardContent>
          </Card>

        {/* Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Shield className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-gray-400 text-xs">Secure</p>
              </div>
          <div className="text-center">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-gray-400 text-xs">Fast</p>
              </div>
          <div className="text-center">
            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Globe className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-gray-400 text-xs">Global</p>
          </div>
        </div>
      </div>
    </div>
  );
}