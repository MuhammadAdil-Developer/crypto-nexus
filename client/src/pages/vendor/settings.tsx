import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, Store, CreditCard, Bell, Shield, Save, Loader2, Settings as SettingsIcon, Lock, Unlock, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/authService";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageBanner } from "@/components/PageBanner";
import { validateBTCAddress, validateXMRAddress } from "@/lib/utils";
import { getImageUrl } from "@/config/api";

interface VendorProfile {
  business_name?: string;
  username: string;
  contact?: string;
  description?: string;
  category?: string;
  website?: string;
  location?: string;
  profile_picture?: string;
  is_on_vacation?: boolean;
  vacation_mode_until?: string | null;
  vacation_mode_note?: string;
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
  support_tickets: boolean;
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
    reviews: true,
    support_tickets: true
  });

  const [security, setSecurity] = useState<SecuritySettings>({
    two_factor_enabled: false,
    login_notifications: true,
    suspicious_activity_alerts: true
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFAData, setTwoFAData] = useState<{ qr_code?: string; secret?: string; uri?: string } | null>(null);
  const [editBTC, setEditBTC] = useState(false);
  const [editXMR, setEditXMR] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [vacation, setVacation] = useState({
    enabled: false,
    until: "",
    note: "",
  });

  useEffect(() => {
    fetchVendorData();
  }, []);

  const fetchVendorData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/profile/');

      if (response.data && response.data.success) {
        const userData = response.data.data;
        setProfile({
          username: userData.username || "",
          contact: "",
          description: "",
          category: "",
          website: "",
          location: "",
          business_name: "",
          profile_picture: userData.profile_picture || "",
          is_on_vacation: userData.is_on_vacation || false,
          vacation_mode_until: userData.vacation_mode_until || null,
          vacation_mode_note: userData.vacation_mode_note || "",
        });
        const vacationUntilRaw = userData.vacation_mode_until || "";
        const vacationUntilLocal = vacationUntilRaw
          ? new Date(vacationUntilRaw).toISOString().slice(0, 16)
          : "";
        setVacation({
          enabled: Boolean(userData.is_on_vacation_active || userData.is_on_vacation),
          until: vacationUntilLocal,
          note: userData.vacation_mode_note || "",
        });
        if (userData.profile_picture) {
          setProfilePreview(getImageUrl(userData.profile_picture));
        }

        // Set payout addresses from profile
        setPayment(prev => ({
          ...prev,
          btc_address: userData.btc_payout_address || "",
          xmr_address: userData.xmr_payout_address || ""
        }));

        // Set notification preferences from profile
        setNotifications({
          new_orders: userData.notify_new_orders ?? true,
          messages: userData.notify_messages ?? true,
          disputes: userData.notify_disputes ?? true,
          reviews: userData.notify_reviews ?? true,
          support_tickets: userData.notify_support_tickets ?? true,
          payouts: userData.notify_payouts ?? true,
          marketing: userData.notify_marketing ?? false
        });

        // Set 2FA state from profile
        if (userData.two_factor_enabled !== undefined) {
          setSecurity(prev => ({
            ...prev,
            two_factor_enabled: userData.two_factor_enabled || false,
            login_notifications: userData.notify_login_alerts ?? true
          }));
        }
      }

      // Fetch vendor application data for all profile fields
      try {
        const username = response.data.data.username;
        const vendorResponse = await api.get(`/vendors/applications/check/${username}/`);
        if (vendorResponse.data && vendorResponse.data.success && vendorResponse.data.data.has_application) {
          const app = vendorResponse.data.data;
          console.log("Full Vendor Application Data fetched:", app);

          setProfile(prev => {
            const newProfile = {
              ...prev,
              contact: app.contact || app.phone || prev.contact || "",
              description: app.store_description || app.business_description || app.application_message || prev.description || "",
              business_name: app.business_name || prev.business_name || ""
            };
            console.log("Updated Profile State:", newProfile);
            return newProfile;
          });

          setPayment(prev => ({
            ...prev,
            btc_address: app.btc_address || prev.btc_address || "",
            xmr_address: app.xmr_address || prev.xmr_address || ""
          }));
        } else {
          console.log("No application found for this vendor or check failed.");
        }
      } catch (vendorError) {
        console.warn('Could not fetch vendor application data:', vendorError);
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

      // Immediate validation
      if (payment.btc_address && !validateBTCAddress(payment.btc_address)) {
        toast({
          title: "Invalid BTC Address",
          description: "Please enter a valid Bitcoin address (Legacy, P2SH, or Segwit)",
          variant: "destructive"
        });
        setSaving(false);
        return;
      }

      if (payment.xmr_address && !validateXMRAddress(payment.xmr_address)) {
        toast({
          title: "Invalid XMR Address",
          description: "Please enter a valid Monero address (Standard, Integrated, or Subaddress)",
          variant: "destructive"
        });
        setSaving(false);
        return;
      }

      // Handle profile picture upload if changed
      if (profileImage) {
        const formData = new FormData();
        formData.append('profile_picture', profileImage);
        await api.put('/profile/update/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      // Check if 2FA is being enabled
      const previous2FAState = await api.get('/profile/').then(r => r.data.data?.two_factor_enabled || false).catch(() => false);

      // Update profile fields including payout addresses and notification preferences
      await api.put('/profile/update/', {
        two_factor_enabled: security.two_factor_enabled,
        btc_payout_address: payment.btc_address,
        xmr_payout_address: payment.xmr_address,
        notify_new_orders: notifications.new_orders,
        notify_messages: notifications.messages,
        notify_disputes: notifications.disputes,
        notify_reviews: notifications.reviews,
        notify_support_tickets: notifications.support_tickets,
        notify_payouts: notifications.payouts,
        notify_marketing: notifications.marketing,
        notify_login_alerts: security.login_notifications,
        is_on_vacation: vacation.enabled,
        vacation_mode_until: vacation.until ? new Date(vacation.until).toISOString() : null,
        vacation_mode_note: vacation.note || "",
      });

      // Update vendor application with profile fields
      try {
        const formData = new FormData();
        formData.append('business_name', profile.business_name || '');
        formData.append('vendor_username', profile.username || '');
        formData.append('contact', profile.contact || '');
        formData.append('phone', profile.contact || '');
        formData.append('website', profile.website || '');
        formData.append('store_description', profile.description || '');
        formData.append('category', profile.category || '');
        formData.append('business_address', profile.location || '');
        formData.append('btc_address', payment.btc_address || '');
        formData.append('xmr_address', payment.xmr_address || '');
        // Ensure backend sees this as application_message if it's following that route
        formData.append('application_message', profile.description || '');
        if (profileImage) {
          formData.append('profile_picture', profileImage);
        }

        await api.post('/vendors/applications/create/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } catch (vendorError) {
        console.error('Error updating vendor application:', vendorError);
        // Don't fail the whole save if vendor application update fails
      }

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
        // Note: Disable endpoint requires password, so we'll just update the flag
        // User might need to disable through a separate flow if password is required
      }

      setEditBTC(false);
      setEditXMR(false);

      toast({
        title: "Success",
        description: "Settings updated successfully"
      });

      // Dispatch custom event for real-time update
      window.dispatchEvent(new Event('profileUpdate'));
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
        <Loader2 className="w-8 h-8 animate-spin text-theme-cyan" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <PageBanner
        title="Settings"
        subtitle="Manage your vendor account and business preferences"
        type="vendor"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Profile */}
        <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              Business Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Picture Upload Section */}
            <div className="flex flex-col items-center pb-6 border-b border-gray-700/50">
              <div className="relative group">
                <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-theme-cyan/30 bg-black/40 flex items-center justify-center shadow-lg">
                  {profilePreview ? (
                    <img src={profilePreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-gray-600" />
                  )}
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center">
                    <Edit2 className="w-6 h-6 text-white" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setProfileImage(file);
                          setProfilePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <p className="text-xs font-bold text-gray-500 mt-3 uppercase tracking-widest">Store Avatar</p>
            </div>
            {/* <div>
              <Label htmlFor="businessName" className="text-gray-300">Business Name</Label>
              <Input
                id="businessName"
                value={profile.business_name || ""}
                onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div> */}

            <div>
              <Label htmlFor="username" className="text-gray-300">Username</Label>
              <Input
                id="username"
                value={profile.username}
                onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            {/* <div>
              <Label htmlFor="contact" className="text-gray-300">Contact Number</Label>
              <Input
                id="contact"
                value={profile.contact || ""}
                onChange={(e) => setProfile({ ...profile, contact: e.target.value })}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div> */}

            {/* <div>
              <Label htmlFor="website" className="text-gray-300">Website</Label>
              <Input
                id="website"
                value={profile.website || ""}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div> */}

            <div>
              <Label htmlFor="description" className="text-gray-300">Business Description</Label>
              <Textarea
                id="description"
                value={profile.description || ""}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                className="bg-gray-800 border-gray-600 text-white"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-theme-cyan" />
              Payment Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="btcAddress" className="text-gray-300">Bitcoin Address</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditBTC(!editBTC)}
                  className={`h-7 px-3 rounded-full transition-all duration-200 ${editBTC ? 'bg-theme-cyan text-black font-medium' : 'text-theme-cyan border border-theme-cyan/30 hover:bg-theme-cyan/20'}`}
                >
                  {editBTC ? <Unlock className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                  {editBTC ? "Unlocked" : "Edit"}
                </Button>
              </div>
              <Input
                id="btcAddress"
                value={payment.btc_address || ""}
                onChange={(e) => setPayment({ ...payment, btc_address: e.target.value })}
                className={`bg-gray-800 border-gray-600 text-white transition-all duration-300 ${!editBTC ? 'opacity-40 grayscale cursor-not-allowed border-dashed' : 'border-theme-cyan/50 ring-1 ring-theme-cyan/20'}`}
                placeholder="bc1q..."
                readOnly={!editBTC}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="xmrAddress" className="text-gray-300">Monero Address</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditXMR(!editXMR)}
                  className={`h-7 px-3 rounded-full transition-all duration-200 ${editXMR ? 'bg-theme-cyan text-black font-medium' : 'text-theme-cyan border border-theme-cyan/30 hover:bg-theme-cyan/20'}`}
                >
                  {editXMR ? <Unlock className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                  {editXMR ? "Unlocked" : "Edit"}
                </Button>
              </div>
              <Input
                id="xmrAddress"
                value={payment.xmr_address || ""}
                onChange={(e) => setPayment({ ...payment, xmr_address: e.target.value })}
                className={`bg-gray-800 border-gray-600 text-white transition-all duration-300 ${!editXMR ? 'opacity-40 grayscale cursor-not-allowed border-dashed' : 'border-theme-cyan/50 ring-1 ring-theme-cyan/20'}`}
                placeholder="4A1BvXRJ..."
                readOnly={!editXMR}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">Escrow Protection</Label>
                <p className="text-sm text-gray-400">Enable escrow for buyer protection</p>
              </div>
              <Switch
                checked={payment.escrow_enabled}
                onCheckedChange={(checked) => setPayment({ ...payment, escrow_enabled: checked })}
                className="data-[state=checked]:bg-theme-cyan"
              />
            </div>


            <div>
              {/* <Label className="text-gray-300">Payout Schedule</Label>
              <Select value={payment.payout_schedule} onValueChange={(value) => setPayment({...payment, payout_schedule: value})}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select> */}
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Store className="w-5 h-5 text-theme-cyan" />
              Vacation Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">Temporarily Unavailable</Label>
                <p className="text-sm text-gray-400">Pause new purchases without deleting listings.</p>
              </div>
              <Switch
                checked={vacation.enabled}
                onCheckedChange={(checked) => setVacation(prev => ({ ...prev, enabled: checked }))}
                className="data-[state=checked]:bg-theme-cyan"
              />
            </div>

            <div>
              <Label className="text-gray-300">Vacation Until (optional)</Label>
              <Input
                type="datetime-local"
                value={vacation.until}
                onChange={(e) => setVacation(prev => ({ ...prev, until: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white"
                disabled={!vacation.enabled}
              />
            </div>

            <div>
              <Label className="text-gray-300">Buyer Message (optional)</Label>
              <Textarea
                value={vacation.note}
                onChange={(e) => setVacation(prev => ({ ...prev, note: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="We are away for a short break and will resume soon."
                rows={3}
                disabled={!vacation.enabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-theme-cyan" />
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
                onCheckedChange={(checked) => setNotifications({ ...notifications, new_orders: checked })}
                className="data-[state=checked]:bg-theme-cyan"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">Messages</Label>
                <p className="text-sm text-gray-400">Get notified about new messages</p>
              </div>
              <Switch
                checked={notifications.messages}
                onCheckedChange={(checked) => setNotifications({ ...notifications, messages: checked })}
                className="data-[state=checked]:bg-theme-cyan"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">Disputes</Label>
                <p className="text-sm text-gray-400">Get notified about dispute activity</p>
              </div>
              <Switch
                checked={notifications.disputes}
                onCheckedChange={(checked) => setNotifications({ ...notifications, disputes: checked })}
                className="data-[state=checked]:bg-theme-cyan"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">Reviews</Label>
                <p className="text-sm text-gray-400">Get notified about new reviews</p>
              </div>
              <Switch
                checked={notifications.reviews}
                onCheckedChange={(checked) => setNotifications({ ...notifications, reviews: checked })}
                className="data-[state=checked]:bg-theme-cyan"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">Help & Support</Label>
                <p className="text-sm text-gray-400">Get notified about support ticket updates</p>
              </div>
              <Switch
                checked={notifications.support_tickets}
                onCheckedChange={(checked) => setNotifications({ ...notifications, support_tickets: checked })}
                className="data-[state=checked]:bg-theme-cyan"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">Payouts</Label>
                <p className="text-sm text-gray-400">Get notified about payment activity</p>
              </div>
              <Switch
                checked={notifications.payouts}
                onCheckedChange={(checked) => setNotifications({ ...notifications, payouts: checked })}
                className="data-[state=checked]:bg-theme-cyan"
              />
            </div>

            {/* <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">Marketing</Label>
                <p className="text-sm text-gray-400">Receive promotional emails</p>
              </div>
              <Switch
                checked={notifications.marketing}
                onCheckedChange={(checked) => setNotifications({ ...notifications, marketing: checked })}
                className="data-[state=checked]:bg-theme-cyan"
              />
            </div> */}
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-theme-cyan" />
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
                onCheckedChange={(checked) => setSecurity({ ...security, two_factor_enabled: checked })}
                className="data-[state=checked]:bg-theme-cyan"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">Login Notifications</Label>
                <p className="text-sm text-gray-400">Get notified about account logins</p>
              </div>
              <Switch
                checked={security.login_notifications}
                onCheckedChange={(checked) => setSecurity({ ...security, login_notifications: checked })}
                className="data-[state=checked]:bg-theme-cyan"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">Suspicious Activity Alerts</Label>
                <p className="text-sm text-gray-400">Get alerted about suspicious activity</p>
              </div>
              <Switch
                checked={security.suspicious_activity_alerts}
                onCheckedChange={(checked) => setSecurity({ ...security, suspicious_activity_alerts: checked })}
                className="data-[state=checked]:bg-theme-cyan"
              />
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-theme-red" />
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
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <div>
              <Label htmlFor="newPassword" className="text-gray-300">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-gray-300">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={saving}
              className="w-full bg-theme-red hover:bg-theme-red-dark text-white"
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
        <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden lg:col-span-2">
          <CardContent className="p-6">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-theme-cyan hover:bg-theme-cyan/80 text-black font-semibold"
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

      {/* 2FA QR Code Modal */}
      <Dialog open={show2FAModal} onOpenChange={setShow2FAModal}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-theme-cyan" />
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

                <div className="w-full bg-theme-cyan/10 border border-theme-cyan/30 rounded-lg p-4">
                  <p className="text-sm text-theme-cyan">
                    <strong className="text-white">Steps:</strong>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-gray-300 mt-2">
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
              className="w-full bg-theme-cyan hover:bg-theme-cyan/80 text-black font-semibold"
            >
              I've Scanned the QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
