
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Plus, Edit, Trash2, Key, Lock } from "lucide-react";

export default function AdminRoles() {

  const systemRoles = [
    {
      id: 1,
      name: "Super Administrator",
      description: "Full system access with all permissions",
      userCount: 2,
      color: "danger",
      permissions: [
        "user_management", "vendor_management", "order_management", "dispute_resolution",
        "financial_management", "system_configuration", "security_management", "audit_logs"
      ]
    },
    {
      id: 2,
      name: "Administrator",
      description: "General admin access without system configuration",
      userCount: 5,
      color: "warning",
      permissions: [
        "user_management", "vendor_management", "order_management", "dispute_resolution",
        "financial_management"
      ]
    },
    {
      id: 3,
      name: "Moderator",
      description: "Content moderation and basic user management",
      userCount: 12,
      color: "accent",
      permissions: [
        "user_management", "content_moderation", "message_management", "basic_reports"
      ]
    },
    {
      id: 4,
      name: "Support Agent",
      description: "Customer support and ticket management",
      userCount: 8,
      color: "success",
      permissions: [
        "ticket_management", "basic_user_view", "message_management", "support_reports"
      ]
    },
    {
      id: 5,
      name: "Financial Manager",
      description: "Financial operations and payout management",
      userCount: 3,
      color: "warning",
      permissions: [
        "financial_management", "payout_management", "commission_management", "financial_reports"
      ]
    }
  ];

  const allPermissions = [
    {
      category: "User Management",
      permissions: [
        { id: "user_view", name: "View Users", description: "View user profiles and basic information" },
        { id: "user_management", name: "Manage Users", description: "Create, edit, ban/unban users" },
        { id: "user_impersonate", name: "Impersonate Users", description: "Log in as another user" }
      ]
    },
    {
      category: "Vendor Management",
      permissions: [
        { id: "vendor_view", name: "View Vendors", description: "View vendor profiles and shops" },
        { id: "vendor_management", name: "Manage Vendors", description: "Approve/reject vendor applications" },
        { id: "vendor_settings", name: "Vendor Settings", description: "Modify vendor commission rates and settings" }
      ]
    },
    {
      category: "Order Management",
      permissions: [
        { id: "order_view", name: "View Orders", description: "View order details and history" },
        { id: "order_management", name: "Manage Orders", description: "Update order status and process refunds" },
        { id: "escrow_management", name: "Escrow Management", description: "Release escrow funds and manage disputes" }
      ]
    },
    {
      category: "Financial Management",
      permissions: [
        { id: "financial_view", name: "View Finances", description: "View financial reports and balances" },
        { id: "financial_management", name: "Manage Finances", description: "Process payouts and manage wallets" },
        { id: "commission_management", name: "Commission Management", description: "Set and modify commission rates" }
      ]
    },
    {
      category: "Content & Communication",
      permissions: [
        { id: "content_moderation", name: "Content Moderation", description: "Moderate listings and messages" },
        { id: "message_management", name: "Message Management", description: "View and manage user messages" },
        { id: "ticket_management", name: "Ticket Management", description: "Handle support tickets" }
      ]
    },
    {
      category: "System Administration",
      permissions: [
        { id: "system_configuration", name: "System Configuration", description: "Modify system settings and configuration" },
        { id: "security_management", name: "Security Management", description: "Manage security settings and access controls" },
        { id: "audit_logs", name: "Audit Logs", description: "Access system audit logs and activity history" }
      ]
    }
  ];

  return (
    
      <main className="flex-1 overflow-y-auto bg-bg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Roles & Permissions</h1>
            <p className="text-gray-300 mt-1">Manage user roles and access permissions</p>
          </div>
          <Button className="bg-accent text-bg hover:bg-accent-2">
            <Plus className="w-4 h-4 mr-2" />
            Create Role
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Shield className="w-8 h-8 text-accent mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Total Roles</p>
                  <p className="text-2xl font-bold text-white">{systemRoles.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-success mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-white">{systemRoles.reduce((sum, role) => sum + role.userCount, 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Key className="w-8 h-8 text-warning mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Unique Permissions</p>
                  <p className="text-2xl font-bold text-white">{allPermissions.reduce((sum, cat) => sum + cat.permissions.length, 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Lock className="w-8 h-8 text-danger mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Super Admins</p>
                  <p className="text-2xl font-bold text-white">2</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="roles" className="w-full">
          <TabsList className="bg-surface-2 mb-6">
            <TabsTrigger value="roles" className="text-gray-300 data-[state=active]:text-white">
              System Roles
            </TabsTrigger>
            <TabsTrigger value="permissions" className="text-gray-300 data-[state=active]:text-white">
              Permission Matrix
            </TabsTrigger>
            <TabsTrigger value="create" className="text-gray-300 data-[state=active]:text-white">
              Create Role
            </TabsTrigger>
            <TabsTrigger value="audit" className="text-gray-300 data-[state=active]:text-white">
              Access Audit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roles">
            <div className="space-y-6">
              {systemRoles.map((role) => (
                <Card key={role.id} className="crypto-card" data-testid={`role-${role.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <Shield className="w-6 h-6 text-accent" />
                          <h3 className="text-lg font-semibold text-white">{role.name}</h3>
                          <Badge 
                            variant={
                              role.color === "danger" ? "destructive" :
                              role.color === "warning" ? "secondary" :
                              role.color === "success" ? "default" :
                              "outline"
                            }
                          >
                            {role.userCount} users
                          </Badge>
                        </div>
                        
                        <p className="text-gray-300 mb-4">{role.description}</p>
                        
                        <div>
                          <h4 className="text-sm font-medium text-gray-400 mb-2">Permissions ({role.permissions.length})</h4>
                          <div className="flex flex-wrap gap-2">
                            {role.permissions.slice(0, 5).map((permission) => (
                              <Badge key={permission} variant="outline" className="text-xs text-gray-300">
                                {permission.replace(/_/g, " ")}
                              </Badge>
                            ))}
                            {role.permissions.length > 5 && (
                              <Badge variant="outline" className="text-xs text-gray-400">
                                +{role.permissions.length - 5} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-6">
                        <Button variant="outline" size="sm" className="border-border text-gray-300 hover:bg-surface-2" data-testid={`view-role-${role.id}`}>
                          View Users
                        </Button>
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid={`edit-role-${role.id}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        {role.name !== "Super Administrator" && (
                          <Button variant="ghost" size="sm" className="text-danger hover:text-red-400" data-testid={`delete-role-${role.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="permissions">
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="text-white">Permission Matrix</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-8">
                  {allPermissions.map((category) => (
                    <div key={category.category}>
                      <h3 className="text-lg font-semibold text-white mb-4">{category.category}</h3>
                      <div className="space-y-3">
                        {category.permissions.map((permission) => (
                          <div key={permission.id} className="border border-border rounded-lg p-4" data-testid={`permission-${permission.id}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-white">{permission.name}</h4>
                                <p className="text-sm text-gray-400 mt-1">{permission.description}</p>
                              </div>
                              <div className="flex items-center space-x-4 ml-6">
                                {systemRoles.map((role) => (
                                  <div key={role.id} className="text-center">
                                    <p className="text-xs text-gray-400 mb-1">{role.name}</p>
                                    <div className={`w-4 h-4 rounded border-2 ${
                                      role.permissions.includes(permission.id) 
                                        ? "bg-accent border-accent" 
                                        : "border-border"
                                    }`}>
                                      {role.permissions.includes(permission.id) && (
                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">Role Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="roleName" className="text-white">Role Name</Label>
                      <Input 
                        id="roleName"
                        placeholder="Enter role name..."
                        className="mt-2 bg-surface-2 border-border text-white"
                        data-testid="role-name-input"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="roleDescription" className="text-white">Description</Label>
                      <Textarea 
                        id="roleDescription"
                        placeholder="Describe this role and its purpose..."
                        className="mt-2 bg-surface-2 border-border text-white"
                        rows={4}
                        data-testid="role-description-input"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="roleColor" className="text-white">Role Color</Label>
                      <select 
                        id="roleColor"
                        className="mt-2 w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-white"
                        data-testid="role-color-select"
                      >
                        <option value="accent">Blue (Default)</option>
                        <option value="success">Green</option>
                        <option value="warning">Yellow</option>
                        <option value="danger">Red</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">Assign Permissions</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {allPermissions.map((category) => (
                      <div key={category.category}>
                        <h4 className="text-white font-medium mb-3">{category.category}</h4>
                        <div className="space-y-2">
                          {category.permissions.map((permission) => (
                            <div key={permission.id} className="flex items-center space-x-2">
                              <Checkbox 
                                id={permission.id} 
                                className="border-border"
                                data-testid={`permission-checkbox-${permission.id}`}
                              />
                              <Label htmlFor={permission.id} className="text-gray-300 text-sm">
                                {permission.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    <div className="pt-4">
                      <Button className="w-full bg-accent text-bg hover:bg-accent-2" data-testid="create-role-button">
                        Create Role
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="audit">
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="text-white">Access Audit Log</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="p-4 bg-surface-2 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">Role Created: Financial Manager</p>
                        <p className="text-sm text-gray-400">Created by admin_user_1</p>
                      </div>
                      <span className="text-xs text-gray-400">2 hours ago</span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-surface-2 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">Permission Modified: Support Agent</p>
                        <p className="text-sm text-gray-400">Added ticket_management permission</p>
                      </div>
                      <span className="text-xs text-gray-400">1 day ago</span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-surface-2 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">User Role Changed</p>
                        <p className="text-sm text-gray-400">support_agent_3 promoted to Moderator</p>
                      </div>
                      <span className="text-xs text-gray-400">3 days ago</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    
  );
}