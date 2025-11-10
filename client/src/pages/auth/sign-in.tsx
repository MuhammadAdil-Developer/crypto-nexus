import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Lock, User, Shield, TrendingUp, Zap, Globe } from "lucide-react";
import { authService } from "@/services/authService";
import CircleCaptchaModal from "@/components/captcha/CircleCaptchaModal";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export default function SignIn() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [errors, setErrors] = useState<{ username?: string; password?: string; general?: string; captcha?: string }>({});
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [showCaptchaModal, setShowCaptchaModal] = useState(false);
  const [pendingLoginAttempt, setPendingLoginAttempt] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  
  // Reset CAPTCHA state on page load
  useEffect(() => {
    setCaptchaVerified(false);
    setCaptchaToken(null);
    setShowCaptchaModal(false);
    setPendingLoginAttempt(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: { username?: string; password?: string } = {};

    if (!formData.username) {
      newErrors.username = 'Username is required';
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

    // Check if CAPTCHA is already verified
    if (!captchaVerified || !captchaToken) {
      // Show CAPTCHA modal first and mark that there's a pending login attempt
      setShowCaptchaModal(true);
      setPendingLoginAttempt(true);
      setErrors({ captcha: 'Please complete the security verification to continue' });
      return;
    }

    // Proceed with login if CAPTCHA is verified
    await performLogin();
  };

  const handleCaptchaVerify = (token: string) => {
    console.log('🔍 Captcha verified with token:', token);
    console.log('🔍 Token length:', token.length);
    console.log('🔍 Token type:', typeof token);
    setCaptchaToken(token);
    setCaptchaVerified(true);
    setShowCaptchaModal(false); // Close CAPTCHA modal
    // Only clear captcha error, keep other errors
    setErrors(prev => ({ ...prev, captcha: undefined }));
    console.log('🔍 Captcha token set to state:', token);
    
    // If there was a pending login attempt, proceed with login automatically
    if (pendingLoginAttempt) {
      setPendingLoginAttempt(false);
      performLogin(token);
    }
  };

  const handleCaptchaError = (error: string) => {
    setErrors(prev => ({ ...prev, captcha: error }));
    setCaptchaVerified(false);
    setCaptchaToken(null);
  };

  const performLogin = async (token?: string) => {
    setIsLoading(true);
    setErrors({});

    try {
      // Use the passed token or fall back to state
      const finalToken = token || captchaToken;
      
      console.log('🔍 Attempting login with data:', {
        username: formData.username,
        password: '***',
        captcha_token: finalToken
      });

      const loginData = {
        username: formData.username,
        password: formData.password,
        ...(finalToken && { captcha_token: finalToken })  // Only include if token exists
      };
      
      console.log('🔍 Final login data being sent:', loginData);
      console.log('🔍 Current captchaToken state:', captchaToken);
      console.log('🔍 Current captchaVerified state:', captchaVerified);
      console.log('🔍 Final token being used:', finalToken);

      const response: any = await authService.login(loginData as any);
      
      console.log('🔐 Login response:', response);
      
      // Check if 2FA is required
      if (response.requires_2fa || response.error_code === '2FA_REQUIRED') {
        setRequires2FA(true);
        setSessionToken(response.session_token || null);
        setErrors({});
        setIsLoading(false);
        return;
      }
      
      if (response.success) {
        // Redirect based on user type
        const userType = response.data.user.user_type;
        if (userType === 'admin') {
          navigate('/admin/dashboard');
        } else if (userType === 'vendor') {
          navigate('/vendor/');
        } else {
          navigate('/buyer/');
        }
      } else {
        console.error('❌ Login failed:', response);
        
        // Check if captcha is required
        if (response.captcha_required || response.error_code === 'CAPTCHA_REQUIRED') {
          setShowCaptchaModal(true);
          setErrors({ captcha: 'incorrect username or password' });
        } else {
          setErrors({ general: response.message || 'Login failed. Please try again.' });
        }
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      console.error('❌ Error response:', error.response?.data);
      
      // Check if 2FA is required in error response
      if (error.response?.data?.requires_2fa || error.response?.data?.error_code === '2FA_REQUIRED') {
        setRequires2FA(true);
        setSessionToken(error.response?.data?.session_token || null);
        setErrors({});
        setIsLoading(false);
        return;
      }
      
      // Check if captcha is required in error response
      if (error.response?.data?.captcha_required || error.response?.data?.error_code === 'CAPTCHA_REQUIRED') {
        setShowCaptchaModal(true);
        setErrors({ captcha: 'incorrect username or password' });
      } else {
        setErrors({ 
          general: error.response?.data?.message || error.message || 'An unexpected error occurred. Please try again.' 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (twoFactorCode.length !== 6) {
      setErrors({ general: 'Please enter a valid 6-digit code' });
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    try {
      const finalToken = captchaToken;
      
      const loginData = {
        username: formData.username,
        password: formData.password,
        two_factor_code: twoFactorCode,
        session_token: sessionToken,
        ...(finalToken && { captcha_token: finalToken })
      };
      
      const response = await authService.login(loginData as any);
      
      if (response.success) {
        // Redirect based on user type
        const userType = response.data.user.user_type;
        if (userType === 'admin') {
          navigate('/admin/dashboard');
        } else if (userType === 'vendor') {
          navigate('/vendor/');
        } else {
          navigate('/buyer/');
        }
      } else {
        if (response.error_code === 'INVALID_2FA_CODE') {
          setErrors({ general: 'Invalid 2FA code. Please try again.' });
          setTwoFactorCode("");
        } else if (response.error_code === 'INVALID_2FA_SESSION') {
          setErrors({ general: 'Session expired. Please login again.' });
          setRequires2FA(false);
          setSessionToken(null);
          setTwoFactorCode("");
        } else {
          setErrors({ general: response.message || 'Verification failed. Please try again.' });
        }
      }
    } catch (error: any) {
      console.error('❌ 2FA verification error:', error);
      if (error.response?.data?.error_code === 'INVALID_2FA_CODE') {
        setErrors({ general: 'Invalid 2FA code. Please try again.' });
        setTwoFactorCode("");
      } else if (error.response?.data?.error_code === 'INVALID_2FA_SESSION') {
        setErrors({ general: 'Session expired. Please login again.' });
        setRequires2FA(false);
        setSessionToken(null);
        setTwoFactorCode("");
      } else {
        setErrors({ 
          general: error.response?.data?.message || error.message || 'An unexpected error occurred. Please try again.' 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Left Side - Professional Image */}
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
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-purple-900/70 to-black/80"></div>

        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 text-center">
          {/* Floating Elements */}
          <div className="absolute top-20 right-20 w-16 h-16 bg-green-400/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-bounce border border-green-400/30">
            <TrendingUp className="w-8 h-8 text-green-400" />
          </div>
          <div className="absolute bottom-32 left-20 w-12 h-12 bg-yellow-400/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-pulse border border-yellow-400/30">
            <Zap className="w-6 h-6 text-yellow-400" />
          </div>
          <div className="absolute top-1/3 left-16 w-14 h-14 bg-purple-400/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-bounce delay-300 border border-purple-400/30">
            <Globe className="w-7 h-7 text-purple-400" />
          </div>

          <div className="max-w-lg mx-auto text-center">
            {/* Logo */}
            <div className="">
              <img 
                src="/images/logo.png" 
                className="h-32 w-auto mx-auto"
                style={{ 
                  opacity: 1,
                  imageRendering: 'auto',
                  WebkitFontSmoothing: 'antialiased',
                  filter: 'brightness(1.1) contrast(1.2)',
                  maxWidth: '100%',
                  height: 'auto'
                }}
                alt="AccountzClub Logo"
              />
            </div>
            <p className="text-lg text-blue-100/90 leading-relaxed font-medium font-sans">
              The most secure and anonymous marketplace for digital assets and premium accounts
            </p>
          </div>
          <div className="flex flex-col space-y-4 text-blue-200 mt-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-blue-500/30">
                <Shield className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-lg mt-2">Military-Grade Security</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-purple-500/30">
                <Lock className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-lg">Complete Anonymity</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-green-500/30">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-lg">24/7 Active Trading</span>
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
              {!requires2FA ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-gray-300">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="username"
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="Enter your username"
                      className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 transition-colors"
                      required
                      disabled={isLoading}
                    />
                    {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-300">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter your password"
                      className="pl-10 pr-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 transition-colors"
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
                    <input type="checkbox" className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500" />
                    <span className="text-sm text-gray-300">Remember me</span>
                  </label>
                  <Link to="/forgot-password">
                    <span className="text-sm text-blue-400 hover:text-blue-300 transition-colors cursor-pointer">
                      Forgot password?
                    </span>
                  </Link>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>

                {errors.general && <p className="text-red-500 text-center">{errors.general}</p>}
                {errors.captcha && <p className="text-red-500 text-center">{errors.captcha}</p>}

                <div className="text-center">
                  <span className="text-gray-400">Don't have an account? </span>
                  <Link to="/sign-up">
                    <span className="text-blue-400 hover:text-blue-300 transition-colors cursor-pointer font-semibold">
                      Create Account
                    </span>
                  </Link>
                </div>
              </form>
              ) : (
                <form onSubmit={handle2FASubmit} className="space-y-6">
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Two-Factor Authentication</h3>
                    <p className="text-gray-400 text-sm">
                      Enter the 6-digit code to complete your login
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <Label htmlFor="2fa-code" className="text-gray-300 text-center block">2FA Code</Label>
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={twoFactorCode}
                        onChange={(value) => setTwoFactorCode(value)}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} className="bg-gray-700 border-gray-600 text-white" />
                          <InputOTPSlot index={1} className="bg-gray-700 border-gray-600 text-white" />
                          <InputOTPSlot index={2} className="bg-gray-700 border-gray-600 text-white" />
                          <InputOTPSlot index={3} className="bg-gray-700 border-gray-600 text-white" />
                          <InputOTPSlot index={4} className="bg-gray-700 border-gray-600 text-white" />
                          <InputOTPSlot index={5} className="bg-gray-700 border-gray-600 text-white" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    
                    {errors.general && <p className="text-red-500 text-center text-sm">{errors.general}</p>}
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-300"
                      disabled={isLoading || twoFactorCode.length !== 6}
                    >
                      {isLoading ? 'Verifying...' : 'Verify Code'}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-gray-400 hover:text-gray-300"
                      onClick={() => {
                        setRequires2FA(false);
                        setTwoFactorCode("");
                        setSessionToken(null);
                      }}
                      disabled={isLoading}
                    >
                      Back to Login
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 text-center text-xs text-gray-500">
            Protected by enterprise-grade encryption and security protocols
          </div>
          
        </div>
      </div>

      {/* Captcha Modal */}
      <CircleCaptchaModal
        isOpen={showCaptchaModal}
        onClose={() => setShowCaptchaModal(false)}
        onVerify={handleCaptchaVerify}
        onError={handleCaptchaError}
        siteKey="login-captcha"
        title="Security prompt"
        instruction="Please click into the open circle to continue."
      />
    </div>
  );
}