import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Lock, Mail, User, Shield, Coins, Users, Zap, CheckCircle } from "lucide-react";
import authService from "@/services/authService";

export default function SignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
    phone: ""
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters long';
    }

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    if (!formData.confirm_password) {
      newErrors.confirm_password = 'Please confirm your password';
    } else if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }

    if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
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
      
      // Debug: Log the entire response
      console.log('Full API Response:', response);
      console.log('Response success:', response.success);
      console.log('Response message:', response.message);
      console.log('Response data:', response.data);
      
      if (response.success) {
        // Show success message
        console.log('Registration successful:', response.message);
        setIsSuccess(true);
        setErrors({});
        
        // Redirect to login page
        setTimeout(() => {
          window.location.href = '/sign-in';
        }, 3000);
      } else {
        // Handle API errors
        if (response.errors) {
          setErrors(response.errors);
        } else {
          setErrors({ general: response.message || 'Registration failed. Please try again.' });
        }
      }
    } catch (error: any) {
      console.log('Error caught:', error);
      setErrors({ 
        general: error.message || 'An unexpected error occurred. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex relative">
      {/* Seamless Gradient Overlay for Smooth Transition */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/95 via-gray-900/80 to-transparent z-10 pointer-events-none hidden lg:block"></div>
      
      {/* Left Side - Sign Up Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
            <p className="text-gray-400">Join the crypto marketplace revolution</p>
          </div>

          <Card className="border border-gray-700 bg-gray-800/50 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-white">Create Your Account</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Error Message */}
                {errors.general && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{errors.general}</p>
                  </div>
                )}

                {/* Success Message */}
                {isSuccess && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <p className="text-green-400 text-sm">Registration successful!</p>
                  </div>
                )}

                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-gray-300">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="johndoe123"
                      className={`pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 transition-colors ${
                        errors.username ? 'border-red-500' : ''
                      }`}
                      required
                    />
                  </div>
                  {errors.username && (
                    <p className="text-red-400 text-sm">{errors.username}</p>
                  )}
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-gray-300">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="full_name"
                      name="full_name"
                      type="text"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      placeholder="John Doe"
                      className={`pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 transition-colors ${
                        errors.full_name ? 'border-red-500' : ''
                      }`}
                      required
                    />
                  </div>
                  {errors.full_name && (
                    <p className="text-red-400 text-sm">{errors.full_name}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john@example.com"
                      className={`pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 transition-colors ${
                        errors.email ? 'border-red-500' : ''
                      }`}
                      required
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-400 text-sm">{errors.email}</p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-300">Phone Number (Optional)</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                      className={`pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 transition-colors ${
                        errors.phone ? 'border-red-500' : ''
                      }`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-red-400 text-sm">{errors.phone}</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-300">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Create a strong password"
                      className={`pl-10 pr-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 transition-colors ${
                        errors.password ? 'border-red-500' : ''
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-400 text-sm">{errors.password}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Must be at least 8 characters with uppercase, lowercase, and number
                  </p>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirm_password" className="text-gray-300">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="confirm_password"
                      name="confirm_password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirm_password}
                      onChange={handleInputChange}
                      placeholder="Confirm your password"
                      className={`pl-10 pr-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 transition-colors ${
                        errors.confirm_password ? 'border-red-500' : ''
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.confirm_password && (
                    <p className="text-red-400 text-sm">{errors.confirm_password}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Account...
                    </div>
                  ) : (
                    'Create Account'
                  )}
                </Button>

                <div className="text-center">
                  <p className="text-gray-400 text-sm">
                    Already have an account?{" "}
                    <Link href="/sign-in" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                      Sign in here
                    </Link>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Side - Visual Elements */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2232&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')`
          }}
        ></div>
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/60"></div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-blue-900/70 to-black/80"></div>

        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 text-center">
          {/* Floating Elements */}
          <div className="absolute top-20 right-20 w-16 h-16 bg-purple-400/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-bounce border border-purple-400/30">
            <Coins className="w-8 h-8 text-purple-400" />
          </div>
          <div className="absolute bottom-32 left-20 w-12 h-12 bg-blue-400/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-pulse border border-blue-400/30">
            <Zap className="w-6 h-6 text-blue-400" />
          </div>
          <div className="absolute top-1/3 left-16 w-14 h-14 bg-green-400/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-bounce delay-300 border border-green-400/30">
            <CheckCircle className="w-7 h-7 text-green-400" />
          </div>

          <div className="max-w-lg mx-auto text-center">
            <h1 className="text-4xl lg:text-6xl font-black mb-6 bg-gradient-to-r from-white via-purple-100 to-blue-200 bg-clip-text text-transparent leading-none tracking-tight font-sans">
              Join<br />
              <span className="bg-gradient-to-r from-purple-400 via-blue-500 to-cyan-600 bg-clip-text text-transparent">
                CryptoMarket
              </span>
            </h1>
            <p className="text-lg text-purple-100/90 leading-relaxed font-medium font-sans">
              Start your journey in the world's most secure crypto marketplace
            </p>
          </div>
          
          <div className="flex flex-col space-y-4 text-purple-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-purple-500/30">
                <Shield className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-lg">Secure & Anonymous</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-blue-500/30">
                <Coins className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-lg">24/7 Trading</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-green-500/30">
                <Users className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-lg">Global Community</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}