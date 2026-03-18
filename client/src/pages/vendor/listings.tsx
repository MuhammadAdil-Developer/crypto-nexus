import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Eye, Search, Filter, MoreVertical, Loader2, Upload, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Lock, Heart, CheckCircle, AlertCircle, Info, Zap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import wishlistService from "@/services/wishlistService";
import placeholderImage from "@/assets/placeholder.png";
import { getImageUrl } from "@/config/api";
import { useCryptoPrices } from "@/contexts/PriceContext";

import { PageBanner } from "@/components/PageBanner";

const getStatusColor = (status: string) => {
  switch (status) {
    case "approved":
      return "bg-theme-cyan/10 text-theme-cyan border-theme-cyan/20";
    case "pending_approval":
      return "bg-theme-red/10 text-theme-red border-theme-red/20";
    case "rejected":
      return "bg-theme-red/10 text-theme-red border-theme-red/20";
    case "draft":
      return "bg-gray-500/10 text-gray-300 border-gray-500/20";
    case "reserved":
      return "bg-theme-cyan/5 text-theme-cyan/70 border-theme-cyan/10";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
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
  const { btc: btcPrice, xmr: xmrPrice } = useCryptoPrices();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [products, setProducts] = useState<VendorProduct[]>([]);

  // Check if preview mode is active
  const isPreviewMode = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('preview') === 'true';

  // Helper to append preview param to urls
  const getLinkUrl = (path: string) => {
    return isPreviewMode ? `${path}${path.includes('?') ? '&' : '?'}preview=true` : path;
  };
  const [stats, setStats] = useState<VendorStats>({
    totalProducts: 0,
    activeListings: 0,
    outOfStock: 0,
    underReview: 0,
    totalSales: 0,
    totalRevenue: 0
  });
  const [wishlistCounts, setWishlistCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVendorBlocked, setIsVendorBlocked] = useState(false);
  const [sellingFee, setSellingFee] = useState<number | null>(null);
  const [customFee, setCustomFee] = useState<number | null>(null);
  const [usesDefaultFee, setUsesDefaultFee] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<VendorProduct | null>(null);

  // Rejection reason dialog state
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [selectedRejectionProduct, setSelectedRejectionProduct] = useState<VendorProduct | null>(null);

  // Bulk selection state
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");

  // Check if vendor is blocked from non-escrow listings and fetch selling fee
  useEffect(() => {
    const checkVendorStatus = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const [profileResponse, vendorFeeResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/profile/`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }),
          fetch(`${API_BASE_URL}/payments/vendor/my-fee/`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
        ]);

        if (profileResponse.ok) {
          const data = await profileResponse.json();
          if (data.success && data.data?.non_escrow_blocked) {
            setIsVendorBlocked(true);
          }
        }

        // Get vendor's commission fee (custom or default)
        if (vendorFeeResponse.ok) {
          const vendorFeeData = await vendorFeeResponse.json();
          if (vendorFeeData.success && vendorFeeData.data) {
            const commissionRate = vendorFeeData.data.commission_rate;
            console.log('📊 Vendor fee data:', vendorFeeData.data);
            if (commissionRate !== null && commissionRate !== undefined) {
              setSellingFee(commissionRate);
              setUsesDefaultFee(vendorFeeData.data.uses_default || false);
              if (!vendorFeeData.data.uses_default && commissionRate) {
                setCustomFee(commissionRate);
              }
            } else {
              console.error('❌ Commission rate is null/undefined:', vendorFeeData.data);
              // Fallback to default if API returns null
              setSellingFee(vendorFeeData.data.default_rate || 5);
              setUsesDefaultFee(true);
            }
          } else {
            console.error('❌ Vendor fee response not successful:', vendorFeeData);
          }
        } else {
          console.error('❌ Failed to fetch vendor fee:', vendorFeeResponse.status, vendorFeeResponse.statusText);
        }
      } catch (error) {
        console.error('Error checking vendor status:', error);
      }
    };

    checkVendorStatus();
  }, []);

  // Fetch vendor products and stats
  const fetchVendorData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 fetchVendorData called');

      const [productsResponse, vendorStats, wishlistStatsResponse] = await Promise.all([
        vendorService.getMyProducts(),
        vendorService.getVendorStats(),
        wishlistService.getVendorWishlistStats()
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

      // Process wishlist counts
      if (wishlistStatsResponse.success && wishlistStatsResponse.data) {
        const counts: Record<number, number> = {};
        wishlistStatsResponse.data.forEach((item: any) => {
          counts[item.product_id] = item.wishlist_count;
        });
        setWishlistCounts(counts);
      }
    } catch (err: any) {
      console.error('❌ Error fetching vendor data:', err);
      setError(err.message || 'Failed to fetch vendor data');
    } finally {
      setLoading(false);
    }
  };

  // Highlight product
  const handleHighlightProduct = async (productId: number) => {
    try {
      const response = await vendorService.promoteHighlight(productId);
      if (response.success) {
        showToast({
          title: "Product Highlighted",
          message: "Product will appear at the top of search for 12 hours!",
          type: "success"
        });
        await fetchVendorData(); // Refresh to show highlight status if UI supports it
      }
    } catch (err: any) {
      showToast({
        title: "Promotion Failed",
        message: err.message || "Failed to highlight product",
        type: "error"
      });
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

  // Bulk selection logic
  const toggleSelectProduct = (productId: number) => {
    setSelectedProductIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleSelectAll = () => {
    const allFilteredIds = getFilteredProducts().map(p => p.id);
    const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedProductIds.includes(id));

    if (allSelected) {
      // Unselect all filtered products
      setSelectedProductIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      // Select all filtered products
      setSelectedProductIds(prev => [...new Set([...prev, ...allFilteredIds])]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.length === 0) return;

    try {
      setIsBulkDeleting(true);
      const response = await vendorService.bulkDeleteProducts(selectedProductIds);

      if (response.success) {
        showToast({
          title: "Listings Deleted",
          message: `Successfully deleted ${response.count} listings`,
          type: "success"
        });
        setSelectedProductIds([]);
        await fetchVendorData();
      } else {
        showToast({
          title: "Error",
          message: response.message || "Failed to delete listings",
          type: "error"
        });
      }
    } catch (err: any) {
      showToast({
        title: "Error",
        message: err.message || "An unexpected error occurred",
        type: "error"
      });
    } finally {
      setIsBulkDeleting(false);
      setBulkDeleteDialogOpen(false);
      setConfirmDeleteText("");
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
            <Loader2 className="w-6 h-6 animate-spin text-theme-cyan" />
            <span className="text-white">Loading listings...</span>
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
              className="bg-theme-red text-white hover:bg-theme-red-dark"
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
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 relative z-10 p-3 sm:p-0">
        {/* Vendor Blocked Warning */}
        {isVendorBlocked && (
          <Card className="bg-red-900/20 border-red-500/30">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-red-300 font-semibold text-sm mb-2">⚠️ Only Escrow Enabled Listings Available</h4>
                  <p className="text-red-200 text-xs mb-2">
                    Your account is restricted to escrow-only listings. All new products must have escrow enabled.
                  </p>
                  <p className="text-red-200 text-xs">
                    When creating a new product, escrow will be automatically enabled and cannot be disabled.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <PageBanner
          title="My Listings"
          subtitle="Manage your account portfolio"
          type="vendor"
        />

        <div className="flex flex-col sm:flex-row justify-end items-center gap-3 mb-8">
          <div className="flex gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => navigate(getLinkUrl('/vendor/listings/bulk-upload'))}
              className="bg-gray-800/50 border-gray-700/50 text-gray-300 hover:text-white hover:bg-gray-700/60 rounded-xl h-12 px-6 font-semibold shadow-sm backdrop-blur-sm flex-1 sm:flex-initial"
            >
              <Upload className="w-5 h-5 mr-2" />
              Bulk Actions
            </Button>
            <Button
              onClick={() => navigate(getLinkUrl('/vendor/listings/add'))}
              className="bg-theme-red hover:bg-theme-red-dark text-white px-4 sm:px-6 lg:px-8 h-12 text-sm sm:text-base lg:text-lg shadow-lg shadow-theme-red/20 rounded-xl font-bold transition-all flex-1 sm:flex-initial"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add New
            </Button>
          </div>
        </div>

        {/* Small Fee Info */}
        {sellingFee !== null && (
          <div className="flex justify-end mb-4 -mt-2">
            <div className="inline-flex items-center gap-2 bg-gray-900/80 border border-gray-700 rounded-full px-3 py-1.5 text-xs text-gray-400">
              <Info className="w-3.5 h-3.5 text-theme-cyan" />
              <span>
                Commission: <span className={usesDefaultFee ? "text-white font-medium" : "text-theme-cyan font-medium"}>
                  {sellingFee}%
                </span>
                {!usesDefaultFee && " (Custom)"}
              </span>
            </div>
          </div>
        )}



        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
          <Card className="bg-gray-900/40 backdrop-blur-sm border-gray-700/50 rounded-2xl overflow-hidden relative group hover:bg-gray-800/40 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-blue-500/10 rounded-xl">
                  <span className="text-blue-500 font-bold text-lg">T</span>
                </div>
                <Badge variant="outline" className="border-blue-500/20 text-blue-400 bg-blue-500/5">Total</Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl sm:text-3xl font-black text-white">{stats.totalProducts}</h3>
                <p className="text-gray-400 text-sm font-medium">All Products</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/40 backdrop-blur-sm border-gray-700/50 rounded-2xl overflow-hidden relative group hover:bg-gray-800/40 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                  <span className="text-emerald-500 font-bold text-lg">A</span>
                </div>
                <Badge variant="outline" className="border-emerald-500/20 text-emerald-400 bg-emerald-500/5">Active</Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl sm:text-3xl font-black text-white">{stats.activeListings}</h3>
                <p className="text-gray-400 text-sm font-medium">Live Listings</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/40 backdrop-blur-sm border-gray-700/50 rounded-2xl overflow-hidden relative group hover:bg-gray-800/40 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-amber-500/10 rounded-xl">
                  <span className="text-amber-500 font-bold text-lg">R</span>
                </div>
                <Badge variant="outline" className="border-amber-500/20 text-amber-400 bg-amber-500/5">Pending</Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl sm:text-3xl font-black text-white">{stats.underReview}</h3>
                <p className="text-gray-400 text-sm font-medium">Under Review</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/40 backdrop-blur-sm border-gray-700/50 rounded-2xl overflow-hidden relative group hover:bg-gray-800/40 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-rose-500/10 rounded-xl">
                  <span className="text-rose-500 font-bold text-lg">O</span>
                </div>
                <Badge variant="outline" className="border-rose-500/20 text-rose-400 bg-rose-500/5">Stock</Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl sm:text-3xl font-black text-white">{stats.outOfStock}</h3>
                <p className="text-gray-400 text-sm font-medium">Out of Stock</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        {/* Filters */}
        <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden mb-8">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-purple-500 transition-colors" />
                  <Input
                    placeholder="Search your listings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-800/50 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20 rounded-xl h-11 transition-all"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48 bg-gray-800/50 border-gray-700/50 text-white rounded-xl h-11 focus:border-purple-500/50">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 rounded-xl overflow-hidden">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="approved">Active</SelectItem>
                    <SelectItem value="pending_approval">Under Review</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-48 bg-gray-800/50 border-gray-700/50 text-white rounded-xl h-11 focus:border-purple-500/50">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 rounded-xl overflow-hidden">
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="digital">Digital Goods</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                    <SelectItem value="physical">Physical Goods</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
          <CardHeader className="p-4 sm:p-6 flex flex-row items-center justify-between space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
              <CardTitle className="text-lg sm:text-xl font-bold text-white">Products ({filteredProducts.length})</CardTitle>
              <div className="flex items-center flex-wrap gap-2">
                {/* Mobile Select All */}
                <div className="flex items-center gap-2 lg:hidden bg-gray-800/50 px-3 py-1.5 rounded-lg border border-gray-700/50">
                  <Checkbox
                    id="select-all-mobile"
                    checked={getPaginatedProducts().length > 0 && getPaginatedProducts().every(p => selectedProductIds.includes(p.id))}
                    onCheckedChange={toggleSelectAll}
                    className="border-gray-500 bg-gray-900 data-[state=checked]:bg-theme-cyan data-[state=checked]:border-theme-cyan"
                  />
                  <label htmlFor="select-all-mobile" className="text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer">Select All</label>
                </div>

                {selectedProductIds.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setBulkDeleteDialogOpen(true)}
                    className="bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20 rounded-lg h-9 px-4 font-bold transition-all shadow-lg shadow-red-500/5"
                    disabled={isBulkDeleting}
                  >
                    {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    Delete ({selectedProductIds.length})
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {/* Mobile Card View */}
              <div className="block lg:hidden space-y-3 sm:space-y-4 p-4 sm:p-6">
                {getPaginatedProducts().map((product) => (
                  <div key={product.id} className="group bg-gray-900/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 sm:p-5 hover:bg-gray-800/60 transition-all duration-300 shadow-lg relative overflow-hidden">
                    <div className="absolute top-4 left-4 z-20">
                      <Checkbox
                        checked={selectedProductIds.includes(product.id)}
                        onCheckedChange={() => toggleSelectProduct(product.id)}
                        className="border-gray-600 bg-gray-800 data-[state=checked]:bg-theme-cyan data-[state=checked]:border-theme-cyan"
                      />
                    </div>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-12 -mt-12 group-hover:from-white/10 transition-colors" />

                    <div className="flex items-start gap-4 mb-4 relative z-10 pl-8">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-950/50 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-800 shadow-inner">
                        <img
                          src={getImageUrl(product.main_image) || placeholderImage}
                          alt={product.headline}
                          className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500 bg-gray-900/50"
                          onError={(e) => {
                            e.currentTarget.src = placeholderImage;
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge className={`${getStatusColor(product.status)} text-[10px] sm:text-xs font-bold uppercase tracking-wider`}>
                            {getStatusDisplayName(product.status)}
                          </Badge>
                          {product.escrow_enabled && (
                            <Badge className="bg-gradient-to-r from-amber-500/20 to-yellow-600/20 text-yellow-500 border-yellow-500/30 text-[10px] sm:text-xs px-2 py-0.5 font-bold">
                              <Lock className="w-3 h-3 mr-1" />
                              ESCROW
                            </Badge>
                          )}
                          {product.is_giveaway && (
                            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-[10px] sm:text-xs px-2 py-0.5 font-bold">
                              GIVEAWAY
                            </Badge>
                          )}
                          {product.is_currently_highlighted && (
                            <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px] sm:text-xs px-2 py-0.5 font-bold">
                              <Zap className="w-3 h-3 mr-1" />
                              HIGHLIGHT
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-white font-bold text-base sm:text-lg leading-tight mb-1 line-clamp-2">{product.headline}</h3>
                        <p className="text-gray-400 text-xs sm:text-sm truncate font-medium">{product.category?.name || 'Uncategorized'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4 text-sm relative z-10">
                      <div className="bg-gray-950/30 p-2.5 rounded-lg">
                        <span className="text-gray-500 text-xs font-bold uppercase block mb-0.5">Price</span>
                        <div className="flex flex-col">
                          <span className="text-white font-black text-base">${parseFloat(product.price).toFixed(2)}</span>
                          <span className="text-gray-500 text-[10px] font-mono">
                            {product.accepted_crypto && product.accepted_crypto.includes('XMR') && !product.accepted_crypto.includes('BTC') ? (
                              <>≈ {parseFloat((parseFloat(product.price) / (xmrPrice || 170)).toFixed(8))} XMR</>
                            ) : (
                              <>≈ {parseFloat((parseFloat(product.price) / (btcPrice || 100000)).toFixed(8))} BTC</>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="bg-gray-950/30 p-2.5 rounded-lg">
                        <span className="text-gray-500 text-xs font-bold uppercase block mb-0.5">Stock</span>
                        <div className="flex items-center justify-between">
                          <span className={`font-bold text-base ${product.quantity_available > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {product.quantity_available || 0}
                          </span>
                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${product.quantity_available > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {product.quantity_available > 0 ? 'In Stock' : 'Sold Out'}
                          </span>
                        </div>
                      </div>
                      <div className="bg-gray-950/30 p-2.5 rounded-lg">
                        <span className="text-gray-500 text-xs font-bold uppercase block mb-0.5">Performance</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center text-gray-300">
                            <Eye className="w-3.5 h-3.5 mr-1 text-blue-400" />
                            <span className="font-bold">{product.views_count || 0}</span>
                          </div>
                          <div className="flex items-center text-gray-300">
                            <Heart className="w-3.5 h-3.5 mr-1 text-rose-400" />
                            <span className="font-bold">{wishlistCounts[product.id] || 0}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-950/30 p-2.5 rounded-lg flex items-center justify-center">
                        <span className="text-gray-500 text-xs font-bold uppercase text-center">{new Date(product.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-gray-700/50 relative z-10">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700/50 h-9 text-xs font-semibold rounded-lg"
                        onClick={() => navigate(getLinkUrl(`/vendor/listings/edit/${product.id}`))}
                      >
                        <Edit className="w-3.5 h-3.5 mr-2" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-theme-red hover:bg-theme-red-dark text-white px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-sm sm:text-base lg:text-lg w-full sm:w-auto shadow-lg shadow-theme-red/20 h-9"
                        onClick={() => navigate(getLinkUrl(`/vendor/listings/${product.id}`))}
                      >
                        <Eye className="w-3.5 h-3.5 mr-2" />
                        Manage
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg hover:bg-gray-800">
                            <MoreVertical className="w-4 h-4 text-gray-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-gray-900 border-gray-700 rounded-xl shadow-xl w-48">
                          <DropdownMenuItem className="focus:bg-gray-800 focus:text-white cursor-pointer" onClick={() => navigate(getLinkUrl(`/vendor/listings/${product.id}`))}>
                            <Eye className="w-4 h-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="focus:bg-gray-800 focus:text-white cursor-pointer" onClick={() => navigate(getLinkUrl(`/vendor/listings/edit/${product.id}`))}>
                            <Edit className="w-4 h-4 mr-2" /> Quick Edit
                          </DropdownMenuItem>
                          {product.is_currently_highlighted ? (
                            <DropdownMenuItem className="focus:bg-red-900/20 focus:text-red-400 cursor-pointer text-red-400" onClick={() => handleHighlightProduct(product.id)}>
                              <Zap className="w-4 h-4 mr-2" /> Cancel Highlight
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="focus:bg-theme-cyan/10 focus:text-theme-cyan cursor-pointer" onClick={() => handleHighlightProduct(product.id)}>
                              <Zap className="w-4 h-4 mr-2" /> Highlight (12h Top)
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="focus:bg-red-900/20 focus:text-red-400 text-red-400 cursor-pointer" onClick={() => { setProductToDelete(product); setDeleteDialogOpen(true); }}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete Product
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}

                {filteredProducts.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm sm:text-base">No products found</p>
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <table className="w-full hidden lg:table">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="p-4 w-10 text-center">
                      <Checkbox
                        checked={getPaginatedProducts().length > 0 && getPaginatedProducts().every(p => selectedProductIds.includes(p.id))}
                        onCheckedChange={toggleSelectAll}
                        className="border-gray-600 bg-gray-800 data-[state=checked]:bg-theme-cyan data-[state=checked]:border-theme-cyan"
                      />
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Product</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Price</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Views</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Wishlist</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Stock</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Created</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {getPaginatedProducts().map((product) => (
                    <tr key={product.id} className={`hover:bg-gray-800/50 transition-colors ${selectedProductIds.includes(product.id) ? 'bg-theme-cyan/5' : ''}`}>
                      <td className="p-4 items-center justify-center">
                        <Checkbox
                          checked={selectedProductIds.includes(product.id)}
                          onCheckedChange={() => toggleSelectProduct(product.id)}
                          className="mx-auto border-gray-600 bg-gray-800 data-[state=checked]:bg-theme-cyan data-[state=checked]:border-theme-cyan"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                            <img
                              src={getImageUrl(product.main_image) || placeholderImage}
                              alt={product.headline}
                              className="w-full h-full object-contain bg-gray-900/50"
                              onError={(e) => {
                                e.currentTarget.src = placeholderImage;
                              }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-medium truncate">{product.headline}</p>
                            <p className="text-gray-400 text-sm truncate">{product.website}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge className={getStatusColor(product.status)}>
                                    {getStatusDisplayName(product.status)}
                                  </Badge>
                                </TooltipTrigger>
                                {product.status === 'rejected' && product.rejection_reason && (
                                  <TooltipContent className="max-w-xs">
                                    <p className="font-semibold mb-1">Rejection Reason:</p>
                                    <p className="text-sm">{product.rejection_reason}</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                            {product.status === 'rejected' && product.rejection_reason && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedRejectionProduct(product);
                                  setRejectionDialogOpen(true);
                                }}
                                className="h-6 w-6 p-0 text-theme-red hover:text-theme-red-light hover:bg-theme-red/10"
                              >
                                <Info className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                          {product.escrow_enabled && (
                            <Badge className="bg-gradient-to-r from-yellow-500/90 to-amber-500/90 text-black border border-yellow-400/60 text-xs px-1.5 py-0.5">
                              <Lock className="w-2.5 h-2.5 mr-0.5" />
                              ESCROW
                            </Badge>
                          )}
                          {product.is_giveaway && (
                            <Badge className="bg-cyan-500 text-black border-none text-xs px-1.5 py-0.5 mt-1">
                              GIVEAWAY
                            </Badge>
                          )}
                          {product.is_currently_highlighted && (
                             <Badge className="bg-amber-500 text-black border-none text-xs px-1.5 py-0.5 mt-1 block w-fit">
                               <Zap className="w-2.5 h-2.5 mr-0.5 inline" />
                               HIGHLIGHT
                             </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {product.is_giveaway ? (
                          <span className="text-cyan-400 font-black uppercase tracking-wider">Free Giveaway</span>
                        ) : (
                          <>
                            <span className="text-white font-bold">${parseFloat(product.price).toFixed(2)}</span>
                            <span className="text-gray-400 text-xs font-mono ml-2">
                              {product.accepted_crypto && product.accepted_crypto.includes('XMR') && !product.accepted_crypto.includes('BTC') ? (
                                <>≈ {parseFloat((parseFloat(product.price) / (xmrPrice || 170)).toFixed(8))} XMR</>
                              ) : (
                                <>≈ {parseFloat((parseFloat(product.price) / (btcPrice || 100000)).toFixed(8))} BTC</>
                              )}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-white">{product.views_count || 0}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-1">
                          <Heart className="w-4 h-4 text-theme-red" />
                          <span className="text-white">{wishlistCounts[product.id] || 0}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`${product.quantity_available > 0 ? 'text-theme-cyan' : 'text-theme-red'}`}>
                          {product.quantity_available || 0}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-gray-300 text-sm">
                          {new Date(product.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2 justify-end">
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
                            onClick={() => navigate(`/vendor/listings/edit/${product.id}`)}
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
                              {product.status === 'rejected' && (
                                <DropdownMenuItem
                                  className="text-theme-cyan hover:bg-theme-cyan/10"
                                  onClick={() => {
                                    showToast({
                                      type: 'info',
                                      title: 'Edit Required',
                                      message: 'Please edit the product to address the rejection reason before resubmitting.',
                                    });
                                    navigate(`/vendor/listings/edit/${product.id}`);
                                  }}
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit & Resubmit
                                </DropdownMenuItem>
                              )}
                              
                              {product.is_currently_highlighted ? (
                                <DropdownMenuItem
                                  className="text-red-400 hover:bg-red-500/10 cursor-pointer"
                                  onClick={() => handleHighlightProduct(product.id)}
                                >
                                  <Zap className="w-4 h-4 mr-2" />
                                  Cancel Highlight
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="text-theme-cyan hover:bg-theme-cyan/10 cursor-pointer"
                                  onClick={() => handleHighlightProduct(product.id)}
                                >
                                  <Zap className="w-4 h-4 mr-2" />
                                  Highlight (12h Top)
                                </DropdownMenuItem>
                              )}
                              
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
                <div className="text-center py-8 hidden lg:block">
                  <p className="text-gray-400">No products found</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-4 border-t border-border">
                <div className="flex items-center space-x-2">
                  <span className="text-xs sm:text-sm text-gray-400 text-center sm:text-left">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
                  </span>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="border-border text-gray-300 hover:bg-surface-2 h-8 w-8 p-0"
                  >
                    <ChevronsLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="border-border text-gray-300 hover:bg-surface-2 h-8 w-8 p-0"
                  >
                    <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  <span className="text-xs sm:text-sm text-gray-400 px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="border-border text-gray-300 hover:bg-surface-2 h-8 w-8 p-0"
                  >
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="border-border text-gray-300 hover:bg-surface-2 h-8 w-8 p-0"
                  >
                    <ChevronsRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div >

      {/* Delete Confirmation Dialog */}
      < AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} >
        <AlertDialogContent className="bg-card border-gray-600 mx-4 sm:mx-auto max-w-[95vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-base sm:text-lg">Delete Product</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300 text-sm sm:text-base break-words">
              Are you sure you want to delete "{productToDelete?.headline}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-700 w-full sm:w-auto text-sm sm:text-base">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => productToDelete && handleDeleteProduct(productToDelete.id.toString())}
              className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto text-sm sm:text-base"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog >

      {/* Rejection Reason Dialog */}
      < Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen} >
        <DialogContent className="bg-card border-gray-600 max-w-[95vw] sm:max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
              Listing Rejected
            </DialogTitle>
            <DialogDescription className="text-gray-300 text-sm sm:text-base break-words">
              Your product "{selectedRejectionProduct?.headline}" was rejected for the following reason:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 sm:p-4">
              <h4 className="text-red-300 font-semibold mb-2 text-sm sm:text-base">Rejection Reason:</h4>
              <p className="text-gray-300 text-xs sm:text-sm leading-relaxed break-words">
                {selectedRejectionProduct?.rejection_reason}
              </p>
            </div>
            <div className="mt-4 text-xs sm:text-sm text-gray-400">
              <p className="break-words"><strong>Product:</strong> {selectedRejectionProduct?.headline}</p>
              <p className="break-words"><strong>Website:</strong> {selectedRejectionProduct?.website}</p>
              <p><strong>Price:</strong> ${parseFloat(selectedRejectionProduct?.price || '0').toFixed(2)}</p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setRejectionDialogOpen(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700 w-full sm:w-auto text-sm sm:text-base"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                if (selectedRejectionProduct) {
                  setRejectionDialogOpen(false);
                  navigate(`/vendor/listings/edit/${selectedRejectionProduct.id}`);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto text-sm sm:text-base"
            >
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Resubmit for Review</span>
              <span className="sm:hidden">Resubmit</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >
      {/* Bulk Delete Confirmation Dialog (Strong Confirmation) */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={(open) => {
        setBulkDeleteDialogOpen(open);
        if (!open) setConfirmDeleteText("");
      }}>
        <AlertDialogContent className="bg-gray-900 border-red-500/30 mx-4 sm:mx-auto max-w-[95vw] sm:max-w-md shadow-[0_0_50px_rgba(239,68,68,0.2)]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-500/10 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <AlertDialogTitle className="text-white text-xl font-bold">Confirmation Required</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-gray-300 text-sm sm:text-base space-y-3">
              <p className="font-semibold text-red-400">
                You are about to delete {selectedProductIds.length} listings permanently!
              </p>
              <p>
                This action <span className="text-red-500 font-bold underline">cannot be undone</span>. All selected product data, images, and history will be wiped.
              </p>
              <div className="bg-black/40 p-4 rounded-xl border border-gray-800 mt-4">
                <p className="text-xs text-gray-400 mb-3 uppercase tracking-widest font-bold">Type <span className="text-white">"DELETE"</span> to confirm</p>
                <Input
                  value={confirmDeleteText}
                  onChange={(e) => setConfirmDeleteText(e.target.value.toUpperCase())}
                  placeholder="Type DELETE here..."
                  className="bg-gray-950 border-gray-700 text-white placeholder:text-gray-600 focus:border-red-500/50 focus:ring-red-500/20 rounded-lg h-11"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 mt-4">
            <AlertDialogCancel className="border-gray-700 bg-transparent text-gray-400 hover:bg-gray-800 hover:text-white w-full sm:w-auto h-11 rounded-xl">
              I changed my mind
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                if (confirmDeleteText !== "DELETE") {
                  e.preventDefault();
                  return;
                }
                handleBulkDelete();
              }}
              className={`w-full sm:w-auto h-11 rounded-xl font-bold transition-all shadow-lg ${confirmDeleteText === "DELETE"
                ? "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20"
                : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
                }`}
              disabled={isBulkDeleting || confirmDeleteText !== "DELETE"}
            >
              {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Confirm Bulk Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
