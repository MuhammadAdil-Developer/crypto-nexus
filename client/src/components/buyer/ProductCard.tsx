import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Heart, ShoppingCart, Eye, User, Shield, Clock, Plus, Check, Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ProductDetailModal from './ProductDetailModal';
import PaymentModal from './PaymentModal';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import wishlistService from '@/services/wishlistService';
import placeholderImage from '@/assets/placeholder.png';
import { getImageUrl } from '@/config/api';
import { useCryptoPrices } from '@/contexts/PriceContext';

interface Product {
  id: number;
  listing_title: string;
  description: string;
  account_balance?: string | null;
  vendor: {
    id: number;
    username: string;
    email: string;
  };
  category: {
    id: number;
    name: string;
  };
  sub_category: {
    id: number;
    name: string;

  };
  price: string;
  account_type?: string | null;
  verification_level?: string | null;
  delivery_method?: string | null;
  status: string;
  created_at: string;
  updated_at?: string;
  main_image?: string | null;
  main_images: string[];
  gallery_images: string[];
  tags: string[];
  special_features: string[];
  quantity_available: number;
  rating?: number;
  review_count?: number;
  escrow_enabled?: boolean;
  accepted_crypto?: string[];
  is_giveaway?: boolean;
}

interface ProductCardProps {
  product: Product;
  viewMode?: 'grid' | 'list';
  redirectOnAction?: boolean; // If true, redirects to listings page on button clicks
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, viewMode = 'grid', redirectOnAction = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const { toast } = useToast();
  const { btc: btcPrice, xmr: xmrPrice } = useCryptoPrices();
  const { addToCart, isInCart, removeFromCart } = useCart();

  useEffect(() => {
    checkWishlistStatus();
  }, [product.id]); // Only run when product.id changes

  // Format USD price with 2 decimal places
  const formatUSD = (price: string) => {
    return parseFloat(price).toFixed(2);
  };

  // Format Crypto equivalent
  const formatCryptoPrice = (price: string, currency: 'BTC' | 'XMR') => {
    const usdPrice = parseFloat(price);
    let cryptoAmount = 0;

    if (currency === 'BTC') {
      const rate = btcPrice || 100000;
      cryptoAmount = usdPrice / rate;
      // Remove unnecessary trailing zeros, max 8 decimals
      return parseFloat(cryptoAmount.toFixed(8)).toString();
    } else {
      const rate = xmrPrice || 170;
      cryptoAmount = usdPrice / rate;
      // Remove unnecessary trailing zeros, max 8 decimals - XMR doesn't strictly need 8 but it's fine
      return parseFloat(cryptoAmount.toFixed(8)).toString();
    }
  };

  // Legacy support
  const formatBTCEquivalent = (price: string) => formatCryptoPrice(price, 'BTC');

  // Format Balance Display
  const renderBalance = (balance: string | null | undefined, size: 'sm' | 'md' = 'sm') => {
    if (!balance || balance === 'NaN') return null;

    const numeric = parseFloat(balance);
    const isNumeric = !isNaN(numeric);
    const displayValue = isNumeric ? `$${numeric.toFixed(2)}` : balance;

    // For very long text, truncate in the small badge
    const finalValue = !isNumeric && displayValue.length > 15 ? displayValue.substring(0, 12) + '...' : displayValue;

    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex-shrink-0 flex items-center justify-center px-2 rounded-full border border-theme-cyan shadow-[0_0_10px_rgba(34,211,238,0.2)] bg-theme-cyan/10 text-theme-cyan font-bold tracking-tight cursor-help transition-all hover:bg-theme-cyan/20 ${size === 'sm' ? 'min-w-[32px] h-6 text-[10px]' : 'min-w-[36px] h-7 text-[11px]'
              }`}>
              BAL: {finalValue}
            </div>
          </TooltipTrigger>
          <TooltipContent
            className="bg-black/90 backdrop-blur-md border-theme-cyan/30 p-3 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in duration-200"
            side="top"
          >
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-theme-cyan/70">Verified Credit</p>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">BALANCE: {isNumeric ? `$${numeric.toFixed(2)}` : balance}</h4>
              <p className="text-[10px] text-gray-400">Pre-loaded assets available on this account</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const getProductImage = () => {
    // Priority: main_image > gallery_images[0] > main_images[0] > null
    if (product.main_image) {
      return getImageUrl(product.main_image);
    }
    if (product.gallery_images && product.gallery_images.length > 0) {
      return getImageUrl(product.gallery_images[0]);
    }
    if (product.main_images && product.main_images.length > 0) {
      return getImageUrl(product.main_images[0]);
    }
    return placeholderImage;
  };

  const getAccountTypeColor = (type: string | null | undefined) => {
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

  const getVerificationColor = (level: string | null | undefined) => {
    if (!level) return 'bg-gray-500/20 text-gray-400 border-gray-500/30';

    const colors: { [key: string]: string } = {
      'verified': 'bg-green-500/20 text-green-400 border-green-500/30',
      'premium': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'basic': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'unverified': 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return colors[level] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getDeliveryMethodColor = (method: string | null | undefined) => {
    if (!method) return 'bg-gray-500/20 text-gray-400 border-gray-500/30';

    const colors: { [key: string]: string } = {
      'instant': 'bg-green-500/20 text-green-400 border-green-500/30',
      'manual': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'auto': 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };
    return colors[method] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const handleViewProduct = () => {
    if (redirectOnAction) {
      // Redirect to listings page with product name in search and open view modal
      const productName = product.listing_title || product.headline || '';
      window.location.href = `/buyer/listings?search=${encodeURIComponent(productName)}&openView=${product.id}`;
      return;
    }
    setIsModalOpen(true);
  };

  const handleBuyNow = () => {
    if (product.quantity_available <= 0) {
      toast({
        title: "Out of Stock",
        description: "this account is currently out of stock kindly talk with vender",
        variant: "destructive"
      });
      // Allow opening modal even if out of stock, as requested
    }
    if (redirectOnAction) {
      // Redirect to listings page with product name in search and open payment modal
      const productName = product.listing_title || product.headline || '';
      window.location.href = `/buyer/listings?search=${encodeURIComponent(productName)}&openOrder=${product.id}`;
      return;
    }
    setIsPaymentModalOpen(true);
  };

  // Listen for redirect events (Order Now, View, Add to Cart)
  useEffect(() => {
    const handleOpenProductOrder = (event: CustomEvent) => {
      if (event.detail?.productId === product.id.toString() || event.detail?.product?.id === product.id) {
        setIsPaymentModalOpen(true);
      }
    };

    const handleOpenProductView = (event: CustomEvent) => {
      if (event.detail?.productId === product.id.toString() || event.detail?.product?.id === product.id) {
        setIsModalOpen(true);
      }
    };

    const handleAddProductToCart = (event: CustomEvent) => {
      if (event.detail?.productId === product.id.toString() || event.detail?.product?.id === product.id) {
        if (product.quantity_available > 0) {
          addToCart(product);
          toast({
            title: "Added to Cart",
            description: `${product.listing_title} added to your cart`
          });
        }
      }
    };

    window.addEventListener('openProductOrder', handleOpenProductOrder as EventListener);
    window.addEventListener('openProductView', handleOpenProductView as EventListener);
    window.addEventListener('addProductToCart', handleAddProductToCart as EventListener);

    return () => {
      window.removeEventListener('openProductOrder', handleOpenProductOrder as EventListener);
      window.removeEventListener('openProductView', handleOpenProductView as EventListener);
      window.removeEventListener('addProductToCart', handleAddProductToCart as EventListener);
    };
  }, [product.id, product.quantity_available, product.listing_title]);

  const checkWishlistStatus = async () => {
    if (wishlistLoading) return; // Prevent multiple simultaneous calls

    try {
      setWishlistLoading(true);
      const inWishlist = await wishlistService.isInWishlist(product.id);
      setIsInWishlist(inWishlist);
    } catch (error) {
      console.error('Error checking wishlist status:', error);
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleWishlistToggle = async () => {
    setWishlistLoading(true);
    try {
      if (isInWishlist) {
        // Remove from wishlist
        const response = await wishlistService.removeFromWishlist(product.id);
        if (response.success) {
          setIsInWishlist(false);
          toast({
            title: "Removed from Wishlist",
            description: "Product has been removed from your wishlist"
          });
        } else {
          toast({
            title: "Error",
            description: response.message || "Failed to remove from wishlist",
            variant: "destructive"
          });
        }
      } else {
        // Add to wishlist
        const response = await wishlistService.addToWishlist(product.id);
        if (response.success) {
          setIsInWishlist(true);
          toast({
            title: "Added to Wishlist",
            description: "Product has been added to your wishlist"
          });
        } else {
          toast({
            title: "Error",
            description: response.message || "Failed to add to wishlist",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to update wishlist",
        variant: "destructive"
      });
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (product.quantity_available <= 0) {
      toast({
        title: "Out of Stock",
        description: "This product is currently out of stock and cannot be added to cart",
        variant: "destructive"
      });
      return;
    }
    if (redirectOnAction) {
      // Redirect to listings page with product name in search and auto-add to cart
      const productName = product.listing_title || product.headline || '';
      window.location.href = `/buyer/listings?search=${encodeURIComponent(productName)}&addToCart=${product.id}`;
      return;
    }
    addToCart(product);
    toast({
      title: "Added to Cart",
      description: `${product.listing_title} added to your cart`
    });
  };

  const handleRemoveFromCart = () => {
    removeFromCart(product.id);
    toast({
      title: "Removed from Cart",
      description: `${product.listing_title} removed from your cart`
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
  };

  const listViewCard = (
    <Card className="bg-gray-950 border border-gray-800/80 rounded-xl shadow-sm">
      <CardContent className="p-0">
        <div className="hidden lg:grid grid-cols-[3.2fr,1.2fr,1fr,1fr,1.2fr,0.6fr,auto] gap-4 items-center px-4 py-3 text-sm text-gray-200">
          <div
            className="flex items-center gap-3 min-w-0 cursor-pointer rounded-lg hover:bg-gray-900/70 transition-colors px-2 py-1"
            onClick={handleViewProduct}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleViewProduct()}
          >
            <div className="w-10 h-10 bg-gray-800 rounded-md overflow-hidden flex-shrink-0">
              <img
                src={getProductImage() || placeholderImage}
                alt={product.listing_title}
                className="w-full h-full object-contain bg-gray-900/50"
                onError={(e) => {
                  e.currentTarget.src = placeholderImage;
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-white truncate flex-1">{product.listing_title}</p>
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-1">{product.description}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  {renderBalance(product.account_balance)}
                  {product.is_giveaway && (
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge className="bg-cyan-500 text-black border-none text-[9px] px-1.5 py-0 font-black cursor-help">
                            GIVEAWAY
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="bg-black/95 backdrop-blur-md border-cyan-500/30 p-2.5 rounded-xl shadow-2xl max-w-[200px]">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Promotion</p>
                            <p className="text-[11px] text-white leading-tight">Zero cost listing. First person to click "Buy" gets the account credentials delivered instantly!</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div>
            <p className="font-medium">{product.vendor.username}</p>
            <p className="text-xs text-gray-500">{product.sub_category?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase">Checked</p>
            <p className="font-medium">{new Date(product.created_at).toLocaleDateString()}</p>
          </div>
          <div className="space-y-1">
            {product.account_type && (
              <Badge className={`${getAccountTypeColor(product.account_type)} text-xs px-2 py-0.5`}>
                {product.account_type.replace('_', ' ').toUpperCase()}
              </Badge>
            )}
            {product.verification_level && (
              <Badge className={`${getVerificationColor(product.verification_level)} text-xs px-2 py-0.5`}>
                {product.verification_level.toUpperCase()}
              </Badge>
            )}
          </div>
          <div>
            <p className="font-bold text-white text-lg font-mono">
              {(!product.accepted_crypto || product.accepted_crypto.length === 0 || product.accepted_crypto.includes('BTC')) ? (
                <span>{formatCryptoPrice(product.price, 'BTC')} BTC</span>
              ) : (
                <span>{formatCryptoPrice(product.price, 'XMR')} XMR</span>
              )}
            </p>
            <p className="text-xs text-gray-500">≈ ${formatUSD(product.price)}</p>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-200">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span>{(parseFloat(product.rating as any) || 0).toFixed(1)}</span>
            <span className="text-xs text-gray-500">({product.review_count || 0})</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleViewProduct}
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-white hover:bg-gray-800"
            >
              View
            </Button>
            <Button
              onClick={handleBuyNow}
              size="sm"
              // disabled={product.quantity_available <= 0} // Allow click
              className={product.quantity_available > 0 ? 'bg-theme-red hover:bg-theme-red-dark text-white' : 'bg-gray-700 text-gray-400'}
            >
              Buy
            </Button>
            {isInCart(product.id) ? (
              <Button
                onClick={handleRemoveFromCart}
                size="sm"
                className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600 border border-teal-400"
              >
                ✓ Added
              </Button>
            ) : (
              <Button
                onClick={handleAddToCart}
                size="sm"
                disabled={product.quantity_available <= 0}
                className={
                  product.quantity_available > 0
                    ? 'bg-gradient-to-r from-cyan-400 to-teal-500 text-white hover:from-cyan-500 hover:to-teal-600 border border-cyan-400'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }
              >
                + Add
              </Button>
            )}
            <Button
              onClick={handleWishlistToggle}
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-red-400"
              disabled={wishlistLoading}
            >
              <Heart className={`w-4 h-4 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Mobile / tablet fallback */}
        <div className="lg:hidden p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gray-800/40 rounded-lg overflow-hidden">
              {getProductImage() ? (
                <img src={getProductImage() || undefined} alt={product.listing_title} className="w-full h-full object-contain bg-gray-950/40" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">📦</div>
              )}
            </div>
            <div>
              <p className="text-base font-semibold text-white">
                {product.listing_title}
                {product.is_giveaway && <span className="ml-2 text-[10px] bg-cyan-500 text-black px-1.5 py-0.5 rounded font-black">GIVEAWAY</span>}
              </p>
              <p className="text-xs text-gray-400">{product.vendor.username}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-gray-400">Price</p>
              <p className="font-bold text-white font-mono">
                {(!product.accepted_crypto || product.accepted_crypto.length === 0 || product.accepted_crypto.includes('BTC')) ? (
                  <span>{formatCryptoPrice(product.price, 'BTC')} BTC</span>
                ) : (
                  <span>{formatCryptoPrice(product.price, 'XMR')} XMR</span>
                )}
              </p>
              <p className="text-xs text-gray-500">≈ ${formatUSD(product.price)}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400">Stock</p>
              <p className="font-semibold">{product.quantity_available}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleViewProduct} size="sm" variant="outline" className="flex-1 border-gray-700 text-gray-200">
              View
            </Button>
            <Button onClick={handleBuyNow} size="sm" className="flex-1 bg-theme-red hover:bg-theme-red-dark text-white">
              Buy
            </Button>
            <Button
              onClick={isInCart(product.id) ? handleRemoveFromCart : handleAddToCart}
              size="sm"
              className="flex-1 bg-theme-cyan hover:bg-theme-cyan/90 text-black border border-theme-cyan"
            >
              {isInCart(product.id) ? 'Remove' : 'Add'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const gridViewCard = (
    <Card className="border-2 border-teal-500/30 hover:border-cyan-400/60 transition-all duration-300 group overflow-hidden rounded-xl shadow-lg h-full" style={{ backgroundColor: '#0E1A26' }}>
      <CardContent className="p-0 h-full flex flex-col">
        {/* Product Image - Small width and height like Netflix cards */}
        <div className="relative h-[170px] overflow-hidden flex items-center justify-center p-8" style={{ backgroundColor: '#0E1A26' }}>
          <img
            src={getProductImage() || placeholderImage}
            alt={product.listing_title}
            className="max-w-[140px] max-h-[140px] object-contain group-hover:scale-110 transition-transform duration-500"
            onError={(e) => {
              e.currentTarget.src = placeholderImage;
            }}
          />

          {/* Status Badges - Smaller */}
          <div className="absolute top-1 left-1 flex flex-col space-y-0.5">
            {/* Stock Status Badge */}
            {/* Stock Status Badge */}
            {product.quantity_available <= 0 && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs px-1 py-0.5">
                Out of Stock
              </Badge>
            )}

            {product.account_type && (
              <Badge className={`${getAccountTypeColor(product.account_type)} text-xs px-1 py-0.5`}>
                {product.account_type.replace('_', ' ').toUpperCase()}
              </Badge>
            )}
            {product.verification_level && (
              <Badge className={`${getVerificationColor(product.verification_level)} text-xs px-1 py-0.5`}>
                {product.verification_level.toUpperCase()}
              </Badge>
            )}
            {product.escrow_enabled && (
              <Badge className="bg-gradient-to-r from-yellow-500/90 to-amber-500/90 text-black border border-yellow-400/60 text-xs px-1 py-0.5 shadow-lg">
                <Lock className="w-2 h-2 mr-0.5" />
                ESCROW
              </Badge>
            )}
            {product.is_giveaway && (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="bg-cyan-500 text-black border-none text-xs px-1 py-0.5 shadow-lg font-black animate-pulse cursor-help">
                      GIVEAWAY
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="bg-black/95 backdrop-blur-md border-cyan-500/30 p-2.5 rounded-xl shadow-2xl max-w-[200px]">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Free Account</p>
                      <p className="text-[11px] text-white leading-tight">Claim this account for $0. Instant delivery upon purchase.</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Quick Actions */}
          <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button
              onClick={handleWishlistToggle}
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0 bg-black/50 border-gray-500/50 text-white hover:bg-red-500/20 hover:border-red-500/50"
              disabled={wishlistLoading}
            >
              <Heart className={`w-3 h-3 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Product Info - Fixed height with proper spacing */}
        <div className="p-4 pb-3 flex flex-col flex-1" style={{ backgroundColor: '#0E1A26' }}>
          <div className="space-y-2 flex-1">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2 overflow-hidden">
                <h3 className="text-xl font-bold text-white leading-tight truncate uppercase tracking-wider flex-1" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  {product.listing_title}
                </h3>
                {renderBalance(product.account_balance, 'md')}
              </div>
            </div>
            <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Price and Rating */}
          <div className="flex items-center justify-between mt-3 mb-4 bg-white/5 p-2 rounded-lg border border-white/5 shadow-inner">
            <div>
              <p className="text-lg font-black text-theme-cyan font-mono">
                {(!product.accepted_crypto || product.accepted_crypto.length === 0 || product.accepted_crypto.includes('BTC')) ? (
                  <span>{formatCryptoPrice(product.price, 'BTC')} BTC</span>
                ) : (
                  <span>{formatCryptoPrice(product.price, 'XMR')} XMR</span>
                )}
              </p>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-tighter">
                ≈ ${formatUSD(product.price)}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-1 text-[10px] text-gray-400 font-bold bg-white/5 px-2 py-1 rounded-full border border-white/10">
                <Star className="w-2.5 h-2.5 fill-current text-yellow-500" />
                <span>{(parseFloat(product.rating as any) || 0).toFixed(1)}</span>
              </div>
              <p className="text-gray-600 text-[9px] font-bold mt-1 uppercase">
                {product.quantity_available || 0} left
              </p>
            </div>
          </div>

          {/* Action Buttons - Narrower width */}
          <div className="flex space-x-1.5 mt-auto pb-2">
            <Button
              onClick={handleViewProduct}
              variant="outline"
              size="sm"
              className="flex-1 border-white/10 text-gray-400 hover:bg-white/5 text-[10px] font-bold uppercase tracking-widest py-2 h-9 min-w-0 px-2 transition-all"
            >
              <Eye className="w-3 h-3 mr-1" />
              Info
            </Button>

            <Button
              onClick={handleBuyNow}
              size="sm"
              // disabled={product.quantity_available <= 0} // Allow click to show modal + error
              className={`flex-1 text-[10px] font-bold uppercase tracking-widest py-2 h-9 min-w-0 px-2 transition-all active:scale-95 ${product.quantity_available > 0
                ? 'bg-theme-red hover:bg-[#850231] text-white shadow-lg shadow-theme-red/20'
                : 'bg-gray-800 text-gray-400' // Still gray if out of stock, but clickable
                }`}
            >
              <ShoppingCart className="w-3 h-3 mr-1" />
              Buy
            </Button>

            {isInCart(product.id) ? (
              <Button
                onClick={handleRemoveFromCart}
                size="sm"
                className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600 border border-teal-400 text-xs py-2 h-9 min-w-0 px-2"
              >
                <Check className="w-3 h-3 mr-1" />
                <span className="text-[10px]">Added</span>
              </Button>
            ) : (
              <Button
                onClick={handleAddToCart}
                size="sm"
                disabled={product.quantity_available <= 0}
                className={`flex-1 text-xs py-2 h-9 min-w-0 px-2 ${product.quantity_available > 0
                  ? 'bg-gradient-to-r from-[#00D9FF] to-[#00BCD4] text-white hover:from-[#00C4E6] hover:to-[#00ACC1] border border-[#00D9FF]'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
              >
                <Plus className="w-3 h-3 mr-1" />
                <span className="text-[10px]">Add</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card >
  );

  const renderedCard = viewMode === 'list' ? listViewCard : gridViewCard;

  return (
    <>
      {renderedCard}

      {isModalOpen && (
        <ProductDetailModal
          product={product as any}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}

      {isPaymentModalOpen && (
        <PaymentModal
          product={product as any}
          isOpen={isPaymentModalOpen}
          onClose={handleClosePaymentModal}
          onBack={handleClosePaymentModal}
        />
      )}
    </>
  );
};

export default ProductCard;