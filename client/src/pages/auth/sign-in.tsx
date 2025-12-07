import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Lock, User, Shield } from "lucide-react";
import { authService } from "@/services/authService";
import CircleCaptchaModal from "@/components/captcha/CircleCaptchaModal";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { CloudflareTurnstile, CloudflareTurnstileHandle } from "@/components/security/CloudflareTurnstile";

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
  const [isSubmitting2FA, setIsSubmitting2FA] = useState(false);
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

  // Auto-submit when 6 digits are entered in 2FA
  useEffect(() => {
    if (requires2FA && twoFactorCode.length === 6 && !isLoading && !isSubmitting2FA) {
      const timer = setTimeout(() => {
        handle2FASubmit();
      }, 300); // Small delay to ensure state is updated
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
    console.log('🔍 Captcha verified with token:', token);
    console.log('🔍 Token length:', token.length);
    console.log('🔍 Token type:', typeof token);
    setCaptchaToken(token);
    setCaptchaVerified(true);
    setShowCaptchaModal(false); // Close CAPTCHA modal
    // Only clear captcha error, keep other errors
    setErrors(prev => ({ ...prev, captcha: undefined }));
    console.log('🔍 Captcha token set to state:', token);

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

      console.log('🔍 Attempting login with data:', {
        username: formData.username,
        password: '***',
        captcha_token: finalToken,
        cloudflare_token: currentTurnstileToken ? '[present]' : '[missing]'
      });

      const loginData = {
        username: formData.username,
        password: formData.password,
        ...(finalToken && { captcha_token: finalToken }),  // Only include if token exists
        cloudflare_token: currentTurnstileToken
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
        // Check if user is buyer (only buyers can login from sign-in page)
        const userType = response.data.user.user_type;
        if (userType !== 'buyer') {
          setErrors({ general: 'Invalid username or password' });
          setIsLoading(false);
          return;
        }
        // Redirect to buyer dashboard
        navigate('/buyer/');
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

    // Prevent multiple submissions
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

      if (response.success) {
        // Check if user is buyer (only buyers can login from sign-in page)
        const userType = response.data.user.user_type;
        if (userType !== 'buyer') {
          setErrors({ general: 'Invalid username or password' });
          setIsLoading(false);
          return;
        }
        // Redirect to buyer dashboard
        navigate('/buyer/');
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
      setIsSubmitting2FA(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex">
      {/* Left Side - Video */}
      <div className="hidden xl:flex xl:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <video
            autoPlay
            muted
            playsInline
            className="w-auto h-full"
            style={{
              minWidth: '100%',
              minHeight: '100%',
              objectFit: 'cover',
              transition: 'opacity 0.5s ease-in-out'
            }}
            onLoadedData={(e) => {
              // Ensure smooth rendering when video is loaded
              e.currentTarget.style.opacity = '1';
            }}
            onTimeUpdate={(e) => {
              const video = e.currentTarget;
              // Cut last 0.2 seconds (200ms) - pause before video ends
              if (video.duration && video.currentTime >= video.duration - 0.2) {
                video.pause();
                video.currentTime = video.duration - 0.2;
              }
            }}
            onEnded={(e) => {
              // Pause at the last frame when video ends
              e.currentTarget.pause();
            }}
            onError={(e) => {
              console.error('Video failed to load:', e);
              // Fallback to a dark background if video fails
              e.currentTarget.style.display = 'none';
            }}
          >
            <source src="/userlogin-sidebar.mp4" type="video/mp4" />
          </video>
        </div>
        {/* Fade gradient overlay on right edge to blend with right side */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-blue-950/60 pointer-events-none"></div>
      </div>

      {/* Right Side - Sign In Form */}
      <div className="w-full xl:w-1/2 flex items-center justify-center p-8 relative bg-gray-950">
        {/* Fade gradient overlay on left edge to blend with video */}
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-gray-950/50 pointer-events-none z-0"></div>
        {/* Blue light effect from left (like sunlight) - more visible */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-800/30 via-blue-900/15 to-transparent pointer-events-none z-0"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700/25 via-blue-800/10 to-gray-950/90 pointer-events-none z-0"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 via-transparent to-gray-950/95 pointer-events-none z-0"></div>
        {/* Lighter black overlay - not too dark */}
        <div className="absolute inset-0 bg-gray-950/60 z-0"></div>
        {/* Subtle geometric pattern overlay */}
        <div
          className="absolute inset-0 opacity-5 z-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>

        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Sign In</h2>
            <p className="text-gray-300">Welcome back to AccountZ Club</p>
          </div>

          <Card className="border border-blue-800/20 backdrop-blur-md shadow-2xl shadow-blue-900/10" style={{ background: 'linear-gradient(to bottom, #010717, #14182B)' }}>
            {!requires2FA && (
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ backgroundColor: '#AD0539' }}>
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-white">Access Your Account</CardTitle>
              </CardHeader>
            )}
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
                        className="pl-10 bg-black/40 border-gray-700/50 text-white placeholder-gray-500 focus:border-pink-500/50 focus:ring-pink-500/20 transition-colors"
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
                        className="pl-10 pr-10 bg-black/40 border-gray-700/50 text-white placeholder-gray-500 focus:border-pink-500/50 focus:ring-pink-500/20 transition-colors"
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
                      <input type="checkbox" className="rounded border-gray-700/50 bg-black/40 text-pink-500 focus:ring-pink-500/50" />
                      <span className="text-sm text-gray-300">Remember me</span>
                    </label>
                    <Link to="/forgot-password">
                      <span className="text-sm transition-colors cursor-pointer" style={{ color: '#f2306d' }}>
                        Forgot password?
                      </span>
                    </Link>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Cloudflare Protection</Label>
                    <CloudflareTurnstile
                      ref={turnstileRef}
                      action="buyer_login"
                      theme="dark"
                      size="flexible"
                      retryKey={turnstileResetKey}
                      onVerify={handleTurnstileVerify}
                      onExpire={handleTurnstileExpire}
                      onError={(msg) => setTurnstileError(msg || 'Security check failed. Please refresh and try again.')}
                      className="mt-1"
                    />
                    {turnstileError && <p className="text-red-500 text-xs">{turnstileError}</p>}
                  </div>

                  <Button
                    type="submit"
                    className="w-full text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                    style={{ backgroundColor: '#c4144b' }}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Button>

                  {errors.general && <p className="text-red-500 text-center">{errors.general}</p>}
                  {errors.captcha && <p className="text-red-500 text-center">{errors.captcha}</p>}

                  <div className="text-center space-y-3">
                    <div>
                      <span className="text-gray-400">Don't have an account? </span>
                      <Link to="/sign-up">
                        <span className="transition-colors cursor-pointer font-semibold" style={{ color: '#f2306d' }}>
                          Create Account
                        </span>
                      </Link>
                    </div>
                    <div className="pt-2 border-t border-gray-700/50">
                      <span className="text-gray-400 text-sm">Are you a vendor? </span>
                      <Link to="/vender-sign-in">
                        <span className="transition-all duration-300 cursor-pointer font-semibold hover:underline inline-flex items-center gap-1" style={{ color: '#f2306d' }}>
                          Vendor Sign In
                          <svg className="w-4 h-4 inline-block transition-transform duration-300 hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </Link>
                    </div>
                  </div>
                </form>
              ) : (
                <form onSubmit={handle2FASubmit} className="space-y-6">
                  <div className="text-center mb-4 pt-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ backgroundColor: '#AD0539' }}>
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
                        onChange={(value) => {
                          setTwoFactorCode(value);
                        }}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} className="bg-black/40 border-gray-700/50 text-white focus:border-pink-500/50" />
                          <InputOTPSlot index={1} className="bg-black/40 border-gray-700/50 text-white focus:border-pink-500/50" />
                          <InputOTPSlot index={2} className="bg-black/40 border-gray-700/50 text-white focus:border-pink-500/50" />
                          <InputOTPSlot index={3} className="bg-black/40 border-gray-700/50 text-white focus:border-pink-500/50" />
                          <InputOTPSlot index={4} className="bg-black/40 border-gray-700/50 text-white focus:border-pink-500/50" />
                          <InputOTPSlot index={5} className="bg-black/40 border-gray-700/50 text-white focus:border-pink-500/50" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    {errors.general && <p className="text-red-500 text-center text-sm">{errors.general}</p>}

                    <Button
                      type="submit"
                      className="w-full text-white font-semibold py-3 rounded-lg transition-all duration-300 shadow-lg"
                      style={{ backgroundColor: '#d61853' }}
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

          <div className="mt-6 text-center text-xs text-gray-400">
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