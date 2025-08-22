import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, AlertTriangle, Info, CheckCircle, X, Plus, Settings } from "lucide-react";

export default function AdminAlerts() {
  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Alerts" }
  ];

  const systemAlerts = [
    {
      id: 1,
      type: "Critical",
      title: "BTC Node Synchronization Warning",
      message: "Bitcoin node is 2 blocks behind. Sync in progress.",
      priority: "High",
      priorityType: "danger" as const,
      timestamp: "5 min ago",
      status: "Active",
      statusType: "danger" as const,
      category: "System",
      resolved: false
    },
    {
      id: 2,
      type: "Info",
      title: "New Vendor Application",
      message: "DigitalServices submitted a vendor application for review.",
      priority: "Medium",
      priorityType: "warning" as const,
      timestamp: "1 hour ago",
      status: "Active",
      statusType: "warning" as const,
      category: "Vendor",
      resolved: false
    },
    {
      id: 3,
      type: "Warning",
      title: "Low Escrow Balance",
      message: "BTC escrow wallet balance is below 5 BTC threshold.",
      priority: "Medium",
      priorityType: "warning" as const,
      timestamp: "2 hours ago",
      status: "Active",
      statusType: "warning" as const,
      category: "Finance",
      resolved: false
    },
    {
      id: 4,
      type: "Success",
      title: "System Backup Completed",
      message: "Daily backup completed successfully. All data secured.",
      priority: "Low",
      priorityType: "success" as const,
      timestamp: "6 hours ago",
      status: "Resolved",
      statusType: "success" as const,
      category: "System",
      resolved: true
    },
    {
      id: 5,
      type: "Critical",
      title: "Dispute Requires Attention",
      message: "Order #ORD-2844 dispute has been open for 24+ hours.",
      priority: "High",
      priorityType: "danger" as const,
      timestamp: "1 day ago",
      status: "Active",
      statusType: "danger" as const,
      category: "Orders",
      resolved: false
    }
  ];

  const alertSettings = [
    {
      id: 1,
      name: "Node Connectivity",
      description: "Alert when blockchain nodes go offline or fall behind",
      enabled: true,
      threshold: "2 blocks",
      recipients: ["admin@marketplace.onion"]
    },
    {
      id: 2,
      name: "Vendor Applications",
      description: "Notify when new vendor applications are submitted",
      enabled: true,
      threshold: "Immediate",
      recipients: ["vendor-review@marketplace.onion"]
    },
    {
      id: 3,
      name: "Dispute Escalation",
      description: "Alert when disputes remain unresolved",
      enabled: true,
      threshold: "24 hours",
      recipients: ["disputes@marketplace.onion"]
    },
    {
      id: 4,
      name: "Low Balance Warning",
      description: "Warn when escrow balances drop below threshold",
      enabled: true,
      threshold: "5 BTC / 50 XMR",
      recipients: ["finance@marketplace.onion"]
    },
    {
      id: 5,
      name: "Security Incidents",
      description: "Critical security alerts and failed login attempts",
      enabled: true,
      threshold: "5 failed attempts",
      recipients: ["security@marketplace.onion"]
    }
  ];

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <main className="flex-1 overflow-y-auto bg-bg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Alert Management</h1>
            <p className="text-gray-300 mt-1">Monitor system alerts and configure notifications</p>
          </div>
          <Button className="bg-accent text-bg hover:bg-accent-2">
            <Plus className="w-4 h-4 mr-2" />
            Create Alert
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="w-8 h-8 text-danger mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Active Alerts</p>
                  <p className="text-2xl font-bold text-white">5</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-danger/20 rounded-lg flex items-center justify-center mr-4">
                  <AlertTriangle className="w-5 h-5 text-danger" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Critical</p>
                  <p className="text-2xl font-bold text-white">2</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Bell className="w-8 h-8 text-warning mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Warnings</p>
                  <p className="text-2xl font-bold text-white">2</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-success mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Resolved Today</p>
                  <p className="text-2xl font-bold text-white">12</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="bg-surface-2 mb-6">
            <TabsTrigger value="active" className="text-gray-300 data-[state=active]:text-white">
              Active Alerts
            </TabsTrigger>
            <TabsTrigger value="create" className="text-gray-300 data-[state=active]:text-white">
              Create Alert
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-gray-300 data-[state=active]:text-white">
              Alert Settings
            </TabsTrigger>
            <TabsTrigger value="history" className="text-gray-300 data-[state=active]:text-white">
              Alert History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <div className="space-y-4">
              {systemAlerts.filter(alert => !alert.resolved).map((alert) => (
                <Card key={alert.id} className="crypto-card" data-testid={`alert-${alert.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          {alert.type === "Critical" && <AlertTriangle className="w-5 h-5 text-danger" />}
                          {alert.type === "Warning" && <Bell className="w-5 h-5 text-warning" />}
                          {alert.type === "Info" && <Info className="w-5 h-5 text-accent" />}
                          {alert.type === "Success" && <CheckCircle className="w-5 h-5 text-success" />}
                          
                          <h3 className="text-lg font-semibold text-white">{alert.title}</h3>
                          <StatusBadge status={alert.priority} type={alert.priorityType} />
                          <Badge variant="outline" className="text-gray-300">
                            {alert.category}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-300 mb-3">{alert.message}</p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span>{alert.timestamp}</span>
                          <span>•</span>
                          <span>Priority: {alert.priority}</span>
                          <span>•</span>
                          <span>Category: {alert.category}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-6">
                        <Button variant="outline" className="border-border text-gray-300 hover:bg-surface-2" data-testid={`view-alert-${alert.id}`}>
                          View Details
                        </Button>
                        <Button className="bg-success text-white hover:bg-green-600" data-testid={`resolve-alert-${alert.id}`}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Resolve
                        </Button>
                        <Button variant="ghost" className="text-danger hover:text-red-400" data-testid={`dismiss-alert-${alert.id}`}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {systemAlerts.filter(alert => !alert.resolved).length === 0 && (
                <Card className="crypto-card">
                  <CardContent className="p-12 text-center">
                    <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
                    <p className="text-gray-400">No active alerts</p>
                    <p className="text-sm text-gray-500 mt-2">All systems operating normally</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="create">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">Alert Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="alertTitle" className="text-white">Alert Title</Label>
                      <Input 
                        id="alertTitle"
                        placeholder="Enter alert title..."
                        className="mt-2 bg-surface-2 border-border text-white"
                        data-testid="alert-title-input"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="alertMessage" className="text-white">Message</Label>
                      <Textarea 
                        id="alertMessage"
                        placeholder="Describe the alert..."
                        className="mt-2 bg-surface-2 border-border text-white"
                        rows={4}
                        data-testid="alert-message-input"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="alertType" className="text-white">Alert Type</Label>
                      <Select>
                        <SelectTrigger className="mt-2 bg-surface-2 border-border text-white">
                          <SelectValue placeholder="Select alert type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="success">Success</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="alertPriority" className="text-white">Priority</Label>
                      <Select>
                        <SelectTrigger className="mt-2 bg-surface-2 border-border text-white">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">Alert Configuration</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="alertCategory" className="text-white">Category</Label>
                      <Select>
                        <SelectTrigger className="mt-2 bg-surface-2 border-border text-white">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system">System</SelectItem>
                          <SelectItem value="security">Security</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="vendor">Vendor</SelectItem>
                          <SelectItem value="orders">Orders</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="recipients" className="text-white">Recipients</Label>
                      <Input 
                        id="recipients"
                        placeholder="admin@marketplace.onion"
                        className="mt-2 bg-surface-2 border-border text-white"
                        data-testid="alert-recipients-input"
                      />
                      <p className="text-sm text-gray-400 mt-1">Separate multiple emails with commas</p>
                    </div>
                    
                    <div>
                      <Label className="text-white">Auto-resolve</Label>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center space-x-2">
                          <input type="radio" id="manual" name="resolve" value="manual" defaultChecked />
                          <Label htmlFor="manual" className="text-gray-300">Manual resolution only</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="radio" id="timer" name="resolve" value="timer" />
                          <Label htmlFor="timer" className="text-gray-300">Auto-resolve after 24 hours</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="radio" id="condition" name="resolve" value="condition" />
                          <Label htmlFor="condition" className="text-gray-300">Resolve when condition met</Label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <Button className="w-full bg-accent text-bg hover:bg-accent-2" data-testid="create-alert-button">
                        Create Alert
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="text-white">Alert Notification Settings</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {alertSettings.map((setting) => (
                    <div key={setting.id} className="border border-border rounded-lg p-4" data-testid={`alert-setting-${setting.id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium text-white">{setting.name}</h3>
                            <StatusBadge 
                              status={setting.enabled ? "Enabled" : "Disabled"} 
                              type={setting.enabled ? "success" : "muted"} 
                            />
                          </div>
                          <p className="text-gray-300 mb-3">{setting.description}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-400">Threshold</p>
                              <p className="text-white">{setting.threshold}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Recipients</p>
                              <p className="text-white">{setting.recipients.join(", ")}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-6">
                          <Button variant="outline" size="sm" className="border-border text-gray-300 hover:bg-surface-2" data-testid={`edit-setting-${setting.id}`}>
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant={setting.enabled ? "outline" : "default"}
                            size="sm" 
                            className={setting.enabled ? "border-border text-gray-300" : "bg-accent text-bg"}
                            data-testid={`toggle-setting-${setting.id}`}
                          >
                            {setting.enabled ? "Disable" : "Enable"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="text-white">Resolved Alerts</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {systemAlerts.filter(alert => alert.resolved).map((alert) => (
                    <div key={alert.id} className="p-4 bg-surface-2 rounded-lg opacity-75" data-testid={`resolved-alert-${alert.id}`}>
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-success" />
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{alert.title}</h4>
                          <p className="text-sm text-gray-400">{alert.message}</p>
                          <p className="text-xs text-gray-500 mt-1">Resolved {alert.timestamp}</p>
                        </div>
                        <Badge variant="outline" className="text-gray-300">
                          {alert.category}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </AdminLayout>
  );
}