import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Eye, Search, Filter, MoreVertical, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/ToastContainer";
import vendorService, { VendorProduct, VendorStats } from "@/services/vendorService";

const getStatusColor = (status: string) => {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800 border-green-200";
    case "pending_approval":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200";
    case "draft":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-700 text-gray-800 border-gray-700 bg-gray-900";
  }
};

const getStatusDisplayName = (status: string) => {
  switch (status) {
    case "approved":
      return "Active";
    case "pending_approval":
      return "Under Review";
    case "rejected":
      return "Rejected";
    case "draft":
      return "Draft";
    default:
      return status;
  }
};

export default function VendorListings() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [stats, setStats] = useState<VendorStats>({
    totalProducts: 0,
    activeListings: 0,
    outOfStock: 0,
    underReview: 0,
    totalSales: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<VendorProduct | null>(null);

  // Fetch vendor products and stats
  const fetchVendorData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [productsResponse, vendorStats] = await Promise.all([
        vendorService.getMyProducts(),
        vendorService.getVendorStats()
      ]);
      
      if (productsResponse.results) {
        setProducts(productsResponse.results || []);
      } else {
        setError('Failed to fetch products');
      }
      
      setStats(vendorStats);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch vendor data');
      console.error('Error fetching vendor data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (productId: string) => {
    try {
      const response = await vendorService.deleteProduct(productId);
      if (response.success) {
        // Refresh the data
        await fetchVendorData();
        // Show success toast
        showToast({
          type: 'success',
          title: 'Product deleted successfully!',
          message: 'Your product has been removed from the marketplace.',
        });
      } else {
        showToast({
          type: 'error',
          title: 'Failed to delete product',
          message: response.message || 'Failed to delete product',
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Failed to delete product',
        message: err.message || 'Failed to delete product',
      });
    }
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (product: VendorProduct) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  // Confirm delete action
  const confirmDelete = async () => {
    if (productToDelete) {
      await handleDeleteProduct(productToDelete.id);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  // Update product status
  const handleUpdateStatus = async (productId: string, newStatus: string) => {
    try {
      const response = await vendorService.updateProductStatus(productId, newStatus);
      if (response.success) {
        // Refresh the data
        await fetchVendorData();
        showToast({
          type: 'success',
          title: 'Product status updated successfully!',
          message: 'Your product status has been updated.',
        });
      } else {
        showToast({
          type: 'error',
          title: 'Failed to update product status',
          message: response.message || 'Failed to update product status',
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Failed to update product status',
        message: err.message || 'Failed to update product status',
      });
    }
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.listing_title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || product.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || product.category_name === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Get unique categories for filter
  const uniqueCategories = Array.from(new Set(products.map(p => p.category_name)));

  // Get unique statuses for filter
  const uniqueStatuses = Array.from(new Set(products.map(p => p.status)));

  useEffect(() => {
    fetchVendorData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading your products...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <Filter className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Error loading products</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <Button onClick={fetchVendorData} className="bg-blue-500 hover:bg-blue-600">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Product Listings</h1>
            <p className="text-gray-400">Manage your products and inventory</p>
          </div>
          <Button 
            onClick={() => navigate('/vendor/listings/add')}
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Product
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-white">{stats.totalProducts}</div>
              <p className="text-sm text-gray-400">Total Products</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600">{stats.activeListings}</div>
              <p className="text-sm text-gray-400">Active Listings</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
              <p className="text-sm text-gray-400">Out of Stock</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-yellow-600">{stats.underReview}</div>
              <p className="text-sm text-gray-400">Under Review</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {uniqueStatuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {getStatusDisplayName(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">
              Products ({filteredProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredProducts.map((product) => (
                <div 
                  key={product.id} 
                  className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-4">
                    <img
                      src={product.main_image || "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=100"}
                      alt={product.listing_title}
                      className="w-16 h-16 rounded-lg object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=100";
                      }}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{product.listing_title}</h3>
                      <p className="text-sm text-gray-400">{product.category_name}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-gray-400">Created: {new Date(product.created_at).toLocaleDateString()}</span>
                        <span className="text-sm text-gray-400">Views: {product.views_count}</span>
                        <span className="text-sm text-gray-400">Favorites: {product.favorites_count}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="font-semibold text-blue-600">${product.final_price}</div>
                      <div className="text-sm text-gray-400">Stock: {product.quantity_available}</div>
                      {product.discount_percentage > 0 && (
                        <div className="text-xs text-green-400">-{product.discount_percentage}% off</div>
                      )}
                    </div>

                    <Badge className={`border ${getStatusColor(product.status)}`}>
                      {getStatusDisplayName(product.status)}
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/vendor/listings/${product.id}`)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/vendor/listings/edit/${product.id}`)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Product
                        </DropdownMenuItem>
                        {product.status === 'pending_approval' && (
                          <DropdownMenuItem onClick={() => handleUpdateStatus(product.id, 'draft')}>
                            <Edit className="w-4 h-4 mr-2" />
                            Move to Draft
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => openDeleteDialog(product)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}

              {filteredProducts.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Filter className="w-12 h-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No products found</h3>
                  <p className="text-gray-400">Try adjusting your search or filter criteria.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-gray-900 border border-gray-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Product</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                Are you sure you want to delete your listing "{productToDelete?.listing_title}"? 
                This action cannot be undone and will permanently remove your product from the marketplace.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-800">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Yes, Delete Listing
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}