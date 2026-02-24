
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Lock, AlertTriangle, Users, Eye, Ban, Key, Smartphone, Trash2, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";

export default function AdminSecurity() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    failed_logins_24h: 0,
    active_sessions: 0,
    two_fa_enabled_ratio: "0/0",
    blocked_ips_count: 0
  });
  const [logs, setLogs] = useState([]);
  const [twoFactorUsers, setTwoFactorUsers] = useState([]);
  const [settings, setSettings] = useState({
    enforce_2fa_admins: "true",
    session_timeout: "60",
    max_login_attempts: "5",
    lockout_duration: "30",
    password_expiry: "90",
    audit_logging: "true"
  });
  const [restrictions, setRestrictions] = useState([]);
  const [newIp, setNewIp] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, logsRes, usersRes, settingsRes, restrictionsRes] = await Promise.all([
        api.get('/system/security/summary/'),
        api.get('/system/security/logs/'),
        api.get('/system/security/2fa-status/'),
        api.get('/system/security/settings/'),
        api.get('/system/ip-restrictions/')
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (logsRes.data.success) setLogs(logsRes.data.data);
      if (usersRes.data.success) setTwoFactorUsers(usersRes.data.data);
      if (settingsRes.data.success) setSettings(settingsRes.data.data);
      if (restrictionsRes.data.success) setRestrictions(restrictionsRes.data);
    } catch (err) {
      console.error("Failed to fetch security data", err);
      toast({
        title: "Error",
        description: "Failed to load security data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      const updatedSettings = { ...settings, [key]: value };
      const res = await api.post('/system/security/settings/', { [key]: value });
      if (res.data.success) {
        setSettings(updatedSettings);
        toast({ title: "Updated", description: "Security setting saved." });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to update setting.", variant: "destructive" });
    }
  };

  const handleAddRestriction = async (type: 'whitelist' | 'blacklist', label: string = 'Added via dashboard') => {
    if (!newIp) return;
    try {
      const res = await api.post('/system/ip-restrictions/', {
        ip_address: newIp,
        restriction_type: type,
        label: label
      });
      if (res.data.id) {
        setRestrictions([...restrictions, res.data]);
        setNewIp("");
        toast({ title: "Success", description: `IP added to ${type}` });
        fetchData(); // Refresh stats
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to add restriction", variant: "destructive" });
    }
  };

  const handleDeleteRestriction = async (id: number) => {
    try {
      await api.delete(`/system/ip-restrictions/${id}/`);
      setRestrictions(restrictions.filter(r => r.id !== id));
      toast({ title: "Success", description: "Restriction removed" });
      fetchData(); // Refresh stats
    } catch (err) {
      toast({ title: "Error", description: "Failed to remove restriction", variant: "destructive" });
    }
  };

  const getStatusType = (type: string) => {
    if (type === 'login_failed' || type === 'security_alert') return 'danger';
    if (type === 'login' || type === 'password_changed') return 'success';
    return 'outline';
  };

  const getStatusLabel = (type: string) => {
    if (type === 'login_failed') return 'Failed';
    if (type === 'login') return 'Success';
    if (type === 'security_alert') return 'Alert';
    return type;
  };

  return (
    <main className="flex-1 overflow-y-auto bg-bg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Security Management</h1>
          <p className="text-gray-300 mt-1">Monitor security events and configure access controls</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchData} className="border-border text-gray-300">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button className="bg-accent text-bg hover:bg-accent-2">
            <Shield className="w-4 h-4 mr-2" />
            Security Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="crypto-card">
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-danger mr-4" />
              <div>
                <p className="text-sm text-gray-400">Failed Logins (24h)</p>
                <p className="text-2xl font-bold text-white">{stats.failed_logins_24h}</p>
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
                <p className="text-2xl font-bold text-white">{stats.active_sessions}</p>
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
                <p className="text-2xl font-bold text-white">{stats.two_fa_enabled_ratio}</p>
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
                <p className="text-2xl font-bold text-white">{stats.blocked_ips_count}</p>
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
                      <th className="text-left p-4 text-sm font-medium text-gray-300">User Agent</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-300">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-300">Time</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-surface-2/50">
                        <td className="p-4">
                          <div className="flex items-center">
                            {log.activity_type === "login_failed" && <AlertTriangle className="w-4 h-4 text-danger mr-2" />}
                            {log.activity_type === "login" && <Users className="w-4 h-4 text-success mr-2" />}
                            {log.activity_type === "password_changed" && <Key className="w-4 h-4 text-accent mr-2" />}
                            <span className="text-white">{log.activity_display}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center mr-3">
                              <span className="text-accent text-sm">{log.username?.[0]?.toUpperCase() || '?'}</span>
                            </div>
                            <span className="text-white">{log.username || 'System/Guest'}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-mono text-gray-300">{log.ip_address || 'Internal'}</span>
                        </td>
                        <td className="p-4 text-gray-300 max-w-[200px] truncate" title={log.user_agent}>{log.user_agent || 'N/A'}</td>
                        <td className="p-4">
                          <StatusBadge status={getStatusLabel(log.activity_type)} type={getStatusType(log.activity_type)} />
                        </td>
                        <td className="p-4 text-gray-300">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="p-4">
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {logs.length === 0 && !loading && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-400">No security logs found.</td>
                      </tr>
                    )}
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
                      {twoFactorUsers.map((user: any) => (
                        <tr key={user.id} className="hover:bg-surface-2/50">
                          <td className="p-4">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center mr-3">
                                <span className="text-accent text-sm">{user.username?.[0]?.toUpperCase()}</span>
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
                            <span className="text-white">{user.backupCodes || 0}/10</span>
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
                              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                                <Key className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
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
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
                      <div>
                        <p className="text-white font-medium">Enforce 2FA for Admins</p>
                        <p className="text-sm text-gray-400">Require all admin accounts to use 2FA</p>
                      </div>
                      <Switch
                        checked={settings.enforce_2fa_admins === 'true'}
                        onCheckedChange={(checked) => handleUpdateSetting('enforce_2fa_admins', checked ? 'true' : 'false')}
                      />
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-white">Session Timeout (minutes)</Label>
                  <Input
                    type="number"
                    value={settings.session_timeout}
                    onChange={(e) => setSettings({ ...settings, session_timeout: e.target.value })}
                    onBlur={(e) => handleUpdateSetting('session_timeout', e.target.value)}
                    className="mt-2 bg-surface-2 border-border text-white"
                  />
                </div>

                <div>
                  <Label className="text-white">Max Failed Login Attempts</Label>
                  <Input
                    type="number"
                    value={settings.max_login_attempts}
                    onChange={(e) => setSettings({ ...settings, max_login_attempts: e.target.value })}
                    onBlur={(e) => handleUpdateSetting('max_login_attempts', e.target.value)}
                    className="mt-2 bg-surface-2 border-border text-white"
                  />
                </div>

                <div>
                  <Label className="text-white">Account Lockout Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={settings.lockout_duration}
                    onChange={(e) => setSettings({ ...settings, lockout_duration: e.target.value })}
                    onBlur={(e) => handleUpdateSetting('lockout_duration', e.target.value)}
                    className="mt-2 bg-surface-2 border-border text-white"
                  />
                </div>

                <div>
                  <Label className="text-white">Password Expiry (days)</Label>
                  <Input
                    type="number"
                    value={settings.password_expiry}
                    onChange={(e) => setSettings({ ...settings, password_expiry: e.target.value })}
                    onBlur={(e) => handleUpdateSetting('password_expiry', e.target.value)}
                    className="mt-2 bg-surface-2 border-border text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
                    <div>
                      <p className="text-white font-medium">Audit Logging</p>
                      <p className="text-sm text-gray-400">Log all administrative actions</p>
                    </div>
                    <Switch
                      checked={settings.audit_logging === 'true'}
                      onCheckedChange={(checked) => handleUpdateSetting('audit_logging', checked ? 'true' : 'false')}
                    />
                  </div>
                </div>
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
                      placeholder="e.g. 192.168.1.0/24"
                      value={newIp}
                      onChange={(e) => setNewIp(e.target.value)}
                      className="bg-surface-2 border-border text-white"
                    />
                    <Button onClick={() => handleAddRestriction('whitelist')} className="bg-accent text-bg hover:bg-accent-2">
                      Add to Whitelist
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {restrictions.filter(r => r.restriction_type === 'whitelist').map((res: any) => (
                      <div key={res.id} className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                        <span className="font-mono text-white">{res.ip_address}</span>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">{res.label || 'Whitelisted'}</Badge>
                          <Button
                            onClick={() => handleDeleteRestriction(res.id)}
                            variant="ghost" size="sm" className="text-danger hover:text-red-400 h-6 w-6 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {restrictions.filter(r => r.restriction_type === 'whitelist').length === 0 && (
                      <p className="text-sm text-gray-500 italic">No whitelisted IPs.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="text-white">Blocked IPs</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="e.g. 45.67.89.12"
                      value={newIp}
                      onChange={(e) => setNewIp(e.target.value)}
                      className="bg-surface-2 border-border text-white"
                    />
                    <Button onClick={() => handleAddRestriction('blacklist', 'Manual Block')} className="bg-red-600 text-white hover:bg-red-700">
                      Block IP
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {restrictions.filter(r => r.restriction_type === 'blacklist').map((res: any) => (
                      <div key={res.id} className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                        <span className="font-mono text-white">{res.ip_address}</span>
                        <div className="flex items-center space-x-2">
                          <Badge variant="destructive" className="text-xs">{res.label || 'Blocked'}</Badge>
                          <Button
                            onClick={() => handleDeleteRestriction(res.id)}
                            variant="ghost" size="sm" className="text-success hover:text-green-400 h-6 w-6 p-0"
                          >
                            <Lock className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {restrictions.filter(r => r.restriction_type === 'blacklist').length === 0 && (
                      <p className="text-sm text-gray-500 italic">No blocked IPs.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
