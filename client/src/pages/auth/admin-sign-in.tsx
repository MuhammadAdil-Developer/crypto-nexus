import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Lock, User, Shield, Crown, Database, Server, Key } from "lucide-react";
import { authService } from "@/services/authService";
import CircleCaptchaModal from "@/components/captcha/CircleCaptchaModal";
import { CloudflareTurnstile, CloudflareTurnstileHandle } from "@/components/security/CloudflareTurnstile";

export default function AdminSignIn() {
  const navigate = useNavigate();
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  
  // Protect admin route - check if user is trying to access directly
  useEffect(() => {
    // Add a simple check - you can enhance this with more security
    const referrer = document.referrer;
    const isDirectAccess = !referrer || referrer === window.location.href;
    
    // Optional: Add a secret key check or other protection mechanism
    // For now, we'll just log it (you can add more protection as needed)
    if (isDirectAccess) {
      console.log('Admin sign-in accessed directly');
    }
  }, []);
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
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const turnstileRef = useRef<CloudflareTurnstileHandle>(null);
  
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

    if (!turnstileToken) {
      setTurnstileError('Please complete the Cloudflare security check to continue.');
      return;
    }

    // Proceed with login if CAPTCHA is verified
    await performLogin();
  };

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
    setCaptchaVerified(true);
    setShowCaptchaModal(false); // Close CAPTCHA modal
    // Only clear captcha error, keep other errors
    setErrors(prev => ({ ...prev, captcha: undefined }));
    
    // Execute Cloudflare Turnstile after circle captcha is verified
    // This ensures user interaction is required
    setTimeout(() => {
      turnstileRef.current?.execute();
    }, 100);
    
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

  const handleTurnstileVerify = (token: string) => {
    setTurnstileToken(token);
    setTurnstileError(null);
  };

  const handleTurnstileExpire = () => {
    setTurnstileToken(null);
    setTurnstileError("Security check expired. Please verify again.");
  };

  const performLogin = async (token?: string) => {
    setIsLoading(true);
    setErrors({});
    setTurnstileError(null);

    try {
      // Use the passed token or fall back to state
      const finalToken = token || captchaToken;
      const currentTurnstileToken = turnstileToken;

      if (!currentTurnstileToken) {
        setTurnstileError('Please complete the Cloudflare security check to continue.');
        setIsLoading(false);
        return;
      }
      
      const loginData = {
        ...formData,
        ...(finalToken && { captcha_token: finalToken }),  // Only include if token exists
        cloudflare_token: currentTurnstileToken
      };
      
      const response = await authService.login(loginData as any);
      console.log('🔐 Admin login response:', response);
      
      if (response.success) {
        // Check if user is admin (only admins can login from admin-sign-in page)
        if (response.data?.user?.user_type === 'admin') {
          console.log('✅ Admin login successful, redirecting to /admin');
          navigate('/admin/dashboard');
        } else {
          setErrors({ 
            general: 'Invalid username or password' 
          });
          // Clear stored data since non-admin tried to access admin login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
        }
      } else {
        // Check if captcha is required
        if (response.captcha_required || response.error_code === 'CAPTCHA_REQUIRED') {
          setShowCaptchaModal(true);
          setErrors({ captcha: 'incorrect username or password' });
        } else {
          setErrors({ general: response.message || 'Login failed. Please try again.' });
        }
      }
    } catch (error: any) {
      console.error('❌ Admin login error:', error);
      
      // Check if captcha is required in error response
      if (error.response?.data?.captcha_required || error.response?.data?.error_code === 'CAPTCHA_REQUIRED') {
        setShowCaptchaModal(true);
        setErrors({ captcha: 'incorrect username or passwor' });
      } else {
        setErrors({ 
          general: error.response?.data?.message || error.message || 'An unexpected error occurred. Please try again.' 
        });
      }
    } finally {
      setIsLoading(false);
      setTurnstileToken(null);
      setTurnstileResetKey(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-black flex">
      {/* Left Side - Video */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {isVideoLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white text-sm">Loading secure access...</p>
            </div>
          </div>
        )}
        <video 
          autoPlay 
          muted 
          playsInline
          className="w-full h-full object-cover"
          style={{
            objectFit: 'cover',
            transition: 'opacity 0.5s ease-in-out'
          }}
          onLoadedData={(e) => {
            // Ensure smooth rendering when video is loaded
            e.currentTarget.style.opacity = '1';
            setIsVideoLoading(false);
          }}
          onTimeUpdate={(e) => {
            const video = e.currentTarget;
            // Stop video 1 second before it ends
            if (video.duration && video.currentTime >= video.duration - 1) {
              video.pause();
              video.currentTime = video.duration - 1;
            }
          }}
          onEnded={(e) => {
            // Pause at the last frame when video ends
            e.currentTarget.pause();
          }}
          onError={(e) => {
            console.error('Video failed to load:', e);
            setIsVideoLoading(false);
            // Fallback to a dark background if video fails
            e.currentTarget.style.display = 'none';
          }}
        >
          <source src="/adminlogin-sidebar.mp4" type="video/mp4" />
        </video>
        {/* Fade gradient overlay on right edge to blend with right side */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/60 pointer-events-none"></div>

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
            {/* Logo - Always visible, not dependent on video */}
            <div className="mb-6">
              <img 
                src="/images/logo.png" 
                alt="AccountzClub Logo" 
                className="h-20 w-auto mx-auto"
                style={{ 
                  opacity: 0.9,
                  position: 'relative',
                  zIndex: 10
                }}
              />
            </div>
            {!isVideoLoading && (
              <p className="text-lg text-purple-100/90 leading-relaxed font-medium font-sans">
                Secure administrative access to manage the entire crypto marketplace ecosystem
              </p>
            )}
          </div>
          {!isVideoLoading && (
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
          )}
        </div>
      </div>

      {/* Right Side - Admin Sign In Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative bg-black">
        {/* Fade gradient overlay on left edge to blend with video */}
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-black/60 pointer-events-none z-0"></div>
        {/* Mixed gradient overlay to match video aesthetic - red/purple and black shades */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-red-950/30 to-black/90 z-0"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-950/20 via-black/70 to-red-900/15 z-0"></div>
        
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Admin Access</h2>
            <p className="text-gray-400">Administrative login only</p>
          </div>

          <Card className="border border-red-800/30 bg-black/80 backdrop-blur-md shadow-2xl shadow-red-900/20">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#AD0539' }}>
                <Key className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-white">Administrative Login</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-gray-300">Admin Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="username"
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="Enter admin username"
                      className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 transition-colors"
                      required
                      disabled={isLoading}
                    />
                    {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
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

                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Cloudflare Protection</Label>
                <CloudflareTurnstile
                  ref={turnstileRef}
                  action="admin_login"
                  theme="dark"
                  size="flexible"
                  retryKey={turnstileResetKey}
                  onVerify={handleTurnstileVerify}
                  onExpire={handleTurnstileExpire}
                  onError={(msg) => setTurnstileError(msg || 'Security check failed. Please refresh and try again.')}
                  className="mt-1"
                />
                  {turnstileError && <p className="text-red-400 text-sm">{turnstileError}</p>}
                </div>

                <Button 
                  type="submit" 
                  className="w-full text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105"
                  style={{ backgroundColor: '#AD0539' }}
                  disabled={isLoading}
                >
                  {isLoading ? 'Authenticating...' : 'Sign In'}
                </Button>

                {errors.general && <p className="text-red-500 text-center">{errors.general}</p>}
                {errors.captcha && <p className="text-red-500 text-center">{errors.captcha}</p>}

              </form>
            </CardContent>
          </Card>

          <div className="mt-6 text-center text-xs text-gray-500">
            <div className="flex items-center justify-center space-x-2">
              <Shield className="w-4 h-4 text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Captcha Modal */}
      <CircleCaptchaModal
        isOpen={showCaptchaModal}
        onClose={() => setShowCaptchaModal(false)}
        onVerify={handleCaptchaVerify}
        onError={handleCaptchaError}
        siteKey="admin-login-captcha"
        title="Security prompt"
        instruction="Please click into the open circle to continue."
      />
    </div>
  );
}