import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Star, Heart, ShoppingCart, Eye, Clock, Shield, CheckCircle, Star as StarIcon, X, ArrowLeft, ExternalLink, Flag, Copy, ChevronUp, ChevronDown, HelpCircle, MapPin, DollarSign, Users, TrendingUp, Calendar, Lock, Info, MessageSquare, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { productService } from '@/services/productService';
import vendorService from '@/services/vendorService';
import wishlistService from '@/services/wishlistService';
import PaymentModal from './PaymentModal';

interface Product {
  id: number;
  headline: string | null;
  listing_title?: string;
  website?: string | null;
  account_type: string | null;
  access_type: string | null;
  account_balance?: string | null;
  description: string;
  price: string;
  additional_info?: string | null;
  delivery_time: string | null;
  credentials_display?: string | null;
  main_image?: string | null;
  gallery_images: string[];
  main_images: string[];
  status: string;
  is_featured: boolean;
  views_count: number;
  favorites_count: number;
  rating: string;
  review_count: number;
  created_at: string;
  vendor_username: string;
  vendor: {
    id: string;
    username: string;
    email: string;
  };
  category: {
    id: number;
    name: string;
  };
  sub_category?: {
    id: number;
    name: string;
  } | null;
  tags: string[];
  special_features: string[];
  quantity_available: number;
  escrow_enabled?: boolean;
  access_method?: string | null;
  account_age?: string | null;
  delivery_method?: string | null;
  region_restrictions?: string | null;
  auto_delivery_script?: string | null;
  notes_for_buyer?: string | null;
  discount_percentage?: string | null;
}

interface ProductDetailModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, isOpen, onClose }) => {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showFullAdditionalInfo, setShowFullAdditionalInfo] = useState(false);
  const [vendorStats, setVendorStats] = useState<any>(null);
  const [productReviews, setProductReviews] = useState<any>(null);
  const [loadingVendorStats, setLoadingVendorStats] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && product?.id) {
      // Track product view
      productService.trackProductView(Number(product.id));
      
      // Fetch vendor statistics
      fetchVendorStats();
      
      // Fetch product reviews
      fetchProductReviews();
      
      // Check wishlist status
      checkWishlistStatus();
    }
  }, [isOpen, product?.id]);

  const fetchVendorStats = async () => {
    if (!product?.vendor_username) return;
    
    setLoadingVendorStats(true);
    try {
      const response = await vendorService.getVendorStatistics(product.vendor_username);
      if (response.success) {
        setVendorStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching vendor stats:', error);
    } finally {
      setLoadingVendorStats(false);
    }
  };

  const fetchProductReviews = async () => {
    if (!product?.id) return;
    
    setLoadingReviews(true);
    try {
      const response = await productService.getProductReviewsModal(product.id, { page_size: 5 });
      if (response.success) {
        setProductReviews(response.data);
      }
    } catch (error) {
      console.error('Error fetching product reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const checkWishlistStatus = async () => {
    if (!product?.id) return;
    
    try {
      const inWishlist = await wishlistService.isInWishlist(product.id);
      setIsInWishlist(inWishlist);
    } catch (error) {
      console.error('Error checking wishlist status:', error);
    }
  };

  const handleWishlistToggle = async () => {
    if (!product?.id) return;
    
    setWishlistLoading(true);
    try {
      if (isInWishlist) {
        // Remove from wishlist
        const response = await wishlistService.removeFromWishlist(product.id);
        if (response.success) {
          setIsInWishlist(false);
          toast({
            title: "Removed from Wishlist",
            description: "Product has been removed from your wishlist",
          });
        } else {
          toast({
            title: "Error",
            description: response.message || "Failed to remove from wishlist",
            variant: "destructive",
          });
        }
      } else {
        // Add to wishlist
        const response = await wishlistService.addToWishlist(product.id);
        if (response.success) {
          setIsInWishlist(true);
          toast({
            title: "Added to Wishlist",
            description: "Product has been added to your wishlist",
          });
        } else {
          toast({
            title: "Error",
            description: response.message || "Failed to add to wishlist",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to update wishlist",
        variant: "destructive",
      });
    } finally {
      setWishlistLoading(false);
    }
  };

  const getFullUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    return `http://localhost:8000${url}`;
  };

  const formatPrice = (price: string) => {
    return parseFloat(price).toFixed(8);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getAccountTypeColor = (type: string | null) => {
    if (!type) return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    
    const colors: { [key: string]: string } = {
      'social': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'gaming': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'streaming': 'bg-red-500/20 text-red-400 border-red-500/30',
      'software': 'bg-green-500/20 text-green-400 border-green-500/30',
      'trading': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'music': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      'business': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      'messengers': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'other': 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return colors[type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getAccessTypeColor = (type: string | null) => {
    if (!type) return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    
    const colors: { [key: string]: string } = {
      'full_ownership': 'bg-green-500/20 text-green-400 border-green-500/30',
      'shared': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'access': 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };
    return colors[type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getDeliveryTimeDisplay = (time: string | null) => {
    if (!time) return 'N/A';
    return time.replace('_', ' ').toUpperCase();
  };

  const getDeliveryTimeColor = (time: string | null) => {
    if (!time) return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    
    const colors: { [key: string]: string } = {
      'instant_auto': 'bg-green-500/20 text-green-400 border-green-500/30',
      'instant': 'bg-green-500/20 text-green-400 border-green-500/30',
      'manual_24h': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'manual_48h': 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    };
    return colors[time] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const handleBuyNow = () => {
    setIsPaymentModalOpen(true);
  };

  const handleAddToFavorites = () => {
    setIsFavorited(!isFavorited);
    toast({
      title: isFavorited ? "Removed from Favorites" : "Added to Favorites",
      description: isFavorited ? "Product removed from your favorites" : "Product added to your favorites"
    });
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
  };

  // Add debugging

  if (!product) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-gray-600/30 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-600/20 bg-card">
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white">{product.headline || 'Untitled Product'}</h2>
                <p className="text-gray-400 text-sm">{product.website || 'No website'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Always-visible link to vendor public listings */}
              <button
                onClick={() => {
                  const vendorUsername = (product.vendor && product.vendor.username) || product.vendor_username;
                  if (vendorUsername) {
                    navigate(`/vendor/public/${vendorUsername}`);
                  }
                }}
                className="flex items-center text-blue-400 hover:text-blue-300 text-sm transition-colors"
                title="View all products of this vendor"
              >
                <ExternalLink className="w-4 h-4 mr-1" /> View vendor listings
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="p-6 space-y-6">
              {/* Product Images - Reduced height */}
              <div className="space-y-4">
                <div className="h-48 bg-gray-800/30 rounded-xl overflow-hidden border border-gray-600/20">
                  {product.main_image ? (
                    <img
                      src={product.main_image}
                      alt={product.headline || 'Product'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-400 text-4xl">📦</span>
                    </div>
                  )}
                </div>

                {/* Gallery Images */}
                {product.gallery_images && product.gallery_images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {product.gallery_images.map((image, index) => (
                      <div key={index} className="aspect-square bg-gray-800/30 rounded-lg overflow-hidden border border-gray-600/20">
                        <img
                          src={image}
                          alt={`${product.headline || 'Product'} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="space-y-4">
                <div className="flex gap-2 overflow-x-auto">
                  {product.account_type && (
                    <Badge className={`${getAccountTypeColor(product.account_type)} flex-shrink-0`}>
                      {product.account_type.replace('_', ' ').toUpperCase()}
                    </Badge>
                  )}
                  {product.access_type && (
                    <Badge className={`${getAccessTypeColor(product.access_type)} flex-shrink-0`}>
                      {product.access_type.replace('_', ' ').toUpperCase()}
                    </Badge>
                  )}
                  {product.is_featured && (
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 flex-shrink-0">
                      FEATURED
                    </Badge>
                  )}
                  {product.escrow_enabled && (
                    <Badge className="bg-gradient-to-r from-yellow-500/90 to-amber-500/90 text-black border border-yellow-400/60 hover:from-yellow-500 hover:to-amber-500 transition-all duration-200 shadow-lg flex-shrink-0">
                      <Lock className="w-3 h-3 mr-1" />
                      ESCROW PROTECTED
                    </Badge>
                  )}
                </div>

                {/* Fixed layout - Headings on top line, values on bottom line with better spacing */}
                <div className="text-sm">
                  {/* Headings line */}
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">Account Balance:</span>
                    <span className="text-gray-400 text-center flex-1">Delivery Time:</span>
                  </div>
                  {/* Values line */}
                  <div className="flex justify-between">
                    <span className="text-white">{product.account_balance || 'N/A'}</span>
                    <div className="flex-1 flex justify-center">
                      <Badge className={getDeliveryTimeColor(product.delivery_time)}>
                        {getDeliveryTimeDisplay(product.delivery_time)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price Section */}
              <div className="bg-gradient-to-r from-accent/10 to-accent-2/10 rounded-xl p-6 border border-accent/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Price</p>
                    <p className="text-3xl font-bold text-white">
                      {formatPrice(product.price)} BTC
                    </p>
                    {product.discount_percentage && parseFloat(product.discount_percentage) > 0 && (
                      <p className="text-green-400 text-sm">
                        {product.discount_percentage}% OFF
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm">Available</p>
                    <p className="text-xl font-semibold text-white">
                      {product.quantity_available || 0} units
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Improved Buy Now button */}
              <div className="flex space-x-3">
                <Button
                  onClick={handleBuyNow}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 shadow-lg"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Buy Now
                </Button>
                <Button
                  onClick={() => {
                    // Navigate to messages page with product context
                    const productData = {
                      id: product.id,
                      title: product.headline || product.listing_title,
                      image: product.main_image,
                      vendor: product.vendor_username,
                      vendorId: product.vendor?.id
                    };
                    localStorage.setItem('productContext', JSON.stringify(productData));
                    window.location.href = '/buyer/messages';
                  }}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 shadow-lg"
                >
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Chat with Vendor
                </Button>
                <Button
                  onClick={handleWishlistToggle}
                  variant="outline"
                  className="border-border text-gray-300 hover:bg-surface-2 py-3"
                  disabled={wishlistLoading}
                >
                  {wishlistLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Heart className={`w-5 h-5 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                  )}
                </Button>
              </div>

              {/* Product Details */}
              <div className="space-y-6">
                {/* Description */}
                <div className="bg-surface-2/50 rounded-xl p-4 border border-gray-600/20">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">Description</h3>
                    <button
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="text-accent hover:text-accent-2 text-sm"
                    >
                      {showFullDescription ? 'Show Less' : 'Show More'}
                    </button>
                  </div>
                  <p className="text-gray-300 leading-relaxed">
                    {showFullDescription ? product.description : truncateText(product.description, 200)}
                  </p>
                </div>

                {/* Escrow Protection Information */}
                {product.escrow_enabled && (
                  <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/30">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                          <Lock className="w-4 h-4 text-green-400" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-green-300">Escrow Protection Enabled</h3>
                          <button 
                            className="text-green-400 hover:text-green-300 transition-colors"
                            title="Payment held until you approve the order • Automatic refund if order is not approved • Secure transaction with buyer protection"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">
                          This product is protected by our escrow system. Your payment will be held securely until you confirm the order is satisfactory.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Information */}
                {product.additional_info && (
                  <div className="bg-surface-2/50 rounded-xl p-4 border border-gray-600/20">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-white">Additional Information</h3>
                      <button
                        onClick={() => setShowFullAdditionalInfo(!showFullAdditionalInfo)}
                        className="text-accent hover:text-accent-2 text-sm"
                      >
                        {showFullAdditionalInfo ? 'Show Less' : 'Show More'}
                      </button>
                    </div>
                    <p className="text-gray-300 leading-relaxed">
                      {showFullAdditionalInfo ? product.additional_info : truncateText(product.additional_info, 200)}
                    </p>
                  </div>
                )}

                {/* Vendor Details */}
                <div className="bg-surface-2/50 rounded-xl p-4 border border-gray-600/20">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-400" />
                    Vendor Details
                    {loadingVendorStats && <Loader2 className="w-4 h-4 ml-2 animate-spin text-blue-400" />}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Username:</span>
                        <span className="text-white font-medium">{product.vendor_username}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Member Since:</span>
                        <span className="text-white">
                          {vendorStats ? vendorStats.member_since : "Loading..."}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Total Sales:</span>
                        <span className="text-green-400 font-medium">
                          {vendorStats ? vendorStats.total_sales : "Loading..."}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Vendor Rating:</span>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-white">
                            {vendorStats ? vendorStats.vendor_rating : "Loading..."}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Completion Rate:</span>
                        <span className="text-green-400 font-medium">
                          {vendorStats ? vendorStats.completion_rate : "Loading..."}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product Statistics */}
                <div className="bg-surface-2/50 rounded-xl p-4 border border-gray-600/20">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
                    Product Statistics
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 flex items-center">
                          <Eye className="w-4 h-4 mr-1" />
                          Views:
                        </span>
                        <span className="text-white font-medium">{product.views_count || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 flex items-center">
                          <Heart className="w-4 h-4 mr-1" />
                          Favorites:
                        </span>
                        <span className="text-white font-medium">{product.favorites_count || 0}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 flex items-center">
                          <Star className="w-4 h-4 mr-1" />
                          Rating:
                        </span>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-white">{product.rating || '0.00'}</span>
                          <span className="text-gray-400">({product.review_count || 0})</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          Listed:
                        </span>
                        <span className="text-white">{new Date(product.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Product Details - if available */}
                {product.access_method && (
                  <div className="bg-surface-2/50 rounded-xl p-4 border border-gray-600/20">
                    <h3 className="text-lg font-semibold text-white mb-3">Access Method</h3>
                    <p className="text-gray-300">{product.access_method}</p>
                  </div>
                )}

                {product.account_age && (
                  <div className="bg-surface-2/50 rounded-xl p-4 border border-gray-600/20">
                    <h3 className="text-lg font-semibold text-white mb-3">Account Age</h3>
                    <p className="text-gray-300">{product.account_age}</p>
                  </div>
                )}

                {product.region_restrictions && (
                  <div className="bg-surface-2/50 rounded-xl p-4 border border-gray-600/20">
                    <h3 className="text-lg font-semibold text-white mb-3">Region Restrictions</h3>
                    <p className="text-gray-300">{product.region_restrictions}</p>
                  </div>
                )}

                {product.notes_for_buyer && (
                  <div className="bg-surface-2/50 rounded-xl p-4 border border-gray-600/20">
                    <h3 className="text-lg font-semibold text-white mb-3">Notes for Buyer</h3>
                    <p className="text-gray-300">{product.notes_for_buyer}</p>
                  </div>
                )}

                {/* Credentials Display */}
                <div className="bg-surface-2/50 rounded-xl p-4 border border-gray-600/20">
                  <h3 className="text-lg font-semibold text-white mb-3">Delivery Method</h3>
                  <p className="text-gray-300">{product.credentials_display || 'N/A'}</p>
                </div>

                {/* Reviews Section */}
                <div className="bg-surface-2/50 rounded-xl p-4 border border-gray-600/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center">
                      <Star className="w-5 h-5 mr-2 text-yellow-400" />
                      Reviews
                      {loadingReviews && <Loader2 className="w-4 h-4 ml-2 animate-spin text-yellow-400" />}
                    </h3>
                    {productReviews && productReviews.reviews.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowReviews(!showReviews)}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700/50"
                      >
                        {showReviews ? 'Hide Reviews' : 'Show Reviews'}
                      </Button>
                    )}
                  </div>
                  
                  {loadingReviews ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-3 animate-spin" />
                      <p className="text-gray-400">Loading reviews...</p>
                    </div>
                  ) : productReviews && productReviews.reviews.length > 0 ? (
                    <div>
                      {/* Review Stats */}
                      <div className="mb-4 p-3 bg-gray-800/30 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Star className="w-5 h-5 text-yellow-400 fill-current" />
                            <span className="text-white font-medium">
                              {productReviews.product_stats.average_rating.toFixed(1)}
                            </span>
                            <span className="text-gray-400">
                              ({productReviews.product_stats.total_reviews} reviews)
                            </span>
                          </div>
                          <span className="text-gray-400 text-sm">
                            {productReviews.pagination.total_count} total reviews
                          </span>
                        </div>
                      </div>
                      
                      {/* Reviews List */}
                      {showReviews && (
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {productReviews.reviews.map((review: any) => (
                            <div key={review.id} className="p-3 bg-gray-800/30 rounded-lg border border-gray-600/20">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-4 h-4 ${
                                          i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-400'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-white font-medium">{review.buyer_username}</span>
                                </div>
                                <span className="text-gray-400 text-sm">{review.time_ago}</span>
                              </div>
                              <p className="text-gray-300 text-sm leading-relaxed">{review.comment}</p>
                              {review.images && review.images.length > 0 && (
                                <div className="mt-2 flex space-x-2">
                                  {review.images.map((image: string, index: number) => (
                                    <img
                                      key={index}
                                      src={image}
                                      alt={`Review image ${index + 1}`}
                                      className="w-16 h-16 object-cover rounded border border-gray-600/20"
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Star className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-400 text-lg">No reviews yet</p>
                      <p className="text-gray-500 text-sm">Be the first to review this product</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* View all products of this vendor */}
              <a
                href={`/vendor/public/${(product.vendor && product.vendor.username) || product.vendor_username}`}
                className="flex items-center text-blue-400 hover:text-blue-300 text-sm"
                title="View all products of this vendor"
              >
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <PaymentModal
          product={{
            ...product,
            listing_title: product.headline || product.listing_title || 'Untitled Product'
          }}
          isOpen={isPaymentModalOpen}
          onClose={handleClosePaymentModal}
          onBack={() => setIsPaymentModalOpen(false)}
        />
      )}
    </>
  );
};

export default ProductDetailModal;
