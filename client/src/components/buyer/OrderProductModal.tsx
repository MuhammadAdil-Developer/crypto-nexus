import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Star, Eye, EyeOff, Clock, Shield, CheckCircle, X, ArrowLeft, Copy, ChevronUp, ChevronDown, HelpCircle, MapPin, DollarSign, Users, TrendingUp, Calendar, Key, Lock, Download, Info, FileText, Tag, MessageSquare, AlertTriangle } from 'lucide-react';
import { DotLoader } from '@/components/ui/dot-loader';
import vendorService from '@/services/vendorService';
import { productService } from '@/services/productService';
import { useToast } from '@/hooks/use-toast';
import { getImageUrl } from '@/config/api';
import placeholderImage from "@/assets/placeholder.png";
import { useCryptoPrices } from '@/contexts/PriceContext';

interface Order {
  order_id: string;
  order_status: string;
  payment_status: string;
  total_amount: string;
  crypto_currency: string;
  created_at: string;
  updated_at?: string;
  delivered_at?: string | null;
  use_escrow?: boolean;
  buyer?: {
    id: string;
    username: string;
    email: string;
  };
  product: {
    id: number;
    headline: string;
    website?: string;
    account_type: string;
    access_type: string;
    account_balance?: string;
    description: string;
    price: string;
    additional_info?: string;
    delivery_time: string;
    credentials_display?: string;
    main_image?: string;
    gallery_images: string[];
    main_images: string[];
    documents?: string[];
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
    access_method?: string;
    account_age?: string;
    delivery_method?: string;
    region_restrictions?: string;
    auto_delivery_script?: string;
    notes_for_buyer?: string;
    discount_percentage?: string;
  };
  product_credentials?: {
    credentials?: string;
    username?: string;
    password?: string;
    email?: string;
    [key: string]: any;
  };
}

// Human readable date formatter (No slashes as requested)
const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    return `${day} ${month} ${year} ${displayHours}:${minutes} ${ampm}`;
  } catch {
    return dateStr;
  }
};

interface OrderProductModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  scrollToCredentials?: boolean;
}

export const OrderProductModal: React.FC<OrderProductModalProps> = ({ order, isOpen, onClose, scrollToCredentials = false }) => {
  const { btc: btcPrice, xmr: xmrPrice } = useCryptoPrices();
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showFullAdditionalInfo, setShowFullAdditionalInfo] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [showCredentialsText, setShowCredentialsText] = useState(false);
  const [vendorStats, setVendorStats] = useState<any>(null);
  const [loadingVendorStats, setLoadingVendorStats] = useState(false);
  const [productReviews, setProductReviews] = useState<any>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const { toast } = useToast();
  const credentialsSectionRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen && order?.product?.id) {
      fetchVendorStats();
      fetchProductReviews();
    }
  }, [isOpen, order?.product?.id]);

  // Auto-scroll to credentials section when modal opens with scrollToCredentials=true
  React.useEffect(() => {
    if (isOpen && scrollToCredentials && credentialsSectionRef.current) {
      // Ensure credentials section is visible/expanded
      setShowCredentials(true);

      // Delay to wait for modal transition and state update to finish
      const timer = setTimeout(() => {
        if (credentialsSectionRef.current) {
          credentialsSectionRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });

          // Fallback check: if it didn't scroll enough, try again after another short delay
          // (Sometimes animations interfere with the first attempt)
          setTimeout(() => {
            credentialsSectionRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }, 300);
        }
      }, 400); // 400ms is usually enough for most modal entry animations

      return () => clearTimeout(timer);
    }
  }, [isOpen, scrollToCredentials]);

  const fetchVendorStats = async () => {
    const vendorUsername = order.product.vendor_username || order.product.vendor?.username;
    if (!vendorUsername) return;

    setLoadingVendorStats(true);
    try {
      const response = await vendorService.getVendorStatistics(vendorUsername);
      console.log('Vendor stats response:', response);
      // Response structure: { success: true, data: { member_since, total_sales, ... } }
      if (response && response.success === true && response.data) {
        console.log('Setting vendor stats:', response.data);
        setVendorStats(response.data);
      } else if (response && response.data) {
        // Handle case where response.data is already the data object
        console.log('Setting vendor stats:', response.data);
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
    if (!order?.product?.id) return;

    setLoadingReviews(true);
    try {
      const response = await productService.getProductReviewsModal(order.product.id, { page_size: 10 });
      if (response.success) {
        setProductReviews(response.data);
      }
    } catch (error) {
      console.error('Error fetching product reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };



  const getFullUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    return getImageUrl(url);
  };

  const formatPrice = (price: string) => {
    return parseFloat(price).toFixed(8);
  };

  const truncateText = (text: string | undefined | null, maxLength: number) => {
    if (!text) return 'No description available';
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

  const getOrderStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-500/20 text-gray-400 border-gray-500/30';

    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
      case 'confirmed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'processing':
      case 'paid':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPaymentStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-500/20 text-gray-400 border-gray-500/30';

    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const copyToClipboard = (text: string) => {
    if (!navigator.clipboard && document.execCommand) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          toast({
            title: "Copied!",
            description: "Credentials copied!"
          });
        }
      } catch (err) {
        // fail silently
      }
      document.body.removeChild(textArea);
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: "Credentials copied to clipboard"
      });
    }, () => {
      toast({
        title: "Error",
        description: "Failed to copy credentials",
        variant: "destructive"
      });
    });
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div className="bg-card border border-gray-600/30 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-[95vw] sm:max-w-2xl lg:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
              <h2 className="text-sm sm:text-lg md:text-xl font-bold text-white truncate">
                {order.product?.headline || order.product?.listing_title || 'Order Details'}
              </h2>
              <p className="text-gray-400 text-[10px] sm:text-sm font-mono truncate">
                Order ID: {order.order_id}
              </p>
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div ref={scrollContainerRef} className="overflow-y-auto max-h-[calc(95vh-100px)] sm:max-h-[calc(90vh-120px)]">
          <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
            {/* Product Images - Responsive height */}
            <div className="space-y-3 sm:space-y-4">
              <div className="h-40 sm:h-48 md:h-56 bg-white/5 rounded-lg sm:rounded-xl overflow-hidden border border-white/10">
                {order.product.main_image || (order.product.main_images && order.product.main_images.length > 0) ? (
                  <img
                    src={
                      getImageUrl(order.product.main_image) ||
                      (order.product.main_images && order.product.main_images.length > 0
                        ? getImageUrl(order.product.main_images[0])
                        : placeholderImage)
                    }
                    alt={order.product?.headline || order.product?.listing_title || 'Product'}
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

              {/* Gallery Images & Documents - Responsive Grid */}
              {(order.product.gallery_images && order.product.gallery_images.length > 0) || ((order.product as any).documents && (order.product as any).documents.length > 0) ? (
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-gray-400 mb-2 sm:mb-3">Gallery Images & Documents</h4>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {order.product.gallery_images && order.product.gallery_images.map((image, index) => {
                      const imageUrl = getImageUrl(image);
                      return (
                        <div key={`img-${index}`} className="aspect-square w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 bg-white/5 rounded-lg overflow-hidden border border-gray-600/20 hover:border-gray-500/40 transition-colors">
                          <img
                            src={imageUrl}
                            alt={`${order.product?.headline || order.product?.listing_title || 'Product'} ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400";
                            }}
                          />
                        </div>
                      );
                    })}
                    {(order.product as any).documents && (order.product as any).documents.map((doc: string, index: number) => {
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

            {/* Price section moved here - immediately after images */}
            <div className="bg-white/5 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-white/10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                <div>
                  <p className="text-gray-400 text-xs sm:text-sm mb-1 uppercase tracking-widest font-bold">Amount Paid</p>
                  <div>
                    {(() => {
                      let btcAmt = parseFloat(order.total_amount);
                      const btcRate = btcPrice || 100000;
                      const xmrRate = xmrPrice || 170;
                      const currentRate = order.crypto_currency === 'XMR' ? xmrRate : btcRate;

                      let usdAmt = btcAmt * currentRate;
                      // Heuristic to check if amount is USD instead of Crypto
                      if ((!order.crypto_currency || order.crypto_currency === 'BTC') && btcAmt > 50) {
                        usdAmt = btcAmt;
                        btcAmt = usdAmt / btcRate;
                      } else if (order.crypto_currency === 'XMR' && btcAmt > 200) {
                        // Likely USD stored in amount field
                        usdAmt = btcAmt;
                        btcAmt = usdAmt / xmrRate;
                      }

                      return (
                        <>
                          <p className="text-2xl sm:text-3xl font-bold text-white font-mono">
                            {parseFloat(btcAmt.toFixed(8))} <span className="text-sm sm:text-lg">{order.crypto_currency || 'BTC'}</span>
                          </p>
                          <p className="text-xs sm:text-sm text-gray-400 mt-0.5 sm:mt-1 font-mono">
                            ≈ ${usdAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-gray-400 text-xs sm:text-sm mb-0.5 uppercase tracking-widest font-bold">Order Date</p>
                  <p className="text-base sm:text-lg font-semibold text-white">
                    {formatDate(order.created_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Status & Payment Status - Responsive grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-surface-2/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-600/20">
                <h3 className="text-[10px] sm:text-sm text-gray-400 mb-1.5 sm:mb-2 uppercase tracking-widest font-bold">Order Status</h3>
                <Badge className={`${getOrderStatusColor(order.order_status)} text-[10px] sm:text-xs px-2 py-0.5 sm:px-3 sm:py-1`}>
                  {(() => {
                    const s = order.order_status?.toLowerCase();
                    if (s === 'completed' || s === 'delivered' || s === 'confirmed') return 'Completed';
                    if (s === 'paid') return 'Paid';
                    return order.order_status ? order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1).replace('_', ' ') : 'Unknown';
                  })()}
                </Badge>
              </div>
              <div className="bg-surface-2/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-600/20">
                <h3 className="text-[10px] sm:text-sm text-gray-400 mb-1.5 sm:mb-2 uppercase tracking-widest font-bold">Payment Status</h3>
                <Badge className={`${getPaymentStatusColor(order.payment_status) as any} text-[10px] sm:text-xs px-2 py-0.5 sm:px-3 sm:py-1`}>
                  {order.payment_status ? order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1) : 'Unknown'}
                </Badge>
              </div>
            </div>

            {/* Escrow Information - Responsive */}
            {order.use_escrow && (
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-green-500/30">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                      <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                      <h3 className="text-sm sm:text-lg font-semibold text-green-300">Escrow Protected</h3>
                      <button
                        className="text-green-400 hover:text-green-300 transition-colors"
                        title="Payment held until order approval"
                      >
                        <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                    <p className="text-gray-300 text-[11px] sm:text-sm leading-relaxed">
                      Payment is held securely until you confirm satisfactory receipt.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Buyer Information - Responsive grid */}
            {order.buyer && (
              <div className="bg-surface-2/50 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-gray-600/20">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-400" />
                  Buyer Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs sm:text-sm">Username:</span>
                      <span className="text-white text-xs sm:text-sm font-medium">{order.buyer.username || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs sm:text-sm">Order ID:</span>
                      <span className="text-white font-mono text-[10px] sm:text-sm">{order.order_id}</span>
                    </div>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs sm:text-sm">Purchase Date:</span>
                      <span className="text-white text-xs sm:text-sm">{formatDate(order.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs sm:text-sm">Status:</span>
                      <Badge className={getOrderStatusColor(order.order_status)}>{order.order_status}</Badge>
                    </div>
                    {order.order_status === 'delivered' && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs sm:text-sm">Delivered At:</span>
                        <span className="text-white text-xs sm:text-sm">{formatDate(order.delivered_at || order.created_at)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Product Info - Badges & Stats */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar">
                {order.product.account_type && (
                  <Badge className={`${getAccountTypeColor(order.product.account_type)} flex-shrink-0 text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1`}>
                    {order.product.account_type.replace('_', ' ').toUpperCase()}
                  </Badge>
                )}
                {order.product.access_type && (
                  <Badge className={`${getAccessTypeColor(order.product.access_type)} flex-shrink-0 text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1`}>
                    {order.product.access_type.replace('_', ' ').toUpperCase()}
                  </Badge>
                )}
                {order.product.is_featured && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 flex-shrink-0 text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1">
                    FEATURED
                  </Badge>
                )}
              </div>

              <div className="bg-surface-2/30 rounded-lg p-3 sm:p-4 border border-gray-600/10">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-400 text-[10px] sm:text-xs uppercase tracking-wider block mb-1">Balance</span>
                    <span className="text-white text-sm sm:text-base font-semibold">{order.product.account_balance || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] sm:text-xs uppercase tracking-wider block mb-1">Delivery</span>
                    <Badge className={`${getDeliveryTimeColor(order.product.delivery_time)} text-[10px] sm:text-xs`}>
                      {getDeliveryTimeDisplay(order.product.delivery_time)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>


            {/* Credentials Section - For paid, confirmed, and delivered orders */}
            {(order.payment_status === 'paid' || order.order_status === 'paid' || order.order_status === 'confirmed' || order.order_status === 'delivered') && order.product_credentials && Object.keys(order.product_credentials).filter(k => order.product_credentials[k]).length > 0 && (
              <div ref={credentialsSectionRef} className="bg-green-900/10 border border-green-500/20 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-lg shadow-green-900/5">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-sm sm:text-lg font-semibold text-white flex items-center">
                    <Key className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-400" />
                    Credentials
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        // Download credentials as text file
                        const getAllValues = (data: any): string[] => {
                          if (!data) return [];
                          if (typeof data === 'string') {
                            const trimmed = data.trim();
                            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                              try {
                                return getAllValues(JSON.parse(trimmed));
                              } catch {
                                return [trimmed];
                              }
                            }
                            return [trimmed];
                          }
                          if (Array.isArray(data)) {
                            return data.flatMap(getAllValues);
                          }
                          if (typeof data === 'object') {
                            return Object.entries(data).map(([key, val]) => `${key}: ${typeof val === 'object' ? JSON.stringify(val) : val}`);
                          }
                          return [String(data)];
                        };

                        const values = getAllValues(order.product_credentials);
                        const uniqueValues = Array.from(new Set(values.filter(v => v && v.toString().trim() !== '')));
                        const content = `Order ID: ${order.order_id}\nProduct: ${order.product.headline}\nDate: ${new Date().toLocaleString()}\n\n--- CREDENTIALS ---\n\n${uniqueValues.join('\n')}`;

                        const blob = new Blob([content], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `credentials_${order.order_id}.txt`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);

                        toast({
                          title: "Downloaded!",
                          description: "Credentials saved to file"
                        });
                      }}
                      variant="outline"
                      size="sm"
                      className="h-7 sm:h-9 text-[10px] sm:text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                    >
                      <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      onClick={() => setShowCredentials(!showCredentials)}
                      variant="outline"
                      size="sm"
                      className="h-7 sm:h-9 text-[10px] sm:text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
                    >
                      {showCredentials ? <EyeOff className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> : <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />}
                      {showCredentials ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                </div>

                {showCredentials && (
                  <div className="space-y-2 sm:space-y-3">
                    {(() => {

                      // Recursive value extractor to handle nested JSON
                      const getAllValues = (data: any): string[] => {
                        if (!data) return [];
                        if (typeof data === 'string') {
                          const trimmed = data.trim();
                          // Handle cases like "Field: Value" or "Field: {JSON}"
                          if (trimmed.includes(':') && (trimmed.includes('{') || trimmed.includes('['))) {
                            const possibleJson = trimmed.substring(trimmed.indexOf(':') + 1).trim();
                            if (possibleJson.startsWith('{') || possibleJson.startsWith('[')) {
                              try {
                                return getAllValues(JSON.parse(possibleJson));
                              } catch { /* continue to generic check */ }
                            }
                          }

                          if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                            try {
                              const parsed = JSON.parse(trimmed);
                              return getAllValues(parsed);
                            } catch {
                              return [trimmed];
                            }
                          }

                          // Check if it's an ISO date string
                          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed)) {
                            return [formatDate(trimmed)];
                          }

                          return [trimmed];
                        }
                        if (Array.isArray(data)) {
                          return data.flatMap(getAllValues);
                        }
                        if (typeof data === 'object') {
                          return Object.values(data).flatMap(getAllValues);
                        }
                        return [String(data)];
                      };

                      const values = getAllValues(order.product_credentials);

                      // Filter out empty or redundant values
                      const uniqueValues = Array.from(new Set(values.filter(v => v && v.toString().trim() !== '')));

                      return uniqueValues.map((val, idx) => (
                        <div key={idx} className="bg-gray-800/40 rounded-lg p-3 sm:p-4 border border-white/5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-xs sm:text-sm font-mono break-all leading-tight">
                                {showCredentialsText ? val : '••••••••••••••••'}
                              </p>
                            </div>
                            <Button
                              onClick={() => copyToClipboard(val)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-green-400 hover:bg-green-500/10 flex-shrink-0"
                            >
                              <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </Button>
                          </div>
                        </div>
                      ));
                    })()}
                    <Button
                      onClick={() => setShowCredentialsText(!showCredentialsText)}
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-green-400 hover:bg-green-500/10"
                    >
                      {showCredentialsText ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                      {showCredentialsText ? 'Hide Values' : 'Reveal Values'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Product Details Section */}
            <div className="space-y-4 sm:space-y-6">
              {/* Description - Responsive scaling */}
              <div className="bg-surface-2/40 rounded-lg sm:rounded-xl p-4 border border-gray-600/20">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm sm:text-lg font-semibold text-white">Description</h3>
                  <button
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="text-theme-cyan hover:text-cyan-400 text-[10px] sm:text-sm font-medium transition-colors"
                  >
                    {showFullDescription ? 'Show Less' : 'Show Full'}
                  </button>
                </div>
                <div className="text-gray-300 text-[11px] sm:text-sm leading-relaxed whitespace-pre-line">
                  {showFullDescription ? order.product.description : truncateText(order.product.description, 150)}
                </div>
              </div>

              {/* Additional Information - Only if exists and has content */}
              {order.product.additional_info && order.product.additional_info.trim() && (
                <div className="bg-surface-2/40 rounded-lg sm:rounded-xl p-4 border border-gray-600/20">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm sm:text-lg font-semibold text-white">Additional Info</h3>
                    <button
                      onClick={() => setShowFullAdditionalInfo(!showFullAdditionalInfo)}
                      className="text-theme-cyan hover:text-cyan-400 text-[10px] sm:text-sm font-medium transition-colors"
                    >
                      {showFullAdditionalInfo ? 'Show Less' : 'Show Full'}
                    </button>
                  </div>
                  <div className="text-gray-300 text-[11px] sm:text-sm leading-relaxed whitespace-pre-line">
                    {showFullAdditionalInfo ? order.product.additional_info : truncateText(order.product.additional_info, 150)}
                  </div>
                </div>
              )}

              {/* Notes for Buyer - Only if exists and has content */}
              {order.product.notes_for_buyer && order.product.notes_for_buyer.trim() && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg sm:rounded-xl p-4">
                  <h3 className="text-xs sm:text-sm font-bold text-amber-400 uppercase tracking-widest mb-2 flex items-center">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                    Instructions for Buyer
                  </h3>
                  <p className="text-gray-300 text-[11px] sm:text-sm leading-relaxed italic">
                    "{order.product.notes_for_buyer}"
                  </p>
                </div>
              )}
            </div>

            {/* Vendor Details - Responsive grid */}
            <div className="bg-surface-2/40 rounded-lg sm:rounded-xl p-4 sm:p-5 border border-gray-600/20">
              <h3 className="text-sm sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-400" />
                Vendor Information
                {loadingVendorStats && <DotLoader size="sm" color="text-blue-400" className="ml-2" />}
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:gap-6">
                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <span className="text-gray-400 text-[10px] sm:text-xs uppercase tracking-wider block mb-0.5">Username</span>
                    <span className="text-white text-xs sm:text-base font-medium truncate block">{order.product.vendor?.username || order.product.vendor_username || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] sm:text-xs uppercase tracking-wider block mb-0.5">Rating</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 fill-current" />
                      <span className="text-white text-xs sm:text-base">
                        {loadingVendorStats ? (
                          <DotLoader size="sm" color="text-yellow-400" />
                        ) : vendorStats?.vendor_rating || (order.product.vendor as any)?.rating || order.product.rating || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <span className="text-gray-400 text-[10px] sm:text-xs uppercase tracking-wider block mb-0.5">Total Sales</span>
                    <span className="text-green-400 text-xs sm:text-base font-medium font-mono">
                      {loadingVendorStats ? (
                        <DotLoader size="sm" color="text-green-400" />
                      ) : vendorStats?.total_sales || (order.product.vendor as any)?.total_sales || '0'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] sm:text-xs uppercase tracking-wider block mb-0.5">Completion</span>
                    <span className="text-blue-400 text-xs sm:text-base font-medium font-mono">
                      {loadingVendorStats ? (
                        <DotLoader size="sm" color="text-blue-400" />
                      ) : vendorStats?.completion_rate || (order.product.vendor as any)?.completion_rate || '100%'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Product Details - Responsive Grid */}
            {(order.product.access_method || order.product.account_age || order.product.delivery_method) && (
              <div className="bg-surface-2/40 rounded-lg sm:rounded-xl p-4 sm:p-5 border border-gray-600/20">
                <h3 className="text-sm sm:text-lg font-semibold text-white mb-3 flex items-center">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-cyan-400" />
                  Additional Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {order.product.access_method && (
                    <div className="bg-white/5 p-2 rounded-lg">
                      <span className="text-gray-400 text-[10px] sm:text-xs uppercase block mb-0.5 tracking-wider">Access Method</span>
                      <p className="text-white text-xs sm:text-sm">{order.product.access_method}</p>
                    </div>
                  )}
                  {order.product.account_age && (
                    <div className="bg-white/5 p-2 rounded-lg">
                      <span className="text-gray-400 text-[10px] sm:text-xs uppercase block mb-0.5 tracking-wider">Account Age</span>
                      <p className="text-white text-xs sm:text-sm">{order.product.account_age}</p>
                    </div>
                  )}
                  {order.product.delivery_method && (
                    <div className="bg-white/5 p-2 rounded-lg">
                      <span className="text-gray-400 text-[10px] sm:text-xs uppercase block mb-0.5 tracking-wider">Delivery Method</span>
                      <p className="text-white text-xs sm:text-sm">{order.product.delivery_method}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tags & Features - Optimized Space */}
            {(order.product.tags && order.product.tags.length > 0) || (order.product.special_features && order.product.special_features.length > 0) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {order.product.tags && order.product.tags.length > 0 && (
                  <div className="bg-surface-2/40 rounded-xl p-4 border border-gray-600/10">
                    <h3 className="text-xs sm:text-sm font-semibold text-white mb-2 uppercase tracking-widest flex items-center">
                      <Tag className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {order.product.tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500/30 text-purple-300 bg-purple-500/5">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {order.product.special_features && order.product.special_features.length > 0 && (
                  <div className="bg-surface-2/40 rounded-xl p-4 border border-gray-600/10">
                    <h3 className="text-xs sm:text-sm font-semibold text-white mb-2 uppercase tracking-widest flex items-center">
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                      Features
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {order.product.special_features.map((feature: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Reviews Section - Responsive Scrolling */}
            <div className="bg-surface-2/40 rounded-lg sm:rounded-xl p-4 border border-gray-600/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm sm:text-lg font-semibold text-white flex items-center">
                  <Star className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-yellow-500" />
                  Reviews & Ratings
                  {loadingReviews && <DotLoader size="sm" color="text-yellow-400" className="ml-2" />}
                </h3>
                {productReviews && productReviews.reviews && productReviews.reviews.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReviews(!showReviews)}
                    className="h-8 text-[10px] sm:text-xs border-gray-700 text-gray-400 bg-gray-800/40 hover:bg-gray-700/60"
                  >
                    {showReviews ? 'Hide' : `See ${productReviews.reviews.length}`}
                  </Button>
                )}
              </div>

              {loadingReviews ? (
                <div className="text-center py-6 sm:py-8">
                  <DotLoader size="md" color="text-yellow-400" />
                  <p className="text-gray-500 text-xs sm:text-sm mt-3">Loading feedback...</p>
                </div>
              ) : productReviews && productReviews.reviews && productReviews.reviews.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 sm:gap-4 p-3 bg-white/5 rounded-lg">
                    <div className="flex flex-col items-center border-r border-white/10 pr-4 sm:pr-6">
                      <span className="text-2xl sm:text-3xl font-bold text-white">
                        {productReviews.product_stats?.average_rating?.toFixed(1) || order.product.rating || '0.0'}
                      </span>
                      <div className="flex gap-0.5 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${i < Math.floor(productReviews.product_stats?.average_rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} />
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-gray-400 mb-1">
                        Based on <span className="text-white font-medium">{productReviews.product_stats?.total_reviews || 0}</span> reviews
                      </p>
                      <div className="flex items-center gap-2 text-[10px] sm:text-xs">
                        <Eye className="w-3 h-3 text-gray-500" />
                        <span className="text-gray-500">{order.product.views_count || 0} views</span>
                      </div>
                    </div>
                  </div>

                  {showReviews && (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1 thin-scrollbar">
                      {productReviews.reviews.map((review: any) => (
                        <div key={review.id} className="p-3 bg-gray-800/40 rounded-lg border border-white/5">
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-white truncate max-w-[100px]">{review.buyer_username || 'Anonymous'}</span>
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`w-2.5 h-2.5 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} />
                                  ))}
                                </div>
                              </div>
                              <p className="text-gray-400 text-[10px] sm:text-xs">
                                {review.created_at ? new Date(review.created_at).toLocaleDateString() : 'Date N/A'}
                              </p>
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-gray-300 text-[11px] sm:text-sm leading-relaxed">{review.comment}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Star className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-500 text-xs sm:text-sm">No reviews yet for this product</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderProductModal;
