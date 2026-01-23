import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Star, Heart, ShoppingCart, Eye, Clock, Shield, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import vendorService from '@/services/vendorService';
import wishlistService from '@/services/wishlistService';
import { API_BASE_URL, getImageUrl } from '@/config/api';
import placeholderImage from "@/assets/placeholder.png";

interface Product {
  id: number;
  headline: string;
  listing_title?: string;
  website: string;
  description: string;
  price: string;
  additional_info?: string;
  category: { name: string };
  sub_category: { name: string };
  delivery_method: string;
  delivery_time?: string;
  account_type: string;
  access_type?: string;
  access_method?: string;
  account_balance?: string;
  account_age?: string;
  verification_level?: string;
  main_image?: string;
  main_images?: string[];
  gallery_images?: string[];
  documents?: string[];
  special_features?: string[];
  region_restrictions?: string[];
  tags?: string[];
  notes_for_buyer?: string;
  auto_delivery_script?: string;
  discount_percentage?: string;
  escrow_enabled?: boolean;
  vendor?: {
    username: string;
    email: string;
    date_joined: string;
  };
  vendor_username?: string;
  views_count: number;
  favorites_count: number;
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
  quantity_available: number;
  status: string;
  is_featured?: boolean;
  accepted_crypto?: string[];
  is_giveaway?: boolean;
}

interface Review {
  id: number;
  user: string;
  rating: number;
  comment: string;
  created_at: string;
}

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  console.log('🔍 ProductDetailPage rendered with ID:', id);

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [vendorStats, setVendorStats] = useState<any>(null);

  // Stock management logic
  const isOutOfStock = product ? (product.quantity_available <= 0 || product.status !== 'approved') : false;

  useEffect(() => {
    if (id) {
      fetchProductDetails();
      fetchProductReviews();
    }
  }, [id]);

  const fetchProductDetails = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      console.log('🔍 Fetching product details for ID:', id);

      const response = await vendorService.getProductDetail(id);

      console.log('🔍 Product detail response:', response);

      if (response.success && response.data) {
        console.log('✅ Setting product state:', response.data);
        const productData = response.data as any;
        setProduct(productData);

        // Set selected image
        if (productData.main_images && Array.isArray(productData.main_images) && productData.main_images.length > 0) {
          setSelectedImage(productData.main_images[0]);
        } else if (productData.main_image) {
          setSelectedImage(productData.main_image);
        }

        // Fetch vendor statistics
        const vendorUsername = productData.vendor?.username || productData.vendor_username;
        if (vendorUsername) {
          fetchVendorStatistics(vendorUsername);
        }

        // Check wishlist status
        checkWishlistStatus();
      } else {
        console.error('❌ Product detail error:', response);
        toast({
          title: "Error",
          description: response.message || "Failed to load product details",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('❌ Error fetching product:', error);
      toast({
        title: "Error",
        description: "Failed to load product details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVendorStatistics = async (vendorUsername: string) => {
    try {
      const statsResponse = await vendorService.getVendorStatistics(vendorUsername);
      if (statsResponse.success && statsResponse.data) {
        setVendorStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching vendor statistics:', error);
    }
  };

  const fetchProductReviews = async () => {
    if (!id) return;

    try {
      console.log('🔍 Fetching reviews for product ID:', id);

      // Try multiple endpoints
      const endpoints = [
        `${API_BASE_URL}/products/${id}/reviews/`,
        `${API_BASE_URL}/products/${id}/reviews/modal/`,
        `${API_BASE_URL}/reviews/product/${id}/`
      ];

      let reviewsData: Review[] = [];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${endpoint}?page_size=100`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            console.log('🔍 Reviews response from', endpoint, ':', data);

            // Handle different possible response structures
            if (data.results && Array.isArray(data.results)) {
              reviewsData = data.results;
              break;
            } else if (data.data && Array.isArray(data.data)) {
              reviewsData = data.data;
              break;
            } else if (Array.isArray(data)) {
              reviewsData = data;
              break;
            }
          }
        } catch (err) {
          console.log('Failed to fetch from', endpoint, err);
          continue;
        }
      }

      setReviews(reviewsData);
      console.log('📝 Final reviews count:', reviewsData.length);
    } catch (error) {
      console.error('❌ Failed to fetch reviews:', error);
      setReviews([]);
    }
  };

  const checkWishlistStatus = async () => {
    if (!id) return;

    try {
      const inWishlist = await wishlistService.isInWishlist(parseInt(id));
      setIsInWishlist(inWishlist);
    } catch (error) {
      console.error('Error checking wishlist status:', error);
    }
  };

  const handleOrder = () => {
    if (isOutOfStock) {
      toast({
        title: "Out of Stock",
        description: "This product is currently out of stock",
        variant: "destructive",
      });
      return;
    }

    // Navigate to listings page with product name in search and open order modal
    const productName = product?.headline || product?.listing_title || '';
    navigate(`/buyer/listings?search=${encodeURIComponent(productName)}&openOrder=${id}`, {
      state: {
        openProductId: id,
        autoOpenOrder: true,
        productName: productName
      }
    });
  };

  const handleAddToWishlist = () => {
    setIsInWishlist(!isInWishlist);
    toast({
      title: isInWishlist ? "Removed from Wishlist" : "Added to Wishlist",
      description: isInWishlist ? "Product removed from your wishlist" : "Product added to your wishlist",
    });
  };

  const getFullUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    return getImageUrl(url);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-800 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-96 bg-gray-800 rounded"></div>
              <div className="space-y-4">
                <div className="h-6 bg-gray-800 rounded w-3/4"></div>
                <div className="h-4 bg-gray-800 rounded w-1/2"></div>
                <div className="h-4 bg-gray-800 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-950 p-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Product Not Found</h1>
          <Button onClick={() => navigate('/buyer/listings')}>
            Back to Listings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/buyer/listings')}
            className="text-gray-400 hover:text-white"
          >
            ← Back to Listings
          </Button>
        </div>

        {/* Product Name Header - Highlighted */}
        <div className="mb-8 bg-blue-600/10 rounded-xl p-6 border border-blue-500/30 shadow-xl">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white mb-3">
            {product.headline || product.listing_title || 'Product'}
          </h1>
          {product.website && (
            <p className="text-gray-300 text-base sm:text-lg">{product.website}</p>
          )}
          {product.is_giveaway && (
            <Badge className="mt-3 bg-cyan-500 text-black border-none text-xs px-3 py-1 font-black">
              🎁 FREE GIVEAWAY
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Column - Product Details */}
          <div className="space-y-6 lg:col-span-3">
            {/* Product Header */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-gray-300 mb-3">
                Product Information
              </h2>
              <div className="flex items-center gap-4 text-gray-400 flex-wrap">
                <Badge variant="outline" className="border-blue-600 text-blue-400">
                  {product.category?.name || 'N/A'}
                </Badge>
                <span>•</span>
                <Badge variant="outline" className="border-purple-600 text-purple-400">
                  {product.sub_category?.name || 'N/A'}
                </Badge>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-3 mt-4">
                <div className="flex items-center gap-1 bg-yellow-400/10 px-3 py-1.5 rounded-full">
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <span className="text-white font-semibold text-lg">{product.rating || '0.00'}</span>
                </div>
                <span className="text-gray-400">({product.review_count || 0} reviews)</span>
              </div>

              {/* Price */}
              <div className="mt-4 bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
                {product.is_giveaway ? (
                  <>
                    <div className="text-4xl font-black text-cyan-400 uppercase tracking-tighter">
                      FREE GIFT
                    </div>
                    <div className="text-gray-400 text-lg font-medium mt-1">
                      Promotional Giveaway • $0.00
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-4xl font-bold text-blue-400">
                      ${parseFloat(product.price).toFixed(2)}
                    </div>
                    <div className="flex flex-col gap-1 mt-2">
                      {(!product.accepted_crypto || product.accepted_crypto.length === 0 || product.accepted_crypto.includes('BTC')) && (
                        <span className="text-gray-400 text-lg font-mono">≈ {parseFloat((parseFloat(product.price) / 100000).toFixed(8))} BTC</span>
                      )}
                      {product.accepted_crypto?.includes('XMR') && (
                        <span className="text-gray-400 text-lg font-mono">≈ {parseFloat((parseFloat(product.price) / 170).toFixed(8))} XMR</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Product Details */}
            <Card className="bg-gray-900 border-gray-700 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900">
                <CardTitle className="text-white flex items-center gap-2">
                  <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
                  Product Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-gray-400 text-sm">Delivery Method</span>
                    <p className="text-white font-semibold mt-1">{product.delivery_method}</p>
                  </div>
                  <div className="bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-gray-400 text-sm">Account Type</span>
                    <p className="text-white font-semibold mt-1">{product.account_type}</p>
                  </div>
                  <div className="bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-gray-400 text-sm">Verification Level</span>
                    <p className="text-white font-semibold mt-1">
                      {product.verification_level && product.verification_level !== 'none' && product.verification_level !== 'None'
                        ? product.verification_level
                        : (product.verification_level || 'N/A')}
                    </p>
                  </div>
                  <div className="bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-gray-400 text-sm">Listed</span>
                    <p className="text-white font-semibold mt-1">{formatDate(product.created_at)}</p>
                  </div>
                </div>

                <Separator className="bg-gray-700" />

                <div className="bg-gray-800/30 p-4 rounded-lg">
                  <span className="text-gray-400 font-medium">Description</span>
                  <p className="text-gray-300 mt-2 leading-relaxed">{product.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Vendor Information */}
            <Card className="bg-gray-900 border-gray-700 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900">
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  Vendor Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-start justify-between bg-gray-800/30 p-4 rounded-lg">
                  <div>
                    <p className="text-white font-semibold text-xl">
                      {product.vendor?.username || product.vendor_username || 'Unknown Vendor'}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Member since {vendorStats?.member_since || (product.vendor?.date_joined ? formatDate(product.vendor.date_joined) : 'Unknown')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1.5 rounded-full">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 text-sm font-medium">Verified</span>
                  </div>
                </div>
                <Separator className="bg-gray-700" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-gray-400 text-sm">Total Sales</span>
                    <p className="text-white font-semibold mt-1">{vendorStats?.total_sales || 0} products</p>
                  </div>
                  <div className="bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-gray-400 text-sm">Vendor Rating</span>
                    <p className="text-white font-semibold mt-1">
                      {vendorStats?.vendor_rating ? `${vendorStats.vendor_rating}` : (product.rating ? `${Number(product.rating).toFixed(1)}` : 'No rating')}
                    </p>
                  </div>
                  <div className="bg-gray-800/50 p-3 rounded-lg col-span-2">
                    <span className="text-gray-400 text-sm">Completion Rate</span>
                    <p className="text-white font-semibold mt-1">{vendorStats?.completion_rate || '100%'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            {product.additional_info && (
              <Card className="bg-gray-900 border-gray-700 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-400" />
                    Additional Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="bg-gray-800/30 p-4 rounded-lg">
                    <p className="text-gray-300 leading-relaxed">{product.additional_info}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="sticky bottom-4 bg-gray-900/95 backdrop-blur-sm rounded-xl p-4 border border-gray-700 shadow-2xl">
              <div className="flex gap-4">
                <Button
                  size="lg"
                  className={`flex-1 font-semibold text-lg h-14 ${isOutOfStock
                    ? 'bg-gray-600 hover:bg-gray-500 cursor-not-allowed opacity-60 text-white'
                    : 'bg-pink-800 hover:bg-pink-700 text-white shadow-lg hover:shadow-xl transition-all'
                    }`}
                  onClick={handleOrder}
                  disabled={isOutOfStock}
                  title={isOutOfStock ? "This product is currently out of stock" : "Order this product"}
                >
                  <ShoppingCart className="w-6 h-6 mr-2" />
                  {isOutOfStock ? 'Out of Stock' : 'Order Now'}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-gray-600 text-gray-300 hover:bg-gray-800 hover:border-gray-500 h-14 px-6 transition-all"
                  onClick={handleAddToWishlist}
                >
                  <Heart className={`w-6 h-6 ${isInWishlist ? 'fill-current text-red-500' : ''}`} />
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column - Images */}
          <div className="space-y-4 lg:col-span-2">
            {/* Main Image */}
            <div className="w-full bg-gray-800 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center" style={{ maxHeight: '400px' }}>
              <img
                src={selectedImage ? getFullUrl(selectedImage) : placeholderImage}
                alt={product?.listing_title || 'Product'}
                className="w-full h-auto max-h-[400px] object-contain"
                style={{ maxWidth: '100%' }}
                onError={(e) => {
                  e.currentTarget.src = placeholderImage;
                }}
              />
            </div>

            {/* Gallery Images */}
            {((product.gallery_images && Array.isArray(product.gallery_images) && product.gallery_images.length > 0) ||
              (product.main_images && Array.isArray(product.main_images) && product.main_images.length > 1)) && (
                <div className="grid grid-cols-4 gap-3">
                  {(product.gallery_images || product.main_images || []).slice(0, 4).map((image, index) => (
                    <div
                      key={index}
                      className={`w-full aspect-square bg-gray-800 rounded-lg cursor-pointer overflow-hidden hover:ring-2 hover:ring-blue-400 transition-all ${selectedImage === image ? 'ring-2 ring-blue-400' : ''
                        }`}
                      onClick={() => setSelectedImage(image)}
                    >
                      <img
                        src={getFullUrl(image) || placeholderImage}
                        alt={`Gallery ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = placeholderImage;
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

            {/* Stock Status Badge */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Availability:</span>
                {isOutOfStock ? (
                  <Badge variant="destructive" className="bg-red-600">Out of Stock</Badge>
                ) : (
                  <Badge className="bg-green-600 hover:bg-green-700">In Stock ({product.quantity_available})</Badge>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-lg p-4 border border-blue-800/50">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-xs text-gray-400">Views</p>
                    <p className="text-white font-semibold">{product.views_count || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-400" />
                  <div>
                    <p className="text-xs text-gray-400">Favorites</p>
                    <p className="text-white font-semibold">{product.favorites_count || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12">
          <Card className="bg-gray-900 border-gray-700 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900">
              <CardTitle className="text-white flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                Customer Reviews ({reviews.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {reviews.length > 0 ? (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="bg-gray-800/30 rounded-lg p-5 border-l-4 border-blue-500">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                            {review.user.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-white font-semibold">{review.user}</span>
                            <div className="flex items-center gap-1 mt-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-600'}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className="text-gray-400 text-sm">{formatDate(review.created_at)}</span>
                      </div>
                      <p className="text-gray-300 leading-relaxed">{review.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-800/20 rounded-lg">
                  <Star className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">No reviews yet. Be the first to review this product!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;