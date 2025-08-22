import { useState } from "react";
import { Settings as SettingsIcon, User, Lock, Bell, CreditCard, Shield, Palette } from "lucide-react";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function BuyerSettings() {
  const [profileData, setProfileData] = useState({
    username: "crypto_buyer",
    email: "crypto_buyer@example.com",
    phone: "+1 (555) 123-4567",
    preferredCurrency: "BTC"
  });

  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    priceAlerts: true,
    marketingEmails: false,
    securityAlerts: true,
    vendorMessages: true
  });

  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    loginAlerts: true,
    sessionTimeout: "24h"
  });

  return (
    <BuyerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl p-6 text-white">
          <div className="flex items-center space-x-3">
            <SettingsIcon className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Account Settings</h1>
              <p className="text-blue-100">Manage your account preferences and security</p>
            </div>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 bg-white dark:bg-gray-900 rounded-xl p-1 shadow-lg">
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center space-x-2">
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Privacy</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center space-x-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Theme</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Profile Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center space-x-6">
                  <Avatar className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600">
                    <AvatarFallback className="text-white font-bold text-lg">CB</AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline">Change Avatar</Button>
                    <p className="text-sm text-gray-500 mt-2">JPG, PNG up to 2MB</p>
                  </div>
                </div>

                {/* Profile Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={profileData.username}
                      onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="currency">Preferred Currency</Label>
                    <Input
                      id="currency"
                      value={profileData.preferredCurrency}
                      onChange={(e) => setProfileData({...profileData, preferredCurrency: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button variant="outline">Cancel</Button>
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-600">Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <div className="space-y-6">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lock className="w-5 h-5" />
                    <span>Password & Authentication</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <h4 className="font-medium">Change Password</h4>
                        <p className="text-sm text-gray-500">Update your account password</p>
                      </div>
                      <Button variant="outline">Change</Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <h4 className="font-medium">Two-Factor Authentication</h4>
                        <p className="text-sm text-gray-500">Add an extra layer of security</p>
                      </div>
                      <Switch
                        checked={security.twoFactorEnabled}
                        onCheckedChange={(checked) => setSecurity({...security, twoFactorEnabled: checked})}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <h4 className="font-medium">Login Alerts</h4>
                        <p className="text-sm text-gray-500">Get notified of new login attempts</p>
                      </div>
                      <Switch
                        checked={security.loginAlerts}
                        onCheckedChange={(checked) => setSecurity({...security, loginAlerts: checked})}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Active Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div>
                        <h4 className="font-medium text-green-800 dark:text-green-400">Current Session</h4>
                        <p className="text-sm text-green-600 dark:text-green-500">Chrome on Windows • Current location</p>
                      </div>
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">Active</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <h4 className="font-medium">Mobile App</h4>
                        <p className="text-sm text-gray-500">iPhone • Last active 2 hours ago</p>
                      </div>
                      <Button variant="outline" size="sm">End Session</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="w-5 h-5" />
                  <span>Notification Preferences</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <h4 className="font-medium">Order Updates</h4>
                      <p className="text-sm text-gray-500">Notifications about order status changes</p>
                    </div>
                    <Switch
                      checked={notifications.orderUpdates}
                      onCheckedChange={(checked) => setNotifications({...notifications, orderUpdates: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <h4 className="font-medium">Price Alerts</h4>
                      <p className="text-sm text-gray-500">Get notified when wishlist items go on sale</p>
                    </div>
                    <Switch
                      checked={notifications.priceAlerts}
                      onCheckedChange={(checked) => setNotifications({...notifications, priceAlerts: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <h4 className="font-medium">Vendor Messages</h4>
                      <p className="text-sm text-gray-500">Notifications for new vendor messages</p>
                    </div>
                    <Switch
                      checked={notifications.vendorMessages}
                      onCheckedChange={(checked) => setNotifications({...notifications, vendorMessages: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <h4 className="font-medium">Security Alerts</h4>
                      <p className="text-sm text-gray-500">Important security notifications</p>
                    </div>
                    <Switch
                      checked={notifications.securityAlerts}
                      onCheckedChange={(checked) => setNotifications({...notifications, securityAlerts: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <h4 className="font-medium">Marketing Emails</h4>
                      <p className="text-sm text-gray-500">Promotional offers and product updates</p>
                    </div>
                    <Switch
                      checked={notifications.marketingEmails}
                      onCheckedChange={(checked) => setNotifications({...notifications, marketingEmails: checked})}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-600">Save Preferences</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Settings */}
          <TabsContent value="payments">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5" />
                  <span>Payment Methods</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-medium mb-2">Bitcoin (BTC)</h4>
                    <p className="text-sm text-gray-500 mb-3">bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh</p>
                    <Button variant="outline" size="sm">Update Address</Button>
                  </div>
                  
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-medium mb-2">Monero (XMR)</h4>
                    <p className="text-sm text-gray-500 mb-3">Not configured</p>
                    <Button variant="outline" size="sm">Add Address</Button>
                  </div>
                </div>
                
                <div className="border-t pt-6">
                  <h4 className="font-medium mb-4">Transaction History</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium">Payment sent</p>
                        <p className="text-sm text-gray-500">Order #ORD-2847 • 2 hours ago</p>
                      </div>
                      <span className="text-green-600 font-medium">0.0012 BTC</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium">Payment sent</p>
                        <p className="text-sm text-gray-500">Order #ORD-2846 • 1 day ago</p>
                      </div>
                      <span className="text-green-600 font-medium">0.0008 BTC</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings */}
          <TabsContent value="privacy">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Privacy & Data</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-medium text-blue-800 dark:text-blue-400 mb-2">Data Protection</h4>
                    <p className="text-sm text-blue-600 dark:text-blue-300 mb-3">
                      Your privacy is important to us. We use minimal data collection and anonymous transactions.
                    </p>
                    <Button variant="outline" size="sm">View Privacy Policy</Button>
                  </div>
                  
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-medium mb-2">Download Your Data</h4>
                    <p className="text-sm text-gray-500 mb-3">Export your account data and transaction history</p>
                    <Button variant="outline" size="sm">Request Export</Button>
                  </div>
                  
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <h4 className="font-medium text-red-800 dark:text-red-400 mb-2">Delete Account</h4>
                    <p className="text-sm text-red-600 dark:text-red-300 mb-3">
                      Permanently delete your account and all associated data
                    </p>
                    <Button variant="destructive" size="sm">Delete Account</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="w-5 h-5" />
                  <span>Theme & Appearance</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-3">Color Theme</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <button className="p-4 bg-white border-2 border-blue-500 rounded-lg text-center">
                        <div className="w-full h-8 bg-white border rounded mb-2"></div>
                        <span className="text-sm font-medium">Light</span>
                      </button>
                      
                      <button className="p-4 bg-gray-900 border-2 border-gray-300 rounded-lg text-center">
                        <div className="w-full h-8 bg-gray-800 rounded mb-2"></div>
                        <span className="text-sm font-medium text-white">Dark</span>
                      </button>
                      
                      <button className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 border-2 border-gray-300 rounded-lg text-center">
                        <div className="w-full h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded mb-2"></div>
                        <span className="text-sm font-medium text-white">Auto</span>
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Interface Density</h4>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-3">
                        <input type="radio" name="density" value="compact" className="text-blue-600" />
                        <span>Compact - More content on screen</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="radio" name="density" value="comfortable" defaultChecked className="text-blue-600" />
                        <span>Comfortable - Balanced spacing</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="radio" name="density" value="spacious" className="text-blue-600" />
                        <span>Spacious - More breathing room</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-600">Apply Changes</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </BuyerLayout>
  );
}