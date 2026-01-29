import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Search, Filter, MoreHorizontal, Ban, Unlock, Eye, LogIn, Edit, Trash2, Plus, Phone, Mail, Calendar, User, UserCheck, Shield, Settings, Loader2, History, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { SAMPLE_USERS } from "@/lib/constants";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl, getImageUrl } from "@/config/api";
import { messagingService } from "@/services/messagingService";

// API Integration Types
interface User {
  id: string; // Backend sends UUID as string
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  user_type: string;
  phone?: string | null;
  profile_picture?: string | null;
  is_verified: boolean;
  is_active?: boolean | null;
  date_joined: string; // Backend sends this field
  last_login?: string | null;
  total_orders?: number | null;
  total_spent?: number | null;
  two_factor_enabled?: boolean | null;
}

export default function AdminUsers() {
  const { toast } = useToast();
  // API Integration State
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const currentUser = authService.getCurrentUser();

  // Existing Modal State
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [userDetailsModalOpen, setUserDetailsModalOpen] = useState(false);
  const [banConfirmOpen, setBanConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionUser, setActionUser] = useState<User | null>(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [userActivities, setUserActivities] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState({ new_password: "", confirm_password: "" });
  const [disable2FAConfirmOpen, setDisable2FAConfirmOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Vendor details state
  const [vendorDetails, setVendorDetails] = useState<any>(null);
  const [loadingVendorDetails, setLoadingVendorDetails] = useState(false);

  // Action loading states
  const [loadingActions, setLoadingActions] = useState<{ [key: string]: boolean }>({});
  const [creatingUser, setCreatingUser] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total_count: 0,
    total_pages: 1,
    has_next: false,
    has_previous: false,
    page_size: 20
  });
  const [stats, setStats] = useState({
    total_users: 0,
    active_users: 0,
    vendors: 0,
    banned_users: 0
  });

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

  const handleCreateUser = async (data: any) => {
    try {
      setCreatingUser(true);
      const token = authService.getToken();
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please login again to continue",
          variant: "destructive",
        });
        return;
      }

      if (data.password !== data.confirmPassword) {
        toast({
          title: "Validation Error",
          description: "Passwords do not match",
          variant: "destructive",
        });
        return;
      }

      // Map form data to API format
      const userData = {
        username: data.username,
        password: data.password,
        confirm_password: data.confirmPassword,
        user_type: data.role === 'Viewer / Normal User' ? 'buyer' :
          data.role === 'Editor / Manager' ? 'vendor' :
            data.role.toLowerCase(),
      };

      // Admin can create users without captcha
      const response = await fetch(getApiUrl('/auth/register/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...userData,
          captcha_token: 'admin-bypass' // Add dummy token, backend will bypass for admin
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "User created successfully",
        });
        setAddUserModalOpen(false);
        form.reset();
        fetchUsers(); // Refresh user list
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to create user",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const handleViewUser = async (user: any) => {
    // Determine the ID (some endpoints use id, others use uuid, assume user object has correct id)
    const userId = user.id;

    // Set preliminary data while loading
    setSelectedUser(user);
    setUserDetailsModalOpen(true);

    // Fetch full details including stats
    try {
      const token = authService.getToken();
      if (token) {
        const response = await fetch(getApiUrl(`/users/${userId}/`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setSelectedUser(data.data);
            // Update user in the list if needed or just keep separate
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch detailed user info", error);
    }

    // Fetch vendor details if user is a vendor
    if (user.user_type === 'vendor') {
      try {
        setLoadingVendorDetails(true);
        const token = authService.getToken();
        if (!token) {
          setVendorDetails(null);
          return;
        }

        const response = await fetch(getApiUrl(`/vendors/applications/check/${user.username}/`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();
        if (data && data.success && data.data.has_application) {
          setVendorDetails(data.data);
        } else {
          setVendorDetails(null);
        }
      } catch (error) {
        console.error('Error fetching vendor details:', error);
        setVendorDetails(null);
      } finally {
        setLoadingVendorDetails(false);
      }
    } else {
      setVendorDetails(null);
    }
  };

  const handleLoginAsUser = async (userId: string | number) => {
    try {
      setLoadingActions({ ...loadingActions, [`impersonate_${userId}`]: true });
      const response = await authService.impersonateUser(userId.toString());

      if (response.success) {
        toast({
          title: "Success",
          description: `Logged in as ${response.data.user.username}`,
        });

        // Redirect based on user type
        const userType = response.data.user.user_type;
        if (userType === 'admin') {
          window.location.href = '/admin';
        } else if (userType === 'vendor') {
          window.location.href = '/vendor/dashboard';
        } else {
          window.location.href = '/buyer/dashboard';
        }
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to login as user",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Impersonation error:', error);
      toast({
        title: "Error",
        description: "Failed to login as user",
        variant: "destructive",
      });
    } finally {
      setLoadingActions({ ...loadingActions, [`impersonate_${userId}`]: false });
    }
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

  const handleUpdateUser = async (data: any) => {
    if (!selectedUser) return;

    try {
      setLoadingActions({ ...loadingActions, [`update_${selectedUser.id}`]: true });
      const token = authService.getToken();
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please login again to continue",
          variant: "destructive",
        });
        return;
      }

      // Map form data to API format - only fields allowed by AdminUserUpdateSerializer
      const updateData: any = {};

      // Only send username if it changed
      if (data.username && data.username !== selectedUser.username) {
        updateData.username = data.username;
      }

      // Map role to user_type
      if (data.role === 'Viewer / Normal User') {
        updateData.user_type = 'buyer';
      } else if (data.role === 'Editor / Manager') {
        updateData.user_type = 'vendor';
      } else if (data.role) {
        updateData.user_type = data.role.toLowerCase();
      }

      // Map status to is_verified
      if (data.status === 'Active') {
        updateData.is_verified = true;
      } else if (data.status === 'Inactive') {
        updateData.is_verified = false;
      }

      const response = await fetch(getApiUrl(`/users/${selectedUser.id}/update/`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "User updated successfully",
        });
        setEditUserModalOpen(false);
        fetchUsers(); // Refresh user list
      } else {
        const errorData = await response.json();

        // Parse specific error messages
        let errorMessage = errorData.message || "Failed to update user";

        // Check for field-specific errors
        if (errorData.errors) {
          if (errorData.errors.username) {
            errorMessage = `Username: ${Array.isArray(errorData.errors.username) ? errorData.errors.username[0] : errorData.errors.username}`;
          } else if (errorData.errors.email) {
            errorMessage = `Email: ${Array.isArray(errorData.errors.email) ? errorData.errors.email[0] : errorData.errors.email}`;
          } else if (errorData.errors.non_field_errors) {
            errorMessage = Array.isArray(errorData.errors.non_field_errors)
              ? errorData.errors.non_field_errors[0]
              : errorData.errors.non_field_errors;
          }
        }

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setLoadingActions({ ...loadingActions, [`update_${selectedUser.id}`]: false });
    }
  };

  const handleBanUser = (user: any) => {
    setActionUser(user);
    setBanConfirmOpen(true);
  };

  const handleVerifyUser = async (user: any) => {
    try {
      setLoadingActions({ ...loadingActions, [`verify_${user.id}`]: true });
      const token = authService.getToken();
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please login again to continue",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(getApiUrl(`/users/${user.id}/verify/`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "User verified successfully",
        });
        fetchUsers(); // Refresh user list
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to verify user",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error verifying user:', error);
      toast({
        title: "Error",
        description: "Failed to verify user",
        variant: "destructive",
      });
    } finally {
      setLoadingActions({ ...loadingActions, [`verify_${user.id}`]: false });
    }
  };

  const handleUnbanUser = (user: any) => {
    handleVerifyUser(user); // Treat unban as verify for now
  };

  const handleViewActivity = async (user: any) => {
    setSelectedUser(user);
    setActivityModalOpen(true);
    setLoadingActivity(true);
    setUserActivities([]);

    try {
      const token = authService.getToken();
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please login again to continue",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(getApiUrl(`/users/${user.id}/activity/`), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setUserActivities(data.data.activities || []);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to load user activity",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching user activity:', error);
      toast({
        title: "Error",
        description: "Failed to load user activity",
        variant: "destructive",
      });
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    if (resetPasswordData.new_password !== resetPasswordData.confirm_password) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (resetPasswordData.new_password.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoadingActions({ ...loadingActions, [`reset_password_${selectedUser.id}`]: true });
      const token = authService.getToken();
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please login again to continue",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(getApiUrl(`/users/${selectedUser.id}/reset-password/`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          new_password: resetPasswordData.new_password
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Password reset successfully",
        });
        setResetPasswordModalOpen(false);
        setResetPasswordData({ new_password: "", confirm_password: "" });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to reset password",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: "Error",
        description: "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setLoadingActions({ ...loadingActions, [`reset_password_${selectedUser.id}`]: false });
    }
  };

  const handleDisable2FA = async (user: User) => {
    try {
      setLoadingActions({ ...loadingActions, [`disable_2fa_${user.id}`]: true });
      const token = authService.getToken();

      const response = await fetch(getApiUrl(`/users/${user.id}/update/`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ two_factor_enabled: false })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Two-factor authentication disabled successfully",
        });
        fetchUsers(); // Refresh user list
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to disable 2FA",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      toast({
        title: "Error",
        description: "Failed to disable 2FA",
        variant: "destructive",
      });
    } finally {
      setLoadingActions({ ...loadingActions, [`disable_2fa_${user.id}`]: false });
      setDisable2FAConfirmOpen(false);
      setActionUser(null);
    }
  };

  const handleDeleteUser = (user: any) => {
    setActionUser(user);
    setDeleteConfirmOpen(true);
  };

  const confirmBanUser = async () => {
    if (!actionUser) return;

    try {
      setLoadingActions({ ...loadingActions, [`ban_${actionUser.id}`]: true });
      const token = authService.getToken();
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please login again to continue",
          variant: "destructive",
        });
        return;
      }

      // Ban user by setting is_active to false
      const response = await fetch(getApiUrl(`/users/${actionUser.id}/update/`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: false })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "User banned successfully",
        });
        fetchUsers(); // Refresh user list
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to ban user",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error banning user:', error);
      toast({
        title: "Error",
        description: "Failed to ban user",
        variant: "destructive",
      });
    } finally {
      setLoadingActions({ ...loadingActions, [`ban_${actionUser.id}`]: false });
      setBanConfirmOpen(false);
      setActionUser(null);
    }
  };

  const confirmDeleteUser = async () => {
    if (!actionUser) return;

    try {
      const token = authService.getToken();
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please login again to continue",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(getApiUrl(`/users/${actionUser.id}/delete/`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "User deleted successfully",
        });
        fetchUsers(); // Refresh user list
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to delete user",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setDeleteConfirmOpen(false);
      setActionUser(null);
    }
  };

  const toggleSelectAll = () => {
    const filteredUsers = getFilteredUsers();
    if (selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    }
  };

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedUserIds.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedUserIds.length} users?`)) {
      return;
    }

    try {
      const token = authService.getToken();
      setLoading(true);

      // Perform deletions sequentially or use a bulk endpoint if available
      // The backend seems to have individual delete, so we'll do them in parallel
      const deletePromises = selectedUserIds.map(userId =>
        fetch(getApiUrl(`/users/${userId}/delete/`), {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
      );

      await Promise.all(deletePromises);

      toast({
        title: "Success",
        description: `Successfully deleted ${selectedUserIds.length} users`,
      });

      setSelectedUserIds([]);
      fetchUsers();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast({
        title: "Error",
        description: "Failed to perform bulk deletion",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkActivate = async () => {
    if (selectedUserIds.length === 0) return;

    try {
      const token = authService.getToken();
      setLoading(true);

      const activatePromises = selectedUserIds.map(userId =>
        fetch(getApiUrl(`/users/${userId}/verify/`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
      );

      await Promise.all(activatePromises);

      toast({
        title: "Success",
        description: `Successfully activated ${selectedUserIds.length} users`,
      });

      setSelectedUserIds([]);
      fetchUsers();
    } catch (error) {
      console.error('Bulk activate error:', error);
      toast({
        title: "Error",
        description: "Failed to perform bulk activation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // API Functions
  const fetchUsers = async (page = currentPage) => {
    try {
      setLoading(true);

      const queryParams = new URLSearchParams({
        page: page.toString(),
        page_size: '20',
        search: searchTerm,
      });

      if (roleFilter !== 'all') {
        queryParams.append('user_type', roleFilter);
      }

      if (statusFilter !== 'all') {
        queryParams.append('status', statusFilter);
      }

      const apiUrl = getApiUrl(`/users/?${queryParams.toString()}`);
      console.log('🔍 Fetching users from:', apiUrl);

      // Get authentication token
      const token = authService.getToken();
      if (!token) {
        console.error('❌ No authentication token found');
        toast({
          title: "Authentication Error",
          description: "Please login again to continue",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(apiUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Raw API response:', data);

        // Extract data from backend response format
        let usersData = [];
        if (data.success && data.data) {
          if (data.data.users) {
            usersData = data.data.users;
          }
          if (data.data.pagination) {
            setPagination(data.data.pagination);
          }
          if (data.data.stats) {
            setStats(data.data.stats);
          }
        } else if (data.results) {
          usersData = data.results;
        } else if (Array.isArray(data)) {
          usersData = data;
        }

        console.log('🔍 Extracted users data:', usersData);

        setUsers(Array.isArray(usersData) ? usersData : []);
        console.log('🔍 Final users state:', usersData);
      } else if (response.status === 401) {
      } else if (response.status === 401) {
        console.error('❌ Authentication failed');
        toast({
          title: "Authentication Error",
          description: "Please login again to continue",
          variant: "destructive",
        });
        setUsers([]);
      } else if (response.status === 403) {
        console.error('❌ Permission denied');
        toast({
          title: "Permission Denied",
          description: "You don't have permission to view users",
          variant: "destructive",
        });
        setUsers([]);
      } else {
        console.error('❌ Failed to fetch users');
        setUsers([]);
      }
    } catch (error) {
      console.error('💥 Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Get counts from API data
  const getTotalUsersCount = () => {
    return stats.total_users;
  };

  const getActiveUsersCount = () => {
    return stats.active_users;
  };

  const getVendorsCount = () => {
    return stats.vendors;
  };

  const getBannedUsersCount = () => {
    return stats.banned_users;
  };

  // Filter users based on search and filters
  const getFilteredUsers = () => {
    let filtered = users;

    // Search filter - use API search if available, otherwise client-side filter
    if (searchTerm && searchTerm.length >= 2) {
      // Client-side search as fallback
      filtered = filtered.filter(user =>
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(user => user.is_verified);
      } else if (statusFilter === 'pending') {
        filtered = filtered.filter(user => !user.is_verified);
      } else if (statusFilter === 'banned') {
        filtered = filtered.filter(user => user.is_active === false);
      }
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.user_type === roleFilter);
    }

    return filtered;
  };

  // Fetch users when page or filters change
  useEffect(() => {
    // For search, we only fetch if it's empty or at least 2 characters
    if (searchTerm.length > 0 && searchTerm.length < 2) return;

    // We want a small delay for search specifically
    const timer = setTimeout(() => {
      fetchUsers(currentPage);
    }, searchTerm ? 500 : 0);

    return () => clearTimeout(timer);
  }, [currentPage, roleFilter, statusFilter, searchTerm]);

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, statusFilter, searchTerm]);

  const handleSendMessage = async () => {
    if (!selectedUser || !messageContent.trim()) return;

    try {
      setSendingMessage(true);

      // Try to create/get conversation
      const conv = await messagingService.createConversation(selectedUser.id);

      if (conv && conv.id) {
        await messagingService.sendMessage(conv.id, messageContent);

        toast({
          title: "Success",
          description: "Message sent successfully",
        });
        setMessageModalOpen(false);
        setMessageContent("");
      } else {
        throw new Error("Could not start conversation");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
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
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card border border-border shadow-xl">
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
                            className="!bg-gray-800 !border-gray-600 !text-white placeholder:text-gray-400 focus:!bg-gray-800"
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
                            className="!bg-gray-800 !border-gray-600 !text-white placeholder:text-gray-400 focus:!bg-gray-800"
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
                          className="!bg-gray-800 !border-gray-600 !text-white placeholder:text-gray-400 focus:!bg-gray-800"
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
                            className="!bg-gray-800 !border-gray-600 !text-white placeholder:text-gray-400 focus:!bg-gray-800"
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
                            className="!bg-gray-800 !border-gray-600 !text-white placeholder:text-gray-400 focus:!bg-gray-800"
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
                            <SelectTrigger className="!bg-gray-800 !border-gray-600 !text-white placeholder:text-gray-400 focus:!bg-gray-800" data-testid="select-role">
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
                            <SelectTrigger className="!bg-gray-800 !border-gray-600 !text-white placeholder:text-gray-400 focus:!bg-gray-800" data-testid="select-status">
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
                          className="!bg-gray-800 !border-gray-600 !text-white placeholder:text-gray-400 focus:!bg-gray-800"
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
                          className="!bg-gray-800 !border-gray-600 !text-white placeholder:text-gray-400 focus:!bg-gray-800"
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
                    disabled={creatingUser}
                  >
                    {creatingUser ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create User"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>


      {/* Send Message Modal */}
      <Dialog open={messageModalOpen} onOpenChange={setMessageModalOpen}>
        <DialogContent className="bg-surface-1 border-border text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <MessageSquare className="w-5 h-5 text-accent" />
              Direct Message to {selectedUser?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-gray-400 text-sm font-medium">Message Content</Label>
              <textarea
                className="w-full h-40 bg-surface-2 border border-border rounded-xl p-4 text-white focus:ring-2 focus:ring-accent/50 outline-none transition-all resize-none shadow-inner"
                placeholder="Type your administrative message here..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                This message will be delivered to the user's inbox immediately.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-border text-gray-400 hover:text-white hover:bg-surface-2"
                onClick={() => setMessageModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-[2] bg-accent text-bg font-bold hover:bg-accent/90"
                disabled={sendingMessage || !messageContent.trim()}
                onClick={async () => {
                  if (!selectedUser) return;
                  try {
                    setSendingMessage(true);
                    const conversation = await messagingService.createConversation(selectedUser.id);
                    await messagingService.sendMessage(messageContent, conversation.id);

                    toast({
                      title: "Success",
                      description: `Message sent to ${selectedUser.username}`,
                    });
                    setMessageModalOpen(false);
                    setMessageContent("");
                  } catch (error: any) {
                    toast({
                      title: "Error",
                      description: error.message || "Failed to send message",
                      variant: "destructive",
                    });
                  } finally {
                    setSendingMessage(false);
                  }
                }}
              >
                {sendingMessage ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <MessageSquare className="w-4 h-4 mr-2" />
                )}
                Send Message
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="crypto-card">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-accent/20 rounded-lg">
                {/* <div className="w-6 h-6 bg-accent rounded"></div> */}
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-white">{getTotalUsersCount()}</p>
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
                <p className="text-2xl font-bold text-white">{getActiveUsersCount()}</p>
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
                <p className="text-2xl font-bold text-white">{getVendorsCount()}</p>
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
                <p className="text-2xl font-bold text-white">{getBannedUsersCount()}</p>
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
                  className="pl-10 !bg-gray-800 !border-gray-600 !text-white placeholder:text-gray-400 focus:!bg-gray-800"
                  data-testid="search-users"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 !bg-gray-800 !border-gray-600 !text-white placeholder:text-gray-400 focus:!bg-gray-800">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40 !bg-gray-800 !border-gray-600 !text-white placeholder:text-gray-400 focus:!bg-gray-800">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="crypto-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-white">Users List</CardTitle>
          {selectedUserIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 mr-2">{selectedUserIds.length} selected</span>
              <Button
                variant="outline"
                size="sm"
                className="border-success/50 text-success hover:text-green"
                onClick={handleBulkActivate}
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Activate
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-danger/50 text-danger hover:text-red"
                onClick={handleBulkDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-2">
                <tr>
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      className="rounded border-gray-600 bg-gray-700 text-accent focus:ring-accent"
                      checked={selectedUserIds.length === getFilteredUsers().length && getFilteredUsers().length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-gray-300">Username</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-300">Email</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-300">Role</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-300">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-300">Join Date</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-300">Last Login</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-300">Orders</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-300">2FA</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                        <span className="ml-3 text-gray-400">Loading users...</span>
                      </div>
                    </td>
                  </tr>
                ) : getFilteredUsers().length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <User className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400">
                        {searchTerm || statusFilter !== 'all' || roleFilter !== 'all'
                          ? 'No users found matching your filters'
                          : 'No users found'
                        }
                      </p>
                    </td>
                  </tr>
                ) : (
                  getFilteredUsers().map((user) => {
                    const isSelf = currentUser && String(currentUser.id) === String(user.id);
                    return (
                      <tr key={user.id} className={`${selectedUserIds.includes(user.id) ? 'bg-accent/10' : 'hover:bg-surface-2/50'}`} data-testid={`user-row-${user.id}`}>
                        <td className="p-4">
                          <input
                            type="checkbox"
                            className="rounded border-gray-600 bg-gray-700 text-accent focus:ring-accent"
                            checked={selectedUserIds.includes(user.id)}
                            onChange={() => toggleSelectUser(user.id)}
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center mr-3 bg-accent/20 border border-border">
                              {!!user.profile_picture ? (
                                <img src={getImageUrl(user.profile_picture)} alt={user.username} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-accent text-sm font-medium">{user.username ? user.username[0].toUpperCase() : '?'}</span>
                              )}
                            </div>
                            <span className="font-medium text-white">{user.username}</span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-300 text-muted">{user.email || 'Not Available'}</td>
                        <td className="p-4">
                          <Badge
                            variant={user.user_type === "vendor" ? "secondary" : "outline"}
                            className="text-gray-300"
                          >
                            {user.user_type === "vendor" ? "Vendor" : user.user_type === "admin" ? "Admin" : "Buyer"}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {user.is_active === false ? (
                            <StatusBadge
                              status="Banned"
                              type="danger"
                            />
                          ) : (
                            <StatusBadge
                              status={!!user.is_verified ? "Verified" : "Pending Verification"}
                              type={!!user.is_verified ? "success" : "warning"}
                            />
                          )}
                        </td>
                        <td className="p-4 text-gray-300">{new Date(user.date_joined).toLocaleDateString()}</td>
                        <td className="p-4 text-gray-300">Never</td>
                        <td className="p-4 text-gray-300">{user.total_orders || 0}</td>
                        <td className="p-4">
                          {!!user.two_factor_enabled ? (
                            <Badge className="bg-success/20 text-success border-success/30">Enabled</Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500 border-gray-700">Disabled</Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-400 hover:text-white"
                              onClick={() => handleViewUser(user)}
                              data-testid={`view-user-${user.id}`}
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-accent hover:text-accent-2"
                              onClick={() => {
                                setSelectedUser(user);
                                setMessageModalOpen(true);
                              }}
                              data-testid={`message-user-${user.id}`}
                              title="Send Message"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-400 hover:text-white"
                              onClick={() => handleEditUser(user)}
                              data-testid={`edit-user-${user.id}`}
                              disabled={!!loadingActions[`update_${user.id}`]}
                            >
                              {!!loadingActions[`update_${user.id}`] ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Edit className="w-4 h-4" />
                              )}
                            </Button>
                            {/* <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-gray-400 hover:text-white" 
                              onClick={() => handleLoginAsUser(String(user.id))}
                              data-testid={`login-as-${user.id}`}
                            >
                              <LogIn className="w-4 h-4" />
                            </Button> */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-400 hover:text-white"
                              onClick={() => handleViewActivity(user)}
                              data-testid={`view-activity-${user.id}`}
                              disabled={loadingActivity}
                            >
                              {loadingActivity && selectedUser?.id === user.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <History className="w-4 h-4" />
                              )}
                            </Button>
                            {user.is_active === false ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-success hover:text-green-400"
                                onClick={() => handleVerifyUser(user)}
                                data-testid={`unban-user-${user.id}`}
                                title="Unban User"
                                disabled={!!loadingActions[`verify_${user.id}`]}
                              >
                                {!!loadingActions[`verify_${user.id}`] ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Unlock className="w-4 h-4" />
                                )}
                              </Button>
                            ) : !user.is_verified ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-success hover:text-green-400"
                                onClick={() => handleVerifyUser(user)}
                                data-testid={`verify-user-${user.id}`}
                                title="Verify User"
                                disabled={!!loadingActions[`verify_${user.id}`]}
                              >
                                {!!loadingActions[`verify_${user.id}`] ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <UserCheck className="w-4 h-4" />
                                )}
                              </Button>
                            ) : null}
                            {user.is_active !== false && user.is_verified && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`text-danger hover:text-red-400 ${isSelf ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={() => !isSelf && handleBanUser(user)}
                                data-testid={`ban-user-${user.id}`}
                                disabled={isSelf}
                                title={isSelf ? "You cannot suspend yourself" : "Suspend User"}
                              >
                                <Ban className="w-4 h-4" />
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
                                  onClick={() => handleViewActivity(user)}
                                >
                                  <UserCheck className="w-4 h-4 mr-2" />
                                  View Activity
                                </DropdownMenuItem>
                                {!user.is_verified && (
                                  <DropdownMenuItem
                                    className="text-gray-300 hover:bg-surface-2 hover:text-white cursor-pointer"
                                    onClick={() => handleVerifyUser(user)}
                                  >
                                    <UserCheck className="w-4 h-4 mr-2" />
                                    Verify User
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="text-gray-300 hover:bg-surface-2 hover:text-white cursor-pointer"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setResetPasswordModalOpen(true);
                                    setResetPasswordData({ new_password: "", confirm_password: "" });
                                  }}
                                >
                                  <Shield className="w-4 h-4 mr-2" />
                                  Reset Password
                                </DropdownMenuItem>
                                {user.two_factor_enabled && (
                                  <DropdownMenuItem
                                    className="text-warning hover:bg-warning/10 cursor-pointer"
                                    onClick={() => {
                                      setActionUser(user);
                                      setDisable2FAConfirmOpen(true);
                                    }}
                                  >
                                    <Shield className="w-4 h-4 mr-2" />
                                    Disable 2FA
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator className="bg-border" />
                                <DropdownMenuItem
                                  className={`text-danger hover:bg-danger/10 hover:text-red-400 cursor-pointer ${isSelf ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  onClick={() => !isSelf && handleDeleteUser(user)}
                                  disabled={isSelf}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  {isSelf ? "Delete User (Self-Disabled)" : "Delete User"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
        {pagination.total_pages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border bg-surface-2/30">
            <div className="text-sm text-gray-400">
              Showing <span className="text-white">{(currentPage - 1) * pagination.page_size + 1}</span> to <span className="text-white">{Math.min(currentPage * pagination.page_size, pagination.total_count)}</span> of <span className="text-white">{pagination.total_count}</span> users
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="border-border text-gray-300 hover:bg-surface-2 h-8 w-8 p-0"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={!pagination.has_previous}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(pagination.total_pages, 5) }, (_, i) => {
                  let pageNum;
                  if (pagination.total_pages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= pagination.total_pages - 2) {
                    pageNum = pagination.total_pages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  if (pageNum <= 0 || pageNum > pagination.total_pages) return null;

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      className={`h-8 w-8 p-0 ${currentPage === pageNum ? "bg-accent text-bg hover:bg-accent/90 font-bold" : "border-border text-gray-300 hover:bg-surface-2"}`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-border text-gray-300 hover:bg-surface-2 h-8 w-8 p-0"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.total_pages))}
                disabled={!pagination.has_next}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* User Details Modal */}
      <Dialog open={userDetailsModalOpen} onOpenChange={setUserDetailsModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-card border border-border shadow-xl">
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
                  <StatusBadge
                    status={!!selectedUser.is_verified ? "Verified" : "Pending Verification"}
                    type={!!selectedUser.is_verified ? "success" : "warning"}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-400 text-sm">Role</Label>
                    <div className="flex items-center mt-1">
                      <User className="w-4 h-4 text-accent mr-2" />
                      <span className="text-white capitalize">{selectedUser.user_type || 'User'}</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-400 text-sm">Join Date</Label>
                    <div className="flex items-center mt-1">
                      <Calendar className="w-4 h-4 text-accent mr-2" />
                      <span className="text-white">{new Date(selectedUser.date_joined).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-400 text-sm">Total Orders</Label>
                    <div className="flex items-center mt-1">
                      <span className="text-white text-lg font-semibold">{selectedUser.total_orders || 0}</span>
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
                      <span className="text-white">
                        {selectedUser.last_login
                          ? new Date(selectedUser.last_login).toLocaleString()
                          : "Never"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-400 text-sm">Total Spent</Label>
                    <div className="flex items-center mt-1">
                      <span className="text-accent font-mono font-semibold">
                        {(selectedUser.total_spent || 0).toFixed(8)} BTC
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vendor Details Section - Only show for vendors */}
              {selectedUser.user_type === 'vendor' && (
                <div className="border-t border-border pt-4 mt-4">
                  <h4 className="text-white font-semibold mb-3">Vendor Business Details</h4>
                  {loadingVendorDetails ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-accent" />
                    </div>
                  ) : vendorDetails ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-400 text-sm">Business Name</Label>
                        <div className="text-white mt-1">{vendorDetails.business_name || 'Not Available'}</div>
                      </div>
                      <div>
                        <Label className="text-gray-400 text-sm">Contact Number</Label>
                        <div className="text-white mt-1">{vendorDetails.contact || vendorDetails.phone || 'Not Available'}</div>
                      </div>
                      <div>
                        <Label className="text-gray-400 text-sm">Website</Label>
                        <div className="text-white mt-1">{vendorDetails.website || 'Not Available'}</div>
                      </div>
                      <div>
                        <Label className="text-gray-400 text-sm">Business Description</Label>
                        <div className="text-white mt-1 text-sm">{vendorDetails.store_description || 'Not Available'}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">No vendor details available</div>
                  )}
                </div>
              )}

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
                  disabled={!!loadingActions[`impersonate_${selectedUser.id}`]}
                >
                  {!!loadingActions[`impersonate_${selectedUser.id}`] ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4 mr-2" />
                  )}
                  Login As User
                </Button>
                {selectedUser.is_verified ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className={`border-danger text-danger hover:bg-danger/10 ${currentUser && String(selectedUser.id) === String(currentUser.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => {
                      if (currentUser && String(selectedUser.id) === String(currentUser.id)) return;
                      setUserDetailsModalOpen(false);
                      handleBanUser(selectedUser);
                    }}
                    data-testid="btn-ban-user-details"
                    disabled={currentUser && String(selectedUser.id) === String(currentUser.id)}
                    title={currentUser && String(selectedUser.id) === String(currentUser.id) ? "You cannot suspend yourself" : "Ban User"}
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
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-card border border-border shadow-xl">
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
                          className="!bg-gray-800 !border-gray-600 !text-white placeholder:text-gray-400 focus:!bg-gray-800"
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
                          className="!bg-gray-800 !border-gray-600 !text-white placeholder:text-gray-400 focus:!bg-gray-800"
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
                        className="!bg-gray-800 !border-gray-600 !text-white placeholder:text-gray-400 focus:!bg-gray-800"
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
                      <Select onValueChange={field.onChange} value={field.value} disabled={selectedUser && currentUser && String(selectedUser.id) === String(currentUser.id)}>
                        <FormControl>
                          <SelectTrigger className={`!bg-gray-800 !border-gray-600 !text-white placeholder:text-gray-400 focus:!bg-gray-800 ${selectedUser && currentUser && String(selectedUser.id) === String(currentUser.id) ? 'opacity-50 cursor-not-allowed' : ''}`} data-testid="edit-select-role">
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
                      <Select onValueChange={field.onChange} value={field.value} disabled={selectedUser && currentUser && String(selectedUser.id) === String(currentUser.id)}>
                        <FormControl>
                          <SelectTrigger className={`!bg-gray-800 !border-gray-600 !text-white placeholder:text-gray-400 focus:!bg-gray-800 ${selectedUser && currentUser && String(selectedUser.id) === String(currentUser.id) ? 'opacity-50 cursor-not-allowed' : ''}`} data-testid="edit-select-status">
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
                        className="!bg-gray-800 !border-gray-600 !text-white placeholder:text-gray-400 focus:!bg-gray-800"
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
                  disabled={!!(selectedUser && loadingActions[`update_${selectedUser.id}`])}
                >
                  {selectedUser && loadingActions[`update_${selectedUser.id}`] ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update User"
                  )}
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
              disabled={!!(actionUser && loadingActions[`ban_${actionUser.id}`])}
            >
              {actionUser && loadingActions[`ban_${actionUser.id}`] ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Banning...
                </>
              ) : (
                "Ban User"
              )}
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

      {/* User Activity Modal */}
      <Dialog open={activityModalOpen} onOpenChange={setActivityModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card text-white border border-gray-600/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              User Activity - {selectedUser?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-150px)]">
            {loadingActivity ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="ml-3 text-gray-400">Loading activity...</span>
              </div>
            ) : userActivities.length > 0 ? (
              <div className="space-y-3">
                {userActivities.map((activity, index) => (
                  <div
                    key={index}
                    className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge
                            variant={activity.type === 'order' ? 'secondary' : 'outline'}
                            className={
                              activity.type === 'account_created' ? 'bg-green-500/20 text-green-400 border-green-500/30 text-xs' :
                                activity.type === 'login' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs' :
                                  'text-xs'
                            }
                          >
                            {activity.type === 'order' ? 'Order' :
                              activity.type === 'product' ? 'Product' :
                                activity.type === 'login' ? 'Login' :
                                  activity.type === 'account_created' ? 'Account Created' :
                                    'Activity'}
                          </Badge>
                          <span className="text-sm text-gray-400">
                            {new Date(activity.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-white font-medium">{activity.description}</p>
                        {activity.status && (
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                            <span>Status: <span className="text-white">{activity.status}</span></span>
                            {activity.amount && (
                              <span>
                                Amount: <span className="text-white font-mono">{activity.amount} {activity.currency || 'BTC'}</span>
                              </span>
                            )}
                            {activity.price && (
                              <span>
                                Price: <span className="text-white font-mono">{activity.price} BTC</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <User className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No activity found for this user</p>
              </div>
            )}
          </div>
          <div className="flex justify-end pt-4 border-t border-gray-600/20">
            <Button
              variant="outline"
              onClick={() => setActivityModalOpen(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Confirmation Dialog */}
      <AlertDialog open={disable2FAConfirmOpen} onOpenChange={setDisable2FAConfirmOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Disable 2FA</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to disable 2FA for user <strong className="text-white">{actionUser?.username}</strong>?
              This will remove the requirement for a 6-digit code during login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-border text-gray-300 hover:bg-surface-2"
              onClick={() => setActionUser(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => actionUser && handleDisable2FA(actionUser)}
              className="bg-warning text-white hover:bg-warning/90"
              disabled={!!(actionUser && loadingActions[`disable_2fa_${actionUser.id}`])}
            >
              {actionUser && loadingActions[`disable_2fa_${actionUser.id}`] ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Disabling...
                </>
              ) : (
                "Disable 2FA"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Modal */}
      <Dialog open={resetPasswordModalOpen} onOpenChange={setResetPasswordModalOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[80vh] overflow-y-auto bg-card border border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-white">Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">New Password</Label>
              <Input
                type="password"
                placeholder="Enter new password"
                className="mt-1 bg-gray-800 border-gray-600 text-white"
                value={resetPasswordData.new_password}
                onChange={(e) => setResetPasswordData({ ...resetPasswordData, new_password: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-gray-300">Confirm Password</Label>
              <Input
                type="password"
                placeholder="Confirm new password"
                className="mt-1 bg-gray-800 border-gray-600 text-white"
                value={resetPasswordData.confirm_password}
                onChange={(e) => setResetPasswordData({ ...resetPasswordData, confirm_password: e.target.value })}
              />
            </div>
            <p className="text-xs text-gray-400">
              Password must be at least 8 characters long.
            </p>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setResetPasswordModalOpen(false);
                setResetPasswordData({ new_password: "", confirm_password: "" });
              }}
              className="border-border text-gray-300 hover:bg-surface-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              className="bg-accent text-bg hover:bg-accent-2"
              disabled={resetPasswordData.new_password.length < 8 || resetPasswordData.new_password !== resetPasswordData.confirm_password || !!(selectedUser && loadingActions[`reset_password_${selectedUser.id}`])}
            >
              {selectedUser && loadingActions[`reset_password_${selectedUser.id}`] ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Direct Message Modal */}
      <Dialog open={messageModalOpen} onOpenChange={setMessageModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-white">Direct Message to {selectedUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Message Content</Label>
              <Textarea
                placeholder="Type your administrative message here..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                className="min-h-[150px] !bg-gray-800 !border-gray-600 !text-white placeholder:text-gray-500 focus:!border-accent focus:!ring-accent"
              />
              <p className="text-xs text-gray-400">This message will be delivered to the user's inbox immediately.</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMessageModalOpen(false)}
              className="border-gray-600 text-gray-300 hover:bg-surface-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!messageContent.trim() || sendingMessage}
              className="bg-accent text-white hover:bg-accent-2"
            >
              {sendingMessage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
