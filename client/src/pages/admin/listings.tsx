import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Search, Filter, Check, X, Edit, Trash2, Eye, Star, MapPin, Calendar, CheckCircle, XCircle, Clock, User, Tag, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// API Service
const API_BASE_URL = 'http://localhost:8000/api/v1';

interface Product {
  id: number;
  listing_title: string;
  description: string;
  vendor: {
    id: number;
    username: string;
    email: string;
  };
  category: {
    id: number;
    name: string;
  };
  sub_category: {
    id: number;
    name: string;
  };
  price: string;
  account_type: string;
  verification_level: string;
  delivery_method: string;
  status: string;
  created_at: string;
  main_images: string[];
  tags: string[];
  special_features: string[];
  quantity_available: number;
  documents: string[]; // Changed from string[] to string[]
}

export default function AdminListings() {
  const [viewListingModalOpen, setViewListingModalOpen] = useState(false);
  const [editListingModalOpen, setEditListingModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Product | null>(null);
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState("");
  const [currentFilter, setCurrentFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState(false);
  const [actionProduct, setActionProduct] = useState<Product | null>(null);
  const { toast } = useToast();
  
  const editForm = useForm({
    defaultValues: {
      title: "",
      description: "",
      vendor: "",
      category: "",
      btcPrice: "",
      xmrPrice: "",
      delivery: "",
      status: "Pending"
    }
  });

  // Fetch pending products
  useEffect(() => {
    fetchAllProducts();
  }, []);

  const fetchAllProducts = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please login to access admin panel",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/products/admin/all/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Backend Response (All Products):', data);
        console.log('📊 Products with statuses:', data.results?.map(p => ({ id: p.id, status: p.status, title: p.listing_title })));
        
        setAllProducts(data.results || []);
        setPendingProducts(data.results || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch products",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get filtered products based on current filter
  const getFilteredProducts = () => {
    console.log('🔍 Filtering products:', {
      currentFilter,
      totalProducts: allProducts.length,
      products: allProducts.map(p => ({ id: p.id, status: p.status, title: p.listing_title }))
    });
    
    switch (currentFilter) {
      case 'pending':
        const pending = allProducts.filter(product => product.status === 'pending_approval' || product.status === 'draft');
        console.log('📋 Pending products:', pending.length);
        return pending;
      case 'approved':
        const approved = allProducts.filter(product => product.status === 'approved');
        console.log('✅ Approved products:', approved.length);
        return approved;
      case 'rejected':
        const rejected = allProducts.filter(product => product.status === 'rejected');
        console.log('❌ Rejected products:', rejected.length);
        return rejected;
      default:
        console.log('🌐 All products:', allProducts.length);
        return allProducts;
    }
  };

  // Get product counts for stats
  const getProductCounts = () => {
    const pending = allProducts.filter(p => p.status === 'pending_approval' || p.status === 'draft').length;
    const approved = allProducts.filter(p => p.status === 'approved').length;
    const rejected = allProducts.filter(p => p.status === 'rejected').length;
    const total = allProducts.length;
    
    return { pending, approved, rejected, total };
  };

  const handleViewListing = (listing: Product) => {
    setSelectedListing(listing);
    setViewListingModalOpen(true);
  };

  const openApproveConfirm = (listing: Product) => {
    setActionProduct(listing);
    setIsApproveConfirmOpen(true);
  };

  const openRejectConfirm = (listing: Product) => {
    setActionProduct(listing);
    setIsRejectConfirmOpen(true);
  };

  const handleApproveListing = async (listingId: number) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please login to access admin panel",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/products/admin/${listingId}/approve/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Approval Response:', responseData);
        console.log('🔄 Updating product status from pending to approved');
        
        // Update local state immediately
        setAllProducts(prevProducts => {
          const updated = prevProducts.map(product => 
            product.id === listingId 
              ? { ...product, status: 'approved' }
              : product
          );
          console.log('📝 Updated products:', updated.map(p => ({ id: p.id, status: p.status, title: p.listing_title })));
          return updated;
        });
        
        // Show success toaster
        toast({
          title: "✅ Listing Approved Successfully!",
          description: "Product has been approved and is now visible to buyers.",
          variant: "default",
        });
        
        // Close the review modal
        setViewListingModalOpen(false);
        setSelectedListing(null);
        
        // Also refresh from server to ensure consistency
        setTimeout(() => {
          console.log('🔄 Refreshing from server...');
          fetchAllProducts();
        }, 1000);
      } else {
        const errorData = await response.json();
        toast({
          title: "❌ Approval Failed",
          description: errorData.message || "Failed to approve listing",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error approving listing:', error);
      toast({
        title: "❌ Error",
        description: "Failed to approve listing. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRejectListing = async (listingId: number) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "❌ Rejection Reason Required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please login to access admin panel",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/products/admin/${listingId}/reject/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejection_reason: rejectionReason
        }),
      });

      if (response.ok) {
        // Update local state immediately
        setAllProducts(prevProducts => 
          prevProducts.map(product => 
            product.id === listingId 
              ? { ...product, status: 'rejected' }
              : product
          )
        );
        
        // Show success toaster
        toast({
          title: "✅ Listing Rejected Successfully!",
          description: "Product has been rejected with the provided reason.",
          variant: "default",
        });
        
        // Close both modals
        setRejectModalOpen(false);
        setViewListingModalOpen(false);
        setSelectedListing(null);
        setRejectionReason('');
        
        // Also refresh from server to ensure consistency
        setTimeout(() => {
          fetchAllProducts();
        }, 1000);
      } else {
        const errorData = await response.json();
        toast({
          title: "❌ Rejection Failed",
          description: errorData.message || "Failed to reject listing",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error rejecting listing:', error);
      toast({
        title: "❌ Error",
        description: "Failed to reject listing. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditListing = (listing: Product) => {
    setSelectedListing(listing);
    editForm.reset({
      title: listing.listing_title,
      description: listing.description,
      vendor: listing.vendor.username,
      category: listing.category.name,
      btcPrice: listing.price,
      xmrPrice: listing.price,
      delivery: listing.delivery_method,
      status: listing.status
    });
    setEditListingModalOpen(true);
  };

  const handleUpdateListing = (data: any) => {
    console.log("Updating listing:", selectedListing?.id, data);
    setEditListingModalOpen(false);
  };

  const handleDeleteListing = (listing: Product) => {
    setSelectedListing(listing);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteListing = () => {
    console.log("Confirmed deleting listing:", selectedListing?.id);
    setDeleteConfirmOpen(false);
    setSelectedListing(null);
  };

  const openRejectModal = (listing: Product) => {
    setSelectedListing(listing);
    setRejectModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return <StatusBadge status="warning" text="Pending Approval" />;
      case 'draft':
        return <StatusBadge status="info" text="Draft" />;
      case 'approved':
        return <StatusBadge status="success" text="Approved" />;
      case 'rejected':
        return <StatusBadge status="destructive" text="Rejected" />;
      default:
        return <StatusBadge status="secondary" text={status} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // If it's today, show time
    if (diffDays === 1) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    
    // If it's within last 7 days, show relative date
    if (diffDays <= 7) {
      if (diffDays === 1) return 'Yesterday';
      if (diffDays === 2) return '2 days ago';
      if (diffDays === 3) return '3 days ago';
      if (diffDays === 4) return '4 days ago';
      if (diffDays === 5) return '5 days ago';
      if (diffDays === 6) return '6 days ago';
      if (diffDays === 7) return '1 week ago';
    }
    
    // For older dates, show compact format
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Helper function to get full URL for media files
  const getFullUrl = (url: string) => {
    if (url.startsWith('http')) {
      return url; // Already absolute URL
    }
    if (url.startsWith('/media/')) {
      return `http://localhost:8000${url}`; // Convert relative to absolute
    }
    return url; // Fallback
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pending products...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-bg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Listing Management</h1>
            <p className="text-gray-300 mt-1">Review and manage product listings from vendors</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" className="border-border text-gray-300 hover:bg-surface-2">
              Bulk Actions
            </Button>
            <Button className="bg-accent text-bg hover:bg-accent-2">
              Export Data
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-success/20 rounded-lg">
                  <Check className="w-6 h-6 text-success" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-400">Total Products</p>
                  <p className="text-2xl font-bold text-white">{allProducts.length}</p>
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
                  <p className="text-sm text-gray-400">Pending Review</p>
                  <p className="text-2xl font-bold text-white">
                    {allProducts.filter(p => p.status === 'pending_approval' || p.status === 'draft').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-info/20 rounded-lg">
                  <Edit className="w-6 h-6 text-info" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-400">Draft</p>
                  <p className="text-2xl font-bold text-white">
                    {allProducts.filter(p => p.status === 'draft').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <User className="w-6 h-6 text-accent" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-400">Vendors</p>
                  <p className="text-2xl font-bold text-white">
                    {new Set(allProducts.map(p => p.vendor.id)).size}
                  </p>
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
                    placeholder="Search listings by title, vendor, or category..." 
                    className="pl-10 bg-surface-2 border-border text-white"
                    data-testid="search-listings"
                  />
                </div>
              </div>
              <Select>
                <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="streaming">Streaming</SelectItem>
                  <SelectItem value="gaming">Gaming</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="border-border hover:bg-surface-2">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filter Tabs */}
        <Card className="crypto-card mb-6">
          <CardContent className="p-4">
            <div className="flex space-x-1 bg-surface-2 p-1 rounded-lg">
              {[
                { key: 'all', label: 'All', count: getProductCounts().total },
                { key: 'pending', label: 'Pending', count: getProductCounts().pending },
                { key: 'approved', label: 'Approved', count: getProductCounts().approved },
                { key: 'rejected', label: 'Rejected', count: getProductCounts().rejected }
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setCurrentFilter(filter.key as any)}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    currentFilter === filter.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-300 hover:text-white hover:bg-surface-2'
                  }`}
                >
                  {filter.label}
                  <span className="ml-2 bg-gray-600 text-gray-200 px-2 py-1 rounded-full text-xs">
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Listings Table */}
        <Card className="crypto-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Product Listings</CardTitle>
              <div className="flex items-center space-x-2">
                <Checkbox id="selectAll" className="border-border" />
                <label htmlFor="selectAll" className="text-sm text-gray-300">Select All</label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-2">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-gray-300 w-8"></th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Product</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Vendor</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Category</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Price</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Created</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {getFilteredProducts().map((listing) => (
                    <tr key={listing.id} className="hover:bg-surface-2/50" data-testid={`listing-row-${listing.id}`}>
                      <td className="p-4">
                        <Checkbox className="border-border" />
                      </td>
                      <td className="p-4">
                        <div className="flex items-start">
                          <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                            <span className="text-accent text-sm font-medium">{listing.listing_title[0]}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-white truncate">{listing.listing_title}</p>
                            <p className="text-sm text-gray-400 line-clamp-2">{listing.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-300">{listing.vendor.username}</td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-gray-300">
                          {listing.category.name}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="text-white font-mono text-sm">{listing.price} BTC</div>
                          <div className="text-gray-400 font-mono text-xs">{listing.price} XMR</div>
                        </div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(listing.status)}
                      </td>
                      <td className="p-4 text-gray-300">{formatDate(listing.created_at)}</td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          {/* Show Review button only for pending products */}
                          {(currentFilter === 'pending' || currentFilter === 'all') && 
                           (listing.status === 'pending_approval' || listing.status === 'draft') && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white" 
                              onClick={() => handleViewListing(listing)}
                              data-testid={`review-listing-${listing.id}`}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Review
                            </Button>
                          )}
                          
                          {/* Show View button for approved and rejected products */}
                          {(currentFilter === 'approved' || currentFilter === 'rejected' || currentFilter === 'all') && 
                           (listing.status === 'approved' || listing.status === 'rejected') && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-gray-500 text-gray-400 hover:bg-gray-500 hover:text-white" 
                              onClick={() => handleViewListing(listing)}
                              data-testid={`view-listing-${listing.id}`}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                          )}
                          
                          {/* Show Edit button for all products except pending */}
                          {listing.status !== 'pending_approval' && listing.status !== 'draft' && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-white" 
                              onClick={() => handleEditListing(listing)}
                              data-testid={`edit-listing-${listing.id}`}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                          )}
                          
                          {/* Show Delete button for all products except pending */}
                          {listing.status !== 'pending_approval' && listing.status !== 'draft' && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white" 
                              onClick={() => {
                                setSelectedListing(listing);
                                setDeleteConfirmOpen(true);
                              }}
                              data-testid={`delete-listing-${listing.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
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
        
        {/* View Listing Modal */}
        <Dialog open={viewListingModalOpen} onOpenChange={setViewListingModalOpen}>
          <DialogContent className="sm:max-w-[800px] bg-card border border-border shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-white">Review Product Listing</DialogTitle>
            </DialogHeader>
            {selectedListing && (
              <div className="space-y-8 overflow-y-auto flex-1 pr-2">
                {/* Listing Header */}
                <div className="flex items-start gap-4 pb-6 border-b border-gray-700">
                  <div className="w-16 h-16 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-accent text-xl font-medium">{selectedListing.listing_title[0]}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold text-white mb-2">{selectedListing.listing_title}</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <span className="text-white font-medium">{selectedListing.rating || 'N/A'}</span>
                        <span className="text-gray-400">({selectedListing.reviews || 0} reviews)</span>
                      </div>
                      {getStatusBadge(selectedListing.status)}
                    </div>
                  </div>
                </div>
                
                {/* Basic Information Section */}
                <div className="space-y-6">
                  <div className="border-b border-gray-700 pb-2">
                    <h4 className="text-lg font-semibold text-white mb-4">Basic Information</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-gray-300 text-sm font-medium">Vendor</Label>
                      <p className="text-white mt-1 font-medium">{selectedListing.vendor.username}</p>
                    </div>
                    <div>
                      <Label className="text-gray-300 text-sm font-medium">Category</Label>
                      <p className="text-white mt-1 font-medium">{selectedListing.category.name}</p>
                    </div>
                    <div>
                      <Label className="text-gray-300 text-sm font-medium">Created</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-white">{formatDate(selectedListing.created_at)}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-300 text-sm font-medium">Last Updated</Label>
                      <p className="text-white mt-1">{formatDate(selectedListing.created_at)}</p>
                    </div>
                  </div>
                </div>
                
                {/* Product Details Section */}
                <div className="space-y-6">
                  <div className="border-b border-gray-700 pb-2">
                    <h4 className="text-lg font-semibold text-white mb-4">Product Details</h4>
                  </div>
                  
                  <div>
                    <Label className="text-gray-300 text-sm font-medium">Description</Label>
                    <p className="text-gray-300 mt-2 leading-relaxed bg-gray-800 p-3 rounded-lg">{selectedListing.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-gray-300 text-sm font-medium">Account Type</Label>
                      <p className="text-white mt-1 font-medium">{selectedListing.account_type || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-gray-300 text-sm font-medium">Verification Level</Label>
                      <p className="text-white mt-1 font-medium">{selectedListing.verification_level || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-gray-300 text-sm font-medium">Quantity Available</Label>
                      <p className="text-white mt-1 font-medium">{selectedListing.quantity_available || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-gray-300 text-sm font-medium">Delivery Method</Label>
                      <Badge variant="outline" className="mt-1">
                        {selectedListing.delivery_method}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-gray-300 text-sm font-medium">Special Features</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedListing.special_features && selectedListing.special_features.length > 0 ? (
                        selectedListing.special_features.map((feature, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm">None</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Pricing Section */}
                <div className="space-y-6">
                  <div className="border-b border-gray-700 pb-2">
                    <h4 className="text-lg font-semibold text-white mb-4">Pricing & Availability</h4>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-400">Price</p>
                        <p className="text-white font-mono text-lg">{selectedListing.price} BTC</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Discount</p>
                        <p className="text-white font-medium">{selectedListing.discount_percentage || 0}%</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Media Section */}
                <div className="space-y-6">
                  <div className="border-b border-gray-700 pb-2">
                    <h4 className="text-lg font-semibold text-white mb-4">Media & Documents</h4>
                  </div>
                  
                  {/* Main Images */}
                  <div>
                    <Label className="text-gray-300 text-sm font-medium mb-3 block">Main Product Images</Label>
                    <div className="mt-2">
                      {selectedListing.main_images && selectedListing.main_images.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {selectedListing.main_images.map((image, index) => (
                            <div key={index} className="relative group">
                              <img 
                                src={getFullUrl(typeof image === 'string' ? image : image.url || image)} 
                                alt={`Product image ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg border border-gray-600"
                                onError={(e) => {
                                  console.error('Image failed to load:', image);
                                  e.target.style.display = 'none';
                                }}
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="opacity-0 group-hover:opacity-100 text-white hover:text-white"
                                  onClick={() => window.open(getFullUrl(typeof image === 'string' ? image : image.url || image), '_blank')}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-gray-800 rounded-lg p-8 text-center">
                          <p className="text-gray-400">No images uploaded</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Gallery Images */}
                  <div>
                    <Label className="text-gray-300 text-sm font-medium mb-3 block">Gallery Images</Label>
                    <div className="mt-2">
                      {selectedListing.gallery_images && selectedListing.gallery_images.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {selectedListing.gallery_images.map((image, index) => (
                            <div key={index} className="relative group">
                              <img 
                                src={getFullUrl(typeof image === 'string' ? image : image.url || image)} 
                                alt={`Gallery image ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-gray-600"
                                onError={(e) => {
                                  console.error('Gallery image failed to load:', image);
                                  e.target.style.display = 'none';
                                }}
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="opacity-0 group-hover:opacity-100 text-white hover:text-white"
                                  onClick={() => window.open(getFullUrl(typeof image === 'string' ? image : image.url || image), '_blank')}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-gray-800 rounded-lg p-6 text-center">
                          <p className="text-gray-400">No gallery images</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Documents */}
                  <div>
                    <Label className="text-gray-300 text-sm font-medium mb-3 block">Supporting Documents</Label>
                    <div className="mt-2">
                      {selectedListing.documents && selectedListing.documents.length > 0 ? (
                        <div className="space-y-2">
                          {selectedListing.documents.map((doc, index) => {
                            const docUrl = typeof doc === 'string' ? doc : doc.url || doc;
                            const docName = typeof doc === 'string' ? `Document ${index + 1}` : doc.name || doc.title || `Document ${index + 1}`;
                            const docSize = typeof doc === 'string' ? 'Unknown size' : doc.size ? `${(doc.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size';
                            
                            return (
                              <div key={index} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg border border-gray-600">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                    <span className="text-blue-400 text-sm">📄</span>
                                  </div>
                                  <div>
                                    <p className="text-white text-sm font-medium">{docName}</p>
                                    <p className="text-gray-400 text-xs">{docSize}</p>
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-blue-400 hover:text-blue-300"
                                  onClick={() => window.open(getFullUrl(docUrl), '_blank')}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-gray-800 rounded-lg p-6 text-center">
                          <p className="text-gray-400">No documents uploaded</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <Button 
                    variant="outline" 
                    onClick={() => setViewListingModalOpen(false)}
                    className="border-border text-gray-300 hover:bg-surface-2"
                    data-testid="btn-close-listing-details"
                  >
                    Close
                  </Button>
                  
                  {(selectedListing.status === "pending_approval" || selectedListing.status === "draft") && (
                    <div className="flex space-x-3">
                      <Button 
                        onClick={() => openApproveConfirm(selectedListing)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        data-testid="btn-approve-listing"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve Listing
                      </Button>
                      <Button 
                        onClick={() => openRejectConfirm(selectedListing)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                        data-testid="btn-reject-listing"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Listing
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Edit Listing Modal */}
        <Dialog open={editListingModalOpen} onOpenChange={setEditListingModalOpen}>
          <DialogContent className="sm:max-w-[600px] bg-card border border-border shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-white">Edit Listing</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleUpdateListing)} className="space-y-4 overflow-y-auto flex-1 pr-2">
                <FormField
                  control={editForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Product Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter product title" 
                          className="!bg-gray-800 !border-gray-600 !text-white placeholder:text-gray-400 focus:!bg-gray-800"
                          data-testid="edit-input-title"
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter product description" 
                          className="!bg-gray-800 !border-gray-600 !text-white placeholder:text-gray-400 min-h-[100px] resize-none focus:!bg-gray-800"
                          data-testid="edit-textarea-description"
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="vendor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Vendor</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Vendor name" 
                            className="!bg-gray-800 !border-gray-600 !text-white placeholder:text-gray-400 focus:!bg-gray-800"
                            data-testid="edit-input-vendor"
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="!bg-gray-800 !border-gray-600 !text-white focus:!bg-gray-800" data-testid="edit-select-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Streaming">Streaming</SelectItem>
                            <SelectItem value="Gaming">Gaming</SelectItem>
                            <SelectItem value="Software">Software</SelectItem>
                            <SelectItem value="Social Media">Social Media</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="btcPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Bitcoin Price</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="0.0000" 
                            className="!bg-gray-800 !border-gray-600 !text-white placeholder:text-gray-400 font-mono focus:!bg-gray-800"
                            data-testid="edit-input-btc-price"
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="xmrPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Monero Price</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="0.00" 
                            className="!bg-gray-800 !border-gray-600 !text-white placeholder:text-gray-400 font-mono focus:!bg-gray-800"
                            data-testid="edit-input-xmr-price"
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="delivery"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Delivery Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="!bg-gray-800 !border-gray-600 !text-white focus:!bg-gray-800" data-testid="edit-select-delivery">
                              <SelectValue placeholder="Select delivery method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Instant Delivery">Instant Delivery</SelectItem>
                            <SelectItem value="Manual Delivery">Manual Delivery</SelectItem>
                            <SelectItem value="24h Delivery">24h Delivery</SelectItem>
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
                            <SelectTrigger className="!bg-gray-800 !border-gray-600 !text-white focus:!bg-gray-800" data-testid="edit-select-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Approved">Approved</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t border-border mt-6 flex-shrink-0">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setEditListingModalOpen(false)}
                    className="border-border text-gray-300 hover:bg-surface-2"
                    data-testid="btn-cancel-edit-listing"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-accent text-bg hover:bg-accent-2"
                    data-testid="btn-update-listing"
                  >
                    Update Listing
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Listing</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                Are you sure you want to permanently delete the listing <strong className="text-white">"{selectedListing?.listing_title}"</strong>? 
                This action cannot be undone and will remove the listing from the marketplace.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                className="border-border text-gray-300 hover:bg-surface-2"
                data-testid="btn-cancel-delete-listing"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteListing}
                className="bg-danger text-white hover:bg-red-600"
                data-testid="btn-confirm-delete-listing"
              >
                Delete Listing
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reject Confirmation Dialog */}
        <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
          <DialogContent className="sm:max-w-[400px] bg-card border border-border shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-white">Reject Listing</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <p className="text-gray-300">
                Are you sure you want to reject the listing <strong className="text-white">"{selectedListing?.listing_title}"</strong>? 
                This action cannot be undone and will remove the listing from the marketplace.
              </p>
              <div className="flex flex-col gap-2">
                <Label className="text-gray-300 text-sm font-medium">Rejection Reason</Label>
                <Textarea
                  placeholder="Enter rejection reason"
                  className="!bg-gray-800 !border-gray-600 !text-white placeholder:text-gray-400 min-h-[100px] resize-none focus:!bg-gray-800"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  data-testid="reject-reason-textarea"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-border mt-6 flex-shrink-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setRejectModalOpen(false)}
                className="border-border text-gray-300 hover:bg-surface-2"
                data-testid="btn-cancel-reject-listing"
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={() => handleRejectListing(selectedListing?.id || 0)}
                className="bg-danger text-white hover:bg-red-600"
                data-testid="btn-confirm-reject-listing"
              >
                Reject Listing
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Approve Confirmation Dialog */}
        <AlertDialog open={isApproveConfirmOpen} onOpenChange={setIsApproveConfirmOpen}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Approve Product Listing</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                Are you sure you want to approve <strong className="text-white">"{actionProduct?.listing_title}"</strong>? 
                This will make the product visible to buyers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border text-gray-300 hover:bg-surface-2">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  if (actionProduct) {
                    handleApproveListing(actionProduct.id);
                    setIsApproveConfirmOpen(false);
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Yes, Approve
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reject Confirmation Dialog */}
        <AlertDialog open={isRejectConfirmOpen} onOpenChange={setIsRejectConfirmOpen}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Reject Product Listing</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                Are you sure you want to reject <strong className="text-white">"{actionProduct?.listing_title}"</strong>? 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border text-gray-300 hover:bg-surface-2">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  if (actionProduct) {
                    openRejectModal(actionProduct);
                    setIsRejectConfirmOpen(false);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Yes, Reject
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
  );
}
  