import { useState, useEffect } from "react";
import { Settings as SettingsIcon, User, Lock, Bell, Save, Loader2, Wallet, RefreshCcw, Edit2, Bitcoin } from "lucide-react";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/authService";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageBanner } from "@/components/PageBanner";
import { validateBTCAddress, validateXMRAddress, cn } from "@/lib/utils";

interface UserProfile {
  username: string;
  phone?: string;
  date_joined?: string;
  user_type?: string;
  is_verified?: boolean;
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

  const [notifications, setNotifications] = useState({
    order_updates: true,
    vendor_messages: true,
    disputes: true,
    reviews: true,
    support_tickets: true,
    payouts: true,
    marketing_emails: false,
  });

  const [security, setSecurity] = useState<SecuritySettings>({
    two_factor_enabled: false,
    login_alerts: true,
    session_timeout: "24h"
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payoutSaving, setPayoutSaving] = useState(false);
  const { toast } = useToast();
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFAData, setTwoFAData] = useState<{ qr_code?: string; secret?: string; uri?: string } | null>(null);
  const [payoutAddresses, setPayoutAddresses] = useState({
    btc_payout_address: "",
    xmr_payout_address: ""
  });
  const [editingWallet, setEditingWallet] = useState({
    btc: false,
    xmr: false
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/profile/');

      if (response.data && response.data.success) {
        const userData = response.data.data;
        setProfile({
          username: userData.username || "",
          phone: userData.phone || "",
          date_joined: userData.date_joined || "",
          user_type: userData.user_type || "buyer",
          is_verified: userData.is_verified || false
        });
        setPayoutAddresses({
          btc_payout_address: userData.btc_payout_address || "",
          xmr_payout_address: userData.xmr_payout_address || ""
        });

        // Set notification preferences from backend
        setNotifications({
          order_updates: userData.notify_new_orders ?? true,
          vendor_messages: userData.notify_messages ?? true,
          disputes: userData.notify_disputes ?? true,
          reviews: userData.notify_reviews ?? true,
          support_tickets: userData.notify_support_tickets ?? true,
          payouts: userData.notify_payouts ?? true,
          marketing_emails: userData.notify_marketing ?? false,
        });

        // Set 2FA and login alerts state from profile
        if (userData.two_factor_enabled !== undefined) {
          setSecurity(prev => ({
            ...prev,
            two_factor_enabled: userData.two_factor_enabled || false,
            login_alerts: userData.notify_login_alerts ?? true
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
      const previousProfile = await api.get('/profile/').then(r => r.data.data).catch(() => null);
      const previous2FAState = previousProfile?.two_factor_enabled || false;

      // Update profile with notification preferences
      await api.put('/profile/update/', {
        username: profile.username,
        two_factor_enabled: security.two_factor_enabled,
        // Map notification settings back to backend field names
        notify_new_orders: notifications.order_updates,
        notify_messages: notifications.vendor_messages,
        notify_disputes: notifications.disputes,
        notify_reviews: notifications.reviews,
        notify_support_tickets: notifications.support_tickets,
        notify_payouts: notifications.payouts,
        notify_marketing: notifications.marketing_emails,
        notify_login_alerts: security.login_alerts
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

  const handleSavePayoutAddresses = async () => {
    if (!payoutAddresses.btc_payout_address && !payoutAddresses.xmr_payout_address) {
      toast({
        title: "Error",
        description: "Please enter at least one payout address (BTC or XMR)",
        variant: "destructive"
      });
      return;
    }

    // Immediate validation
    if (payoutAddresses.btc_payout_address && !validateBTCAddress(payoutAddresses.btc_payout_address)) {
      toast({
        title: "Invalid BTC Address",
        description: "Please enter a valid Bitcoin address (Legacy, P2SH, or Segwit)",
        variant: "destructive"
      });
      return;
    }

    if (payoutAddresses.xmr_payout_address && !validateXMRAddress(payoutAddresses.xmr_payout_address)) {
      toast({
        title: "Invalid XMR Address",
        description: "Please enter a valid Monero address (Standard, Integrated, or Subaddress)",
        variant: "destructive"
      });
      return;
    }

    try {
      setPayoutSaving(true);
      await api.put('/profile/payout/', {
        btc_payout_address: payoutAddresses.btc_payout_address || null,
        xmr_payout_address: payoutAddresses.xmr_payout_address || null
      });

      toast({
        title: "Success",
        description: "Payout addresses updated"
      });
      setEditingWallet({ btc: false, xmr: false });
    } catch (error: any) {
      console.error('Error saving payout addresses:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save payout addresses",
        variant: "destructive"
      });
    } finally {
      setPayoutSaving(false);
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
          <Loader2 className="w-8 h-8 animate-spin text-theme-cyan" />
        </div>
      </BuyerLayout>
    );
  }

  return (
    <BuyerLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <PageBanner
          title="Settings"
          subtitle="Manage your account preferences and security."
          type="buyer"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Wallet / Payout Addresses */}
          <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6 sm:p-8 shadow-2xl lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-theme-cyan/10 border border-theme-cyan/20 rounded-2xl">
                <Wallet className="w-6 h-6 text-theme-cyan" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Settlement Wallets</h3>
                <p className="text-gray-400 text-xs font-medium italic">Configure your primary withdrawal channels</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="btcAddress" className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Bitcoin Payout Link</Label>
                  <div className="relative group">
                    <Bitcoin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 group-focus-within:text-theme-cyan transition-colors w-4 h-4" />
                    <Input
                      id="btcAddress"
                      value={payoutAddresses.btc_payout_address}
                      onChange={(e) => setPayoutAddresses(prev => ({ ...prev, btc_payout_address: e.target.value }))}
                      placeholder="bc1q..."
                      className={cn(
                        "pl-12 h-12 bg-black/40 border-gray-700/50 text-white font-mono rounded-2xl focus:border-theme-cyan/50 focus:ring-theme-cyan/10 transition-all",
                        !editingWallet.btc && "opacity-50 cursor-not-allowed"
                      )}
                      readOnly={!editingWallet.btc}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 text-gray-500 hover:text-white"
                      onClick={() => setEditingWallet(prev => ({ ...prev, btc: !prev.btc }))}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="xmrAddress" className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Monero Payout Link</Label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 group-focus-within:text-theme-cyan transition-colors text-[10px] font-black font-mono">XMR</div>
                    <Input
                      id="xmrAddress"
                      value={payoutAddresses.xmr_payout_address}
                      onChange={(e) => setPayoutAddresses(prev => ({ ...prev, xmr_payout_address: e.target.value }))}
                      placeholder="4xxxxxxxx..."
                      className={cn(
                        "pl-12 h-12 bg-black/40 border-gray-700/50 text-white font-mono rounded-2xl focus:border-theme-cyan/50 focus:ring-theme-cyan/10 transition-all",
                        !editingWallet.xmr && "opacity-50 cursor-not-allowed"
                      )}
                      readOnly={!editingWallet.xmr}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 text-gray-500 hover:text-white"
                      onClick={() => setEditingWallet(prev => ({ ...prev, xmr: !prev.xmr }))}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleSavePayoutAddresses}
                disabled={payoutSaving}
                className="h-12 px-6 bg-theme-cyan hover:bg-theme-cyan-dark text-black font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-theme-cyan/20 transition-all"
              >
                {payoutSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    update Wallet
                  </>
                )}
              </Button>
            </div>
          </div>
          {/* Profile Settings */}
          <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-theme-cyan/10 border border-theme-cyan/20 rounded-2xl">
                <User className="w-6 h-6 text-theme-cyan" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tighter">Identity Core</h3>
                <p className="text-gray-400 text-[10px] font-medium italic">Immutable identification parameters</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Alias</Label>
                <Input
                  value={profile.username}
                  readOnly
                  className="h-11 bg-black/20 border-gray-700/50 text-gray-500 cursor-not-allowed rounded-xl font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Origin Date</Label>
                <div className="h-11 px-4 bg-black/20 border border-gray-700/50 rounded-xl text-gray-400 flex items-center text-sm font-medium">
                  {profile.date_joined ? new Date(profile.date_joined).toLocaleDateString() : 'N/A'}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Account Class</Label>
                <div className="h-11 px-4 bg-black/20 border border-gray-700/50 rounded-xl text-theme-cyan flex items-center text-sm font-black uppercase tracking-tight">
                  {profile.user_type || 'Buyer'}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Standing</Label>
                <div className="h-11 px-4 bg-black/20 border border-gray-700/50 rounded-xl flex items-center">
                  <div className={cn(
                    "flex items-center gap-2 text-xs font-bold uppercase",
                    profile.is_verified ? "text-emerald-400" : "text-yellow-500"
                  )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full", profile.is_verified ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-yellow-500")} />
                    {profile.is_verified ? "Verified" : "Unverified"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-theme-cyan/10 border border-theme-cyan/20 rounded-2xl">
                <Bell className="w-6 h-6 text-theme-cyan" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tighter">Signal Matrix</h3>
                <p className="text-gray-400 text-[10px] font-medium italic">Configure notification relay protocols</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Order Updates', desc: 'Real-time acquisition status changes', key: 'order_updates' },
                { label: 'Vendor Messages', desc: 'Encrypted communication alerts', key: 'vendor_messages' },
                { label: 'Dispute Alerts', desc: 'Case intelligence status updates', key: 'disputes' },
                { label: 'Support Tickets', desc: 'Nexus support response notifications', key: 'support_tickets' },
                { label: 'Refund Alerts', desc: 'Financial resolution status', key: 'payouts' },
                { label: 'Review Reminders', desc: 'Feedback protocol opportunities', key: 'reviews' },
                { label: 'Marketing Streams', desc: 'Nexus updates and transmissions', key: 'marketing_emails' }
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-2xl bg-black/20 border border-white/5 hover:bg-black/40 transition-all">
                  <div>
                    <Label className="text-sm font-bold text-gray-200">{item.label}</Label>
                    <p className="text-[10px] text-gray-500 italic">{item.desc}</p>
                  </div>
                  <Switch
                    checked={(notifications as any)[item.key]}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, [item.key]: checked })}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Security & Password Container */}
          <div className="space-y-6">
            {/* Security Switches */}
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-theme-cyan/10 border border-theme-cyan/20 rounded-2xl">
                  <Lock className="w-6 h-6 text-theme-cyan" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tighter">Security Protocols</h3>
                  <p className="text-gray-400 text-[10px] font-medium italic">Advanced protection mechanisms</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-black/20 border border-white/5">
                  <div>
                    <Label className="text-sm font-bold text-gray-200">2FA Encryption</Label>
                    <p className="text-[10px] text-gray-500 italic">Multifactor authentication sequence</p>
                  </div>
                  <Switch
                    checked={security.two_factor_enabled}
                    onCheckedChange={(checked) => setSecurity({ ...security, two_factor_enabled: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-black/20 border border-white/5">
                  <div>
                    <Label className="text-sm font-bold text-gray-200">Access Alerts</Label>
                    <p className="text-[10px] text-gray-500 italic">Login attempt notifications</p>
                  </div>
                  <Switch
                    checked={security.login_alerts}
                    onCheckedChange={(checked) => setSecurity({ ...security, login_alerts: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Change Password */}
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6 shadow-2xl">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-6 ml-1">Credential Rotation</h4>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Current Password</Label>
                  <Input
                    type="password"
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                    className="h-11 bg-black/20 border-gray-700/50 text-white rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">New Password</Label>
                  <Input
                    type="password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    className="h-11 bg-black/20 border-gray-700/50 text-white rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Confirm Protocol</Label>
                  <Input
                    type="password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    className="h-11 bg-black/20 border-gray-700/50 text-white rounded-xl"
                  />
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={saving}
                  className="w-full h-11 bg-theme-red hover:bg-theme-red-dark text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-theme-red/20 transition-all text-xs"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rotate Credentials'}
                </Button>
              </div>
            </div>
          </div>

          {/* Global Action Bar */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6 shadow-2xl">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full h-12 bg-theme-cyan hover:bg-theme-cyan-dark text-black font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-theme-cyan/20 transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Update Settings
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 2FA QR Code Modal */}
      <Dialog open={show2FAModal} onOpenChange={setShow2FAModal}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-theme-cyan" />
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

                <div className="w-full bg-theme-cyan-dim border border-theme-cyan/30 rounded-lg p-4">
                  <p className="text-sm text-theme-cyan">
                    <strong className="text-theme-cyan">Steps:</strong>
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
              className="w-full bg-theme-cyan hover:bg-theme-cyan/90 text-black border border-theme-cyan"
            >
              I've Scanned the QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </BuyerLayout>
  );
}
