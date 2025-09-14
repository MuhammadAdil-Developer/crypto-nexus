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
import { Pagination } from "@/components/ui/pagination";
import { useForm } from "react-hook-form";
import { Search, Filter, Check, X, Edit, Trash2, Eye, Star, MapPin, Calendar, CheckCircle, XCircle, Clock, User, Tag, DollarSign, Loader2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// API Service
const API_BASE_URL = 'http://localhost:8000/api/v1';

interface Product {
  id: number;
  headline: string | null;
  website: string | null;
  account_type: string;
  access_type: string | null;
  account_balance: string | null;
  description: string;
  price: string;
  additional_info: string | null;
  delivery_time: string | null;
  credentials_display: string;
  main_image: string | null;
  gallery_images: string[];
  status: string;
  is_featured: boolean;
  views_count: number;
  favorites_count: number;
  rating: string;
  review_count: number;
  created_at: string;
  vendor_username: string;
  escrow_enabled?: boolean;
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
  
  // Pagination state - Changed default to 10
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
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

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentFilter]);

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
        console.log('📊 Products data:', data.data);
        
        // FIXED: data.data is directly the array, not data.data.products
        const products = data.data || [];
        console.log('📊 Products array:', products);
        console.log('📊 Products with statuses:', products.map(p => ({ id: p.id, status: p.status, headline: p.headline })));
        
        setAllProducts(products);
        setPendingProducts(products);
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
        description: "Failed to fetch products",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (productId: number) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/products/admin/${productId}/approve/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Product approved successfully",
        });
        fetchAllProducts(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: "Failed to approve product",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error approving product:', error);
      toast({
        title: "Error",
        description: "Failed to approve product",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (productId: number, reason: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/products/admin/${productId}/reject/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rejection_notes: reason }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Product rejected successfully",
        });
        fetchAllProducts(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: "Failed to reject product",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error rejecting product:', error);
      toast({
        title: "Error",
        description: "Failed to reject product",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (productId: number) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/products/delete/${productId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Product deleted successfully",
        });
        fetchAllProducts(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: "Failed to delete product",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (product: Product) => {
    setSelectedListing(product);
    editForm.reset({
      title: product.headline || "",
      description: product.description || "",
      vendor: product.vendor_username || "",
      category: product.account_type || "",
      btcPrice: product.price || "",
      xmrPrice: product.price || "",
      delivery: product.delivery_time || "",
      status: product.status || "Pending"
    });
    setEditListingModalOpen(true);
  };

  const handleView = (product: Product) => {
    setSelectedListing(product);
    setViewListingModalOpen(true);
  };

  // Filter products based on current filter
  const getFilteredProducts = () => {
    if (currentFilter === 'all') {
      return allProducts;
    } else if (currentFilter === 'pending') {
      return allProducts.filter(product => product.status === 'pending_approval');
    } else if (currentFilter === 'approved') {
      return allProducts.filter(product => product.status === 'approved');
    } else if (currentFilter === 'rejected') {
      return allProducts.filter(product => product.status === 'rejected');
    }
    return allProducts;
  };

  // Get paginated products
  const getPaginatedProducts = () => {
    const filteredProducts = getFilteredProducts();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  };

  const filteredProducts = getFilteredProducts();
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending_approval':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'pending_approval':
        return 'Pending';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <main className="flex-1 overflow-y-auto bg-bg p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
              <span className="text-white">Loading listings...</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-bg p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Product Listings</h1>
            <p className="text-gray-300 mt-1">Manage all marketplace product listings</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="crypto-card">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-accent text-sm font-semibold">T</span>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total Products</p>
                  <p className="text-lg font-bold text-white">{allProducts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center mr-3">
                  <Clock className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Pending Review</p>
                  <p className="text-lg font-bold text-white">
                    {allProducts.filter(p => p.status === 'pending_approval').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mr-3">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Approved</p>
                  <p className="text-lg font-bold text-white">
                    {allProducts.filter(p => p.status === 'approved').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center mr-3">
                  <XCircle className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Rejected</p>
                  <p className="text-lg font-bold text-white">
                    {allProducts.filter(p => p.status === 'rejected').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="crypto-card">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search products..."
                    className="pl-10 bg-surface-2 border-border text-white placeholder:text-gray-400"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={currentFilter} onValueChange={(value: any) => setCurrentFilter(value)}>
                  <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-2 border-border">
                    <SelectItem value="all" className="text-white">All Products</SelectItem>
                    <SelectItem value="pending" className="text-white">Pending Review</SelectItem>
                    <SelectItem value="approved" className="text-white">Approved</SelectItem>
                    <SelectItem value="rejected" className="text-white">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="border-border hover:bg-surface-2">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card className="crypto-card">
          <CardHeader>
            <CardTitle className="text-white">Products ({filteredProducts.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-2">
                  <tr>
                    <th className="text-left p-3 text-xs font-medium text-gray-300">Product</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-300">Vendor</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-300">Status</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-300">Price</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-300">Views</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-300">Created</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {getPaginatedProducts().map((product) => (
                    <tr key={product.id} className="hover:bg-surface-2/50">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                            {product.main_image ? (
                              <img
                                src={product.main_image}
                                alt={product.headline || 'Product'}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <span className="text-gray-400 text-sm">📦</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-medium truncate">{product.headline || 'Untitled'}</p>
                            <p className="text-gray-400 text-sm truncate">{product.website || 'No website'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-white">{product.vendor_username}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <Badge className={getStatusColor(product.status)}>
                            {getStatusDisplayName(product.status)}
                          </Badge>
                          {product.escrow_enabled && (
                            <Badge className="bg-gradient-to-r from-yellow-500/90 to-amber-500/90 text-black border border-yellow-400/60 text-xs px-1.5 py-0.5">
                              <Lock className="w-2.5 h-2.5 mr-0.5" />
                              ESCROW
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-white font-mono">{parseFloat(product.price).toFixed(8)} BTC</span>
                      </td>
                      <td className="p-4">
                        <span className="text-white">{product.views_count || 0}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-gray-300 text-sm">
                          {new Date(product.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white"
                            onClick={() => handleView(product)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {product.status === 'pending_approval' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-400 hover:text-green-300"
                                onClick={() => {
                                  setActionProduct(product);
                                  setIsApproveConfirmOpen(true);
                                }}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300"
                                onClick={() => {
                                  setActionProduct(product);
                                  setIsRejectConfirmOpen(true);
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => {
                              setActionProduct(product);
                              setDeleteConfirmOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredProducts.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400">No products found</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredProducts.length}
                onItemsPerPageChange={setItemsPerPage}
              />
            )}
          </CardContent>
        </Card>

        {/* View Product Modal */}
        <Dialog open={viewListingModalOpen} onOpenChange={setViewListingModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] bg-card text-white border border-gray-600/30 shadow-2xl overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b border-gray-600/20 bg-card">
              <DialogTitle className="text-xl font-bold text-white">Product Details</DialogTitle>
            </DialogHeader>
            
            {selectedListing && (
              <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="p-6 space-y-6">
                  {/* Product Header */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                      <Label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Product ID</Label>
                      <p className="text-lg font-mono text-accent font-semibold mt-1">{selectedListing.id}</p>
                    </div>
                    <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                      <Label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Status</Label>
                      <div className="mt-1 space-y-1">
                        <Badge className={getStatusColor(selectedListing.status)}>
                          {getStatusDisplayName(selectedListing.status)}
                        </Badge>
                        {selectedListing.escrow_enabled && (
                          <Badge className="bg-gradient-to-r from-yellow-500/90 to-amber-500/90 text-black border border-yellow-400/60 text-xs px-1.5 py-0.5">
                            <Lock className="w-2.5 h-2.5 mr-0.5" />
                            ESCROW PROTECTED
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                      <Label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Created</Label>
                      <p className="text-white font-medium mt-1 text-sm">
                        {new Date(selectedListing.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Product Information */}
                  <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                    <h3 className="text-lg font-semibold text-white mb-3">Product Information</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Headline</Label>
                          <p className="text-white font-medium">{selectedListing.headline || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Website</Label>
                          <p className="text-white font-medium">{selectedListing.website || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Account Type</Label>
                          <p className="text-white font-medium">{selectedListing.account_type}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Access Type</Label>
                          <p className="text-white font-medium">{selectedListing.access_type || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Price</Label>
                          <p className="text-white font-mono font-semibold text-lg">
                            {parseFloat(selectedListing.price).toFixed(8)} BTC
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Vendor</Label>
                          <p className="text-white font-medium">{selectedListing.vendor_username}</p>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-gray-400">Description</Label>
                        <p className="text-white mt-1 leading-relaxed">{selectedListing.description}</p>
                      </div>

                      {selectedListing.additional_info && (
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Additional Information</Label>
                          <p className="text-white mt-1 leading-relaxed">{selectedListing.additional_info}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                    <h3 className="text-lg font-semibold text-white mb-3">Performance Metrics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-500">{selectedListing.views_count || 0}</div>
                        <p className="text-sm text-gray-400">Views</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-500">{selectedListing.favorites_count || 0}</div>
                        <p className="text-sm text-gray-400">Favorites</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-500">{selectedListing.review_count || 0}</div>
                        <p className="text-sm text-gray-400">Reviews</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-500">
                          {typeof selectedListing.rating === 'number' && !isNaN(selectedListing.rating) ? selectedListing.rating.toFixed(1) : '0.0'}
                        </div>
                        <p className="text-sm text-gray-400">Rating</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="px-6 py-4 border-t border-gray-600/20 bg-card">
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => setViewListingModalOpen(false)}
                  className="border-gray-600/30 text-gray-300 hover:bg-gray-700/50 px-4 py-2"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Approve Confirmation */}
        <AlertDialog open={isApproveConfirmOpen} onOpenChange={setIsApproveConfirmOpen}>
          <AlertDialogContent className="bg-card border-gray-600">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Approve Product</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                Are you sure you want to approve "{actionProduct?.headline}"? This will make it visible to buyers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (actionProduct) {
                    handleApprove(actionProduct.id);
                    setIsApproveConfirmOpen(false);
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Approve
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reject Confirmation */}
        <AlertDialog open={isRejectConfirmOpen} onOpenChange={setIsRejectConfirmOpen}>
          <AlertDialogContent className="bg-card border-gray-600">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Reject Product</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                Are you sure you want to reject "{actionProduct?.headline}"? Please provide a reason.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="px-6 py-4">
              <Label htmlFor="rejection-reason" className="text-sm font-medium text-gray-400">
                Rejection Reason
              </Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="mt-2 bg-surface-2 border-border text-white placeholder:text-gray-400"
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (actionProduct && rejectionReason) {
                    handleReject(actionProduct.id, rejectionReason);
                    setIsRejectConfirmOpen(false);
                    setRejectionReason("");
                  }
                }}
                disabled={!rejectionReason}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Reject
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent className="bg-card border-gray-600">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Product</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                Are you sure you want to delete "{actionProduct?.headline}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (actionProduct) {
                    handleDelete(actionProduct.id);
                    setDeleteConfirmOpen(false);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </main>
  );
}
