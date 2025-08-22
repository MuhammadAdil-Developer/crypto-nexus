import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, MoreHorizontal, Ban, Unlock, Eye, LogIn } from "lucide-react";
import { SAMPLE_USERS } from "@/lib/constants";

export default function AdminUsers() {
  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Users" }
  ];

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <main className="flex-1 overflow-y-auto bg-bg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">User Management</h1>
            <p className="text-gray-300 mt-1">Manage platform users, vendors, and administrators</p>
          </div>
          <Button className="bg-accent text-bg hover:bg-accent-2">
            Add New User
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <div className="w-6 h-6 bg-accent rounded"></div>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-white">2,847</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-success/20 rounded-lg">
                  <div className="w-6 h-6 bg-success rounded"></div>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-400">Active Users</p>
                  <p className="text-2xl font-bold text-white">2,734</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-warning/20 rounded-lg">
                  <div className="w-6 h-6 bg-warning rounded"></div>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-400">Vendors</p>
                  <p className="text-2xl font-bold text-white">127</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-danger/20 rounded-lg">
                  <div className="w-6 h-6 bg-danger rounded"></div>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-400">Banned</p>
                  <p className="text-2xl font-bold text-white">23</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="crypto-card mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input 
                    placeholder="Search users by username or email..." 
                    className="pl-10 bg-surface-2 border-border text-white"
                    data-testid="search-users"
                  />
                </div>
              </div>
              <Select>
                <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="banned">Banned</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="border-border hover:bg-surface-2">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="crypto-card">
          <CardHeader>
            <CardTitle className="text-white">Users List</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-2">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Username</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Email</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Role</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Join Date</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Last Login</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Orders</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {SAMPLE_USERS.map((user) => (
                    <tr key={user.id} className="hover:bg-surface-2/50" data-testid={`user-row-${user.id}`}>
                      <td className="p-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center mr-3">
                            <span className="text-accent text-sm font-medium">{user.username[0].toUpperCase()}</span>
                          </div>
                          <span className="font-medium text-white">{user.username}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-300">{user.email}</td>
                      <td className="p-4">
                        <Badge 
                          variant={user.role === "Vendor" ? "secondary" : "outline"}
                          className="text-gray-300"
                        >
                          {user.role}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={user.status} type={user.statusType} />
                      </td>
                      <td className="p-4 text-gray-300">{user.joinDate}</td>
                      <td className="p-4 text-gray-300">{user.lastLogin}</td>
                      <td className="p-4 text-gray-300">{user.orders}</td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid={`view-user-${user.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid={`login-as-${user.id}`}>
                            <LogIn className="w-4 h-4" />
                          </Button>
                          {user.status === "Active" ? (
                            <Button variant="ghost" size="sm" className="text-danger hover:text-red-400" data-testid={`ban-user-${user.id}`}>
                              <Ban className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" className="text-success hover:text-green-400" data-testid={`unban-user-${user.id}`}>
                              <Unlock className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                            <MoreHorizontal className="w-4 h-4" />
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
      </main>
    </AdminLayout>
  );
}