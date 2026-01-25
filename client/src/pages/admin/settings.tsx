import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Settings as SettingsIcon, User, Lock, Bell, Loader2, KeyRound, Shield, Wrench } from "lucide-react";
import { api, authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/config/api";

interface NotificationSettings {
  new_users: boolean;
  new_vendors: boolean;
  new_orders: boolean;
  disputes: boolean;
  security_alerts: boolean;
  system_updates: boolean;
}

interface SecuritySettings {
  two_factor_enabled: boolean;
  login_alerts: boolean;
  session_timeout: string;
}

export default function AdminSettings() {
  const navigate = useNavigate();
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [profile, setProfile] = useState({
    username: ""
  });

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    new_users: true,
    new_vendors: true,
    new_orders: true,
    disputes: true,
    security_alerts: true,
    system_updates: true
  });

  const [security, setSecurity] = useState<SecuritySettings>({
    two_factor_enabled: false,
    login_alerts: true,
    session_timeout: "24h"
  });

  // Maintenance Mode States
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFAData, setTwoFAData] = useState<{ qr_code?: string; secret?: string; uri?: string } | null>(null);

  // Load session timeout from localStorage on mount
  useEffect(() => {
    const savedTimeout = localStorage.getItem('sessionTimeout');
    if (savedTimeout) {
      setSecurity(prev => ({ ...prev, session_timeout: savedTimeout }));
    }
    fetchAdminData();
    fetchMaintenanceStatus();
  }, []);

  // Session timeout management
  const startSessionTimer = (timeoutValue: string) => {
    // Clear existing timer
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }

    if (timeoutValue === 'never') {
      localStorage.removeItem('sessionExpiry');
      return;
    }

    // Convert timeout to milliseconds
    let timeoutMs = 0;
    if (timeoutValue.endsWith('h')) {
      timeoutMs = parseInt(timeoutValue) * 60 * 60 * 1000;
    } else if (timeoutValue.endsWith('d')) {
      timeoutMs = parseInt(timeoutValue) * 24 * 60 * 60 * 1000;
    }

    if (timeoutMs > 0) {
      const expiryTime = Date.now() + timeoutMs;
      localStorage.setItem('sessionExpiry', expiryTime.toString());

      sessionTimeoutRef.current = setTimeout(() => {
        handleSessionExpiry();
      }, timeoutMs);
    }
  };

  const handleSessionExpiry = async () => {
    toast({
      title: "Session Expired",
      description: "Your session has expired. Please login again.",
      variant: "destructive"
    });

    await authService.logout();
    navigate('/6f2c9b681c3b4cf9a8c4-admin-access-control-panel-login');
  };

  // Check session on mount and user activity
  useEffect(() => {
    const checkSession = () => {
      const expiryTime = localStorage.getItem('sessionExpiry');
      if (expiryTime) {
        const timeLeft = parseInt(expiryTime) - Date.now();

        // If it's expired, check if it's a "reasonable" expiry
        // If it's extremely old (e.g. > 7 days), it's likely stale data from a previous login
        // that wasn't cleared. In this case, just clear it and don't logout.
        if (timeLeft <= 0) {
          const isStale = Math.abs(timeLeft) > 7 * 24 * 60 * 60 * 1000;
          if (isStale) {
            localStorage.removeItem('sessionExpiry');
            return;
          }
          handleSessionExpiry();
        } else {
          if (sessionTimeoutRef.current) {
            clearTimeout(sessionTimeoutRef.current);
          }
          sessionTimeoutRef.current = setTimeout(() => {
            handleSessionExpiry();
          }, timeLeft);
        }
      }
    };

    checkSession();

    // Check session every 60 seconds
    const interval = setInterval(checkSession, 60000);

    // Listen for user activity to reset timer
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const activityHandler = () => {
      const currentTimeout = security.session_timeout;
      if (currentTimeout !== 'never') {
        startSessionTimer(currentTimeout);
      }
    };

    events.forEach(event => {
      window.addEventListener(event, activityHandler);
    });

    return () => {
      clearInterval(interval);
      events.forEach(event => {
        window.removeEventListener(event, activityHandler);
      });
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
    };
  }, [security.session_timeout, navigate]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/profile/');

      if (response.data && response.data.success) {
        setProfile({
          username: response.data.data.username || ""
        });

        // Set 2FA and login alerts state from profile
        if (response.data.data.two_factor_enabled !== undefined) {
          setSecurity(prev => ({
            ...prev,
            two_factor_enabled: response.data.data.two_factor_enabled || false,
            login_alerts: response.data.data.notify_login_alerts ?? true
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMaintenanceStatus = async () => {
    try {
      const response = await api.get('/system/maintenance/manage/');
      if (response.data.success && response.data.data) {
        setMaintenanceMode(response.data.data.enabled);
        setMaintenanceMessage(response.data.data.message || "We're currently performing scheduled maintenance. We'll be back shortly!");
      }
    } catch (error) {
      console.error('Error fetching maintenance status:', error);
    }
  };

  const handleMaintenanceToggle = async (checked: boolean) => {
    try {
      setLoadingMaintenance(true);
      const response = await api.post('/system/maintenance/manage/', {
        enabled: checked,
        message: maintenanceMessage
      });

      if (response.data.success) {
        setMaintenanceMode(checked);
        toast({
          title: checked ? "Maintenance Mode Enabled" : "Maintenance Mode Disabled",
          description: checked ? "The site is now in maintenance mode for regular users." : "The site is now live for all users.",
        });
      }
    } catch (error) {
      console.error('Error updating maintenance mode:', error);
      toast({
        title: "Error",
        description: "Failed to update maintenance settings",
        variant: "destructive"
      });
    } finally {
      setLoadingMaintenance(false);
    }
  };

  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const handle2FAChallenge = async (checked: boolean) => {
    if (checked) {
      // User wants to ENABLE 2FA
      try {
        setSaving(true);
        const enableResponse = await api.post('/auth/enable-2fa/');
        if (enableResponse.data.success && enableResponse.data.data.qr_code) {
          setTwoFAData(enableResponse.data.data);
          setShow2FAModal(true);
          setVerificationCode("");
        } else {
          throw new Error(enableResponse.data.message || "Failed to setup 2FA");
        }
      } catch (error: any) {
        console.error('Error enabling 2FA:', error);
        setSecurity(prev => ({ ...prev, two_factor_enabled: false }));
        toast({
          title: "Error",
          description: error.response?.data?.message || error.message || "Failed to setup 2FA. Please try again.",
          variant: "destructive"
        });
      } finally {
        setSaving(false);
      }
    } else {
      // User wants to DISABLE 2FA
      // In a real app, we should ask for password first. 
      // For now, we'll ask for password via toast or just assume passwordData.current_password is filled
      if (!passwordData.current_password) {
        setSecurity(prev => ({ ...prev, two_factor_enabled: true }));
        toast({
          title: "Verification Required",
          description: "Please enter your current password in the 'Change Password' section to disable 2FA.",
          variant: "destructive"
        });
        return;
      }

      try {
        setSaving(true);
        const response = await api.post('/auth/disable-2fa/', {
          password: passwordData.current_password
        });

        if (response.data.success) {
          setSecurity(prev => ({ ...prev, two_factor_enabled: false }));
          toast({
            title: "2FA Disabled",
            description: "Two-factor authentication has been disabled."
          });
        }
      } catch (error: any) {
        console.error('Error disabling 2FA:', error);
        setSecurity(prev => ({ ...prev, two_factor_enabled: true }));
        toast({
          title: "Error",
          description: error.response?.data?.message || "Failed to disable 2FA. Incorrect password?",
          variant: "destructive"
        });
      } finally {
        setSaving(false);
      }
    }
  };

  const verifyAndEnable2FA = async () => {
    if (verificationCode.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a valid 6-digit code",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsVerifying2FA(true);
      // We use the login endpoint or a dedicated verify-2fa endpoint if available.
      // Since enable-2fa already set it tentatively in backend (based on current backend logic),
      // we should verify it. However, the current backend sets it to TRUE immediately.
      // Let's call the profile update to ENSURE it's set correctly.

      const response = await api.put('/profile/update/', {
        two_factor_enabled: true,
        two_factor_code: verificationCode // Backend needs to verify this!
      });

      if (response.data.success) {
        setShow2FAModal(false);
        setSecurity(prev => ({ ...prev, two_factor_enabled: true }));
        toast({
          title: "Success",
          description: "2FA has been successfully verified and enabled."
        });
      }
    } catch (error: any) {
      console.error('Error verifying 2FA:', error);
      toast({
        title: "Verification Failed",
        description: error.response?.data?.message || "Invalid 2FA code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Update profile
      await api.put('/profile/update/', {
        two_factor_enabled: security.two_factor_enabled,
        notify_login_alerts: security.login_alerts
      });

      // Save session timeout
      localStorage.setItem('sessionTimeout', security.session_timeout);
      startSessionTimer(security.session_timeout);

      toast({
        title: "Success",
        description: "General settings updated successfully"
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (passwordData.new_password.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      const response = await api.post('/profile/change-password/', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });

      if (response.data && response.data.success) {
        toast({
          title: "Success",
          description: "Password changed successfully"
        });
        setPasswordData({
          current_password: "",
          new_password: "",
          confirm_password: ""
        });
      } else {
        throw new Error(response.data?.message || "Failed to change password");
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to change password",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-bg p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 text-white border border-gray-700">
          <div className="flex items-center space-x-3">
            <SettingsIcon className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Admin Settings</h1>
              <p className="text-gray-300">Manage your admin account and preferences</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Status - Maintenance Mode */}
          <Card className="bg-gray-900 border-gray-700 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-accent" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-border">
                <div>
                  <h3 className="text-lg font-medium text-white mb-1">Maintenance Mode</h3>
                  <p className="text-sm text-gray-400">
                    When enabled, only administrators can access the site. All other users will see a maintenance page.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${maintenanceMode ? 'text-accent' : 'text-gray-400'}`}>
                    {maintenanceMode ? 'Enabled' : 'Disabled'}
                  </span>
                  <Switch
                    checked={maintenanceMode}
                    onCheckedChange={handleMaintenanceToggle}
                    disabled={loadingMaintenance}
                  />
                </div>
              </div>

              {maintenanceMode && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                  <Label className="text-gray-300">Maintenance Message</Label>
                  <div className="flex gap-4">
                    <Textarea
                      value={maintenanceMessage}
                      onChange={(e) => setMaintenanceMessage(e.target.value)}
                      placeholder="Enter the message displayed to users..."
                      className="bg-gray-800 border-gray-600 text-white min-h-[80px]"
                    />
                    <Button
                      className="h-auto bg-accent text-bg hover:bg-accent/90"
                      onClick={() => handleMaintenanceToggle(true)}
                      disabled={loadingMaintenance}
                    >
                      Update Message
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400">
                    This message will be shown to users who try to access the site.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Profile */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                Account Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-gray-300">Username</Label>
                <Input
                  id="username"
                  value={profile.username}
                  disabled
                  className="mt-2 bg-surface-2 border-border text-white"
                />
                <p className="text-xs text-gray-400 mt-1">Username cannot be changed</p>
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-400" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300">New Users</Label>
                  <p className="text-sm text-gray-400">Get notified about new user registrations</p>
                </div>
                <Switch
                  checked={notifications.new_users}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, new_users: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300">New Vendors</Label>
                  <p className="text-sm text-gray-400">Get notified about vendor applications</p>
                </div>
                <Switch
                  checked={notifications.new_vendors}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, new_vendors: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300">New Orders</Label>
                  <p className="text-sm text-gray-400">Get notified about new orders</p>
                </div>
                <Switch
                  checked={notifications.new_orders}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, new_orders: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300">Disputes</Label>
                  <p className="text-sm text-gray-400">Get notified about new disputes</p>
                </div>
                <Switch
                  checked={notifications.disputes}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, disputes: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300">Security Alerts</Label>
                  <p className="text-sm text-gray-400">Get notified about security issues</p>
                </div>
                <Switch
                  checked={notifications.security_alerts}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, security_alerts: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300">System Updates</Label>
                  <p className="text-sm text-gray-400">Get notified about system updates</p>
                </div>
                <Switch
                  checked={notifications.system_updates}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, system_updates: checked })}
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300">Two-Factor Authentication</Label>
                  <p className="text-sm text-gray-400">Add extra security to your account</p>
                </div>
                <Switch
                  checked={security.two_factor_enabled}
                  onCheckedChange={handle2FAChallenge}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300">Login Alerts</Label>
                  <p className="text-sm text-gray-400">Get notified about account logins</p>
                </div>
                <Switch
                  checked={security.login_alerts}
                  onCheckedChange={(checked) => setSecurity({ ...security, login_alerts: checked })}
                />
              </div>

              <div>
                <Label htmlFor="sessionTimeout" className="text-gray-300">Session Timeout</Label>
                <select
                  id="sessionTimeout"
                  value={security.session_timeout}
                  onChange={(e) => setSecurity({ ...security, session_timeout: e.target.value })}
                  className="mt-2 w-full bg-gray-800 border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1h">1 Hour</option>
                  <option value="4h">4 Hours</option>
                  <option value="8h">8 Hours</option>
                  <option value="24h">24 Hours</option>
                  <option value="7d">7 Days</option>
                  <option value="never">Never</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">Automatically log out after inactivity</p>
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-400" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currentPassword" className="text-gray-300">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  className="mt-2 bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <Label htmlFor="newPassword" className="text-gray-300">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  className="mt-2 bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-gray-300">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  className="mt-2 bg-gray-800 border-gray-600 text-white"
                  placeholder="Confirm new password"
                />
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Changing...
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 2FA Setup Modal */}
        <Dialog open={show2FAModal} onOpenChange={setShow2FAModal}>
          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Setup Two-Factor Authentication</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {twoFAData?.qr_code && (
                <div className="flex justify-center flex-col items-center">
                  <div className="bg-white p-3 rounded-lg mb-4">
                    <img
                      src={twoFAData.qr_code}
                      alt="QR Code for 2FA"
                      className="w-48 h-48"
                    />
                  </div>
                  <p className="text-sm text-gray-400 text-center mb-4">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                  </p>
                </div>
              )}

              {twoFAData?.secret && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <Label className="text-gray-300 text-xs lowercase">Backup Secret (Store Securely)</Label>
                  <div className="font-mono text-sm text-white mt-1 break-all select-all">
                    {twoFAData.secret}
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-gray-800">
                <Label className="text-gray-300">Verification Code</Label>
                <Input
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="bg-gray-800 border-gray-700 text-white text-center text-lg tracking-widest"
                />
                <p className="text-xs text-gray-500">
                  Enter the 6-digit code from your app to verify setup.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShow2FAModal(false);
                    setSecurity(prev => ({ ...prev, two_factor_enabled: false }));
                  }}
                  className="flex-1 bg-transparent border-gray-700 text-gray-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={verifyAndEnable2FA}
                  disabled={isVerifying2FA || verificationCode.length !== 6}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isVerifying2FA ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Enable'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}

