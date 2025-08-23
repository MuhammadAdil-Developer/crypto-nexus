import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Lock, Mail, User, Shield, Coins, Users, Zap, CheckCircle } from "lucide-react";

export default function SignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle sign up logic
    console.log("Sign up:", formData);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Left Side - Professional Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1518546305927-5a555bb7020d?q=80&w=2069&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')`
          }}
        ></div>
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/70"></div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-blue-900/70 to-black/80"></div>

        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 text-center">
          {/* Floating Success Elements */}
          <div className="absolute top-20 right-20 w-16 h-16 bg-green-400/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-bounce border border-green-400/30">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <div className="absolute bottom-32 left-20 w-14 h-14 bg-purple-400/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-pulse border border-purple-400/30">
            <Zap className="w-7 h-7 text-purple-400" />
          </div>
          <div className="absolute top-1/3 left-16 w-12 h-12 bg-cyan-400/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-bounce delay-500 border border-cyan-400/30">
            <Shield className="w-6 h-6 text-cyan-400" />
          </div>

          {/* Stats Container */}
          <div className="w-80 h-32 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-8 p-6">
            <div className="flex items-center space-x-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">50K+</div>
                <div className="text-sm text-gray-300">Active Traders</div>
              </div>
              <div className="w-px h-12 bg-white/20"></div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400">$2M+</div>
                <div className="text-sm text-gray-300">Daily Volume</div>
              </div>
              <div className="w-px h-12 bg-white/20"></div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">99.9%</div>
                <div className="text-sm text-gray-300">Uptime</div>
              </div>
            </div>
          </div>

          <div className="max-w-lg mx-auto text-center">
            <h1 className="text-5xl lg:text-6xl font-black mb-6 bg-gradient-to-r from-white via-purple-100 to-blue-200 bg-clip-text text-transparent leading-none tracking-tight font-sans">
              Start Your<br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-500 bg-clip-text text-transparent">
                Journey
              </span>
            </h1>
            <p className="text-lg text-purple-100/90 leading-relaxed font-medium font-sans">
              Join thousands of traders in the most trusted crypto marketplace for premium digital accounts
            </p>
          </div>
          
          {/* Features */}
          <div className="space-y-4 text-purple-200">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-green-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-green-500/30">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-lg">Instant account verification</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-blue-500/30">
                <CheckCircle className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-lg">Zero setup fees</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-purple-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-purple-500/30">
                <CheckCircle className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-lg">24/7 customer support</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-cyan-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-cyan-500/30">
                <CheckCircle className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="text-lg">Advanced security protocols</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Sign Up Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
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
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-gray-300">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="username"
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Choose a username"
                      className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email"
                      className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-300">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Create a strong password"
                      className="pl-10 pr-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 transition-colors"
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-300">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm your password"
                      className="pl-10 pr-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 transition-colors"
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
                </div>

                <div className="flex items-start space-x-2">
                  <input 
                    type="checkbox" 
                    id="terms"
                    checked={formData.agreeToTerms}
                    onChange={(e) => setFormData(prev => ({ ...prev, agreeToTerms: e.target.checked }))}
                    className="mt-1 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500" 
                    required
                  />
                  <label htmlFor="terms" className="text-sm text-gray-300">
                    I agree to the{" "}
                    <Link href="/terms">
                      <span className="text-purple-400 hover:text-purple-300 cursor-pointer">Terms of Service</span>
                    </Link>
                    {" "}and{" "}
                    <Link href="/privacy">
                      <span className="text-purple-400 hover:text-purple-300 cursor-pointer">Privacy Policy</span>
                    </Link>
                  </label>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105"
                >
                  Create Account
                </Button>

                <div className="text-center">
                  <span className="text-gray-400">Already have an account? </span>
                  <Link href="/sign-in">
                    <span className="text-purple-400 hover:text-purple-300 transition-colors cursor-pointer font-semibold">
                      Sign In
                    </span>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="mt-6 text-center text-xs text-gray-500">
            Your data is protected with military-grade encryption
          </div>
        </div>
      </div>
    </div>
  );
}