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

export default function VenderSignIn() {
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
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const turnstileRef = useRef<CloudflareTurnstileHandle>(null);

  useEffect(() => {
    setCaptchaVerified(false);
    setCaptchaToken(null);
    setShowCaptchaModal(false);
    setPendingLoginAttempt(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

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

    if (!captchaVerified || !captchaToken) {
      setShowCaptchaModal(true);
      setPendingLoginAttempt(true);
      setErrors({ captcha: 'Please complete the security verification to continue' });
      return;
    }

    if (!turnstileToken) {
      setTurnstileError('Please complete the Cloudflare security check to continue.');
      return;
    }

    await performLogin();
  };

  const handleCaptchaVerify = (token: string) => {
    console.log('🔍 Captcha verified with token:', token);
    setCaptchaToken(token);
    setCaptchaVerified(true);
    setShowCaptchaModal(false);
    setErrors(prev => ({ ...prev, captcha: undefined }));

    setTimeout(() => {
      turnstileRef.current?.execute();
    }, 100);

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
      const finalToken = token || captchaToken;
      const currentTurnstileToken = turnstileToken;

      if (!currentTurnstileToken) {
        setTurnstileError('Please complete the Cloudflare security check to continue.');
        setIsLoading(false);
        return;
      }

      const loginData = {
        username: formData.username,
        password: formData.password,
        ...(finalToken && { captcha_token: finalToken }),
        cloudflare_token: currentTurnstileToken
      };

      const response: any = await authService.login(loginData as any);

      if (response.requires_2fa || response.error_code === '2FA_REQUIRED') {
        setRequires2FA(true);
        setSessionToken(response.session_token || null);
        setErrors({});
        setIsLoading(false);
        return;
      }

      if (response.success) {
        const userType = response.data.user.user_type;
        if (userType !== 'vendor') {
          setErrors({ general: 'Invalid username or password' });
          setIsLoading(false);
          return;
        }
        navigate('/vendor/');
      } else {
        if (response.captcha_required || response.error_code === 'CAPTCHA_REQUIRED') {
          setShowCaptchaModal(true);
          setErrors({ captcha: 'incorrect username or password' });
        } else {
          setErrors({ general: response.message || 'Login failed. Please try again.' });
        }
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);

      if (error.response?.data?.requires_2fa || error.response?.data?.error_code === '2FA_REQUIRED') {
        setRequires2FA(true);
        setSessionToken(error.response?.data?.session_token || null);
        setErrors({});
        setIsLoading(false);
        return;
      }

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
        const userType = response.data.user.user_type;
        if (userType !== 'vendor') {
          setErrors({ general: 'Invalid username or password' });
          setIsLoading(false);
          return;
        }
        navigate('/vendor/');
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
    <div className="h-screen overflow-hidden bg-black flex">
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
              e.currentTarget.style.opacity = '1';
            }}
            onTimeUpdate={(e) => {
              const video = e.currentTarget;
              if (video.duration && video.currentTime >= video.duration - 2.2) {
                video.pause();
                video.currentTime = video.duration - 2.2;
              }
            }}
            onEnded={(e) => {
              e.currentTarget.pause();
            }}
            onError={(e) => {
              console.error('Video failed to load:', e);
              e.currentTarget.style.display = 'none';
            }}
          >
            <source src="/venderlogin-sidebar.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-pink-950/60 pointer-events-none"></div>
      </div>

      {/* Right Side - Sign In Form */}
      <div className="w-full xl:w-1/2 flex items-center justify-center p-4 sm:p-6 relative bg-black overflow-y-auto">
        {/* Fixed background layers */}
        <div className="fixed inset-0 xl:left-1/2 bg-gradient-to-l from-transparent via-transparent to-black/60 pointer-events-none z-0"></div>
        <div className="fixed inset-0 xl:left-1/2 bg-gradient-to-br from-black/90 via-pink-950/40 to-black/90 z-0"></div>
        <div className="fixed inset-0 xl:left-1/2 bg-gradient-to-tr from-pink-950/30 via-black/70 to-rose-900/20 z-0"></div>
        <div
          className="fixed inset-0 xl:left-1/2 opacity-5 z-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>

        <div className="w-full max-w-md relative z-10 my-auto">
          <div className="text-center mb-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">Sign In</h2>
            <p className="text-gray-300 text-sm">Welcome back to AccountZ Club</p>
          </div>

          <Card className="border border-pink-800/30 bg-black/80 backdrop-blur-md shadow-2xl shadow-pink-900/20">
            {!requires2FA && (
              <CardHeader className="text-center pb-3 pt-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#AD0539' }}>
                  <Lock className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <CardTitle className="text-white text-lg">Access Your Account</CardTitle>
              </CardHeader>
            )}
            <CardContent className="px-4 sm:px-6 pb-4">
              {!requires2FA ? (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="username" className="text-gray-300 text-sm">Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="username"
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        placeholder="Enter your username"
                        className="pl-9 h-9 bg-black/40 border-gray-700/50 text-white text-sm placeholder-gray-500 focus:border-pink-500/50 focus:ring-pink-500/20 transition-colors"
                        required
                        disabled={isLoading}
                      />
                      {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-gray-300 text-sm">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="Enter your password"
                        className="pl-9 pr-9 h-9 bg-black/40 border-gray-700/50 text-white text-sm placeholder-gray-500 focus:border-pink-500/50 focus:ring-pink-500/20 transition-colors"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-gray-700/50 bg-black/40 text-pink-500 focus:ring-pink-500/50 w-3.5 h-3.5" />
                      <span className="text-xs text-gray-300">Remember me</span>
                    </label>
                    <Link to="/forgot-password">
                      <span className="text-xs transition-colors cursor-pointer" style={{ color: '#f2306d' }}>
                        Forgot password?
                      </span>
                    </Link>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-xs">Cloudflare Protection</Label>
                    <CloudflareTurnstile
                      ref={turnstileRef}
                      action="vendor_login"
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
                    className="w-full text-white font-semibold py-2 h-9 text-sm rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                    style={{ backgroundColor: '#d61853' }}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Button>

                  {errors.general && <p className="text-red-500 text-center text-xs">{errors.general}</p>}
                  {errors.captcha && <p className="text-red-500 text-center text-xs">{errors.captcha}</p>}

                  <div className="text-center pt-2">
                    <span className="text-gray-400 text-xs">Don't have an account? </span>
                    <Link to="/sign-up">
                      <span className="transition-colors cursor-pointer font-semibold text-xs" style={{ color: '#f2306d' }}>
                        Create Account
                      </span>
                    </Link>
                  </div>
                </form>
              ) : (
                <form onSubmit={handle2FASubmit} className="space-y-4">
                  <div className="text-center mb-3 pt-3">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#AD0539' }}>
                      <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">Two-Factor Authentication</h3>
                    <p className="text-gray-400 text-xs">
                      Enter the 6-digit code to complete your login
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="2fa-code" className="text-gray-300 text-center block text-sm">2FA Code</Label>
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={twoFactorCode}
                        onChange={(value) => setTwoFactorCode(value)}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} className="bg-black/40 border-gray-700/50 text-white focus:border-pink-500/50 w-9 h-9 text-sm" />
                          <InputOTPSlot index={1} className="bg-black/40 border-gray-700/50 text-white focus:border-pink-500/50 w-9 h-9 text-sm" />
                          <InputOTPSlot index={2} className="bg-black/40 border-gray-700/50 text-white focus:border-pink-500/50 w-9 h-9 text-sm" />
                          <InputOTPSlot index={3} className="bg-black/40 border-gray-700/50 text-white focus:border-pink-500/50 w-9 h-9 text-sm" />
                          <InputOTPSlot index={4} className="bg-black/40 border-gray-700/50 text-white focus:border-pink-500/50 w-9 h-9 text-sm" />
                          <InputOTPSlot index={5} className="bg-black/40 border-gray-700/50 text-white focus:border-pink-500/50 w-9 h-9 text-sm" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    {errors.general && <p className="text-red-500 text-center text-xs">{errors.general}</p>}

                    <Button
                      type="submit"
                      className="w-full text-white font-semibold py-2 h-9 text-sm rounded-lg transition-all duration-300 shadow-lg"
                      style={{ backgroundColor: '#AD0539' }}
                      disabled={isLoading || twoFactorCode.length !== 6}
                    >
                      {isLoading ? 'Verifying...' : 'Verify Code'}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-gray-400 hover:text-gray-300 h-8 text-xs"
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

          <div className="mt-3 text-center text-xs text-gray-400">
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