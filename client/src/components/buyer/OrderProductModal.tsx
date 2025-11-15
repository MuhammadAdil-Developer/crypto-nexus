import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Star, Eye, EyeOff, Clock, Shield, CheckCircle, X, ArrowLeft, Copy, ChevronUp, ChevronDown, HelpCircle, MapPin, DollarSign, Users, TrendingUp, Calendar, Key, Lock, Download, Info, FileText, Tag, MessageSquare } from 'lucide-react';
import { DotLoader } from '@/components/ui/dot-loader';
import vendorService from '@/services/vendorService';
import { productService } from '@/services/productService';
import { useToast } from '@/hooks/use-toast';

interface Order {
  order_id: string;
  order_status: string;
  payment_status: string;
  total_amount: string;
  crypto_currency: string;
  created_at: string;
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

interface OrderProductModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderProductModal: React.FC<OrderProductModalProps> = ({ order, isOpen, onClose }) => {
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

  React.useEffect(() => {
    if (isOpen && order?.product?.id) {
      fetchVendorStats();
      fetchProductReviews();
    }
  }, [isOpen, order?.product?.id]);

  const fetchVendorStats = async () => {
    const vendorUsername = order.product.vendor_username || order.product.vendor?.username;
    if (!vendorUsername) return;
    
    setLoadingVendorStats(true);
    try {
      const response = await vendorService.getVendorStatistics(vendorUsername);
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
    return `http://localhost:8000${url}`;
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
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'processing':
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
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Credentials copied to clipboard"
    });
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-gray-600/30 rounded-2xl shadow-2xl w-full max-w-[95vw] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-hidden">
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
              <h2 className="text-xl font-bold text-white">{order.product.headline || 'Order Details'}</h2>
              <p className="text-gray-400 text-sm">Order ID: {order.order_id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-6">
            {/* Product Images - Moved to top */}
            <div className="space-y-4">
              <div className="h-48 bg-gray-800/30 rounded-xl overflow-hidden border border-gray-600/20">
                {order.product.main_image || (order.product.main_images && order.product.main_images.length > 0) ? (
                  <img
                    src={
                      order.product.main_image
                        ? (order.product.main_image.startsWith('http') ? order.product.main_image : `http://localhost:8000${order.product.main_image}`)
                        : (order.product.main_images && order.product.main_images.length > 0
                            ? (order.product.main_images[0].startsWith('http') ? order.product.main_images[0] : `http://localhost:8000${order.product.main_images[0]}`)
                            : '')
                    }
                    alt={order.product.headline || 'Product'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-400 text-4xl">📦</span>
                  </div>
                )}
              </div>

              {/* Gallery Images & Documents - Single Line */}
              {(order.product.gallery_images && order.product.gallery_images.length > 0) || ((order.product as any).documents && (order.product as any).documents.length > 0) ? (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Gallery Images & Documents</h4>
                  <div className="flex flex-wrap gap-3">
                    {order.product.gallery_images && order.product.gallery_images.map((image, index) => {
                      const imageUrl = image.startsWith('http') ? image : `http://localhost:8000${image}`;
                      return (
                        <div key={`img-${index}`} className="aspect-square w-28 h-28 bg-gray-800/30 rounded-lg overflow-hidden border border-gray-600/20 hover:border-gray-500/40 transition-colors">
                          <img
                            src={imageUrl}
                        alt={`${order.product.headline || 'Product'} ${index + 1}`}
                        className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400";
                            }}
                      />
                    </div>
                      );
                    })}
                    {(order.product as any).documents && (order.product as any).documents.map((doc: string, index: number) => {
                      const docUrl = doc.startsWith('http') ? doc : `http://localhost:8000${doc}`;
                      const docName = doc.split('/').pop() || `Document ${index + 1}`;
                      return (
                        <div key={`doc-${index}`} className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:bg-gray-800 hover:border-gray-600 transition-colors min-w-[140px]">
                          <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate max-w-[120px]">{docName}</p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 p-1.5 h-auto"
                            onClick={() => window.open(docUrl, '_blank')}
                            title="Download document"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Order Status & Payment Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-surface-2/50 rounded-xl p-4 border border-gray-600/20">
                <h3 className="text-sm text-gray-400 mb-2">Order Status</h3>
                <Badge className={getOrderStatusColor(order.order_status)}>
                  {order.order_status ? order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1) : 'Unknown'}
                </Badge>
              </div>
              <div className="bg-surface-2/50 rounded-xl p-4 border border-gray-600/20">
                <h3 className="text-sm text-gray-400 mb-2">Payment Status</h3>
                <Badge className={getPaymentStatusColor(order.payment_status) as any}>
                  {order.payment_status ? order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1) : 'Unknown'}
                </Badge>
              </div>
            </div>

            {/* Escrow Information */}
            {order.use_escrow && (
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/30">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                      <Lock className="w-4 h-4 text-green-400" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-green-300">Escrow Protection Active</h3>
                      <button 
                        className="text-green-400 hover:text-green-300 transition-colors"
                        title="Payment held until order approval • Automatic refund if order is not approved • Secure transaction with buyer protection"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      This order is protected by escrow. Payment is held securely until you confirm the order is satisfactory.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Buyer Information - Only show if buyer data exists */}
            {order.buyer && (
              <div className="bg-surface-2/50 rounded-xl p-6 border border-gray-600/20">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-blue-400" />
                  Buyer Info
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Username:</span>
                      <span className="text-white font-medium">{order.buyer.username || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">User ID:</span>
                      <span className="text-white font-mono text-sm">{order.buyer.id || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Purchase Date:</span>
                      <span className="text-white">{new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Purchase Time:</span>
                      <span className="text-white">{new Date(order.created_at).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Order ID:</span>
                      <span className="text-white font-mono text-sm">{order.order_id}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}


            {/* Product Info */}
            <div className="space-y-4">
              <div className="flex gap-2 overflow-x-auto">
                {order.product.account_type && (
                  <Badge className={`${getAccountTypeColor(order.product.account_type)} flex-shrink-0`}>
                    {order.product.account_type.replace('_', ' ').toUpperCase()}
                  </Badge>
                )}
                {order.product.access_type && (
                  <Badge className={`${getAccessTypeColor(order.product.access_type)} flex-shrink-0`}>
                    {order.product.access_type.replace('_', ' ').toUpperCase()}
                  </Badge>
                )}
                {order.product.is_featured && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 flex-shrink-0">
                    FEATURED
                  </Badge>
                )}
              </div>

              <div className="text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">Account Balance:</span>
                  <span className="text-gray-400 text-center flex-1">Delivery Time:</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white">{order.product.account_balance || 'N/A'}</span>
                  <div className="flex-1 flex justify-center">
                    <Badge className={getDeliveryTimeColor(order.product.delivery_time)}>
                      {getDeliveryTimeDisplay(order.product.delivery_time)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Section */}
            <div className="bg-gradient-to-r from-accent/10 to-accent-2/10 rounded-xl p-6 border border-accent/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Amount Paid</p>
                  <p className="text-3xl font-bold text-white">
                    {formatPrice(order.total_amount)} {order.crypto_currency}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">Order Date</p>
                  <p className="text-lg font-semibold text-white">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Credentials Section - For paid, confirmed, and delivered orders */}
            {(order.payment_status === 'paid' || order.order_status === 'paid' || order.order_status === 'confirmed' || order.order_status === 'delivered') && order.product_credentials && Object.keys(order.product_credentials).length > 0 && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <Key className="w-5 h-5 mr-2 text-green-400" />
                    Product Credentials
                  </h3>
                  <Button
                    onClick={() => setShowCredentials(!showCredentials)}
                    variant="outline"
                    size="sm"
                    className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                  >
                    {showCredentials ? 'Hide' : 'Show'} Credentials
                  </Button>
                </div>
                
                {showCredentials && (
                  <div className="space-y-4">
                    {Object.entries(order.product_credentials).map(([key, value]) => (
                      <div key={key} className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm text-gray-400 mb-1 capitalize">
                              {key.replace('_', ' ')}:
                            </p>
                            <p className="text-white font-mono break-all">
                              {showCredentialsText ? value : '••••••••••••••••'}
                            </p>
                          </div>
                          <Button
                            onClick={() => copyToClipboard(value)}
                            variant="ghost"
                            size="sm"
                            className="ml-2 text-green-400 hover:bg-green-500/10"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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
                  {showFullDescription ? order.product.description : truncateText(order.product.description, 200)}
                </p>
              </div>

              {/* Additional Information */}
              {order.product.additional_info && (
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
                    {showFullAdditionalInfo ? order.product.additional_info : truncateText(order.product.additional_info, 200)}
                  </p>
                </div>
              )}

              {/* Vendor Details */}
              <div className="bg-surface-2/50 rounded-xl p-4 border border-gray-600/20">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-blue-400" />
                  Vendor Details
                  {loadingVendorStats && <DotLoader size="sm" color="text-blue-400" />}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Username:</span>
                      <span className="text-white font-medium">{order.product.vendor?.username || order.product.vendor_username || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Member Since:</span>
                      <span className="text-white">
                        {loadingVendorStats ? (
                          <DotLoader size="sm" color="text-gray-400" />
                        ) : vendorStats?.member_since ? (
                          vendorStats.member_since
                        ) : (order.product.vendor as any)?.date_joined ? (
                          (() => {
                            const dateJoined = new Date((order.product.vendor as any).date_joined);
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
                        ) : (order.product.vendor as any)?.total_sales ? (
                          `${(order.product.vendor as any).total_sales} products`
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
                          ) : (order.product.vendor as any)?.rating ? (
                            `${(order.product.vendor as any).rating}/5`
                          ) : order.product.rating ? (
                            `${order.product.rating}/5`
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
                        ) : (order.product.vendor as any)?.completion_rate ? (
                          `${(order.product.vendor as any).completion_rate}%`
                        ) : (
                          '100%'
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Product Details */}
              {(order.product.access_method || order.product.account_age || order.product.delivery_method) && (
                <div className="bg-surface-2/50 rounded-xl p-4 border border-gray-600/20">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                    <Key className="w-5 h-5 mr-2 text-blue-400" />
                    Account Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {order.product.access_method && (
                      <div>
                        <span className="text-gray-400 text-sm">Access Method:</span>
                        <p className="text-white">{order.product.access_method}</p>
                      </div>
                    )}
                    {order.product.account_age && (
                      <div>
                        <span className="text-gray-400 text-sm">Account Age:</span>
                        <p className="text-white">{order.product.account_age}</p>
                      </div>
                    )}
                    {order.product.delivery_method && (
                      <div>
                        <span className="text-gray-400 text-sm">Delivery Method:</span>
                        <p className="text-white">{order.product.delivery_method}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tags & Special Features */}
              {(order.product.tags && order.product.tags.length > 0) || (order.product.special_features && order.product.special_features.length > 0) ? (
                <div className="bg-surface-2/50 rounded-xl p-4 border border-gray-600/20">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                    <Tag className="w-5 h-5 mr-2 text-purple-400" />
                    Tags & Features
                  </h3>
                  <div className="space-y-3">
                    {order.product.tags && order.product.tags.length > 0 && (
                      <div>
                        <span className="text-gray-400 text-sm mb-2 block">Tags:</span>
                        <div className="flex flex-wrap gap-2">
                          {order.product.tags.map((tag: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-purple-400 border-purple-400">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {order.product.special_features && order.product.special_features.length > 0 && (
                      <div>
                        <span className="text-gray-400 text-sm mb-2 block">Special Features:</span>
                        <div className="flex flex-wrap gap-2">
                          {order.product.special_features.map((feature: string, index: number) => (
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

              {/* Notes for Buyer */}
              {order.product.notes_for_buyer && (
                <div className="bg-surface-2/50 rounded-xl p-4 border border-gray-600/20">
                  <h3 className="text-lg font-semibold text-white mb-3">Notes for Buyer</h3>
                  <p className="text-gray-300 leading-relaxed">{order.product.notes_for_buyer}</p>
                </div>
              )}

              {/* Reviews Section */}
              <div className="bg-surface-2/50 rounded-xl p-4 border border-gray-600/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                  <Star className="w-5 h-5 mr-2 text-yellow-400" />
                  Reviews & Ratings
                    {loadingReviews && <DotLoader size="sm" color="text-yellow-400" />}
                </h3>
                  {productReviews && productReviews.reviews && productReviews.reviews.length > 0 && (
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
                ) : productReviews && productReviews.reviews && productReviews.reviews.length > 0 ? (
                  <div>
                    {/* Review Stats */}
                    <div className="mb-4 p-3 bg-gray-800/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Star className="w-5 h-5 text-yellow-400 fill-current" />
                          <span className="text-white font-medium">
                            {productReviews.product_stats?.average_rating?.toFixed(1) || order.product.rating || '0.0'}
                          </span>
                          <span className="text-gray-400">
                            ({productReviews.product_stats?.total_reviews || order.product.review_count || 0} reviews)
                          </span>
                        </div>
                        <span className="text-gray-400 text-sm">
                          {productReviews.pagination?.total_count || order.product.review_count || 0} total reviews
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Views:</span>
                        <span className="text-white">{order.product.views_count || 0} views</span>
                      </div>
                    </div>
                    
                    {/* Reviews List */}
                    {showReviews && (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {productReviews.reviews.map((review: any) => (
                          <div key={review.id} className="p-4 bg-gray-800/30 rounded-lg border border-gray-600/20">
                            <div className="flex items-start justify-between mb-3">
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
                                <span className="text-white font-medium">{review.buyer_username || review.user || 'Anonymous'}</span>
                              </div>
                              <span className="text-gray-400 text-sm">{review.time_ago || review.created_at ? new Date(review.created_at).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            {review.comment && (
                              <p className="text-gray-300 text-sm leading-relaxed mb-3">{review.comment}</p>
                            )}
                            {review.message && (
                              <div className="bg-gray-700/30 rounded p-2 mb-2">
                                <div className="flex items-center space-x-2 mb-1">
                                  <MessageSquare className="w-4 h-4 text-blue-400" />
                                  <span className="text-gray-400 text-xs">Review Message:</span>
                                </div>
                                <p className="text-white text-sm">{review.message}</p>
                              </div>
                            )}
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Product Rating:</span>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={`w-4 h-4 ${
                              star <= parseFloat(order.product.rating || '0') ? 
                                'text-yellow-400 fill-current' : 
                                'text-gray-400'
                            }`} 
                          />
                        ))}
                      </div>
                        <span className="text-white">{order.product.rating || '0.0'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Total Reviews:</span>
                    <span className="text-white">{order.product.review_count || '0'} reviews</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Views:</span>
                    <span className="text-white">{order.product.views_count || '0'} views</span>
                  </div>
                    <div className="text-center py-6">
                      <Star className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-400 text-lg">No reviews yet</p>
                      <p className="text-gray-500 text-sm">Be the first to review this product</p>
                  </div>
                </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderProductModal;
