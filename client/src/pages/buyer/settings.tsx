import { useState, useEffect } from "react";
import { Settings as SettingsIcon, User, Lock, Bell, Save, Loader2 } from "lucide-react";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/authService";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface UserProfile {
  username: string;
  phone?: string;
}

interface NotificationSettings {
  order_updates: boolean;
  price_alerts: boolean;
  marketing_emails: boolean;
  security_alerts: boolean;
  vendor_messages: boolean;
}

interface SecuritySettings {
  two_factor_enabled: boolean;
  login_alerts: boolean;
  session_timeout: string;
}

export default function BuyerSettings() {
  const [profile, setProfile] = useState<UserProfile>({
    username: "",
    phone: ""
  });

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    order_updates: true,
    price_alerts: true,
    marketing_emails: false,
    security_alerts: true,
    vendor_messages: true
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

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/profile/');
      
      if (response.data && response.data.success) {
        setProfile({
          username: response.data.data.username || "",
          phone: response.data.data.phone || ""
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
      console.error('Error fetching user data:', error);
      toast({
        title: "Error",
        description: "Failed to load user data",
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
      const previous2FAState = await api.get('/profile/').then(r => r.data.data?.two_factor_enabled || false).catch(() => false);
      
      // Update profile
      await api.put('/profile/update/', {
        username: profile.username,
        phone: profile.phone,
        // Include 2FA setting
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
        description: "New passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (passwordData.new_password.length < 8) {
      toast({
        title: "Error",
        description: "New password must be at least 8 characters long",
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

      console.log('Password change response:', response);
      
      // Handle different response formats
      if (response.data) {
        // Check if success is true or if the response itself indicates success
        if (response.data.success === true || response.status === 200) {
          setPasswordData({
            current_password: "",
            new_password: "",
            confirm_password: ""
          });

          toast({
            title: "Success",
            description: response.data.message || "Password changed successfully"
          });
          return;
        } else {
          // Check for error message in response
          const errorMsg = response.data.message || response.data.error || "Failed to change password";
          throw new Error(errorMsg);
        }
      } else {
        throw new Error("No response data received");
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      console.error('Error response:', error.response);
      
      // Extract error message from various possible locations
      let errorMessage = "Failed to change password";
      
      if (error.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <BuyerLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </BuyerLayout>
    );
  }

  return (
    <BuyerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 text-white border border-gray-700">
          <div className="flex items-center space-x-3">
            <SettingsIcon className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Account Settings</h1>
              <p className="text-gray-300">Manage your account preferences and security</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Settings */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-gray-300">Username</Label>
                <Input
                  id="username"
                  value={profile.username}
                  onChange={(e) => setProfile({...profile, username: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-gray-300">Phone Number</Label>
                <Input
                  id="phone"
                  value={profile.phone || ""}
                  onChange={(e) => setProfile({...profile, phone: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
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
                  <Label className="text-gray-300">Order Updates</Label>
                  <p className="text-sm text-gray-400">Get notified about order status changes</p>
                </div>
                <Switch
                  checked={notifications.order_updates}
                  onCheckedChange={(checked) => setNotifications({...notifications, order_updates: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300">Price Alerts</Label>
                  <p className="text-sm text-gray-400">Get notified when wishlist items go on sale</p>
                </div>
                <Switch
                  checked={notifications.price_alerts}
                  onCheckedChange={(checked) => setNotifications({...notifications, price_alerts: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300">Vendor Messages</Label>
                  <p className="text-sm text-gray-400">Get notified about new messages from vendors</p>
                </div>
                <Switch
                  checked={notifications.vendor_messages}
                  onCheckedChange={(checked) => setNotifications({...notifications, vendor_messages: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300">Security Alerts</Label>
                  <p className="text-sm text-gray-400">Get notified about security events</p>
                </div>
                <Switch
                  checked={notifications.security_alerts}
                  onCheckedChange={(checked) => setNotifications({...notifications, security_alerts: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300">Marketing Emails</Label>
                  <p className="text-sm text-gray-400">Receive promotional emails and updates</p>
                </div>
                <Switch
                  checked={notifications.marketing_emails}
                  onCheckedChange={(checked) => setNotifications({...notifications, marketing_emails: checked})}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-400" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300">Two-Factor Authentication</Label>
                  <p className="text-sm text-gray-400">Add an extra layer of security to your account</p>
                </div>
                <Switch
                  checked={security.two_factor_enabled}
                  onCheckedChange={(checked) => setSecurity({...security, two_factor_enabled: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300">Login Alerts</Label>
                  <p className="text-sm text-gray-400">Get notified when someone logs into your account</p>
                </div>
                <Switch
                  checked={security.login_alerts}
                  onCheckedChange={(checked) => setSecurity({...security, login_alerts: checked})}
                />
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-400" />
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
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>

              <div>
                <Label htmlFor="newPassword" className="text-gray-300">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-gray-300">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>

              <Button 
                onClick={handleChangePassword} 
                disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Changing...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Change Password
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-6">
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
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 2FA QR Code Modal */}
      <Dialog open={show2FAModal} onOpenChange={setShow2FAModal}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-400" />
              Set Up Two-Factor Authentication
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {twoFAData?.qr_code && (
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-white p-4 rounded-lg">
                  <img 
                    src={twoFAData.qr_code} 
                    alt="2FA QR Code" 
                    className="w-64 h-64"
                  />
                </div>
                
                {twoFAData.secret && (
                  <div className="w-full">
                    <Label className="text-gray-300 text-sm">Backup Secret Key (use if QR code doesn't work)</Label>
                    <div className="mt-2 p-3 bg-gray-800 rounded-lg border border-gray-700">
                      <code className="text-sm text-gray-200 break-all select-all">{twoFAData.secret}</code>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Enter this key manually in your authenticator app if you can't scan the QR code
                    </p>
                  </div>
                )}
                
                <div className="w-full bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-sm text-blue-200">
                    <strong className="text-blue-300">Steps:</strong>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-blue-200 mt-2">
                    <li>Install Google Authenticator, Authy, or Microsoft Authenticator on your phone</li>
                    <li>Open the app and tap "Add account" or "+"</li>
                    <li>Scan the QR code above or enter the secret key manually</li>
                    <li>Use the 6-digit code from the app when logging in</li>
                  </ol>
                </div>
              </div>
            )}
            
            <Button
              onClick={() => setShow2FAModal(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              I've Scanned the QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </BuyerLayout>
  );
}
