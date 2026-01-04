import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/buyer/ProductCard';
import { productService, Product } from '@/services/productService';
import { Loader2, Package, AlertCircle, Star, TrendingUp, Users, Eye, DollarSign, Calendar, Award, Shield } from 'lucide-react';
import { CartProvider } from '@/contexts/CartContext';
import vendorService from '@/services/vendorService';
import { Pagination } from '@/components/ui/pagination';

function VendorPublicListingsContent() {
  const { vendorUsername } = useParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendorStats, setVendorStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const pageSize = 20;

  useEffect(() => {
    const load = async () => {
      if (!vendorUsername) {
        setLoading(false);
        setLoadingStats(false);
        return;
      }

      try {
        setError(null);
        setLoading(true);
        setLoadingStats(true);

        // Load vendor statistics
        try {
          const statsRes = await vendorService.getVendorStatistics(vendorUsername);
          if (statsRes.success && statsRes.data) {
            setVendorStats(statsRes.data);
          }
        } catch (e) {
          console.error('Error loading vendor stats:', e);
        } finally {
          setLoadingStats(false);
        }

        // Load products with pagination
        console.log('🔍 Fetching products for vendor:', vendorUsername, 'page:', currentPage);
        const res = await productService.getVendorPublicProducts(vendorUsername, { page: currentPage, page_size: pageSize });
        console.log('🔍 API Response:', res);

        if (res.success && res.data) {
          setProducts(res.data);
          if (res.pagination) {
            setPagination(res.pagination);
          }
          console.log('🔍 Products loaded:', res.data.length);
        } else {
          console.log('🔍 No products found or API error:', res.message);
          setProducts([]);
          setError(res.message || 'Failed to load products');
        }
      } catch (error: any) {
        console.error('❌ Error fetching vendor products:', error);
        setProducts([]);
        setError(error.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [vendorUsername, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading && !vendorStats) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-theme-cyan animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading vendor store...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !products.length) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-500 mb-2">Error Loading Store</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <Link to="/buyer/listings">
              <Button variant="outline" className="border-gray-600 text-gray-300">
                Back to listings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{vendorUsername}'s Store</h1>
        <Link to="/buyer/listings">
          <Button variant="outline" className="border-gray-600 text-gray-300">Back to listings</Button>
        </Link>
      </div>

      {/* Vendor Analytics */}
      {loadingStats ? (
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-theme-cyan animate-spin" />
            </div>
          </CardContent>
        </Card>
      ) : vendorStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Member Since */}
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="w-5 h-5 text-theme-cyan" />
                <h3 className="text-sm font-medium text-gray-400">Member Since</h3>
              </div>
              <p className="text-xl font-bold text-white">{vendorStats.member_since || 'N/A'}</p>
            </CardContent>
          </Card>

          {/* Active Listings */}
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Package className="w-5 h-5 text-theme-cyan" />
                <h3 className="text-sm font-medium text-gray-400">Active Listings</h3>
              </div>
              <p className="text-xl font-bold text-white">{vendorStats.active_listings || 0}</p>
            </CardContent>
          </Card>

          {/* Total Sales */}
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-5 h-5 text-theme-cyan" />
                <h3 className="text-sm font-medium text-gray-400">Total Sales</h3>
              </div>
              <p className="text-xl font-bold text-white">{vendorStats.total_sales || 0}</p>
            </CardContent>
          </Card>

          {/* Vendor Rating */}
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Star className="w-5 h-5 text-theme-red fill-current" />
                <h3 className="text-sm font-medium text-gray-400">Vendor Rating</h3>
              </div>
              <p className="text-xl font-bold text-white">{vendorStats.vendor_rating || 'No rating'}</p>
            </CardContent>
          </Card>

          {/* Completion Rate */}
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Award className="w-5 h-5 text-theme-cyan" />
                <h3 className="text-sm font-medium text-gray-400">Completion Rate</h3>
              </div>
              <p className="text-xl font-bold text-white">{vendorStats.completion_rate || '100%'}</p>
            </CardContent>
          </Card>

          {/* Total Reviews */}
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Star className="w-5 h-5 text-theme-cyan" />
                <h3 className="text-sm font-medium text-gray-400">Total Reviews</h3>
              </div>
              <p className="text-xl font-bold text-white">{vendorStats.total_reviews || 0}</p>
            </CardContent>
          </Card>

          {/* Total Views */}
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Eye className="w-5 h-5 text-theme-cyan" />
                <h3 className="text-sm font-medium text-gray-400">Total Views</h3>
              </div>
              <p className="text-xl font-bold text-white">{vendorStats.total_views || 0}</p>
            </CardContent>
          </Card>

          {/* Total Favorites */}
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Star className="w-5 h-5 text-theme-red" />
                <h3 className="text-sm font-medium text-gray-400">Total Favorites</h3>
              </div>
              <p className="text-xl font-bold text-white">{vendorStats.total_favorites !== undefined ? vendorStats.total_favorites : 0}</p>
            </CardContent>
          </Card>

          {/* Unique Buyers */}
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-5 h-5 text-theme-cyan" />
                <h3 className="text-sm font-medium text-gray-400">Unique Buyers</h3>
              </div>
              <p className="text-xl font-bold text-white">{vendorStats.unique_buyers || 'N/A'}</p>
            </CardContent>
          </Card>

          {/* Trusted Status */}
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-5 h-5 text-theme-cyan" />
                <h3 className="text-sm font-medium text-gray-400">Trusted Status</h3>
              </div>
              <p className="text-xl font-bold text-white">
                {parseFloat(vendorStats.completion_rate || '0') >= 90 ? 'Verified Pro' : 'Reliable Vendor'}
              </p>
            </CardContent>
          </Card>

          {/* Last Sale Date */}
          {vendorStats.last_sale_date && (
            <Card className="bg-gray-900 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-5 h-5 text-theme-red" />
                  <h3 className="text-sm font-medium text-gray-400">Last Sale</h3>
                </div>
                <p className="text-xl font-bold text-white">{vendorStats.last_sale_date}</p>
              </CardContent>
            </Card>
          )}

          {/* Most Selling Product */}
          {vendorStats.most_selling_product && (
            <Card className="bg-gray-900 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Award className="w-5 h-5 text-theme-cyan" />
                  <h3 className="text-sm font-medium text-gray-400">Most Selling</h3>
                </div>
                <p className="text-sm font-bold text-white truncate" title={vendorStats.most_selling_product}>
                  {vendorStats.most_selling_product}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Products Section */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Active Products {pagination && `(${pagination.total_count || products.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-theme-cyan animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-400 text-lg">No active listings found</p>
              <p className="text-gray-500 text-sm">This vendor may not have any approved products yet.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product as any} viewMode="grid" />
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.total_pages > 1 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={pagination.total_pages}
                    onPageChange={handlePageChange}
                    itemsPerPage={pageSize}
                    totalItems={pagination.total_count}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VendorPublicListings() {
  return (
    <CartProvider>
      <VendorPublicListingsContent />
    </CartProvider>
  );
}
