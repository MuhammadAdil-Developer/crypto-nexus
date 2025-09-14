import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Eye, Search, Filter, MoreVertical, Loader2, Upload, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Lock } from "lucide-react";
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
      return "bg-green-500/10 text-green-300 border-green-500/20";
    case "pending_approval":
      return "bg-yellow-500/10 text-yellow-300 border-yellow-500/20";
    case "rejected":
      return "bg-red-500/10 text-red-300 border-red-500/20";
    case "draft":
      return "bg-gray-500/10 text-gray-300 border-gray-500/20";
    case "reserved":
      return "bg-purple-500/10 text-purple-300 border-purple-500/20";
    default:
      return "bg-blue-500/10 text-blue-300 border-blue-500/20";
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
    case "reserved":
      return "Reserved";
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<VendorProduct | null>(null);

  // Fetch vendor products and stats
  const fetchVendorData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 fetchVendorData called');
      
      const [productsResponse, vendorStats] = await Promise.all([
        vendorService.getMyProducts(),
        vendorService.getVendorStats()
      ]);
      
      console.log('🔍 Products response:', productsResponse);
      console.log('🔍 Vendor stats:', vendorStats);
      
      // FIXED: productsResponse.data is directly the array, not productsResponse.data.products
      if (productsResponse.success && productsResponse.data) {
        console.log('🔍 Setting products:', productsResponse.data);
        setProducts(productsResponse.data || []);
      } else {
        console.log('❌ Products response not successful:', productsResponse);
        setError('Failed to fetch products');
      }
      
      setStats(vendorStats);
    } catch (err: any) {
      console.error('❌ Error fetching vendor data:', err);
      setError(err.message || 'Failed to fetch vendor data');
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
          title: "Product Deleted",
          message: "Product has been deleted successfully",
          type: "success"
        });
      } else {
        showToast({
          title: "Error",
          message: response.message || "Failed to delete product",
          type: "error"
        });
      }
    } catch (err: any) {
      showToast({
        title: "Error",
        message: err.message || "Failed to delete product",
        type: "error"
      });
    } finally {
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  // Filter products based on search and filters
  const getFilteredProducts = () => {
    return products.filter(product => {
      const matchesSearch = searchTerm === "" || 
        product.headline.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || product.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  };

  // Get paginated products
  const getPaginatedProducts = () => {
    const filteredProducts = getFilteredProducts();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, categoryFilter]);

  // Fetch data on component mount
  useEffect(() => {
    fetchVendorData();
  }, []);

  const filteredProducts = getFilteredProducts();
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
            <span className="text-white">Loading products...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-400 text-xl font-semibold mb-2">Error loading products</div>
            <div className="text-gray-400 mb-4">{error}</div>
            <Button 
              onClick={fetchVendorData}
              className="bg-accent text-bg hover:bg-accent-2"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">My Products</h1>
            <p className="text-gray-300 mt-1">Manage your product listings</p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              className="border-border text-gray-300 hover:bg-surface-2"
              onClick={() => navigate('/vendor/bulk-upload')}
            >
              <Upload className="w-4 h-4 mr-2" />
              Bulk Upload
            </Button>
            <Button
              className="bg-accent text-bg hover:bg-accent-2"
              onClick={() => navigate('/vendor/add-product')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-accent text-sm font-semibold">T</span>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total Products</p>
                  <p className="text-lg font-bold text-white">{stats.totalProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-green-400 text-sm font-semibold">A</span>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Active Listings</p>
                  <p className="text-lg font-bold text-white">{stats.activeListings}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-yellow-400 text-sm font-semibold">R</span>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Under Review</p>
                  <p className="text-lg font-bold text-white">{stats.underReview}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-red-400 text-sm font-semibold">O</span>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Out of Stock</p>
                  <p className="text-lg font-bold text-white">{stats.outOfStock}</p>
                </div>
              </div>
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
                    className="pl-10 bg-surface-2 border-border text-white placeholder:text-gray-400"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-2 border-border">
                    <SelectItem value="all" className="text-white">All Status</SelectItem>
                    <SelectItem value="approved" className="text-white">Active</SelectItem>
                    <SelectItem value="pending_approval" className="text-white">Under Review</SelectItem>
                    <SelectItem value="rejected" className="text-white">Rejected</SelectItem>
                    <SelectItem value="draft" className="text-white">Draft</SelectItem>
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
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Products ({filteredProducts.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Product</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Price</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Views</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Stock</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Created</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {getPaginatedProducts().map((product) => (
                    <tr key={product.id} className="hover:bg-gray-800/50">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                            {product.main_image ? (
                              <img
                                src={product.main_image}
                                alt={product.headline}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <span className="text-gray-400 text-sm">📦</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-medium truncate">{product.headline}</p>
                            <p className="text-gray-400 text-sm truncate">{product.website}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
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
                        <span className={`${product.quantity_available > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {product.quantity_available || 0}
                        </span>
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
                            onClick={() => navigate(`/vendor/listings/${product.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white"
                            onClick={() => navigate(`/vendor/products/edit/${product.id}`)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-surface-2 border-border">
                              <DropdownMenuItem
                                className="text-white hover:bg-surface-3"
                                onClick={() => navigate(`/vendor/listings/${product.id}`)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-white hover:bg-surface-3"
                                onClick={() => navigate(`/vendor/products/edit/${product.id}`)}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Product
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-400 hover:bg-red-500/10"
                                onClick={() => {
                                  setProductToDelete(product);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Product
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
              <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="border-border text-gray-300 hover:bg-surface-2"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="border-border text-gray-300 hover:bg-surface-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-400 px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="border-border text-gray-300 hover:bg-surface-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="border-border text-gray-300 hover:bg-surface-2"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-gray-600">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Product</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to delete "{productToDelete?.headline}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => productToDelete && handleDeleteProduct(productToDelete.id.toString())}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}