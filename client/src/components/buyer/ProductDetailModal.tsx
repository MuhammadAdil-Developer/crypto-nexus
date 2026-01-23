import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Star, Heart, ShoppingCart, Eye, Clock, Shield, CheckCircle, Star as StarIcon, X, ArrowLeft, ExternalLink, Flag, Copy, ChevronUp, ChevronDown, HelpCircle, MapPin, DollarSign, Users, TrendingUp, Calendar, Lock, Info, MessageSquare, Loader2, FileText, Download, Tag, Key, Truck } from 'lucide-react';
import { DotLoader } from '@/components/ui/dot-loader';
import { useToast } from '@/hooks/use-toast';
import { productService } from '@/services/productService';
import vendorService from '@/services/vendorService';
import wishlistService from '@/services/wishlistService';
import PaymentModal from './PaymentModal';
import { getImageUrl } from '@/config/api';
import placeholderImage from "@/assets/placeholder.png";
import { CRYPTO_PRICES } from '@/lib/priceUtils';

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
  accepted_crypto?: string[];
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
      console.log('Vendor stats response:', response); // Debug log
      // Response structure: { success: true, data: { member_since, total_sales, ... } }
      if (response && response.success === true && response.data) {
        console.log('Setting vendor stats:', response.data);
        setVendorStats(response.data);
      } else if (response && response.data) {
        // Handle case where response.data is already the data object
        console.log('Setting vendor stats (fallback):', response.data);
        setVendorStats(response.data);
      } else {
        console.warn('Invalid vendor stats response:', response);
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
    return getImageUrl(url);
  };

  // Format USD price with 2 decimal places
  const formatUSD = (price: string) => {
    return parseFloat(price).toFixed(2);
  };

  // Format Crypto equivalent
  const getCryptoEstimate = (price: string, crypto: string) => {
    const usdPrice = parseFloat(price);
    if (crypto === 'BTC') {
      const rate = CRYPTO_PRICES.BTC || 100000;
      const btcPrice = usdPrice / rate;
      return parseFloat(btcPrice.toFixed(8)).toString();
    }
    if (crypto === 'XMR') {
      const rate = CRYPTO_PRICES.XMR || 170;
      const xmrPrice = usdPrice / rate;
      return parseFloat(xmrPrice.toFixed(8)).toString();
    }
    return '0';
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
        <div className="bg-card border border-gray-600/30 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 p-4 sm:p-6 border-b border-gray-600/20 bg-card">
            {/* Left Section - Back Button + Title */}
            <div className="flex items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto min-w-0">
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 hover:bg-gray-700/50 rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm sm:text-lg md:text-xl font-extrabold text-white uppercase tracking-wider sm:tracking-widest truncate" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  {product.headline || 'Untitled Product'}
                </h2>
                <p className="text-theme-cyan/70 text-[10px] sm:text-xs font-bold uppercase tracking-tighter truncate">
                  {product.website || 'No website'}
                </p>
              </div>
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
              {/* Vendor Link - Hidden on mobile, shown on tablet+ */}
              <button
                onClick={() => {
                  const vendorUsername = (product.vendor && product.vendor.username) || product.vendor_username;
                  if (vendorUsername) {
                    navigate(`/vendor/public/${vendorUsername}`);
                  }
                }}
                className="hidden md:flex items-center text-theme-cyan hover:text-white text-xs sm:text-sm transition-colors whitespace-nowrap"
                title="View all products of this vendor"
              >
                <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden lg:inline">View vendor listings</span>
                <span className="lg:hidden">Vendor</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(95vh-100px)] sm:max-h-[calc(90vh-120px)]">
            <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
              {/* Product Images - Responsive height */}
              <div className="space-y-3 sm:space-y-4">
                <div className="h-40 sm:h-48 md:h-56 bg-white/5 rounded-lg sm:rounded-xl overflow-hidden border border-white/10">
                  {product.main_image || (product.main_images && product.main_images.length > 0) ? (
                    <img
                      src={
                        getImageUrl(product.main_image) ||
                        (product.main_images && product.main_images.length > 0
                          ? getImageUrl(product.main_images[0])
                          : placeholderImage)
                      }
                      alt={product.headline || 'Product'}
                      className="w-full h-full object-contain bg-transparent"
                      onError={(e) => {
                        e.currentTarget.src = placeholderImage;
                      }}
                    />
                  ) : (
                    <img
                      src={placeholderImage}
                      alt="Placeholder"
                      className="w-full h-full object-contain bg-transparent"
                    />
                  )}
                </div>

                {/* Gallery Images & Documents - Responsive grid */}
                {(product.gallery_images && product.gallery_images.length > 0) || (product.documents && product.documents.length > 0) ? (
                  <div>
                    <h4 className="text-xs sm:text-sm font-medium text-gray-400 mb-2 sm:mb-3">Gallery Images & Documents</h4>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      {product.gallery_images && product.gallery_images.map((image, index) => {
                        const imageUrl = getImageUrl(image);
                        return (
                          <div key={`img-${index}`} className="aspect-square w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 bg-gray-800/30 rounded-lg overflow-hidden border border-gray-600/20 hover:border-gray-500/40 transition-colors">
                            <img
                              src={imageUrl}
                              alt={`${product.headline || 'Product'} ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400";
                              }}
                            />
                          </div>
                        );
                      })}
                      {product.documents && product.documents.map((doc: string, index: number) => {
                        const docUrl = getImageUrl(doc);
                        const docName = doc.split('/').pop() || `Document ${index + 1}`;
                        return (
                          <div key={`doc-${index}`} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:bg-gray-800 hover:border-gray-600 transition-colors min-w-[120px] sm:min-w-[140px]">
                            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-xs sm:text-sm font-medium truncate max-w-[80px] sm:max-w-[120px]">{docName}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 p-1 sm:p-1.5 h-auto"
                              onClick={() => window.open(docUrl, '_blank')}
                              title="Download document"
                            >
                              <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Product Info - Responsive badges */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1">
                  {product.account_type && (
                    <Badge className={`${getAccountTypeColor(product.account_type)} flex-shrink-0 text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1`}>
                      {product.account_type.replace('_', ' ').toUpperCase()}
                    </Badge>
                  )}
                  {product.access_type && (
                    <Badge className={`${getAccessTypeColor(product.access_type)} flex-shrink-0 text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1`}>
                      {product.access_type.replace('_', ' ').toUpperCase()}
                    </Badge>
                  )}
                  {product.is_featured && (
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 flex-shrink-0 text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1">
                      FEATURED
                    </Badge>
                  )}
                  {product.escrow_enabled && (
                    <Badge className="bg-gradient-to-r from-yellow-500/90 to-amber-500/90 text-black border border-yellow-400/60 hover:from-yellow-500 hover:to-amber-500 transition-all duration-200 shadow-lg flex-shrink-0 text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1">
                      <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                      ESCROW
                    </Badge>
                  )}
                </div>

                {/* Account info - Responsive layout */}
                <div className="text-xs sm:text-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0 mb-1 sm:mb-1">
                    <span className="text-gray-400">Account Balance:</span>
                    <span className="text-gray-400 sm:text-center sm:flex-1">Delivery Time:</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0">
                    <div className="flex items-center">
                      {product.account_balance ? (
                        <div className="flex-shrink-0 flex items-center justify-center min-w-[40px] px-3 h-8 rounded-full border border-theme-cyan shadow-[0_0_15px_rgba(34,211,238,0.3)] bg-theme-cyan/10 text-theme-cyan text-sm font-bold">
                          BALANCE: ${product.account_balance}
                        </div>
                      ) : (
                        <span className="text-white font-medium">N/A</span>
                      )}
                    </div>
                    <div className="sm:flex-1 flex sm:justify-center">
                      <Badge className={`${getDeliveryTimeColor(product.delivery_time)} text-[10px] sm:text-xs`}>
                        {getDeliveryTimeDisplay(product.delivery_time)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price Section - Responsive */}
              <div className="bg-gradient-to-br from-[#1c2e3f] to-[#0E1A26] rounded-lg sm:rounded-xl p-4 sm:p-6 border-2 border-theme-cyan/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-theme-cyan/5 blur-3xl rounded-full -mr-12 sm:-mr-16 -mt-12 sm:-mt-16 group-hover:bg-theme-cyan/10 transition-colors"></div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                  <div className="w-full sm:w-auto">
                    <p className="text-gray-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-1">Asset Price</p>
                    <p className="text-2xl sm:text-3xl font-black text-theme-cyan font-mono">
                      ${formatUSD(product.price)}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-400 font-mono flex flex-wrap gap-1.5 sm:gap-2 mt-1">
                      {(!product.accepted_crypto || product.accepted_crypto.includes('BTC')) && (
                        <span className="text-[10px] sm:text-xs">≈ {getCryptoEstimate(product.price, 'BTC')} BTC</span>
                      )}
                      {product.accepted_crypto?.includes('XMR') && (
                        <span className="text-[10px] sm:text-xs">≈ {getCryptoEstimate(product.price, 'XMR')} XMR</span>
                      )}
                    </p>
                  </div>
                  <div className="text-left sm:text-right w-full sm:w-auto">
                    <p className="text-gray-400 text-xs sm:text-sm">Available</p>
                    <p className="text-lg sm:text-xl font-semibold text-white">
                      {product.quantity_available || 0} <span className="text-sm sm:text-base">accounts</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Responsive */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  onClick={handleBuyNow}
                  className="flex-1 bg-theme-red hover:bg-theme-red-dark text-white font-semibold py-2.5 sm:py-3 text-sm sm:text-base shadow-lg"
                >
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
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
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white font-bold uppercase tracking-wider sm:tracking-widest text-[10px] sm:text-xs border-none shadow-lg shadow-cyan-500/20 px-3 sm:px-6 py-2.5 sm:py-3"
                >
                  <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Chat with Vendor</span>
                  <span className="xs:hidden">Chat</span>
                </Button>
                <Button
                  onClick={handleWishlistToggle}
                  variant="outline"
                  className="border-white/10 text-gray-300 hover:bg-white/5 py-2.5 sm:py-3 transition-colors px-3 sm:px-4"
                  disabled={wishlistLoading}
                >
                  {wishlistLoading ? (
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  ) : (
                    <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                  )}
                </Button>
              </div>

              {/* Product Details */}
              <div className="space-y-6">
                {/* Description */}
                <div className="bg-[#111C20] rounded-xl p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest" style={{ fontFamily: "'Orbitron', sans-serif" }}>Description</h3>
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
                <div className="bg-[#111C20] rounded-xl p-4 border border-white/5">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center uppercase tracking-widest" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                    <Users className="w-4 h-4 mr-2 text-theme-cyan" />
                    Vendor Profile
                    {loadingVendorStats && <Loader2 className="w-4 h-4 ml-2 animate-spin text-theme-cyan" />}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Username:</span>
                        <span className="text-white font-medium">{product.vendor_username || product.vendor?.username || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Member Since:</span>
                        <span className="text-white">
                          {loadingVendorStats ? (
                            <DotLoader size="sm" color="text-gray-400" />
                          ) : vendorStats?.member_since ? (
                            vendorStats.member_since
                          ) : (product.vendor as any)?.date_joined ? (
                            (() => {
                              const dateJoined = new Date((product.vendor as any).date_joined);
                              const now = new Date();
                              const yearsSince = (now.getTime() - dateJoined.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
                              if (yearsSince >= 1) {
                                return `${yearsSince.toFixed(1)} years ago`;
                              } else {
                                const monthsSince = yearsSince * 12;
                                return `${Math.round(monthsSince)} months ago`;
                              }
                            })()
                          ) : (
                            'N/A'
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Total Sales:</span>
                        <span className="text-green-400 font-medium">
                          {loadingVendorStats ? (
                            <DotLoader size="sm" color="text-green-400" />
                          ) : vendorStats?.total_sales ? (
                            vendorStats.total_sales
                          ) : (
                            '0 products'
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Vendor Rating:</span>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-white">
                            {loadingVendorStats ? (
                              <DotLoader size="sm" color="text-yellow-400" />
                            ) : vendorStats?.vendor_rating ? (
                              vendorStats.vendor_rating
                            ) : (
                              'No rating'
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Completion Rate:</span>
                        <span className="text-green-400 font-medium">
                          {loadingVendorStats ? (
                            <DotLoader size="sm" color="text-green-400" />
                          ) : vendorStats?.completion_rate ? (
                            vendorStats.completion_rate
                          ) : (
                            '100%'
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product Statistics */}
                <div className="bg-[#111C20] rounded-xl p-4 border border-white/5">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center uppercase tracking-widest" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                    <TrendingUp className="w-4 h-4 mr-2 text-theme-cyan" />
                    Analytics
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

                {/* Account Details */}
                {(product.access_method || product.account_age || product.delivery_method) && (
                  <div className="bg-surface-2/50 rounded-xl p-4 border border-gray-600/20">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                      <Key className="w-5 h-5 mr-2 text-blue-400" />
                      Account Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {product.access_method && (
                        <div>
                          <span className="text-gray-400 text-sm">Access Method:</span>
                          <p className="text-white">{product.access_method}</p>
                        </div>
                      )}
                      {product.account_age && (
                        <div>
                          <span className="text-gray-400 text-sm">Account Age:</span>
                          <p className="text-white">{product.account_age}</p>
                        </div>
                      )}
                      {product.delivery_method && (
                        <div>
                          <span className="text-gray-400 text-sm">Delivery Method:</span>
                          <p className="text-white">{product.delivery_method}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tags & Special Features */}
                {(product.tags && product.tags.length > 0) || (product.special_features && product.special_features.length > 0) ? (
                  <div className="bg-surface-2/50 rounded-xl p-4 border border-gray-600/20">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                      <Tag className="w-5 h-5 mr-2 text-purple-400" />
                      Tags & Features
                    </h3>
                    <div className="space-y-3">
                      {product.tags && product.tags.length > 0 && (
                        <div>
                          <span className="text-gray-400 text-sm mb-2 block">Tags:</span>
                          <div className="flex flex-wrap gap-2">
                            {product.tags.map((tag: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-purple-400 border-purple-400">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {product.special_features && product.special_features.length > 0 && (
                        <div>
                          <span className="text-gray-400 text-sm mb-2 block">Special Features:</span>
                          <div className="flex flex-wrap gap-2">
                            {product.special_features.map((feature: string, index: number) => (
                              <Badge key={index} variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Region Restrictions */}
                {product.region_restrictions && (
                  <div className="bg-surface-2/50 rounded-xl p-4 border border-gray-600/20">
                    <h3 className="text-lg font-semibold text-white mb-3">Region Restrictions</h3>
                    <p className="text-gray-300">{product.region_restrictions}</p>
                  </div>
                )}

                {/* Notes for Buyer */}
                {product.notes_for_buyer && (
                  <div className="bg-surface-2/50 rounded-xl p-4 border border-gray-600/20">
                    <h3 className="text-lg font-semibold text-white mb-3">Notes for Buyer</h3>
                    <p className="text-gray-300 leading-relaxed">{product.notes_for_buyer}</p>
                  </div>
                )}

                {/* Credentials Display */}
                {product.credentials_display && (
                  <div className="bg-surface-2/50 rounded-xl p-4 border border-gray-600/20">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                      <Truck className="w-5 h-5 mr-2 text-orange-400" />
                      Delivery Information
                    </h3>
                    <p className="text-gray-300">{product.credentials_display}</p>
                  </div>
                )}

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
                      <DotLoader size="lg" color="text-yellow-400" />
                      <p className="text-gray-400 mt-3">Loading reviews...</p>
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
                                        className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-400'
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
