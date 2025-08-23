import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Lock, Mail, Shield, TrendingUp, Zap, Globe } from "lucide-react";

export default function SignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle sign in logic
    console.log("Sign in:", formData);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Left Side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-purple-700 to-indigo-800 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-32 h-32 border-2 border-white rounded-full"></div>
          <div className="absolute top-40 right-32 w-24 h-24 border border-white rounded-lg rotate-45"></div>
          <div className="absolute bottom-32 left-32 w-40 h-40 border-2 border-white rounded-full"></div>
          <div className="absolute bottom-20 right-20 w-16 h-16 border border-white rounded-lg rotate-12"></div>
        </div>

        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 text-center">
          {/* Crypto Marketplace Illustration */}
          <div className="mb-8">
            <div className="relative">
              {/* Main Circle */}
              <div className="w-64 h-64 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-8">
                <div className="w-48 h-48 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
                  <div className="text-6xl">₿</div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-green-400 rounded-full flex items-center justify-center animate-bounce">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
                <Zap className="w-6 h-6 text-gray-900" />
              </div>
              <div className="absolute top-1/2 -right-8 w-14 h-14 bg-purple-400 rounded-full flex items-center justify-center animate-bounce delay-300">
                <Globe className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-4">Welcome to CryptoMarket</h1>
          <p className="text-xl text-blue-100 mb-6 max-w-md">
            The most secure and anonymous marketplace for digital assets and accounts
          </p>
          <div className="flex items-center space-x-6 text-blue-200">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Secure Trading</span>
            </div>
            <div className="flex items-center space-x-2">
              <Lock className="w-5 h-5" />
              <span>Anonymous</span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>24/7 Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Sign In Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Sign In</h2>
            <p className="text-gray-400">Welcome back to your crypto marketplace</p>
          </div>

          <Card className="border border-gray-700 bg-gray-800/50 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-white">Access Your Account</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
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
                      className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 transition-colors"
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
                      placeholder="Enter your password"
                      className="pl-10 pr-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 transition-colors"
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

                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500" />
                    <span className="text-sm text-gray-300">Remember me</span>
                  </label>
                  <Link href="/forgot-password">
                    <span className="text-sm text-blue-400 hover:text-blue-300 transition-colors cursor-pointer">
                      Forgot password?
                    </span>
                  </Link>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105"
                >
                  Sign In to Account
                </Button>

                <div className="text-center">
                  <span className="text-gray-400">Don't have an account? </span>
                  <Link href="/sign-up">
                    <span className="text-blue-400 hover:text-blue-300 transition-colors cursor-pointer font-semibold">
                      Create Account
                    </span>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="mt-6 text-center text-xs text-gray-500">
            Protected by enterprise-grade encryption and security protocols
          </div>
        </div>
      </div>
    </div>
  );
}