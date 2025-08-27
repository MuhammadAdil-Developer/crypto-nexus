import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { User, Store, CreditCard, Bell, Shield, Key, Save, Upload } from "lucide-react";

export default function VendorSettings() {
  const [profileData, setProfileData] = useState({
    businessName: "CryptoAccountsPlus",
    username: "cryptoaccountsplus",
    email: "vendor@cryptoaccountsplus.com",
    contact: "+1234567890",
    description: "Premium digital accounts and streaming services provider. Offering high-quality Netflix, Spotify, Adobe, and other premium accounts with warranty and support.",
    category: "Streaming Accounts",
    website: "https://cryptoaccountsplus.com",
    location: "Global"
  });

  const [paymentData, setPaymentData] = useState({
    btcAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    xmrAddress: "4A1BvXRJjVhHpP9ErvwMdqXHnF7VjZn2KyTpgQfGQfGQKT7bqYzLYzKvD2d3nYzNxXdpBmCdH1vWxM9xKsT2vKpWBnTnY4QvXr",
    escrowEnabled: true,
    commissionRate: "5%",
    payoutSchedule: "weekly"
  });

  const [notificationSettings, setNotificationSettings] = useState({
    newOrders: true,
    messages: true,
    disputes: true,
    payouts: true,
    marketing: false,
    reviews: true
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    loginNotifications: true,
    suspiciousActivityAlerts: true
  });

  const handleProfileSave = () => {
    // Handle profile save
    console.log("Saving profile:", profileData);
  };

  const handlePaymentSave = () => {
    // Handle payment settings save
    console.log("Saving payment settings:", paymentData);
  };

  const handleNotificationSave = () => {
    // Handle notification settings save
    console.log("Saving notification settings:", notificationSettings);
  };

  const handleSecuritySave = () => {
    // Handle security settings save
    console.log("Saving security settings:", securitySettings);
  };

  return (
    
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Settings</h1>
            <p className="text-gray-400">Manage your vendor profile and preferences</p>
          </div>
          <Badge className="bg-green-100 text-green-800">
            Verified Vendor
          </Badge>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4" />
              <span>Payments</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Security</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="border border-gray-700 bg-gray-900">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Store className="w-5 h-5" />
                  <span>Business Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input
                      id="businessName"
                      value={profileData.businessName}
                      onChange={(e) => setProfileData({...profileData, businessName: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={profileData.username}
                      onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contact">Contact</Label>
                    <Input
                      id="contact"
                      value={profileData.contact}
                      onChange={(e) => setProfileData({...profileData, contact: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={profileData.category} onValueChange={(value) => setProfileData({...profileData, category: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Streaming Accounts">Streaming Accounts</SelectItem>
                        <SelectItem value="Digital Goods">Digital Goods</SelectItem>
                        <SelectItem value="Gaming Accounts">Gaming Accounts</SelectItem>
                        <SelectItem value="VPN & Security">VPN & Security</SelectItem>
                        <SelectItem value="Educational Services">Educational Services</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="website">Website (Optional)</Label>
                    <Input
                      id="website"
                      value={profileData.website}
                      onChange={(e) => setProfileData({...profileData, website: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Store Description</Label>
                  <Textarea
                    id="description"
                    value={profileData.description}
                    onChange={(e) => setProfileData({...profileData, description: e.target.value})}
                    className="h-32"
                  />
                </div>
                
                <div className="space-y-4">
                  <Label>Store Logo/Banner</Label>
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Store className="w-8 h-8 text-white" />
                    </div>
                    <Button variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload New Logo
                    </Button>
                  </div>
                </div>
                
                <Button onClick={handleProfileSave} className="bg-blue-500 hover:bg-blue-600">
                  <Save className="w-4 h-4 mr-2" />
                  Save Profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Settings */}
          <TabsContent value="payments" className="space-y-6">
            <Card className="border border-gray-700 bg-gray-900">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5" />
                  <span>Payment Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="btcAddress">Bitcoin Address</Label>
                    <Input
                      id="btcAddress"
                      value={paymentData.btcAddress}
                      onChange={(e) => setPaymentData({...paymentData, btcAddress: e.target.value})}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-gray-400">For receiving BTC payments</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="xmrAddress">Monero Address</Label>
                    <Input
                      id="xmrAddress"
                      value={paymentData.xmrAddress}
                      onChange={(e) => setPaymentData({...paymentData, xmrAddress: e.target.value})}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-gray-400">For receiving XMR payments</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="payoutSchedule">Payout Schedule</Label>
                    <Select value={paymentData.payoutSchedule} onValueChange={(value) => setPaymentData({...paymentData, payoutSchedule: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="commissionRate">Commission Rate</Label>
                    <Input
                      id="commissionRate"
                      value={paymentData.commissionRate}
                      disabled
                      className="bg-gray-700"
                    />
                    <p className="text-xs text-gray-400">Set by marketplace</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div>
                    <h4 className="font-medium text-white">Escrow Protection</h4>
                    <p className="text-sm text-gray-400">Enable escrow for buyer protection</p>
                  </div>
                  <Switch
                    checked={paymentData.escrowEnabled}
                    onCheckedChange={(checked) => setPaymentData({...paymentData, escrowEnabled: checked})}
                  />
                </div>
                
                <Button onClick={handlePaymentSave} className="bg-blue-500 hover:bg-blue-600">
                  <Save className="w-4 h-4 mr-2" />
                  Save Payment Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="border border-gray-700 bg-gray-900">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="w-5 h-5" />
                  <span>Notification Preferences</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                    <div>
                      <h4 className="font-medium text-white">New Orders</h4>
                      <p className="text-sm text-gray-400">Get notified when you receive new orders</p>
                    </div>
                    <Switch
                      checked={notificationSettings.newOrders}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, newOrders: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                    <div>
                      <h4 className="font-medium text-white">Messages</h4>
                      <p className="text-sm text-gray-400">Get notified when customers send messages</p>
                    </div>
                    <Switch
                      checked={notificationSettings.messages}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, messages: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                    <div>
                      <h4 className="font-medium text-white">Disputes</h4>
                      <p className="text-sm text-gray-400">Get notified about dispute activities</p>
                    </div>
                    <Switch
                      checked={notificationSettings.disputes}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, disputes: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                    <div>
                      <h4 className="font-medium text-white">Payouts</h4>
                      <p className="text-sm text-gray-400">Get notified about payout status</p>
                    </div>
                    <Switch
                      checked={notificationSettings.payouts}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, payouts: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                    <div>
                      <h4 className="font-medium text-white">Reviews</h4>
                      <p className="text-sm text-gray-400">Get notified about new reviews</p>
                    </div>
                    <Switch
                      checked={notificationSettings.reviews}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, reviews: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                    <div>
                      <h4 className="font-medium text-white">Marketing Updates</h4>
                      <p className="text-sm text-gray-400">Receive marketing and promotional emails</p>
                    </div>
                    <Switch
                      checked={notificationSettings.marketing}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, marketing: checked})}
                    />
                  </div>
                </div>
                
                <Button onClick={handleNotificationSave} className="bg-blue-500 hover:bg-blue-600">
                  <Save className="w-4 h-4 mr-2" />
                  Save Notification Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card className="border border-gray-700 bg-gray-900">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Security & Privacy</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                    <div>
                      <h4 className="font-medium text-white">Two-Factor Authentication</h4>
                      <p className="text-sm text-gray-400">Add an extra layer of security to your account</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      {securitySettings.twoFactorEnabled && (
                        <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                      )}
                      <Switch
                        checked={securitySettings.twoFactorEnabled}
                        onCheckedChange={(checked) => setSecuritySettings({...securitySettings, twoFactorEnabled: checked})}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                    <div>
                      <h4 className="font-medium text-white">Login Notifications</h4>
                      <p className="text-sm text-gray-400">Get notified when someone logs into your account</p>
                    </div>
                    <Switch
                      checked={securitySettings.loginNotifications}
                      onCheckedChange={(checked) => setSecuritySettings({...securitySettings, loginNotifications: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                    <div>
                      <h4 className="font-medium text-white">Suspicious Activity Alerts</h4>
                      <p className="text-sm text-gray-400">Get alerts for unusual account activity</p>
                    </div>
                    <Switch
                      checked={securitySettings.suspiciousActivityAlerts}
                      onCheckedChange={(checked) => setSecuritySettings({...securitySettings, suspiciousActivityAlerts: checked})}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-white">Password & Access</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button variant="outline" className="justify-start">
                      <Key className="w-4 h-4 mr-2" />
                      Change Password
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <Shield className="w-4 h-4 mr-2" />
                      View Login History
                    </Button>
                  </div>
                </div>
                
                <Button onClick={handleSecuritySave} className="bg-blue-500 hover:bg-blue-600">
                  <Save className="w-4 h-4 mr-2" />
                  Save Security Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    
  );
}