import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Search, Filter, MoreHorizontal, Ban, Unlock, Eye, LogIn, Edit, Trash2, Plus, Phone, Mail, Calendar, User, UserCheck, Shield, Settings } from "lucide-react";
import { SAMPLE_USERS } from "@/lib/constants";

export default function AdminUsers() {
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [userDetailsModalOpen, setUserDetailsModalOpen] = useState(false);
  const [banConfirmOpen, setBanConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [actionUser, setActionUser] = useState<any>(null);
  
  const form = useForm({
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "Viewer / Normal User",
      status: "Active",
      phoneNumber: "",
      profilePicture: null
    }
  });
  
  const editForm = useForm({
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      role: "Viewer / Normal User",
      status: "Active",
      phoneNumber: ""
    }
  });
  
  const handleCreateUser = (data: any) => {
    console.log("Creating user:", data);
    setAddUserModalOpen(false);
    form.reset();
  };
  
  const handleViewUser = (user: any) => {
    setSelectedUser(user);
    setUserDetailsModalOpen(true);
  };
  
  const handleLoginAsUser = (userId: number) => {
    console.log("Login as user:", userId);
  };
  
  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    editForm.reset({
      fullName: user.username, // Using username as fullName since we don't have fullName in sample data
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      phoneNumber: ""
    });
    setEditUserModalOpen(true);
  };
  
  const handleUpdateUser = (data: any) => {
    console.log("Updating user:", selectedUser?.id, data);
    setEditUserModalOpen(false);
  };
  
  const handleBanUser = (user: any) => {
    setActionUser(user);
    setBanConfirmOpen(true);
  };
  
  const handleUnbanUser = (user: any) => {
    setActionUser(user);
    console.log("Unbanning user:", user.id);
  };
  
  const handleDeleteUser = (user: any) => {
    setActionUser(user);
    setDeleteConfirmOpen(true);
  };
  
  const confirmBanUser = () => {
    console.log("Confirmed banning user:", actionUser?.id);
    setBanConfirmOpen(false);
    setActionUser(null);
  };
  
  const confirmDeleteUser = () => {
    console.log("Confirmed deleting user:", actionUser?.id);
    setDeleteConfirmOpen(false);
    setActionUser(null);
  };

  return (
    <main className="flex-1 overflow-y-auto bg-bg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">User Management</h1>
            <p className="text-gray-300 mt-1">Manage platform users, vendors, and administrators</p>
          </div>
          <Dialog open={addUserModalOpen} onOpenChange={setAddUserModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-bg hover:bg-accent-2" data-testid="add-new-user-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add New User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-card border border-border shadow-xl">
              <DialogHeader>
                <DialogTitle className="text-white">Add New User</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateUser)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Full Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter full name" 
                              className="bg-surface-2 border-border text-white"
                              data-testid="input-full-name"
                              {...field} 
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter username" 
                              className="bg-surface-2 border-border text-white"
                              data-testid="input-username"
                              {...field} 
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="Enter email address" 
                            className="bg-surface-2 border-border text-white"
                            data-testid="input-email"
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Enter password" 
                              className="bg-surface-2 border-border text-white"
                              data-testid="input-password"
                              {...field} 
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Confirm Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Confirm password" 
                              className="bg-surface-2 border-border text-white"
                              data-testid="input-confirm-password"
                              {...field} 
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Role / User Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-surface-2 border-border text-white" data-testid="select-role">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Admin">Admin</SelectItem>
                              <SelectItem value="Editor / Manager">Editor / Manager</SelectItem>
                              <SelectItem value="Viewer / Normal User">Viewer / Normal User</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-surface-2 border-border text-white" data-testid="select-status">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Active">Active</SelectItem>
                              <SelectItem value="Inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter phone number" 
                            className="bg-surface-2 border-border text-white"
                            data-testid="input-phone"
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="profilePicture"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Profile Picture (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="file" 
                            accept="image/*"
                            className="bg-surface-2 border-border text-white"
                            data-testid="input-profile-picture"
                            onChange={(e) => field.onChange(e.target.files?.[0] || null)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setAddUserModalOpen(false)}
                      className="border-border text-gray-300 hover:bg-surface-2"
                      data-testid="btn-cancel"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-accent text-bg hover:bg-accent-2"
                      data-testid="btn-create-user"
                    >
                      Create User
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
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
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-gray-400 hover:text-white" 
                            onClick={() => handleViewUser(user)}
                            data-testid={`view-user-${user.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-gray-400 hover:text-white" 
                            onClick={() => handleEditUser(user)}
                            data-testid={`edit-user-${user.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-gray-400 hover:text-white" 
                            onClick={() => handleLoginAsUser(user.id)}
                            data-testid={`login-as-${user.id}`}
                          >
                            <LogIn className="w-4 h-4" />
                          </Button>
                          {user.status === "Active" ? (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-danger hover:text-red-400" 
                              onClick={() => handleBanUser(user)}
                              data-testid={`ban-user-${user.id}`}
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-success hover:text-green-400" 
                              onClick={() => handleUnbanUser(user)}
                              data-testid={`unban-user-${user.id}`}
                            >
                              <Unlock className="w-4 h-4" />
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-gray-400 hover:text-white"
                                data-testid={`more-actions-${user.id}`}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border">
                              <DropdownMenuItem 
                                className="text-gray-300 hover:bg-surface-2 hover:text-white cursor-pointer"
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-gray-300 hover:bg-surface-2 hover:text-white cursor-pointer"
                                onClick={() => console.log('View activity:', user.id)}
                              >
                                <UserCheck className="w-4 h-4 mr-2" />
                                View Activity
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-gray-300 hover:bg-surface-2 hover:text-white cursor-pointer"
                                onClick={() => console.log('Reset password:', user.id)}
                              >
                                <Shield className="w-4 h-4 mr-2" />
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-border" />
                              <DropdownMenuItem 
                                className="text-danger hover:bg-danger/10 hover:text-red-400 cursor-pointer"
                                onClick={() => handleDeleteUser(user)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        {/* User Details Modal */}
        <Dialog open={userDetailsModalOpen} onOpenChange={setUserDetailsModalOpen}>
          <DialogContent className="sm:max-w-[500px] bg-card border border-border shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-white">User Details</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-6">
                {/* Profile Section */}
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center">
                    <span className="text-accent text-xl font-semibold">
                      {selectedUser.username[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{selectedUser.username}</h3>
                    <p className="text-gray-400">{selectedUser.email}</p>
                    <StatusBadge status={selectedUser.status} type={selectedUser.statusType} className="mt-1" />
                  </div>
                </div>
                
                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-400 text-sm">Role</Label>
                      <div className="flex items-center mt-1">
                        <User className="w-4 h-4 text-accent mr-2" />
                        <span className="text-white">{selectedUser.role}</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-gray-400 text-sm">Join Date</Label>
                      <div className="flex items-center mt-1">
                        <Calendar className="w-4 h-4 text-accent mr-2" />
                        <span className="text-white">{selectedUser.joinDate}</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-gray-400 text-sm">Total Orders</Label>
                      <div className="flex items-center mt-1">
                        <span className="text-white text-lg font-semibold">{selectedUser.orders}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-400 text-sm">Email</Label>
                      <div className="flex items-center mt-1">
                        <Mail className="w-4 h-4 text-accent mr-2" />
                        <span className="text-white text-sm">{selectedUser.email}</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-gray-400 text-sm">Last Login</Label>
                      <div className="flex items-center mt-1">
                        <span className="text-white">{selectedUser.lastLogin}</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-gray-400 text-sm">Total Spent</Label>
                      <div className="flex items-center mt-1">
                        <span className="text-accent font-mono font-semibold">{selectedUser.totalSpent}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-border">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-border text-gray-300 hover:bg-surface-2"
                    onClick={() => {
                      setUserDetailsModalOpen(false);
                      handleEditUser(selectedUser);
                    }}
                    data-testid="btn-edit-user-details"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit User
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-border text-gray-300 hover:bg-surface-2"
                    onClick={() => handleLoginAsUser(selectedUser.id)}
                    data-testid="btn-login-as-user-details"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Login As User
                  </Button>
                  {selectedUser.status === "Active" ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-danger text-danger hover:bg-danger/10"
                      onClick={() => {
                        setUserDetailsModalOpen(false);
                        handleBanUser(selectedUser);
                      }}
                      data-testid="btn-ban-user-details"
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      Ban User
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-success text-success hover:bg-success/10"
                      onClick={() => {
                        setUserDetailsModalOpen(false);
                        handleUnbanUser(selectedUser);
                      }}
                      data-testid="btn-unban-user-details"
                    >
                      <Unlock className="w-4 h-4 mr-2" />
                      Unban User
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Edit User Modal */}
        <Dialog open={editUserModalOpen} onOpenChange={setEditUserModalOpen}>
          <DialogContent className="sm:max-w-[500px] bg-card border border-border shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-white">Edit User</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleUpdateUser)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Full Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter full name" 
                            className="bg-surface-2 border-border text-white"
                            data-testid="edit-input-full-name"
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Username</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter username" 
                            className="bg-surface-2 border-border text-white"
                            data-testid="edit-input-username"
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="Enter email address" 
                          className="bg-surface-2 border-border text-white"
                          data-testid="edit-input-email"
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Role / User Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-surface-2 border-border text-white" data-testid="edit-select-role">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Admin">Admin</SelectItem>
                            <SelectItem value="Editor / Manager">Editor / Manager</SelectItem>
                            <SelectItem value="Viewer / Normal User">Viewer / Normal User</SelectItem>
                            <SelectItem value="Customer">Customer</SelectItem>
                            <SelectItem value="Vendor">Vendor</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-surface-2 border-border text-white" data-testid="edit-select-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Banned">Banned</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={editForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Phone Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter phone number" 
                          className="bg-surface-2 border-border text-white"
                          data-testid="edit-input-phone"
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setEditUserModalOpen(false)}
                    className="border-border text-gray-300 hover:bg-surface-2"
                    data-testid="btn-cancel-edit"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-accent text-bg hover:bg-accent-2"
                    data-testid="btn-update-user"
                  >
                    Update User
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Ban Confirmation Dialog */}
        <AlertDialog open={banConfirmOpen} onOpenChange={setBanConfirmOpen}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Ban User</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                Are you sure you want to ban user <strong className="text-white">{actionUser?.username}</strong>? 
                This action will prevent them from accessing the platform.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                className="border-border text-gray-300 hover:bg-surface-2"
                data-testid="btn-cancel-ban"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmBanUser}
                className="bg-danger text-white hover:bg-red-600"
                data-testid="btn-confirm-ban"
              >
                Ban User
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete User</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                Are you sure you want to permanently delete user <strong className="text-white">{actionUser?.username}</strong>? 
                This action cannot be undone and will remove all user data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                className="border-border text-gray-300 hover:bg-surface-2"
                data-testid="btn-cancel-delete"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteUser}
                className="bg-danger text-white hover:bg-red-600"
                data-testid="btn-confirm-delete"
              >
                Delete User
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
  );
}