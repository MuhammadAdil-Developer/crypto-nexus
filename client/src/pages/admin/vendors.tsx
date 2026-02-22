import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Star, Store, DollarSign, ShoppingCart, Check, X, Clock, Eye, Mail, Phone, Bitcoin, Coins, Calendar, Shield, Globe, Share2, FileText, Download, CheckSquare, Square, Loader2, User, CheckCircle, AlertTriangle, Plus, MessageSquare } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SAMPLE_VENDORS } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { authService } from "@/services/authService";
import { API_BASE_URL, getApiUrl } from "@/config/api";

// API Integration Types
interface VendorApplication {
  id: number;
  business_name: string;
  vendor_username: string;
  email: string;
  contact: string;
  store_description: string;
  category: string;
  category_display: string;
  btc_address: string;
  xmr_address: string;
  documents: string[];
  logo: string;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  status_display: string;
  admin_notes: string;
  reviewed_by: string;
  reviewed_at: string;
  reviewed_at_formatted: string;
  created_at: string;
  created_at_formatted: string;
  updated_at: string;
  non_escrow_blocked?: boolean; // Admin can block vendor from creating non-escrow listings
  vendor_user_id?: string | null;

  // Enhanced fields
  sub_category?: string;
  business_type?: string;
  business_type_display?: string;
  years_in_business?: string;
  years_in_business_display?: string;
  phone?: string;
  website?: string;
  social_media?: string;
  preferred_payment?: string;
  preferred_payment_display?: string;
  target_market?: string;
  business_plan?: string;
  business_address?: string;
  business_license?: string;
  tax_id?: string;
  insurance?: string;
  images?: string; // Single string instead of array
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  images: string[];
  vendor_reply: string;
  vendor_reply_date: string | null;
  conversation: any[];
  product: {
    id: number;
    headline: string;
  };
  buyer: {
    id: number;
    username: string;
  };
  created_at: string;
}


export default function AdminVendors() {
  // API Integration State
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modal State
  const [selectedApplication, setSelectedApplication] = useState<VendorApplication | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);
  const [confirmApplication, setConfirmApplication] = useState<VendorApplication | null>(null);
  const [inviteVendorModalOpen, setInviteVendorModalOpen] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviting, setInviting] = useState(false);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [searchBuyerTerm, setSearchBuyerTerm] = useState("");
  const [loadingBuyers, setLoadingBuyers] = useState(false);
  const [selectedBuyers, setSelectedBuyers] = useState<string[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Image Viewer Modal State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  // Selection state for bulk operations
  const [selectedApplications, setSelectedApplications] = useState<number[]>([]);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  // Confirmation dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogVendor, setConfirmDialogVendor] = useState<VendorApplication | null>(null);
  const [confirmDialogAction, setConfirmDialogAction] = useState<'block' | 'unblock' | null>(null);

  // Reviews State
  const [vendorReviews, setVendorReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState<string | null>(null);
  const [editReviewData, setEditReviewData] = useState({ rating: 0, comment: "", vendor_reply: "" });
  const [activeModalTab, setActiveModalTab] = useState<'details' | 'reviews'>('details');
  const [platformFee, setPlatformFee] = useState<number>(5);


  // Fetch applications and commission settings on component mount
  useEffect(() => {
    fetchApplications();
    fetchCommissionSettings();
  }, []);

  const fetchCommissionSettings = async () => {
    try {
      const token = authService.getToken();
      if (!token) return;

      const response = await fetch(getApiUrl('/payments/admin/commission-settings/'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          setPlatformFee(data.settings.platform_fee_rate);
        }
      }
    } catch (error) {
      console.error('Error fetching commission settings:', error);
    }
  };

  // Fetch reviews when modal opens and vendor is selected
  useEffect(() => {
    if (isModalOpen && selectedApplication && activeModalTab === 'reviews') {
      fetchVendorReviews(selectedApplication.vendor_username);
    }
  }, [isModalOpen, selectedApplication, activeModalTab]);


  // Fetch buyers for dropdown
  const fetchBuyers = async (searchTerm: string = "") => {
    try {
      setLoadingBuyers(true);
      const token = authService.getToken();
      if (!token) return;

      // Using API_BASE_URL from config
      let url = `${API_BASE_URL}/users/?user_type=buyer&page_size=100`;
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.users) {
          setBuyers(data.data.users);
        } else if (data.results) {
          setBuyers(data.results);
        }
      }
    } catch (error) {
      console.error('Error fetching buyers:', error);
    } finally {
      setLoadingBuyers(false);
    }
  };

  // Fetch buyers when modal opens
  useEffect(() => {
    if (inviteVendorModalOpen) {
      fetchBuyers(searchBuyerTerm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteVendorModalOpen]);

  // API Functions
  const fetchApplications = async () => {
    try {
      setLoading(true);
      const apiUrl = getApiUrl('/vendors/applications/');
      console.log('🔍 Fetching applications from:', apiUrl);

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

        // Extract data from results array
        const applicationsData = data.results || data;
        console.log('🔍 Extracted applications data:', applicationsData);

        setApplications(Array.isArray(applicationsData) ? applicationsData : []);
        console.log('🔍 Final applications state:', applicationsData);
      } else if (response.status === 401) {
        console.error('❌ Authentication failed');
        toast({
          title: "Authentication Error",
          description: "Please login again to continue",
          variant: "destructive",
        });
        setApplications([]);
      } else {
        console.error('❌ Failed to fetch applications');
        setApplications([]);
      }
    } catch (error) {
      console.error('💥 Error fetching applications:', error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorReviews = async (vendorUsername: string) => {
    try {
      setLoadingReviews(true);
      const token = authService.getToken();
      if (!token) return;

      const response = await fetch(getApiUrl(`/products/admin/reviews/vendor/${vendorUsername}/`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setVendorReviews(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching vendor reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleUpdateReview = async (reviewId: string) => {
    try {
      const token = authService.getToken();
      if (!token) return;

      const response = await fetch(getApiUrl(`/products/admin/reviews/${reviewId}/update/`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editReviewData)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Review updated successfully",
        });
        setIsEditingReview(null);
        if (selectedApplication) {
          fetchVendorReviews(selectedApplication.vendor_username);
        }
      }
    } catch (error) {
      console.error('Error updating review:', error);
      toast({
        title: "Error",
        description: "Failed to update review",
        variant: "destructive",
      });
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;

    try {
      const token = authService.getToken();
      if (!token) return;

      const response = await fetch(getApiUrl(`/products/admin/reviews/${reviewId}/delete/`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Review deleted successfully",
        });
        if (selectedApplication) {
          fetchVendorReviews(selectedApplication.vendor_username);
        }
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      toast({
        title: "Error",
        description: "Failed to delete review",
        variant: "destructive",
      });
    }
  };

  const handleApprove = async (applicationId: number) => {
    // Find the application to show in confirmation
    const application = applications?.find(app => app.id === applicationId);
    if (application) {
      setConfirmApplication(application);
      setConfirmAction('approve');
      setIsConfirmModalOpen(true);
    }
  };

  const handleReject = async (applicationId: number) => {
    // Find the application to show in confirmation
    const application = applications?.find(app => app.id === applicationId);
    if (application) {
      setConfirmApplication(application);
      setConfirmAction('reject');
      setIsConfirmModalOpen(true);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmApplication || !confirmAction) return;

    try {
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

      const endpoint = confirmAction === 'approve' ? 'approve' : 'reject';
      const notes = adminNotes && adminNotes.trim().length > 0
        ? adminNotes
        : `${confirmAction === 'approve' ? 'Approved' : 'Rejected'} by admin`;

      const response = await fetch(getApiUrl(`/vendors/applications/${confirmApplication.id}/${endpoint}/`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ admin_notes: notes })
      });

      if (response.ok) {
        // Show success toaster
        toast({
          title: `Application ${confirmAction === 'approve' ? 'Approved' : 'Rejected'}`,
          description: `Vendor application "${confirmApplication.business_name}" has been ${confirmAction === 'approve' ? 'approved' : 'rejected'} successfully`,
        });

        // Close confirmation modal
        setIsConfirmModalOpen(false);
        setConfirmAction(null);
        setConfirmApplication(null);

        // Close review modal if open
        if (isModalOpen) {
          closeModal();
        }

        // Refresh applications list
        fetchApplications();
      } else if (response.status === 401) {
        console.error('❌ Authentication failed');
        toast({
          title: "Authentication Error",
          description: "Please login again to continue",
          variant: "destructive",
        });
      } else {
        throw new Error('API request failed');
      }
    } catch (error) {
      console.error(`Error ${confirmAction}ing application:`, error);
      toast({
        title: "Error",
        description: `Failed to ${confirmAction} application`,
        variant: "destructive",
      });
    }
  };

  const closeConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setConfirmAction(null);
    setConfirmApplication(null);
  };

  // Review Modal Functions
  const handleReview = (application: VendorApplication) => {
    console.log('🔍 Opening modal for application:', application);
    console.log('🔍 Application images field:', application.images);
    console.log('🔍 Application documents field:', application.documents);
    console.log('🔍 Application logo field:', application.logo);
    setSelectedApplication(application);
    setAdminNotes(application.admin_notes || '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedApplication(null);
    setAdminNotes("");
    setActiveModalTab('details');
  };

  // Image Viewer Modal Functions
  const openImageViewer = (imageUrl: string) => {
    // Open image in new page instead of modal
    window.open(imageUrl, '_blank');
  };

  const closeImageViewer = () => {
    setIsImageViewerOpen(false);
    setSelectedImage(null);
  };

  // Toggle non-escrow block for vendor
  const handleToggleNonEscrowBlock = (vendor: VendorApplication) => {
    // Show custom confirmation dialog
    setConfirmDialogVendor(vendor);
    setConfirmDialogAction(vendor.non_escrow_blocked ? 'unblock' : 'block');
    setConfirmDialogOpen(true);
  };

  const confirmToggleNonEscrowBlock = async () => {
    if (!confirmDialogVendor || !confirmDialogAction) return;

    const vendor = confirmDialogVendor;
    setConfirmDialogOpen(false);

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

      // Determine vendor user ID. Prefer API-provided ID to avoid search issues.
      let vendorUserId = vendor.vendor_user_id;
      let vendorUserRecord = null;

      if (!vendorUserId) {
        // Try search endpoint
        const searchResponse = await fetch(`${API_BASE_URL}/users/?search=${vendor.vendor_username}&user_type=vendor`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.results && searchData.results.length > 0) {
            vendorUserRecord = searchData.results.find((u: any) => u.username === vendor.vendor_username) || searchData.results[0];
          } else if (searchData.data?.users) {
            vendorUserRecord = searchData.data.users.find((u: any) => u.username === vendor.vendor_username) || searchData.data.users[0];
          }
        }

        // If still not found, try direct username endpoint
        if (!vendorUserRecord) {
          const userResponse = await fetch(`${API_BASE_URL}/users/?username=${vendor.vendor_username}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (userResponse.ok) {
            const userData = await userResponse.json();
            if (userData.success && userData.data?.users) {
              vendorUserRecord = userData.data.users.find((u: any) => u.username === vendor.vendor_username);
            } else if (userData.results) {
              vendorUserRecord = userData.results.find((u: any) => u.username === vendor.vendor_username);
            }
          }
        }

        vendorUserId = vendorUserRecord?.id;
      }

      if (!vendorUserId) {
        toast({
          title: "Error",
          description: `Vendor user not found for ${vendor.vendor_username}. Please try again.`,
          variant: "destructive",
        });
        return;
      }

      // Toggle non_escrow_blocked - use current vendor state from the list
      const currentBlockedStatus = vendor.non_escrow_blocked || false;
      const newValue = !currentBlockedStatus;

      console.log('Blocking vendor:', {
        vendor_username: vendor.vendor_username,
        user_id: vendorUserId,
        current_status: currentBlockedStatus,
        new_status: newValue
      });

      const updateResponse = await fetch(`${getApiUrl('/users/')}${vendorUserId}/update/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          non_escrow_blocked: newValue
        })
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({}));
        const errorMsg = errorData.message || errorData.error || `HTTP ${updateResponse.status}: ${updateResponse.statusText}`;
        console.error('Update failed:', errorMsg, errorData);
        throw new Error(errorMsg || 'Failed to update vendor settings');
      }

      const updateData = await updateResponse.json();
      console.log('Update response:', updateData);

      // Refresh applications to get updated state from backend
      await fetchApplications();

      // Also update local state immediately for better UX
      setApplications(prev => prev.map(app =>
        app.id === vendor.id
          ? { ...app, non_escrow_blocked: newValue, vendor_user_id: vendorUserId }
          : app
      ));

      toast({
        title: "Success",
        description: newValue
          ? "Vendor is now blocked from creating non-escrow listings"
          : "Vendor can now create non-escrow listings",
      });
    } catch (error: any) {
      console.error('Error toggling non-escrow block:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update vendor settings",
        variant: "destructive",
      });
    } finally {
      setConfirmDialogVendor(null);
      setConfirmDialogAction(null);
    }
  };

  // Invite Vendor Handler
  const handleInviteVendor = async () => {
    if (selectedBuyers.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one buyer",
        variant: "destructive",
      });
      return;
    }

    try {
      setInviting(true);
      const token = authService.getToken();
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please login again to continue",
          variant: "destructive",
        });
        return;
      }

      // Using API_BASE_URL from config

      // Send single request with all usernames
      const response = await fetch(`${API_BASE_URL}/vendors/invite/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          usernames: selectedBuyers,
          message: inviteMessage || ''
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: result.message || `Vendor invitations sent to ${selectedBuyers.length} buyer(s)`,
        });
        setInviteVendorModalOpen(false);
        setInviteUsername("");
        setInviteMessage("");
        setSelectedBuyers([]);
      } else {
        throw new Error(result.message || 'Failed to send vendor invitations');
      }
    } catch (error: any) {
      console.error('Error inviting vendor:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send vendor invitation",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  // Bulk selection functions
  const handleSelectAll = () => {
    const pendingApplications = applications?.filter(app => app.status === "pending") || [];

    if (isSelectAll) {
      // Deselect all
      setSelectedApplications([]);
      setIsSelectAll(false);
    } else {
      // Select all pending applications
      const allPendingIds = pendingApplications.map(app => app.id);
      setSelectedApplications(allPendingIds);
      setIsSelectAll(true);
    }
  };

  const handleSelectApplication = (applicationId: number) => {
    if (selectedApplications.includes(applicationId)) {
      setSelectedApplications(prev => prev.filter(id => id !== applicationId));
      setIsSelectAll(false);
    } else {
      const newSelected = [...selectedApplications, applicationId];
      setSelectedApplications(newSelected);

      // Check if all pending applications are now selected
      const pendingApplications = applications?.filter(app => app.status === "pending") || [];
      setIsSelectAll(newSelected.length === pendingApplications.length);
    }
  };

  const handleApproveAllSelected = async () => {
    if (selectedApplications.length === 0) return;

    try {
      setIsApprovingAll(true);

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

      // Approve all selected applications
      const approvePromises = selectedApplications.map(async (applicationId) => {
        const response = await fetch(getApiUrl(`/vendors/applications/${applicationId}/approve/`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ admin_notes: 'Bulk approved by admin' })
        });
        return response.ok;
      });

      const results = await Promise.all(approvePromises);
      const successCount = results.filter(result => result).length;

      if (successCount === selectedApplications.length) {
        toast({
          title: "Bulk Approval Successful",
          description: `${successCount} applications have been approved successfully`,
        });
      } else if (successCount > 0) {
        toast({
          title: "Partial Success",
          description: `${successCount} out of ${selectedApplications.length} applications were approved`,
        });
      } else {
        toast({
          title: "Bulk Approval Failed",
          description: "Failed to approve any applications",
          variant: "destructive",
        });
      }

      // Clear selection and refresh data
      setSelectedApplications([]);
      setIsSelectAll(false);
      fetchApplications();
    } catch (error) {
      console.error('Error approving applications:', error);
      toast({
        title: "Error",
        description: "Failed to approve applications",
        variant: "destructive",
      });
    } finally {
      setIsApprovingAll(false);
    }
  };

  const handleApproveFromModal = async () => {
    if (!selectedApplication) return;

    try {
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

      const response = await fetch(getApiUrl(`/vendors/applications/${selectedApplication.id}/approve/`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ admin_notes: adminNotes })
      });

      if (response.ok) {
        toast({
          title: "Application Approved",
          description: "Vendor application has been approved successfully",
        });
        fetchApplications(); // Refresh list
        closeModal();
      } else if (response.status === 401) {
        console.error('❌ Authentication failed');
        toast({
          title: "Authentication Error",
          description: "Please login again to continue",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error approving application:', error);
      toast({
        title: "Error",
        description: "Failed to approve application",
        variant: "destructive",
      });
    }
  };

  const handleRejectFromModal = async () => {
    if (!selectedApplication) return;

    try {
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

      const response = await fetch(getApiUrl(`/vendors/applications/${selectedApplication.id}/reject/`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ admin_notes: adminNotes })
      });

      if (response.ok) {
        toast({
          title: "Application Rejected",
          description: "Vendor application has been rejected successfully",
        });
        fetchApplications(); // Refresh list
        closeModal();
      } else if (response.status === 401) {
        console.error('❌ Authentication failed');
        toast({
          title: "Authentication Error",
          description: "Please login again to continue",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast({
        title: "Error",
        description: "Failed to reject application",
        variant: "destructive",
      });
    }
  };

  // Get counts from API data
  const getPendingCount = () => {
    const count = applications?.filter(app => app.status === "pending")?.length || 0;
    console.log('🔍 Pending count:', count, 'Applications:', applications); // Debug log
    return count;
  };
  const getApprovedCount = () => {
    const count = applications?.filter(app => app.status === "approved")?.length || 0;
    console.log('🔍 Approved count:', count); // Debug log
    return count;
  };
  const getRejectedCount = () => {
    const count = applications?.filter(app => app.status === "rejected")?.length || 0;
    console.log('🔍 Rejected count:', count); // Debug log
    return count;
  };

  // Debug logging for applications data
  useEffect(() => {
    console.log('🔍 Applications state updated:', applications);
    console.log('🔍 Pending applications:', applications?.filter(app => app.status === "pending"));
  }, [applications]);

  return (
    <> {/* Use Fragment to wrap the entire JSX */}
      <main className="flex-1 overflow-y-auto bg-bg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Vendor Management</h1>
            <p className="text-gray-300 mt-1">Manage vendor applications and shop settings</p>
          </div>
          <Button
            className="bg-accent text-bg hover:bg-accent-2 cursor-pointer"
            onClick={() => {
              setInviteUsername("");
              setInviteMessage("");
              setSelectedBuyers([]);
              setInviteVendorModalOpen(true);
            }}
          >
            Invite Vendor
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Store className="w-8 h-8 text-accent mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Total Applications</p>
                  <p className="text-2xl font-bold text-white">{applications.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-warning mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Pending Applications</p>
                  <p className="text-2xl font-bold text-white">{getPendingCount()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Check className="w-8 h-8 text-success mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Approved Vendors</p>
                  <p className="text-2xl font-bold text-white">{getApprovedCount()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <X className="w-8 h-8 text-red-500 mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Rejected Applications</p>
                  <p className="text-2xl font-bold text-white">{getRejectedCount()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="approved" className="w-full">
          <TabsList className="bg-surface-2 mb-6">
            <TabsTrigger value="approved" className="text-gray-300 data-[state=active]:text-white">
              Approved Vendors
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-gray-300 data-[state=active]:text-white">
              Pending Applications
            </TabsTrigger>
            <TabsTrigger value="rejected" className="text-gray-300 data-[state=active]:text-white">
              Rejected
            </TabsTrigger>
          </TabsList>

          <TabsContent value="approved">
            {/* Search and Filters */}
            <Card className="crypto-card mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search vendors by shop name..."
                        className="pl-10 border-border text-white"
                        data-testid="search-vendors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  {/* <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="Electronics & Tech">Electronics & Tech</SelectItem>
                      <SelectItem value="Digital Goods & Software">Digital Goods & Software</SelectItem>
                      <SelectItem value="Streaming Accounts">Streaming Accounts</SelectItem>
                      <SelectItem value="Gaming Accounts">Gaming Accounts</SelectItem>
                      <SelectItem value="Educational Services">Educational Services</SelectItem>
                      <SelectItem value="VPN & Security">VPN & Security</SelectItem>
                      <SelectItem value="Design & Creative">Design & Creative</SelectItem>
                      <SelectItem value="Business Tools">Business Tools</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select> */}
                </div>
              </CardContent>
            </Card>

            {/* Vendors Table */}
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="text-white">Approved Vendors</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-2">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Business Name</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Owner</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Category</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Applied Date</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Business Type</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border relative">
                      {loading && (
                        <tr>
                          <td colSpan={6} className="py-20 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
                              <p className="text-gray-400">Loading vendors...</p>
                            </div>
                          </td>
                        </tr>
                      )}
                      {!loading && applications?.filter(app => {
                        if (app.status !== "approved") return false;

                        // Apply search filter
                        if (searchTerm && searchTerm.trim().length > 0) {
                          const searchLower = searchTerm.toLowerCase();
                          if (!app.business_name?.toLowerCase().includes(searchLower) &&
                            !app.vendor_username?.toLowerCase().includes(searchLower) &&
                            !app.category?.toLowerCase().includes(searchLower)) {
                            return false;
                          }
                        }

                        // Apply category filter
                        if (categoryFilter !== "all" && app.category !== categoryFilter) {
                          return false;
                        }

                        return true;
                      }).map((vendor) => (
                        <tr key={vendor.id} className="hover:bg-surface-2/50" data-testid={`approved-vendor-${vendor.id}`}>
                          <td className="p-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mr-3">
                                <Store className="w-5 h-5 text-green-400" />
                              </div>
                              <div>
                                <p className="font-medium text-white">{vendor.business_name}</p>
                                <p className="text-sm text-gray-400">Approved</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-gray-300">@{vendor.vendor_username}</td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-gray-300">
                              {vendor.category_display}
                            </Badge>
                          </td>
                          <td className="p-4 text-gray-300">{vendor.created_at_formatted}</td>
                          <td className="p-4 text-gray-300">{vendor.business_type_display || 'Not specified'}</td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-border text-gray-300 whitespace-nowrap"
                                data-testid={`view-approved-vendor-${vendor.id}`}
                                onClick={() => handleReview(vendor)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View Details
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className={`border-border whitespace-nowrap ${vendor.non_escrow_blocked ? 'text-red-400 border-red-500' : 'text-gray-300'}`}
                                onClick={() => handleToggleNonEscrowBlock(vendor)}
                                title={vendor.non_escrow_blocked ? 'Unblock non-escrow listings' : 'Block non-escrow listings'}
                              >
                                <Shield className="w-4 h-4 mr-1" />
                                {vendor.non_escrow_blocked ? 'Unblock' : 'Block'} Non-Escrow
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {!loading && applications?.filter(app => app.status === "approved").length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-12">
                            <Store className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                            <p className="text-gray-400">No approved vendors yet</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card className="crypto-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Pending Vendor Applications</CardTitle>
                  {applications?.filter(app => app.status === "pending").length > 0 && (
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="select-all-pending"
                          checked={isSelectAll}
                          onCheckedChange={handleSelectAll}
                        />
                        <Label htmlFor="select-all-pending" className="text-sm text-gray-300">
                          Select All
                        </Label>
                      </div>
                      {selectedApplications.length > 0 && (
                        <Button
                          onClick={handleApproveAllSelected}
                          disabled={isApprovingAll}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {isApprovingAll ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Approving...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Approve All Selected ({selectedApplications.length})
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4 relative">
                  {loading && (
                    <div className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
                        <p className="text-gray-400">Loading applications...</p>
                      </div>
                    </div>
                  )}
                  {!loading && applications?.filter(app => {
                    if (app.status !== "pending") return false;

                    // Apply search filter
                    if (searchTerm && searchTerm.trim().length > 0) {
                      const searchLower = searchTerm.toLowerCase();
                      if (!app.business_name?.toLowerCase().includes(searchLower) &&
                        !app.vendor_username?.toLowerCase().includes(searchLower)) {
                        return false;
                      }
                    }

                    // Apply category filter
                    if (categoryFilter !== "all" && app.category !== categoryFilter) {
                      return false;
                    }

                    return true;
                  }).map((application) => (
                    <div key={application.id} className="border border-border rounded-lg p-4 sm:p-6 bg-gray-800/50" data-testid={`pending-vendor-${application.id}`}>
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start space-x-3 mb-4 w-full">
                          <Checkbox
                            id={`select-application-${application.id}`}
                            checked={selectedApplications.includes(application.id)}
                            onCheckedChange={() => handleSelectApplication(application.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            {/* Header Section */}
                            <div className="flex flex-col sm:flex-row sm:items-center mb-4 gap-3">
                              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Store className="w-5 h-5 text-blue-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="text-base sm:text-lg font-semibold text-white truncate">{application.business_name}</h3>
                                <p className="text-sm sm:text-base text-gray-300 truncate">Owner: {application.vendor_username}</p>
                                <p className="text-xs sm:text-sm text-gray-400">Applied {application.created_at_formatted}</p>
                              </div>
                            </div>

                            {/* Basic Details Section */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                              <div>
                                <p className="text-xs sm:text-sm text-gray-400">Category</p>
                                <p className="text-sm sm:text-base text-white font-medium truncate">{application.category_display}</p>
                              </div>
                              <div>
                                <p className="text-xs sm:text-sm text-gray-400">Commission Rate</p>
                                <p className="text-sm sm:text-base text-white font-medium">{platformFee}%</p>
                              </div>
                            </div>

                            {/* Business Description */}
                            <div>
                              <p className="text-xs sm:text-sm text-gray-400 mb-1">Business Description</p>
                              <p className="text-gray-300 text-xs sm:text-sm leading-relaxed line-clamp-3">
                                {application.store_description}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-row lg:flex-col gap-2 mt-3 lg:mt-0 lg:ml-6 w-full lg:w-auto">
                          <Button
                            className="bg-transparent hover:bg-green-500 text-white text-xs sm:text-sm px-3 sm:px-4 py-2 flex-1 lg:flex-initial lg:w-full"
                            data-testid={`approve-vendor-${application.id}`}
                            onClick={() => handleApprove(application.id)}
                          >
                            <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Approve</span>
                            <span className="sm:hidden">✓</span>
                          </Button>
                          <Button
                            variant="outline"
                            className="hover:bg-red-500 hover:text-white text-xs sm:text-sm px-3 sm:px-4 py-2 flex-1 lg:flex-initial lg:w-full"
                            data-testid={`reject-vendor-${application.id}`}
                            onClick={() => handleReject(application.id)}
                          >
                            <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Reject</span>
                            <span className="sm:hidden">✕</span>
                          </Button>
                          <Button
                            variant="outline"
                            className="border-gray-600 text-gray-100 hover:bg-gray-700 text-xs sm:text-sm px-3 sm:px-4 py-2 flex-1 lg:flex-initial lg:w-full"
                            data-testid={`review-vendor-${application.id}`}
                            onClick={() => handleReview(application)}
                          >
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 lg:hidden" />
                            <span className="hidden lg:inline">Review</span>
                            <span className="lg:hidden">👁</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {applications?.filter(app => app.status === "pending").length === 0 && (
                    <div className="text-center py-12">
                      <Store className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400">No pending applications</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rejected">
            {/* Search and Filters for Rejected Tab */}
            <Card className="crypto-card mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search vendors by shop name..."
                        className="pl-10 bg-surface-2 border-border text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="Electronics & Tech">Electronics & Tech</SelectItem>
                      <SelectItem value="Digital Goods & Software">Digital Goods & Software</SelectItem>
                      <SelectItem value="Streaming Accounts">Streaming Accounts</SelectItem>
                      <SelectItem value="Gaming Accounts">Gaming Accounts</SelectItem>
                      <SelectItem value="Educational Services">Educational Services</SelectItem>
                      <SelectItem value="VPN & Security">VPN & Security</SelectItem>
                      <SelectItem value="Design & Creative">Design & Creative</SelectItem>
                      <SelectItem value="Business Tools">Business Tools</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="text-white">Rejected Applications</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-2">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Business Name</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Owner</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Category</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Applied Date</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Rejected Date</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border relative">
                      {loading && (
                        <tr>
                          <td colSpan={6} className="py-20 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
                              <p className="text-gray-400">Loading rejected applications...</p>
                            </div>
                          </td>
                        </tr>
                      )}
                      {!loading && applications?.filter(app => {
                        if (app.status !== "rejected") return false;

                        // Apply search filter
                        if (searchTerm && searchTerm.trim().length > 0) {
                          const searchLower = searchTerm.toLowerCase();
                          if (!app.business_name?.toLowerCase().includes(searchLower) &&
                            !app.vendor_username?.toLowerCase().includes(searchLower) &&
                            !app.category?.toLowerCase().includes(searchLower)) {
                            return false;
                          }
                        }

                        // Apply category filter
                        if (categoryFilter !== "all" && app.category !== categoryFilter) {
                          return false;
                        }

                        return true;
                      }).map((vendor) => (
                        <tr key={vendor.id} className="hover:bg-surface-2/50" data-testid={`rejected-vendor-${vendor.id}`}>
                          <td className="p-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center mr-3">
                                <Store className="w-5 h-5 text-red-400" />
                              </div>
                              <div>
                                <p className="font-medium text-white">{vendor.business_name}</p>
                                <p className="text-sm text-red-400">Rejected</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-gray-300">@{vendor.vendor_username}</td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-gray-300">
                              {vendor.category_display}
                            </Badge>
                          </td>
                          <td className="p-4 text-gray-300">{vendor.created_at_formatted}</td>
                          <td className="p-4 text-gray-300">{vendor.reviewed_at_formatted || 'Not specified'}</td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-border text-gray-300"
                                data-testid={`view-rejected-vendor-${vendor.id}`}
                                onClick={() => handleReview(vendor)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View Details
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                                data-testid={`reconsider-rejected-vendor-${vendor.id}`}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Reconsider
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {!loading && applications?.filter(app => app.status === "rejected").length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-12">
                            <X className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                            <p className="text-gray-400">No rejected applications</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs> {/* Added closing tag for Tabs */}

        {/* Detailed Review Modal */}
        {isModalOpen && selectedApplication && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Review Application: {selectedApplication.business_name}
                </h2>
                <Button
                  variant="ghost"
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </Button>
              </div>

              {/* Tabs for Details and Reviews */}
              <Tabs value={activeModalTab} onValueChange={(v: any) => setActiveModalTab(v)} className="w-full">
                <TabsList className="bg-gray-800 border-gray-700 mb-6">
                  <TabsTrigger value="details" className="data-[state=active]:bg-accent data-[state=active]:text-bg">
                    <Store className="w-4 h-4 mr-2" /> Application Details
                  </TabsTrigger>
                  <TabsTrigger value="reviews" className="data-[state=active]:bg-accent data-[state=active]:text-bg">
                    <Star className="w-4 h-4 mr-2" /> Vendor Reviews
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="mt-0">
                  {/* Application Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white border-b border-gray-600 pb-2">Basic Information</h3>

                      <div>
                        <Label className="text-sm font-medium text-gray-400">Business Name</Label>
                        <p className="text-white font-medium mt-2">{selectedApplication.business_name}</p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-400">Vendor Username</Label>
                        <p className="text-white mt-2">@{selectedApplication.vendor_username}</p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-400">Email Address</Label>
                        <p className="text-white flex items-center mt-2">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          {selectedApplication.email}
                        </p>
                      </div>

                      {selectedApplication.phone && (
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Phone Number</Label>
                          <p className="text-white flex items-center mt-2">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            {selectedApplication.phone}
                          </p>
                        </div>
                      )}

                      {selectedApplication.website && (
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Website</Label>
                          <p className="text-blue-400 flex items-center mt-2">
                            <Globe className="w-4 h-4 mr-2 text-gray-400" />
                            {selectedApplication.website}
                          </p>
                        </div>
                      )}

                      {selectedApplication.social_media && (
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Social Media</Label>
                          <p className="text-white flex items-center mt-2">
                            <Share2 className="w-4 h-4 mr-2 text-gray-400" />
                            @{selectedApplication.social_media}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Store Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white border-b border-gray-600 pb-2">Store Information</h3>

                      <div>
                        <Label className="text-sm font-medium text-gray-400">Category</Label>
                        <div className="mt-2">
                          <Badge variant="outline" className="text-gray-300">
                            {selectedApplication.category_display}
                          </Badge>
                        </div>
                        {selectedApplication.sub_category && (
                          <div className="mt-3">
                            <Label className="text-sm font-medium text-gray-400">Sub Category</Label>
                            <div className="mt-2">
                              <Badge variant="outline" className="text-gray-400">
                                {selectedApplication.sub_category}
                              </Badge>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-400">Business Type</Label>
                        <p className="text-white mt-2">
                          {selectedApplication.business_type_display || 'Not specified'}
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-400">Years in Business</Label>
                        <p className="text-white mt-2">
                          {selectedApplication.years_in_business_display || 'Not specified'}
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-400">Application Date</Label>
                        <p className="text-white flex items-center mt-2">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {selectedApplication.created_at_formatted}
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-400">Status</Label>
                        <div className="mt-2">
                          <Badge className="bg-yellow-500 text-white">
                            {selectedApplication.status_display}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Business Information */}
                  {(selectedApplication.target_market || selectedApplication.business_plan) && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-white border-b border-gray-600 pb-2 mb-4">Business Strategy</h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {selectedApplication.target_market && (
                          <div>
                            <Label className="text-sm font-medium text-gray-400">Target Market</Label>
                            <div className="bg-gray-800 rounded-lg p-4 mt-2">
                              <p className="text-gray-300 leading-relaxed">
                                {selectedApplication.target_market}
                              </p>
                            </div>
                          </div>
                        )}

                        {selectedApplication.business_plan && (
                          <div>
                            <Label className="text-sm font-medium text-gray-400">Business Plan</Label>
                            <div className="bg-gray-800 rounded-lg p-4 mt-2">
                              <p className="text-gray-300 leading-relaxed">
                                {selectedApplication.business_plan}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Business Description */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white border-b border-gray-600 pb-2 mb-4">Business Description</h3>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <p className="text-gray-300 leading-relaxed">
                        {selectedApplication.store_description}
                      </p>
                    </div>
                  </div>

                  {/* Payment Information */}
                  {(selectedApplication.btc_address || selectedApplication.xmr_address || selectedApplication.preferred_payment) && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-white border-b border-gray-600 pb-2 mb-4">Payment Information</h3>

                      {selectedApplication.preferred_payment && (
                        <div className="mb-4">
                          <Label className="text-sm font-medium text-gray-400">Preferred Payment Method</Label>
                          <Badge variant="outline" className="text-gray-300 ml-2">
                            {selectedApplication.preferred_payment_display}
                          </Badge>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedApplication.btc_address && (
                          <div>
                            <Label className="text-sm font-medium text-gray-400 flex items-center">
                              <Bitcoin className="w-4 h-4 mr-2" />
                              Bitcoin Address
                            </Label>
                            <p className="text-gray-300 text-sm font-mono break-all bg-gray-800 p-3 rounded">
                              {selectedApplication.btc_address}
                            </p>
                          </div>
                        )}

                        {selectedApplication.xmr_address && (
                          <div>
                            <Label className="text-sm font-medium text-gray-400 flex items-center">
                              <Coins className="w-4 h-4 mr-2" />
                              Monero Address
                            </Label>
                            <p className="text-gray-300 text-sm font-mono break-all bg-gray-800 p-3 rounded">
                              {selectedApplication.xmr_address}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Business Details */}
                  {(selectedApplication.business_address || selectedApplication.business_license || selectedApplication.tax_id || selectedApplication.insurance) && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-white border-b border-gray-600 pb-2 mb-4">Business Details</h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedApplication.business_address && (
                          <div>
                            <Label className="text-sm font-medium text-gray-400">Business Address</Label>
                            <div className="bg-gray-800 rounded-lg p-3 mt-2">
                              <p className="text-gray-300 text-sm">
                                {selectedApplication.business_address}
                              </p>
                            </div>
                          </div>
                        )}

                        {selectedApplication.business_license && (
                          <div>
                            <Label className="text-sm font-medium text-gray-400">Business License</Label>
                            <p className="text-gray-300 text-sm font-mono break-all bg-gray-800 p-3 rounded mt-2">
                              {selectedApplication.business_license}
                            </p>
                          </div>
                        )}

                        {selectedApplication.tax_id && (
                          <div>
                            <Label className="text-sm font-medium text-gray-400">Tax ID</Label>
                            <p className="text-gray-300 text-sm font-mono break-all bg-gray-800 p-3 rounded mt-2">
                              {selectedApplication.tax_id}
                            </p>
                          </div>
                        )}

                        {selectedApplication.insurance && (
                          <div>
                            <Label className="text-sm font-medium text-gray-400">Insurance</Label>
                            <p className="text-gray-300 text-sm font-mono break-all bg-gray-800 p-3 rounded mt-2">
                              {selectedApplication.insurance}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Logo & Images */}
                  {(selectedApplication.logo || selectedApplication.images) && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-white border-b border-gray-600 pb-2 mb-4">Logo & Images</h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Business Logo</Label>
                          {selectedApplication.logo ? (
                            <div className="mt-2">
                              <div className="relative group cursor-pointer" onClick={() => openImageViewer(selectedApplication.logo)}>
                                <img
                                  src={selectedApplication.logo}
                                  alt="Business Logo"
                                  className="w-32 h-32 object-cover rounded-lg border border-gray-600 transition-all duration-200 group-hover:scale-105 group-hover:border-blue-400"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling.style.display = 'block';
                                  }}
                                />

                                {/* Hover Overlay with View Icon */}
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                                    <div className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg">
                                      <Eye className="w-5 h-5" />
                                    </div>
                                  </div>
                                </div>

                                <div className="hidden w-32 h-32 bg-gray-800 rounded-lg border border-gray-600 flex items-center justify-center">
                                  <span className="text-gray-400 text-sm">Logo not available</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-gray-500">Not provided</p>
                          )}
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-gray-400">Additional Images</Label>
                          {selectedApplication.images ? (
                            <div className="mt-2">
                              {/* Handle both array and single string */}
                              {Array.isArray(selectedApplication.images) ? (
                                // If it's an array, map through it
                                <div className="grid grid-cols-2 gap-2">
                                  {selectedApplication.images.map((image, index) => (
                                    <div key={index} className="relative group cursor-pointer" onClick={() => openImageViewer(image)}>
                                      <img
                                        src={image}
                                        alt={`Business Image ${index + 1}`}
                                        className="w-full h-24 object-cover rounded-lg border border-gray-600 transition-all duration-200 group-hover:scale-105 group-hover:border-blue-400"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                          e.currentTarget.nextElementSibling.style.display = 'block';
                                        }}
                                      />

                                      {/* Hover Overlay with View Icon */}
                                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                                        <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                                          <div className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-lg">
                                            <Eye className="w-4 h-4" />
                                          </div>
                                        </div>
                                      </div>

                                      <div className="hidden absolute inset-0 bg-gray-800 rounded-lg border border-gray-600 flex items-center justify-center">
                                        <span className="text-gray-400 text-xs">Image not available</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                // If it's a single string
                                <div className="relative group cursor-pointer" onClick={() => openImageViewer(selectedApplication.images)}>
                                  <img
                                    src={selectedApplication.images}
                                    alt="Business Image"
                                    className="w-full h-24 object-cover rounded-lg border border-gray-600 transition-all duration-200 group-hover:scale-105 group-hover:border-blue-400"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.nextElementSibling.style.display = 'block';
                                    }}
                                  />

                                  {/* Hover Overlay with View Icon */}
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                                      <div className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-lg">
                                        <Eye className="w-4 h-4" />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="hidden absolute inset-0 bg-gray-800 rounded-lg border border-gray-600 flex items-center justify-center">
                                    <span className="text-gray-400 text-xs">Image not available</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-gray-500">Not provided</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </TabsContent>

                <TabsContent value="reviews" className="mt-0">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-600 pb-2 mb-4">
                      <h3 className="text-lg font-semibold text-white">Vendor Feedback & Reviews</h3>
                      <Badge variant="outline" className="text-accent border-accent/30">
                        {vendorReviews.length} Total Reviews
                      </Badge>
                    </div>

                    {loadingReviews ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
                        <p className="text-gray-400">Loading vendor reviews...</p>
                      </div>
                    ) : vendorReviews.length === 0 ? (
                      <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700/50">
                        <Star className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg">No reviews found for this vendor.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {vendorReviews.map((review) => (
                          <div key={review.id} className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-gray-600 transition-colors">
                            {isEditingReview === review.id ? (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-white font-bold">Edit Review</h4>
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setIsEditingReview(null)}
                                      className="text-gray-400 hover:text-white"
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="bg-accent text-bg hover:bg-accent-2"
                                      onClick={() => handleUpdateReview(review.id)}
                                    >
                                      Save Changes
                                    </Button>
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-gray-400 text-sm mb-2 block">Rating (1-5)</Label>
                                  <div className="flex items-center space-x-2">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <button
                                        key={s}
                                        onClick={() => setEditReviewData({ ...editReviewData, rating: s })}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${editReviewData.rating >= s ? 'bg-accent text-bg' : 'bg-gray-700 text-gray-400'}`}
                                      >
                                        <Star className={`w-4 h-4 ${editReviewData.rating >= s ? 'fill-bg' : ''}`} />
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-gray-400 text-sm mb-2 block">Review Comment</Label>
                                  <textarea
                                    value={editReviewData.comment}
                                    onChange={(e) => setEditReviewData({ ...editReviewData, comment: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white h-24 resize-none focus:outline-none focus:border-accent"
                                  />
                                </div>

                                <div>
                                  <Label className="text-gray-400 text-sm mb-2 block">Vendor Reply</Label>
                                  <textarea
                                    value={editReviewData.vendor_reply}
                                    onChange={(e) => setEditReviewData({ ...editReviewData, vendor_reply: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white h-24 resize-none focus:outline-none focus:border-accent"
                                    placeholder="Admin can override or add vendor reply..."
                                  />
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center space-x-3">
                                    <div className="flex items-center bg-gray-900 px-2 py-1 rounded-lg border border-gray-700">
                                      <Star className="w-3 h-3 text-accent fill-accent mr-1" />
                                      <span className="text-white font-bold text-sm">{review.rating}.0</span>
                                    </div>
                                    <div>
                                      <p className="text-white text-sm font-bold flex items-center">
                                        <User className="w-3 h-3 mr-1 text-gray-400" />
                                        @{review.buyer.username}
                                        <span className="text-gray-500 font-normal mx-2">•</span>
                                        <span className="text-gray-400 font-normal text-xs">{review.product.headline}</span>
                                      </p>
                                      <p className="text-gray-500 text-[10px] flex items-center mt-0.5">
                                        <Clock className="w-3 h-3 mr-1" />
                                        {new Date(review.created_at).toLocaleDateString()} at {new Date(review.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-gray-400 hover:text-accent hover:bg-accent/10"
                                      onClick={() => {
                                        setIsEditingReview(review.id);
                                        setEditReviewData({
                                          rating: review.rating,
                                          comment: review.comment,
                                          vendor_reply: review.vendor_reply || ""
                                        });
                                      }}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-red-400/10"
                                      onClick={() => handleDeleteReview(review.id)}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="bg-gray-900 rounded-lg p-3 mb-3 border-l-2 border-accent/30">
                                  <p className="text-gray-200 text-sm italic leading-relaxed">"{review.comment}"</p>
                                </div>

                                {review.vendor_reply ? (
                                  <div className="bg-gray-800/10 rounded-lg p-3 border border-gray-700 flex flex-col space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-accent uppercase tracking-wider flex items-center">
                                        <MessageSquare className="w-3 h-3 mr-1" /> Vendor Response
                                      </span>
                                      <span className="text-[10px] text-gray-500">
                                        {review.vendor_reply_date ? new Date(review.vendor_reply_date).toLocaleDateString() : ''}
                                      </span>
                                    </div>
                                    <p className="text-gray-300 text-sm leading-relaxed">{review.vendor_reply}</p>
                                  </div>
                                ) : (
                                  <div className="py-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-[10px] h-7 text-gray-500 hover:text-accent"
                                      onClick={() => {
                                        setIsEditingReview(review.id);
                                        setEditReviewData({
                                          rating: review.rating,
                                          comment: review.comment,
                                          vendor_reply: ""
                                        });
                                      }}
                                    >
                                      <Plus className="w-3 h-3 mr-1" /> Add Response (Admin)
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white border-b border-gray-600 pb-2 mb-4">Documents</h3>

                {selectedApplication.documents ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Handle both array and single string */}
                    {Array.isArray(selectedApplication.documents) ? (
                      // If it's an array, map through it
                      selectedApplication.documents.map((document, index) => (
                        <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <FileText className="w-5 h-5 text-blue-400 mr-3" />
                              <div>
                                <p className="text-white font-medium text-sm">
                                  Document {index + 1}
                                </p>
                                <p className="text-gray-400 text-xs">
                                  {typeof document === 'string' ? document.split('/').pop() || 'Document file' : 'Document file'}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => window.open(document, '_blank')}
                              className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white text-sm px-3 py-1"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      // If it's a single string
                      <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <FileText className="w-5 h-5 text-blue-400 mr-3" />
                            <div>
                              <p className="text-white font-medium text-sm">
                                Document
                              </p>
                              <p className="text-gray-400 text-xs">
                                {typeof selectedApplication.documents === 'string' ? selectedApplication.documents.split('/').pop() || 'Document file' : 'Document file'}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => window.open(selectedApplication.documents, '_blank')}
                            className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white text-sm px-3 py-1"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Not provided</p>
                )}
              </div>

              {/* Admin Notes */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white border-b border-gray-600 pb-2 mb-4">Admin Notes</h3>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add your review notes here..."
                  className="w-full h-32 bg-gray-800 border border-gray-600 rounded-lg p-3 text-white resize-none focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-600">
                <Button
                  variant="outline"
                  onClick={closeModal}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </Button>

                {/* Only show Approve/Reject buttons for pending applications */}
                {selectedApplication.status === "pending" && (
                  <>
                    <Button
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => {
                        setConfirmApplication(selectedApplication);
                        setConfirmAction('reject');
                        setIsConfirmModalOpen(true);
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject Application
                    </Button>

                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        setConfirmApplication(selectedApplication);
                        setConfirmAction('approve');
                        setIsConfirmModalOpen(true);
                      }}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve Application
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Image Viewer Modal */}
      {isImageViewerOpen && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            {/* Close Button */}
            <button
              onClick={closeImageViewer}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors duration-200 z-10"
            >
              <X className="w-8 h-8" />
            </button>

            {/* Image Container with Proper Constraints */}
            <div className="max-w-4xl max-h-[80vh] overflow-hidden rounded-lg">
              <img
                src={selectedImage}
                alt="Full Size View"
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg shadow-2xl bg-transparent"
              />
            </div>

            {/* Image Info */}
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg">
              <p className="text-sm">
                {selectedImage.split('/').pop() || 'Image'}
              </p>
            </div>

            {/* Download Button */}
            <Button
              onClick={() => window.open(selectedImage, '_blank')}
              className="absolute bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmModalOpen && confirmApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                Confirm {confirmAction === 'approve' ? 'Approval' : 'Rejection'}
              </h2>
              <Button
                variant="ghost"
                onClick={closeConfirmModal}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </Button>
            </div>

            <div className="mb-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mr-4">
                  <Store className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{confirmApplication.business_name}</h3>
                  <p className="text-gray-300 text-sm">Owner: {confirmApplication.vendor_username}</p>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <p className="text-gray-300 text-sm leading-relaxed">
                  Are you sure you want to <span className="font-semibold text-white">{confirmAction === 'approve' ? 'approve' : 'reject'}</span> the vendor application for <span className="font-semibold text-blue-400">"{confirmApplication.business_name}"</span>?
                </p>
              </div>

              <div className="p-3 bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-400 mb-2">Application Details:</p>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-300">
                    <span className="text-gray-400">Category:</span> {confirmApplication.category_display}
                  </p>
                  <p className="text-gray-300">
                    <span className="text-gray-400">Applied:</span> {confirmApplication.created_at_formatted}
                  </p>
                  <p className="text-gray-300">
                    <span className="text-gray-400">Business Type:</span> {confirmApplication.business_type_display || 'Not specified'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={closeConfirmModal}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                className={confirmAction === 'approve'
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
                }
                onClick={handleConfirmAction}
              >
                {confirmAction === 'approve' ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Approve Application
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Reject Application
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Vendor Modal */}
      <Dialog open={inviteVendorModalOpen} onOpenChange={setInviteVendorModalOpen}>
        <DialogContent className="bg-gray-900 border-border text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Invite Vendor</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="search-buyers" className="text-gray-300 mb-2 block">
                Search Buyers <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search-buyers"
                  type="text"
                  placeholder="Search buyers by username..."
                  className="pl-10 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:bg-gray-800"
                  value={searchBuyerTerm}
                  onChange={(e) => {
                    setSearchBuyerTerm(e.target.value);
                    // Clear existing timeout
                    if (searchTimeoutRef.current) {
                      clearTimeout(searchTimeoutRef.current);
                    }
                    // Debounce search
                    searchTimeoutRef.current = setTimeout(() => {
                      fetchBuyers(e.target.value);
                    }, 300);
                  }}
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300 mb-2 block">
                Select Buyers to Invite
              </Label>
              <div className="border border-border rounded-lg bg-surface-2 max-h-[300px] overflow-y-auto">
                {loadingBuyers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                    <span className="ml-3 text-gray-400">Loading buyers...</span>
                  </div>
                ) : buyers.length > 0 ? (
                  <div className="divide-y divide-border">
                    {buyers.map((buyer) => (
                      <div
                        key={buyer.id}
                        className="flex items-center p-3 hover:bg-gray-700/50 cursor-pointer transition-colors"
                        onClick={() => {
                          if (selectedBuyers.includes(buyer.username)) {
                            setSelectedBuyers(selectedBuyers.filter(u => u !== buyer.username));
                          } else {
                            setSelectedBuyers([...selectedBuyers, buyer.username]);
                          }
                        }}
                      >
                        <Checkbox
                          checked={selectedBuyers.includes(buyer.username)}
                          className="mr-3"
                        />
                        <div className="flex-1 flex items-center">
                          <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center mr-3">
                            <span className="text-accent text-sm font-medium">{buyer.username[0].toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="text-white font-medium">@{buyer.username}</p>
                            {buyer.user_type && (
                              <p className="text-xs text-gray-400 capitalize">{buyer.user_type}</p>
                            )}
                          </div>
                        </div>
                        {selectedBuyers.includes(buyer.username) && (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <User className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400">No buyers found</p>
                  </div>
                )}
              </div>
              {selectedBuyers.length > 0 && (
                <p className="text-sm text-gray-400 mt-2">
                  {selectedBuyers.length} buyer(s) selected
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="invite-message" className="text-gray-300 mb-2 block">
                Message (Optional)
              </Label>
              <textarea
                id="invite-message"
                placeholder="Add a personal message to the invitation..."
                className="w-full min-h-[100px] p-3 bg-gray-800 border-gray-600 rounded-md text-white placeholder:text-gray-400 resize-none focus:bg-gray-800"
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
              />
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-sm text-blue-300">
                Selected buyers will receive a real-time notification inviting them to become a vendor. They can click the notification to apply as a vendor.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setInviteVendorModalOpen(false);
                setInviteUsername("");
                setInviteMessage("");
                setSelectedBuyers([]);
                setSearchBuyerTerm("");
              }}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleInviteVendor}
              disabled={inviting || selectedBuyers.length === 0}
              className="bg-accent text-bg hover:bg-accent-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {inviting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invitation{selectedBuyers.length > 0 && ` (${selectedBuyers.length})`}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Confirmation Dialog for Block/Unblock Non-Escrow */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <div className="flex items-center space-x-3 mb-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${confirmDialogAction === 'block' ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                <Shield className={`w-5 h-5 ${confirmDialogAction === 'block' ? 'text-red-400' : 'text-green-400'}`} />
              </div>
              <AlertDialogTitle className="text-white">
                {confirmDialogAction === 'block' ? 'Block Non-Escrow Listings' : 'Unblock Non-Escrow Listings'}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-gray-300">
              {confirmDialogAction === 'block' ? (
                <>
                  Are you sure you want to <span className="font-semibold text-red-400">BLOCK</span> @{confirmDialogVendor?.vendor_username} from creating non-escrow listings?
                  <br /><br />
                  This vendor will only be able to create listings with escrow enabled. They will not be able to disable escrow for any new listings.
                </>
              ) : (
                <>
                  Are you sure you want to <span className="font-semibold text-green-400">ALLOW</span> @{confirmDialogVendor?.vendor_username} to create non-escrow listings again?
                  <br /><br />
                  This vendor will be able to create both escrow and non-escrow listings.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmToggleNonEscrowBlock}
              className={confirmDialogAction === 'block' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {confirmDialogAction === 'block' ? 'Block Vendor' : 'Unblock Vendor'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toaster Component for Notifications */}
      <Toaster />
    </>
  );
}
