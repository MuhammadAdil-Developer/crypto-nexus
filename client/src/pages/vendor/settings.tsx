import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, Store, CreditCard, Bell, Shield, Save, Loader2, Settings as SettingsIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/authService";

interface VendorProfile {
  business_name?: string;
  username: string;
  contact?: string;
  description?: string;
  category?: string;
  website?: string;
  location?: string;
}

interface PaymentSettings {
  btc_address?: string;
  xmr_address?: string;
  escrow_enabled: boolean;
  payout_schedule: string;
}

interface NotificationSettings {
  new_orders: boolean;
  messages: boolean;
  disputes: boolean;
  payouts: boolean;
  marketing: boolean;
  reviews: boolean;
}

interface SecuritySettings {
  two_factor_enabled: boolean;
  login_notifications: boolean;
  suspicious_activity_alerts: boolean;
}

export default function VendorSettings() {
  const [profile, setProfile] = useState<VendorProfile>({
    username: "",
    contact: "",
    description: "",
    category: "",
    website: "",
    location: ""
  });

  const [payment, setPayment] = useState<PaymentSettings>({
    btc_address: "",
    xmr_address: "",
    escrow_enabled: true,
    payout_schedule: "weekly"
  });

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    new_orders: true,
    messages: true,
    disputes: true,
    payouts: true,
    marketing: false,
    reviews: true
  });

  const [security, setSecurity] = useState<SecuritySettings>({
    two_factor_enabled: false,
    login_notifications: true,
    suspicious_activity_alerts: true
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchVendorData();
  }, []);

  const fetchVendorData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/profile/');
      
      if (response.data && response.data.success) {
        setProfile({
          username: response.data.data.username || "",
          contact: response.data.data.phone || "",
          description: response.data.data.description || "",
          category: response.data.data.category || "",
          website: response.data.data.website || "",
          location: response.data.data.location || "",
          business_name: response.data.data.business_name || ""
        });
      }
    } catch (error) {
      console.error('Error fetching vendor data:', error);
      toast({
        title: "Error",
        description: "Failed to load vendor data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Update profile
      await api.put('/profile/update/', {
        username: profile.username,
        phone: profile.contact,
        description: profile.description,
        category: profile.category,
        website: profile.website,
        location: profile.location,
        business_name: profile.business_name
      });

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

      if (response.data && response.data.success) {
        setPasswordData({
          current_password: "",
          new_password: "",
          confirm_password: ""
        });

        toast({
          title: "Success",
          description: "Password changed successfully"
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 text-white border border-gray-700">
        <div className="flex items-center space-x-3">
          <SettingsIcon className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Vendor Settings</h1>
            <p className="text-gray-300">Manage your vendor account and business preferences</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Profile */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Store className="w-5 h-5 text-blue-400" />
              Business Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="businessName" className="text-gray-300">Business Name</Label>
              <Input
                id="businessName"
                value={profile.business_name || ""}
                onChange={(e) => setProfile({...profile, business_name: e.target.value})}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

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
              <Label htmlFor="contact" className="text-gray-300">Contact Number</Label>
              <Input
                id="contact"
                value={profile.contact || ""}
                onChange={(e) => setProfile({...profile, contact: e.target.value})}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <div>
              <Label htmlFor="website" className="text-gray-300">Website</Label>
              <Input
                id="website"
                value={profile.website || ""}
                onChange={(e) => setProfile({...profile, website: e.target.value})}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-gray-300">Business Description</Label>
              <Textarea
                id="description"
                value={profile.description || ""}
                onChange={(e) => setProfile({...profile, description: e.target.value})}
                className="bg-gray-800 border-gray-600 text-white"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-400" />
              Payment Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="btcAddress" className="text-gray-300">Bitcoin Address</Label>
              <Input
                id="btcAddress"
                value={payment.btc_address || ""}
                onChange={(e) => setPayment({...payment, btc_address: e.target.value})}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="bc1q..."
              />
            </div>

            <div>
              <Label htmlFor="xmrAddress" className="text-gray-300">Monero Address</Label>
              <Input
                id="xmrAddress"
                value={payment.xmr_address || ""}
                onChange={(e) => setPayment({...payment, xmr_address: e.target.value})}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="4A1BvXRJ..."
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">Escrow Protection</Label>
                <p className="text-sm text-gray-400">Enable escrow for buyer protection</p>
              </div>
              <Switch
                checked={payment.escrow_enabled}
                onCheckedChange={(checked) => setPayment({...payment, escrow_enabled: checked})}
              />
            </div>


            <div>
              <Label className="text-gray-300">Payout Schedule</Label>
              <Select value={payment.payout_schedule} onValueChange={(value) => setPayment({...payment, payout_schedule: value})}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                <Label className="text-gray-300">Messages</Label>
                <p className="text-sm text-gray-400">Get notified about new messages</p>
              </div>
              <Switch
                checked={notifications.messages}
                onCheckedChange={(checked) => setNotifications({...notifications, messages: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">Disputes</Label>
                <p className="text-sm text-gray-400">Get notified about dispute activity</p>
              </div>
              <Switch
                checked={notifications.disputes}
                onCheckedChange={(checked) => setNotifications({...notifications, disputes: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">Reviews</Label>
                <p className="text-sm text-gray-400">Get notified about new reviews</p>
              </div>
              <Switch
                checked={notifications.reviews}
                onCheckedChange={(checked) => setNotifications({...notifications, reviews: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">Marketing</Label>
                <p className="text-sm text-gray-400">Receive promotional emails</p>
              </div>
              <Switch
                checked={notifications.marketing}
                onCheckedChange={(checked) => setNotifications({...notifications, marketing: checked})}
              />
            </div>
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
                <Label className="text-gray-300">Login Notifications</Label>
                <p className="text-sm text-gray-400">Get notified about account logins</p>
              </div>
              <Switch
                checked={security.login_notifications}
                onCheckedChange={(checked) => setSecurity({...security, login_notifications: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">Suspicious Activity Alerts</Label>
                <p className="text-sm text-gray-400">Get alerted about suspicious activity</p>
              </div>
              <Switch
                checked={security.suspicious_activity_alerts}
                onCheckedChange={(checked) => setSecurity({...security, suspicious_activity_alerts: checked})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
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
                  <Shield className="w-4 h-4 mr-2" />
                  Change Password
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Card className="bg-gray-900 border-gray-700 lg:col-span-2">
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
  );
}