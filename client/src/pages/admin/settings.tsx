import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, User, Lock, Bell, Loader2, KeyRound, Shield } from "lucide-react";
import { api, authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFAData, setTwoFAData] = useState<{qr_code?: string; secret?: string; uri?: string} | null>(null);

  // Load session timeout from localStorage on mount
  useEffect(() => {
    const savedTimeout = localStorage.getItem('sessionTimeout');
    if (savedTimeout) {
      setSecurity(prev => ({ ...prev, session_timeout: savedTimeout }));
    }
    fetchAdminData();
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
    navigate('/admin-sign-in');
  };

  // Check session on mount and user activity
  useEffect(() => {
    const checkSession = () => {
      const expiryTime = localStorage.getItem('sessionExpiry');
      if (expiryTime) {
        const timeLeft = parseInt(expiryTime) - Date.now();
        if (timeLeft <= 0) {
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
        
        // Set 2FA state from profile
        if (response.data.data.two_factor_enabled !== undefined) {
          setSecurity(prev => ({
            ...prev,
            two_factor_enabled: response.data.data.two_factor_enabled || false
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

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Check if 2FA is being enabled
      const previous2FAState = await api.get('/profile/').then((r: any) => r.data.data?.two_factor_enabled || false).catch(() => false);
      
      // Update profile
      await api.put('/profile/update/', {
        two_factor_enabled: security.two_factor_enabled
      });

      // If 2FA is being enabled (was false, now true), call enable endpoint to generate QR code
      if (security.two_factor_enabled && !previous2FAState) {
        try {
          const enableResponse = await api.post('/auth/enable-2fa/');
          if (enableResponse.data.success && enableResponse.data.data.qr_code) {
            // Show QR code in a modal/dialog
            setShow2FAModal(true);
            setTwoFAData(enableResponse.data.data);
            toast({
              title: "2FA Setup",
              description: "Scan the QR code with your authenticator app",
              variant: "default"
            });
          }
        } catch (error) {
          console.error('Error enabling 2FA:', error);
          toast({
            title: "Error",
            description: "Failed to setup 2FA. Please try again.",
            variant: "destructive"
          });
        }
      }
      
      // If 2FA is being disabled, call disable endpoint
      if (!security.two_factor_enabled && previous2FAState) {
        try {
          await api.post('/auth/disable-2fa/', {
            password: passwordData.current_password
          });
        } catch (error) {
          console.error('Error disabling 2FA:', error);
          toast({
            title: "Error",
            description: "Failed to disable 2FA. Please try again.",
            variant: "destructive"
          });
        }
      }

      // Save session timeout and start timer
      localStorage.setItem('sessionTimeout', security.session_timeout);
      startSessionTimer(security.session_timeout);

      toast({
        title: "Success",
        description: "Settings updated successfully"
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
                onCheckedChange={(checked) => setNotifications({...notifications, new_users: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">New Vendors</Label>
                <p className="text-sm text-gray-400">Get notified about vendor applications</p>
              </div>
              <Switch
                checked={notifications.new_vendors}
                onCheckedChange={(checked) => setNotifications({...notifications, new_vendors: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">New Orders</Label>
                <p className="text-sm text-gray-400">Get notified about new orders</p>
              </div>
              <Switch
                checked={notifications.new_orders}
                onCheckedChange={(checked) => setNotifications({...notifications, new_orders: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">Disputes</Label>
                <p className="text-sm text-gray-400">Get notified about new disputes</p>
              </div>
              <Switch
                checked={notifications.disputes}
                onCheckedChange={(checked) => setNotifications({...notifications, disputes: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">Security Alerts</Label>
                <p className="text-sm text-gray-400">Get notified about security issues</p>
              </div>
              <Switch
                checked={notifications.security_alerts}
                onCheckedChange={(checked) => setNotifications({...notifications, security_alerts: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">System Updates</Label>
                <p className="text-sm text-gray-400">Get notified about system updates</p>
              </div>
              <Switch
                checked={notifications.system_updates}
                onCheckedChange={(checked) => setNotifications({...notifications, system_updates: checked})}
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
                onCheckedChange={(checked) => setSecurity({...security, two_factor_enabled: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">Login Alerts</Label>
                <p className="text-sm text-gray-400">Get notified about account logins</p>
              </div>
              <Switch
                checked={security.login_alerts}
                onCheckedChange={(checked) => setSecurity({...security, login_alerts: checked})}
              />
            </div>

            <div>
              <Label htmlFor="sessionTimeout" className="text-gray-300">Session Timeout</Label>
              <select
                id="sessionTimeout"
                value={security.session_timeout}
                onChange={(e) => setSecurity({...security, session_timeout: e.target.value})}
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
                onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
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
                onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
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
                onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
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
              <div className="flex justify-center">
                <img 
                  src={twoFAData.qr_code} 
                  alt="QR Code for 2FA" 
                  className="border-4 border-white rounded-lg"
                />
              </div>
            )}
            
            {twoFAData?.secret && (
              <div className="bg-gray-800 rounded-lg p-4">
                <Label className="text-gray-300 text-sm">Backup Secret (Store Securely)</Label>
                <div className="font-mono text-lg text-white mt-2 break-all">
                  {twoFAData.secret}
                </div>
              </div>
            )}
            
            <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-3">
              <p className="text-sm text-blue-300">
                Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.) 
                or manually enter the secret. Keep your backup secret secure in case you lose access to your device.
              </p>
            </div>
            
            <Button 
              onClick={() => setShow2FAModal(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </main>
  );
}

