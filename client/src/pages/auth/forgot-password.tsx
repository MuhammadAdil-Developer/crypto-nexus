import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowLeft, Shield, Key, Clock, CheckCircle } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle forgot password logic
    console.log("Forgot password for:", email);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex relative">
      {/* Seamless Gradient Overlay for Smooth Transition */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/95 via-gray-900/80 to-transparent z-10 pointer-events-none hidden lg:block"></div>
      
      {/* Left Side - Forgot Password Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Reset Password</h2>
            <p className="text-gray-400">Enter your email to receive a reset link</p>
          </div>

          {!isSubmitted ? (
            <Card className="border border-gray-700 bg-gray-800/50 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Key className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-white">Forgot Your Password?</CardTitle>
                <p className="text-gray-400 text-sm mt-2">
                  No worries! Enter your email and we'll send you a secure reset link.
                </p>
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
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your registered email"
                        className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105"
                  >
                    Send Reset Link
                  </Button>

                  <div className="text-center">
                    <Link href="/sign-in">
                      <span className="text-blue-400 hover:text-blue-300 transition-colors cursor-pointer font-semibold flex items-center justify-center space-x-2">
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Sign In</span>
                      </span>
                    </Link>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-gray-700 bg-gray-800/50 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-white">Reset Link Sent!</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-gray-300">
                  We've sent a password reset link to <span className="text-blue-400 font-semibold">{email}</span>
                </p>
                <p className="text-gray-400 text-sm">
                  Check your email and click the link to reset your password. The link will expire in 24 hours.
                </p>
                
                <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-3 text-sm text-gray-300">
                    <Clock className="w-4 h-4 text-yellow-400" />
                    <span>Link expires in 24 hours</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-300">
                    <Shield className="w-4 h-4 text-green-400" />
                    <span>Check your spam folder if not received</span>
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <Button 
                    onClick={() => setIsSubmitted(false)}
                    variant="outline"
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Send Another Link
                  </Button>
                  
                  <Link href="/sign-in">
                    <Button variant="ghost" className="w-full text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                      Back to Sign In
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mt-6 text-center text-xs text-gray-500">
            Didn't receive the email? Check your spam folder or contact support
          </div>
        </div>
      </div>

      {/* Right Side - Professional Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')`
          }}
        ></div>
        
        {/* Soft Gradient Overlay for Seamless Blend */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-blue-900/60 to-blue-900/80"></div>
        
        {/* Secondary Gradient for Depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-cyan-900/40 to-black/60"></div>

        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 text-center">
          {/* Floating Security Elements */}
          <div className="absolute top-20 right-20 w-16 h-16 bg-blue-400/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-bounce border border-blue-400/30">
            <Shield className="w-8 h-8 text-blue-400" />
          </div>
          <div className="absolute bottom-32 left-20 w-14 h-14 bg-cyan-400/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-pulse border border-cyan-400/30">
            <Key className="w-7 h-7 text-cyan-400" />
          </div>
          <div className="absolute top-1/3 left-16 w-12 h-12 bg-green-400/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-bounce delay-500 border border-green-400/30">
            <CheckCircle className="w-6 h-6 text-green-400" />
          </div>

          {/* Security Info Container */}
          <div className="w-80 h-40 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex flex-col items-center justify-center mb-8 p-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">Advanced Security</div>
              <div className="text-sm text-gray-300 mb-4">Password Recovery System</div>
              <div className="flex items-center justify-center space-x-6 text-xs text-gray-400">
                <div className="flex items-center space-x-1">
                  <Shield className="w-3 h-3" />
                  <span>Encrypted Links</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>24hr Expiry</span>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-lg mx-auto text-center">
            <h1 className="text-5xl lg:text-6xl font-black mb-6 bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent leading-none tracking-tight font-sans">
              Secure<br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-500 to-purple-600 bg-clip-text text-transparent">
                Recovery
              </span>
            </h1>
            <p className="text-lg text-blue-100/90 leading-relaxed font-medium font-sans">
              Your account security is our top priority. Reset your password safely with our encrypted recovery system.
            </p>
          </div>
          
          {/* Security Features */}
          <div className="space-y-4 text-blue-200 mt-8">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-blue-500/30">
                <Shield className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-lg">Military-grade encryption</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-cyan-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-cyan-500/30">
                <Key className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="text-lg">Secure reset tokens</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-green-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-green-500/30">
                <Clock className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-lg">Time-limited access</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}