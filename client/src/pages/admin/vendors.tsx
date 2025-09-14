import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Star, Store, DollarSign, ShoppingCart, Check, X, Clock, Eye, Mail, Phone, Bitcoin, Coins, Calendar, Shield, Globe, Share2, FileText, Download } from "lucide-react";
import { SAMPLE_VENDORS } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/authService";

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

export default function AdminVendors() {
  // API Integration State
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal State
  const [selectedApplication, setSelectedApplication] = useState<VendorApplication | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);
  const [confirmApplication, setConfirmApplication] = useState<VendorApplication | null>(null);
  
  // Image Viewer Modal State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  // Fetch applications on component mount
  useEffect(() => {
    fetchApplications();
  }, []);

  // API Functions
  const fetchApplications = async () => {
    try {
      setLoading(true);
      const apiUrl = 'http://localhost:8000/api/v1/applications/';
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
      const response = await fetch(`http://localhost:8000/api/v1/applications/${confirmApplication.id}/${endpoint}/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ admin_notes: `${confirmAction === 'approve' ? 'Approved' : 'Rejected'} by admin` })
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
      
      const response = await fetch(`http://localhost:8000/api/v1/applications/${selectedApplication.id}/approve/`, {
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
      
      const response = await fetch(`http://localhost:8000/api/v1/applications/${selectedApplication.id}/reject/`, {
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
          <Button className="bg-accent text-bg hover:bg-accent-2">
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
                        className="pl-10 bg-surface-2 border-border text-white"
                        data-testid="search-vendors"
                      />
                    </div>
                  </div>
                  <Select>
                    <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="streaming">Streaming Services</SelectItem>
                      <SelectItem value="software">Software & Tools</SelectItem>
                      <SelectItem value="gaming">Gaming</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <tbody className="divide-y divide-border">
                      {applications?.filter(app => app.status === "approved").map((vendor) => (
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
                                className="border-border hover:bg-surface-2 text-gray-300" 
                                data-testid={`view-approved-vendor-${vendor.id}`}
                                onClick={() => handleReview(vendor)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View Details
                              </Button>
                              {/* <Button 
                                variant="outline" 
                                size="sm" 
                                className="border-border hover:bg-surface-2 text-gray-300" 
                                data-testid={`edit-approved-vendor-${vendor.id}`}
                              >
                                Settings
                              </Button> */}
                            </div>
                          </td>
                        </tr>
                      ))}
                      
                      {applications?.filter(app => app.status === "approved").length === 0 && (
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
                <CardTitle className="text-white">Pending Vendor Applications</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {applications?.filter(app => app.status === "pending").map((application) => (
                    <div key={application.id} className="border border-border rounded-lg p-6 bg-gray-800/50" data-testid={`pending-vendor-${application.id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Header Section */}
                          <div className="flex items-center mb-4">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mr-4">
                              <Store className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-white">{application.business_name}</h3>
                              <p className="text-gray-300">Owner: {application.vendor_username}</p>
                              <p className="text-sm text-gray-400">Applied {application.created_at_formatted}</p>
                            </div>
                          </div>
                          
                          {/* Basic Details Section */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-400">Category</p>
                              <p className="text-white font-medium">{application.category_display}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Commission Rate</p>
                              <p className="text-white font-medium">5%</p>
                            </div>
                          </div>
                          
                          {/* Business Description */}
                          <div>
                            <p className="text-sm text-gray-400">Business Description</p>
                            <p className="text-gray-300 text-sm leading-relaxed">
                              {application.store_description}
                            </p>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex flex-col space-y-2 ml-6">
                          <Button 
                            className="bg-transparent hover:bg-green-500 text-white text-sm px-4 py-2" 
                            data-testid={`approve-vendor-${application.id}`}
                            onClick={() => handleApprove(application.id)}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button 
                            variant="outline" 
                            className="hover:bg-red-500 hover:text-white text-sm px-4 py-2" 
                            data-testid={`reject-vendor-${application.id}`}
                            onClick={() => handleReject(application.id)}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                          <Button 
                            variant="outline" 
                            className="border-gray-600 text-gray-100 hover:bg-gray-700 text-sm px-4 py-2" 
                            data-testid={`review-vendor-${application.id}`}
                            onClick={() => handleReview(application)}
                          >
                            Review
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
                    <tbody className="divide-y divide-border">
                      {applications?.filter(app => app.status === "rejected").map((vendor) => (
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
                                className="border-border hover:bg-surface-2 text-gray-300" 
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
                      
                      {applications?.filter(app => app.status === "rejected").length === 0 && (
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
                    {selectedApplication.logo && (
                      <div>
                        <Label className="text-sm font-medium text-gray-400">Business Logo</Label>
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
                      </div>
                    )}
                    
                    {selectedApplication.images && (
                      <div>
                        <Label className="text-sm font-medium text-gray-400">Additional Images</Label>
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
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Documents */}
              {selectedApplication.documents && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white border-b border-gray-600 pb-2 mb-4">Documents</h3>
                  
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
                </div>
              )}

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
                        closeModal(); // Close review modal
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
                        closeModal(); // Close review modal
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
      
      {/* Toaster Component for Notifications */}
      <Toaster />
    </>
  );
}