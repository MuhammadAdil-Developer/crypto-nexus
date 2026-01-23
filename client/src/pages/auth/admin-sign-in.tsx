import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, Eye, EyeOff, Lock, User, Shield, Crown, Database, Server, Key } from "lucide-react";
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

  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isSubmitting2FA, setIsSubmitting2FA] = useState(false);

  // Reset CAPTCHA state on page load
  useEffect(() => {
    setCaptchaVerified(false);
    setCaptchaToken(null);
    setShowCaptchaModal(false);
    setPendingLoginAttempt(false);
  }, []);

  // Auto-submit when 6 digits are entered in 2FA
  useEffect(() => {
    if (requires2FA && twoFactorCode.length === 6 && !isLoading && !isSubmitting2FA) {
      const timer = setTimeout(() => {
        handle2FASubmit();
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [twoFactorCode, requires2FA, isLoading, isSubmitting2FA]);

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

      // Check for 2FA required
      if (response.requires_2fa || response.error_code === '2FA_REQUIRED') {
        console.log('🔐 2FA Required for admin login');
        setRequires2FA(true);
        setSessionToken(response.session_token || null);
        setErrors({});
        setIsLoading(false);
        return;
      }

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

      // Check for 2FA required in error
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

  const handle2FASubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (twoFactorCode.length !== 6) {
      setErrors({ general: 'Please enter a valid 6-digit code' });
      return;
    }

    if (isSubmitting2FA || isLoading) {
      return;
    }

    setIsSubmitting2FA(true);
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
      console.log('🔐 Admin 2FA verification response:', response);

      if (response.success) {
        // Check if user is admin
        if (response.data?.user?.user_type === 'admin') {
          console.log('✅ Admin login (2FA) successful, redirecting to /admin');
          navigate('/admin/dashboard');
        } else {
          setErrors({ general: 'Invalid username or password' });
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
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
      console.error('❌ Admin 2FA verification error:', error);
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
      setIsSubmitting2FA(false);
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
            objectFit: 'contain',
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

        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 text-center w-full h-full">
          {!isVideoLoading && (
            <>
              {/* Floating Elements - Positioned to corners to avoid text overlap */}
              <div className="absolute top-10 right-10 w-14 h-14 bg-red-400/10 backdrop-blur-md rounded-full flex items-center justify-center animate-bounce border border-red-400/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                <Crown className="w-7 h-7 text-red-400/70" />
              </div>
              <div className="absolute bottom-10 left-10 w-12 h-12 bg-purple-400/10 backdrop-blur-md rounded-full flex items-center justify-center animate-pulse border border-purple-400/20 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                <Database className="w-6 h-6 text-purple-400/70" />
              </div>
              <div className="absolute top-1/4 left-8 w-12 h-12 bg-blue-400/10 backdrop-blur-md rounded-full flex items-center justify-center animate-bounce delay-300 border border-blue-400/20 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                <Server className="w-6 h-6 text-blue-400/70" />
              </div>
            </>
          )}

          <div className={`max-w-lg mx-auto text-center transition-all duration-1000 transform ${isVideoLoading ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
            {/* Logo - Now synchronized with loading state */}
            <div className="mb-8">
              <img
                src="/images/logo.png"
                alt="AccountzClub Logo"
                className="h-20 w-auto mx-auto drop-shadow-[0_0_25px_rgba(239,68,68,0.3)]"
                style={{
                  opacity: 1,
                  position: 'relative',
                  zIndex: 10
                }}
              />
            </div>

            <p className="text-xl text-purple-100/90 leading-relaxed font-semibold font-sans tracking-wide mb-10 drop-shadow-md">
              Secure administrative access to manage the entire crypto marketplace ecosystem
            </p>

            <div className="flex flex-col space-y-6 text-purple-200/90 items-start max-w-xs mx-auto">
              <div className="flex items-center space-x-4 group cursor-default">
                <div className="w-12 h-12 bg-red-500/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-red-500/20 transition-all duration-300 group-hover:bg-red-500/20 group-hover:scale-110 shadow-lg shadow-red-900/20">
                  <Crown className="w-6 h-6 text-red-500" />
                </div>
                <span className="text-lg font-medium tracking-tight">Administrative Control</span>
              </div>

              <div className="flex items-center space-x-4 group cursor-default">
                <div className="w-12 h-12 bg-purple-500/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-purple-500/20 transition-all duration-300 group-hover:bg-purple-500/20 group-hover:scale-110 shadow-lg shadow-purple-900/20">
                  <Shield className="w-6 h-6 text-purple-500" />
                </div>
                <span className="text-lg font-medium tracking-tight">System Management</span>
              </div>

              <div className="flex items-center space-x-4 group cursor-default">
                <div className="w-12 h-12 bg-blue-500/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-blue-500/20 transition-all duration-300 group-hover:bg-blue-500/20 group-hover:scale-110 shadow-lg shadow-blue-900/20">
                  <Server className="w-6 h-6 text-blue-500" />
                </div>
                <span className="text-lg font-medium tracking-tight">Full System Access</span>
              </div>
            </div>
          </div>
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
            {!requires2FA && (
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#AD0539' }}>
                  <Key className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-white">Administrative Login</CardTitle>
              </CardHeader>
            )}
            <CardContent>
              {!requires2FA ? (
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
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Authenticating...
                      </>
                    ) : 'Sign In'}
                  </Button>

                  {errors.general && <p className="text-red-500 text-center">{errors.general}</p>}
                  {errors.captcha && <p className="text-red-500 text-center">{errors.captcha}</p>}

                </form>
              ) : (
                <form onSubmit={handle2FASubmit} className="space-y-6">
                  <div className="text-center mb-4 pt-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#AD0539' }}>
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Two-Factor Authentication</h3>
                    <p className="text-gray-400">
                      Enter the 6-digit security code from your authenticator app.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className="bg-gray-800/50 p-4 rounded-xl border border-red-800/20">
                        <InputOTP
                          maxLength={6}
                          value={twoFactorCode}
                          onChange={(value) => {
                            setTwoFactorCode(value);
                          }}
                        >
                          <InputOTPGroup className="gap-2">
                            <InputOTPSlot index={0} className="bg-gray-700 border-gray-600 text-white focus:border-red-500 w-12 h-12 text-lg" />
                            <InputOTPSlot index={1} className="bg-gray-700 border-gray-600 text-white focus:border-red-500 w-12 h-12 text-lg" />
                            <InputOTPSlot index={2} className="bg-gray-700 border-gray-600 text-white focus:border-red-500 w-12 h-12 text-lg" />
                            <InputOTPSlot index={3} className="bg-gray-700 border-gray-600 text-white focus:border-red-500 w-12 h-12 text-lg" />
                            <InputOTPSlot index={4} className="bg-gray-700 border-gray-600 text-white focus:border-red-500 w-12 h-12 text-lg" />
                            <InputOTPSlot index={5} className="bg-gray-700 border-gray-600 text-white focus:border-red-500 w-12 h-12 text-lg" />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                    </div>

                    {errors.general && <p className="text-red-500 text-center text-sm">{errors.general}</p>}

                    <div className="space-y-3">
                      <Button
                        type="submit"
                        className="w-full text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105"
                        style={{ backgroundColor: '#AD0539' }}
                        disabled={isLoading || twoFactorCode.length !== 6}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Verifying...
                          </>
                        ) : 'Verify & Sign In'}
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full text-gray-400 hover:text-white"
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
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 text-center text-xs text-gray-500">
            <div className="flex items-center justify-center space-x-2">
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
      />
    </div>
  );
}