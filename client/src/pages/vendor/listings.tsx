import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Eye, Search, Filter, MoreVertical, Loader2, Upload, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Lock, Heart, CheckCircle, AlertCircle, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

// Banner Assets
import bannerPattern from "@/assets/banner/vendor/pattern.png";
import bannerLogo from "@/assets/banner/vendor/logo.png";
import bannerLeftArrow from "@/assets/banner/arrow_left.png";
import bannerRightArrow from "@/assets/banner/arrow_right.png";

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

  // Check if vendor is blocked from non-escrow listings and fetch selling fee
  useEffect(() => {
    const checkVendorStatus = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const [profileResponse, vendorFeeResponse] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}/profile/`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }),
          fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}/payments/vendor/my-fee/`, {
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
            setSellingFee(vendorFeeData.data.commission_rate);
            setUsesDefaultFee(vendorFeeData.data.uses_default);
            if (!vendorFeeData.data.uses_default) {
              setCustomFee(vendorFeeData.data.commission_rate);
            }
          }
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

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 sm:gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            className="border-border text-gray-300 hover:bg-surface-2 text-xs sm:text-base w-full sm:w-auto"
            onClick={() => navigate('/vendor/listings/bulk-upload')}
          >
            <Upload className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="sm:inline">Bulk Upload</span>
            <span className="sm:hidden">Bulk</span>
          </Button>
          <Button
            className="bg-theme-red text-white hover:bg-theme-red-dark text-xs sm:text-base w-full sm:w-auto shadow-lg shadow-theme-red/20"
            onClick={() => navigate('/vendor/listings/add')}
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            Add Product
          </Button>
        </div>

        {/* Full Width Banner at the Top */}
        <div className="relative w-full h-[120px] md:h-[150px] overflow-hidden rounded-xl bg-black mb-6 border border-gray-800 shadow-2xl">
          {/* Pattern Background */}
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              backgroundImage: `url(${bannerPattern})`,
              backgroundRepeat: 'repeat-x',
              backgroundSize: 'auto 100%'
            }}
          />

          {/* Left Arrow (Pinned Left) */}
          <img
            src={bannerLeftArrow}
            alt=""
            className="absolute left-0 top-0 h-full z-10 select-none pointer-events-none object-cover sm:object-fill"
            style={{ maxWidth: '30%' }}
          />

          {/* Right Arrow (Pinned Right) */}
          <img
            src={bannerRightArrow}
            alt=""
            className="absolute right-0 top-0 h-full z-10 select-none pointer-events-none object-cover sm:object-fill"
            style={{ maxWidth: '30%' }}
          />

          {/* Center Logo (Always Centered) */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 h-[80%] md:h-[90%] aspect-square flex items-center justify-center">
            <img
              src={bannerLogo}
              alt="Logo"
              className="h-full w-auto object-contain drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] scale-110"
            />
          </div>

          {/* Brand Text (Left Half) */}
          <div className="absolute left-[8%] md:left-[12%] top-1/2 transform -translate-y-1/2 z-20 hidden sm:block" style={{ maxWidth: '40%' }}>
            <h1
              className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tighter uppercase"
              style={{
                fontFamily: "'Orbitron', sans-serif",
                filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))'
              }}
            >
              <span className="text-white">Accountz</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-red to-theme-cyan ml-1">Club</span>
            </h1>
            <p className="text-gray-400 text-[10px] md:text-xs tracking-[0.3em] mt-1 ml-1 uppercase font-bold" style={{ fontFamily: "'Space Age', 'Orbitron', sans-serif" }}>
              Vendor Panel
            </p>
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-theme-cyan/20 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                  <span className="text-theme-cyan text-xs sm:text-sm font-semibold">T</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-gray-400 truncate">Total Products</p>
                  <p className="text-base sm:text-lg font-bold text-white">{stats.totalProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-theme-cyan/20 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                  <span className="text-theme-cyan text-xs sm:text-sm font-semibold">A</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-gray-400 truncate">Active Listings</p>
                  <p className="text-base sm:text-lg font-bold text-white">{stats.activeListings}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-theme-red/10 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                  <span className="text-theme-red text-xs sm:text-sm font-semibold">R</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-gray-400 truncate">Under Review</p>
                  <p className="text-base sm:text-lg font-bold text-white">{stats.underReview}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-theme-red/20 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                  <span className="text-theme-red text-xs sm:text-sm font-semibold">O</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-gray-400 truncate">Out of Stock</p>
                  <p className="text-base sm:text-lg font-bold text-white">{stats.outOfStock}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search listings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-theme-cyan focus:ring-theme-cyan text-sm sm:text-base"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40 bg-surface-2 border-border text-white text-sm sm:text-base">
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
                <Button variant="outline" size="sm" className="border-border hover:bg-surface-2 text-xs sm:text-sm w-full sm:w-auto">
                  <Filter className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Filter</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl font-bold text-theme-red">Products ({filteredProducts.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {/* Mobile Card View */}
              <div className="block lg:hidden space-y-3 sm:space-y-4 p-4 sm:p-6">
                {getPaginatedProducts().map((product) => (
                  <div key={product.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-start space-x-3 mb-3">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                        <img
                          src={getImageUrl(product.main_image) || placeholderImage}
                          alt={product.headline}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = placeholderImage;
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm sm:text-base break-words mb-1">{product.headline}</p>
                        <p className="text-gray-400 text-xs sm:text-sm truncate">{product.website}</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className={`${getStatusColor(product.status)} text-[10px] sm:text-xs`}>
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
                        {product.escrow_enabled && (
                          <Badge className="bg-gradient-to-r from-yellow-500/90 to-amber-500/90 text-black border border-yellow-400/60 text-[9px] sm:text-xs px-1.5 py-0.5">
                            <Lock className="w-2.5 h-2.5 mr-0.5" />
                            ESCROW
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3 text-xs sm:text-sm">
                      <div>
                        <span className="text-gray-400">Price:</span>
                        <p className="text-white font-bold text-lg">${parseFloat(product.price).toFixed(2)}</p>
                        <p className="text-gray-400 text-xs font-mono">
                          {product.accepted_crypto && product.accepted_crypto.includes('XMR') && !product.accepted_crypto.includes('BTC') ? (
                            <>≈ {parseFloat((parseFloat(product.price) / 170).toFixed(8))} XMR</>
                          ) : (
                            <>≈ {parseFloat((parseFloat(product.price) / 100000).toFixed(8))} BTC</>
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Views:</span>
                        <p className="text-white">{product.views_count || 0}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Wishlist:</span>
                        <div className="flex items-center space-x-1">
                          <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-theme-red" />
                          <span className="text-white">{wishlistCounts[product.id] || 0}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400">Stock:</span>
                        <p className={product.quantity_available > 0 ? 'text-theme-cyan' : 'text-theme-red'}>
                          {product.quantity_available || 0}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs sm:text-sm text-gray-400 mb-3">
                      Created: {new Date(product.created_at).toLocaleDateString()}
                    </div>

                    <div className="flex items-center space-x-2 pt-3 border-t border-gray-700">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white flex-1 text-xs sm:text-sm"
                        onClick={() => navigate(`/vendor/listings/${product.id}`)}
                      >
                        <Eye className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                        <span className="hidden sm:inline">View</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white flex-1 text-xs sm:text-sm"
                        onClick={() => navigate(`/vendor/listings/edit/${product.id}`)}
                      >
                        <Edit className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-surface-2 border-border w-[90vw] sm:w-auto">
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
                    <tr key={product.id} className="hover:bg-gray-800/50">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                            <img
                              src={getImageUrl(product.main_image) || placeholderImage}
                              alt={product.headline}
                              className="w-full h-full object-cover"
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
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-white font-bold">${parseFloat(product.price).toFixed(2)}</span>
                        <span className="text-gray-400 text-xs font-mono ml-2">
                          {product.accepted_crypto && product.accepted_crypto.includes('XMR') && !product.accepted_crypto.includes('BTC') ? (
                            <>≈ {parseFloat((parseFloat(product.price) / 170).toFixed(8))} XMR</>
                          ) : (
                            <>≈ {parseFloat((parseFloat(product.price) / 100000).toFixed(8))} BTC</>
                          )}
                        </span>
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
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
      </AlertDialog>

      {/* Rejection Reason Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
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
      </Dialog>
    </>
  );
}
