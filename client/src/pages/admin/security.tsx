
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Lock, AlertTriangle, Users, Eye, Ban, Key, Smartphone } from "lucide-react";

export default function AdminSecurity() {

  const securityLogs = [
    {
      id: 1,
      type: "Failed Login",
      user: "unknown_user",
      ip: "192.168.1.45",
      timestamp: "5 min ago",
      status: "Blocked",
      statusType: "danger" as const,
      attempts: 5,
      location: "Unknown"
    },
    {
      id: 2,
      type: "Successful Login",
      user: "admin_user_1", 
      ip: "10.0.0.15",
      timestamp: "1 hour ago",
      status: "Success",
      statusType: "success" as const,
      attempts: 1,
      location: "Office Network"
    },
    {
      id: 3,
      type: "Password Change",
      user: "vendor_alpha",
      ip: "203.45.67.89",
      timestamp: "3 hours ago",
      status: "Success",
      statusType: "success" as const,
      attempts: 1,
      location: "VPN Connection"
    },
    {
      id: 4,
      type: "Failed Login",
      user: "support_agent_2",
      ip: "172.16.0.5",
      timestamp: "6 hours ago",
      status: "Locked",
      statusType: "warning" as const,
      attempts: 3,
      location: "Office Network"
    }
  ];

  const twoFactorUsers = [
    {
      id: 1,
      username: "admin_user_1",
      role: "Super Administrator",
      twoFAEnabled: true,
      lastLogin: "1 hour ago",
      backupCodes: 8,
      deviceTrust: "Trusted"
    },
    {
      id: 2,
      username: "admin_user_2",
      role: "Administrator", 
      twoFAEnabled: true,
      lastLogin: "2 days ago",
      backupCodes: 10,
      deviceTrust: "Trusted"
    },
    {
      id: 3,
      username: "vendor_alpha",
      role: "Vendor",
      twoFAEnabled: false,
      lastLogin: "3 hours ago",
      backupCodes: 0,
      deviceTrust: "Unknown"
    },
    {
      id: 4,
      username: "support_agent_1",
      role: "Support Agent",
      twoFAEnabled: true,
      lastLogin: "30 min ago",
      backupCodes: 6,
      deviceTrust: "Trusted"
    }
  ];

  const securitySettings = [
    {
      id: 1,
      name: "Two-Factor Authentication",
      description: "Require 2FA for admin accounts",
      enabled: true,
      category: "Authentication"
    },
    {
      id: 2,
      name: "Failed Login Protection",
      description: "Lock accounts after failed attempts",
      enabled: true,
      category: "Authentication"
    },
    {
      id: 3,
      name: "IP Whitelist",
      description: "Restrict admin access by IP address",
      enabled: false,
      category: "Access Control"
    },
    {
      id: 4,
      name: "Session Timeout",
      description: "Auto-logout after inactivity",
      enabled: true,
      category: "Sessions"
    },
    {
      id: 5,
      name: "Audit Logging",
      description: "Log all administrative actions",
      enabled: true,
      category: "Monitoring"
    },
    {
      id: 6,
      name: "Password Complexity",
      description: "Enforce strong password requirements",
      enabled: true,
      category: "Authentication"
    }
  ];

  return (
    
      <main className="flex-1 overflow-y-auto bg-bg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Security Management</h1>
            <p className="text-gray-300 mt-1">Monitor security events and configure access controls</p>
          </div>
          <Button className="bg-accent text-bg hover:bg-accent-2">
            <Shield className="w-4 h-4 mr-2" />
            Security Report
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="w-8 h-8 text-danger mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Failed Logins (24h)</p>
                  <p className="text-2xl font-bold text-white">23</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-success mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Active Sessions</p>
                  <p className="text-2xl font-bold text-white">12</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Smartphone className="w-8 h-8 text-accent mr-4" />
                <div>
                  <p className="text-sm text-gray-400">2FA Enabled</p>
                  <p className="text-2xl font-bold text-white">8/12</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Ban className="w-8 h-8 text-warning mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Blocked IPs</p>
                  <p className="text-2xl font-bold text-white">156</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="logs" className="w-full">
          <TabsList className="bg-surface-2 mb-6">
            <TabsTrigger value="logs" className="text-gray-300 data-[state=active]:text-white">
              Security Logs
            </TabsTrigger>
            <TabsTrigger value="2fa" className="text-gray-300 data-[state=active]:text-white">
              Two-Factor Auth
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-gray-300 data-[state=active]:text-white">
              Security Settings
            </TabsTrigger>
            <TabsTrigger value="access" className="text-gray-300 data-[state=active]:text-white">
              Access Control
            </TabsTrigger>
          </TabsList>

          <TabsContent value="logs">
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="text-white">Recent Security Events</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-2">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Event Type</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">User</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">IP Address</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Location</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Status</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Attempts</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Time</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {securityLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-surface-2/50" data-testid={`security-log-${log.id}`}>
                          <td className="p-4">
                            <div className="flex items-center">
                              {log.type === "Failed Login" && <AlertTriangle className="w-4 h-4 text-danger mr-2" />}
                              {log.type === "Successful Login" && <Users className="w-4 h-4 text-success mr-2" />}
                              {log.type === "Password Change" && <Key className="w-4 h-4 text-accent mr-2" />}
                              <span className="text-white">{log.type}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center mr-3">
                                <span className="text-accent text-sm">{log.user[0].toUpperCase()}</span>
                              </div>
                              <span className="text-white">{log.user}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-mono text-gray-300">{log.ip}</span>
                          </td>
                          <td className="p-4 text-gray-300">{log.location}</td>
                          <td className="p-4">
                            <StatusBadge status={log.status} type={log.statusType} />
                          </td>
                          <td className="p-4">
                            <Badge 
                              variant={log.attempts > 3 ? "destructive" : log.attempts > 1 ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {log.attempts}
                            </Badge>
                          </td>
                          <td className="p-4 text-gray-300">{log.timestamp}</td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid={`view-log-${log.id}`}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              {log.status === "Blocked" && (
                                <Button variant="ghost" size="sm" className="text-danger hover:text-red-400" data-testid={`ban-ip-${log.id}`}>
                                  <Ban className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="2fa">
            <div className="space-y-6">
              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">Two-Factor Authentication Status</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-surface-2">
                        <tr>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">User</th>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">Role</th>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">2FA Status</th>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">Backup Codes</th>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">Device Trust</th>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">Last Login</th>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {twoFactorUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-surface-2/50" data-testid={`2fa-user-${user.id}`}>
                            <td className="p-4">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center mr-3">
                                  <span className="text-accent text-sm">{user.username[0].toUpperCase()}</span>
                                </div>
                                <span className="text-white">{user.username}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className="text-gray-300">
                                {user.role}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <StatusBadge 
                                status={user.twoFAEnabled ? "Enabled" : "Disabled"} 
                                type={user.twoFAEnabled ? "success" : "danger"} 
                              />
                            </td>
                            <td className="p-4">
                              <span className="text-white">{user.backupCodes}/10</span>
                            </td>
                            <td className="p-4">
                              <Badge 
                                variant={user.deviceTrust === "Trusted" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {user.deviceTrust}
                              </Badge>
                            </td>
                            <td className="p-4 text-gray-300">{user.lastLogin}</td>
                            <td className="p-4">
                              <div className="flex items-center space-x-2">
                                {!user.twoFAEnabled && (
                                  <Button variant="ghost" size="sm" className="text-accent hover:text-blue-400" data-testid={`enable-2fa-${user.id}`}>
                                    <Smartphone className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid={`reset-codes-${user.id}`}>
                                  <Key className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid={`view-devices-${user.id}`}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">2FA Configuration</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="backupCodeLength" className="text-white">Backup Code Length</Label>
                      <Input 
                        id="backupCodeLength"
                        type="number"
                        defaultValue="10"
                        className="mt-2 bg-surface-2 border-border text-white"
                        data-testid="backup-code-length"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="codeExpiry" className="text-white">Code Expiry (seconds)</Label>
                      <Input 
                        id="codeExpiry"
                        type="number"
                        defaultValue="30"
                        className="mt-2 bg-surface-2 border-border text-white"
                        data-testid="code-expiry"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
                        <div>
                          <p className="text-white font-medium">Enforce 2FA for Admins</p>
                          <p className="text-sm text-gray-400">Require all admin accounts to use 2FA</p>
                        </div>
                        <Switch defaultChecked data-testid="enforce-2fa-toggle" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="text-white">Security Configuration</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {securitySettings.map((setting) => (
                    <div key={setting.id} className="border border-border rounded-lg p-4" data-testid={`security-setting-${setting.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium text-white">{setting.name}</h3>
                            <Badge variant="outline" className="text-gray-300 text-xs">
                              {setting.category}
                            </Badge>
                          </div>
                          <p className="text-gray-300">{setting.description}</p>
                        </div>
                        <div className="ml-6">
                          <Switch 
                            defaultChecked={setting.enabled}
                            data-testid={`toggle-setting-${setting.id}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="sessionTimeout" className="text-white">Session Timeout (minutes)</Label>
                    <Input 
                      id="sessionTimeout"
                      type="number"
                      defaultValue="60"
                      className="mt-2 bg-surface-2 border-border text-white"
                      data-testid="session-timeout"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="maxLoginAttempts" className="text-white">Max Failed Login Attempts</Label>
                    <Input 
                      id="maxLoginAttempts"
                      type="number"
                      defaultValue="5"
                      className="mt-2 bg-surface-2 border-border text-white"
                      data-testid="max-login-attempts"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="lockoutDuration" className="text-white">Account Lockout Duration (minutes)</Label>
                    <Input 
                      id="lockoutDuration"
                      type="number"
                      defaultValue="30"
                      className="mt-2 bg-surface-2 border-border text-white"
                      data-testid="lockout-duration"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="passwordExpiry" className="text-white">Password Expiry (days)</Label>
                    <Input 
                      id="passwordExpiry"
                      type="number"
                      defaultValue="90"
                      className="mt-2 bg-surface-2 border-border text-white"
                      data-testid="password-expiry"
                    />
                  </div>
                </div>
                
                <div className="mt-6">
                  <Button className="bg-accent text-bg hover:bg-accent-2" data-testid="save-security-settings">
                    Save Security Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="access">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">IP Whitelist</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex space-x-2">
                      <Input 
                        placeholder="192.168.1.0/24"
                        className="bg-surface-2 border-border text-white"
                        data-testid="ip-whitelist-input"
                      />
                      <Button className="bg-accent text-bg hover:bg-accent-2" data-testid="add-ip-button">
                        Add
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                        <span className="font-mono text-white">10.0.0.0/8</span>
                        <div className="flex items-center space-x-2">
                          <Badge variant="default" className="text-xs">Office Network</Badge>
                          <Button variant="ghost" size="sm" className="text-danger hover:text-red-400 h-6 w-6 p-0" data-testid="remove-ip-1">
                            <Ban className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                        <span className="font-mono text-white">192.168.1.0/24</span>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">Local Network</Badge>
                          <Button variant="ghost" size="sm" className="text-danger hover:text-red-400 h-6 w-6 p-0" data-testid="remove-ip-2">
                            <Ban className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">Blocked IPs</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                      <span className="font-mono text-white">45.67.89.12</span>
                      <div className="flex items-center space-x-2">
                        <Badge variant="destructive" className="text-xs">Brute Force</Badge>
                        <Button variant="ghost" size="sm" className="text-success hover:text-green-400 h-6 w-6 p-0" data-testid="unblock-ip-1">
                          <Lock className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                      <span className="font-mono text-white">123.45.67.89</span>
                      <div className="flex items-center space-x-2">
                        <Badge variant="destructive" className="text-xs">Suspicious Activity</Badge>
                        <Button variant="ghost" size="sm" className="text-success hover:text-green-400 h-6 w-6 p-0" data-testid="unblock-ip-2">
                          <Lock className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                      <span className="font-mono text-white">98.76.54.32</span>
                      <div className="flex items-center space-x-2">
                        <Badge variant="destructive" className="text-xs">Failed Login</Badge>
                        <Button variant="ghost" size="sm" className="text-success hover:text-green-400 h-6 w-6 p-0" data-testid="unblock-ip-3">
                          <Lock className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Button variant="outline" className="w-full border-border text-gray-300 hover:bg-surface-2" data-testid="clear-blocked-ips">
                      Clear All Blocked IPs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    
  );
}