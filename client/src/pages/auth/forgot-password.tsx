import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Key, ArrowLeft, Shield, Lock, CheckCircle, RefreshCcw } from "lucide-react";
import CircleCaptchaModal from "@/components/captcha/CircleCaptchaModal";
import { authService } from "@/services/authService";
import { toast } from "sonner";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    recovery_phrase: "",
    new_password: "",
    confirm_password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showCaptchaModal, setShowCaptchaModal] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    recovery_phrase?: string;
    new_password?: string;
    confirm_password?: string;
    general?: string;
  }>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};
    if (!formData.username) newErrors.username = "Username is required";
    if (!formData.recovery_phrase) newErrors.recovery_phrase = "Recovery phrase is required";
    if (!formData.new_password) {
      newErrors.new_password = "New password is required";
    } else if (formData.new_password.length < 8) {
      newErrors.new_password = "Password must be at least 8 characters";
    }
    if (formData.new_password !== formData.confirm_password) {
      newErrors.confirm_password = "Passwords do not match";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowCaptchaModal(true);
    }
  };

  const handleCaptchaVerify = async (token: string) => {
    setShowCaptchaModal(false);
    setIsLoading(true);
    setErrors({});

    try {
      const response = await authService.recoverAccount(
        formData.username,
        formData.recovery_phrase.trim(),
        formData.new_password
      );

      if (response.success) {
        setIsSubmitted(true);
        toast.success("Password reset successful!");
      } else {
        setErrors({ general: response.message || "Recovery failed. Please check your username and phrase." });
      }
    } catch (error: any) {
      setErrors({ general: "An unexpected error occurred. Please try again later." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-4">
            <img src="/images/logo.png" alt="Logo" className="h-10 w-auto mx-auto" />
          </Link>
          <h2 className="text-3xl font-bold text-white mb-2">Account Recovery</h2>
          <p className="text-gray-400">Regain access using your 12-word recovery phrase</p>
          {/* <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg max-w-sm mx-auto">
            <p className="text-blue-300 text-xs leading-relaxed">
              <strong>Anonymous Recovery:</strong> Since we don't collect emails, your recovery phrase is the only way to reset your password.
            </p>
          </div> */}
        </div>

        {!isSubmitted ? (
          <Card className="border border-gray-700 bg-gray-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-center">Reset Password</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-gray-300 font-bold uppercase tracking-wider text-xs">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="Enter your username"
                      className="pl-10 bg-gray-900/50 border-gray-700 text-white"
                    />
                  </div>
                  {errors.username && <p className="text-red-400 text-xs">{errors.username}</p>}
                </div>

                {/* Recovery Phrase */}
                <div className="space-y-2">
                  <Label htmlFor="recovery_phrase" className="text-gray-300 font-bold uppercase tracking-wider text-xs">Recovery Phrase (12 words)</Label>
                  <div className="relative">
                    <RefreshCcw className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                    <textarea
                      id="recovery_phrase"
                      name="recovery_phrase"
                      value={formData.recovery_phrase}
                      onChange={handleInputChange}
                      placeholder="Enter your 12-word recovery phrase..."
                      className="w-full min-h-[100px] pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-md text-white text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                    />
                  </div>
                  {errors.recovery_phrase && <p className="text-red-400 text-xs">{errors.recovery_phrase}</p>}
                </div>

                {/* New Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new_password" className="text-gray-300 font-bold uppercase tracking-wider text-xs">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="new_password"
                        name="new_password"
                        type={showPassword ? "text" : "password"}
                        value={formData.new_password}
                        onChange={handleInputChange}
                        className="pl-10 bg-gray-900/50 border-gray-700 text-white"
                      />
                    </div>
                    {errors.new_password && <p className="text-red-400 text-xs">{errors.new_password}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password" className="text-gray-300 font-bold uppercase tracking-wider text-xs">Confirm</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="confirm_password"
                        name="confirm_password"
                        type={showPassword ? "text" : "password"}
                        value={formData.confirm_password}
                        onChange={handleInputChange}
                        className="pl-10 bg-gray-900/50 border-gray-700 text-white"
                      />
                    </div>
                  </div>
                </div>

                {errors.general && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                    <p className="text-red-400 text-sm text-center">{errors.general}</p>
                  </div>
                )}

                <Button type="submit" disabled={isLoading} className="w-full bg-[#c02053ff] hover:bg-[#a01a45ff] text-white">
                  {isLoading ? "Processing..." : "Reset Password"}
                </Button>

                <div className="text-center">
                  <Link to="/sign-in" className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-gray-700 bg-gray-800/50 backdrop-blur-sm text-center py-8">
            <CardContent className="space-y-6">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <CardTitle className="text-white mb-2">Success!</CardTitle>
                <p className="text-gray-400">Your password has been reset successfully. You can now log in with your new credentials.</p>
              </div>
              <Button onClick={() => navigate("/sign-in")} className="w-full bg-blue-600 hover:bg-blue-700">
                Go to Login
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <CircleCaptchaModal
        isOpen={showCaptchaModal}
        onClose={() => setShowCaptchaModal(false)}
        onVerify={handleCaptchaVerify}
        siteKey="recovery-captcha"
      />
    </div>
  );
}
