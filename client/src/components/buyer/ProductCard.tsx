import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Heart, ShoppingCart, Eye, User, Shield, Clock, Plus, Check, Lock } from 'lucide-react';
import ProductDetailModal from './ProductDetailModal';
import PaymentModal from './PaymentModal';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import wishlistService from '@/services/wishlistService';

interface Product {
  id: number;
  listing_title: string;
  description: string;
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
  main_image?: string | null;
  main_images: string[];
  gallery_images: string[];
  tags: string[];
  special_features: string[];
  quantity_available: number;
  rating?: number;
  review_count?: number;
  escrow_enabled?: boolean;
}

interface ProductCardProps {
  product: Product;
  viewMode?: 'grid' | 'list';
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, viewMode = 'grid' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const { toast } = useToast();
  const { addToCart, isInCart, removeFromCart } = useCart();

  useEffect(() => {
    checkWishlistStatus();
  }, [product.id]); // Only run when product.id changes

  const formatPrice = (price: string) => {
    return parseFloat(price).toFixed(8);
  };

  const getProductImage = () => {
    // Priority: main_image > gallery_images[0] > main_images[0] > null
    if (product.main_image) {
      return product.main_image;
    }
    if (product.gallery_images && product.gallery_images.length > 0) {
      return product.gallery_images[0];
    }
    if (product.main_images && product.main_images.length > 0) {
      return product.main_images[0];
    }
    return null;
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
    setIsModalOpen(true);
  };

  const handleBuyNow = () => {
    if (product.quantity_available <= 0) {
      toast({
        title: "Out of Stock",
        description: "This product is currently out of stock and cannot be purchased",
        variant: "destructive"
      });
      return;
    }
    setIsPaymentModalOpen(true);
  };

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

  if (viewMode === 'list') {
    return (
      <Card className="bg-card border border-gray-600/30 hover:border-gray-500/50 transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-3 sm:space-y-0">
            {/* Product Image */}
            <div className="w-24 h-24 bg-gray-800/30 rounded-lg overflow-hidden border border-gray-600/20 flex-shrink-0">
              {getProductImage() ? (
                <img
                  src={getProductImage() || undefined}
                  alt={product.listing_title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-gray-400 text-2xl">📦</span>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white truncate">
                    {product.listing_title}
                  </h3>
                  <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                    {product.description}
                  </p>
                </div>
                
                <div className="sm:ml-4 text-right">
                  <p className="text-xl font-bold text-white">
                    {formatPrice(product.price)} BTC
                  </p>
                  <p className="text-gray-400 text-sm">
                    {product.quantity_available || 0} available
                  </p>
                </div>
              </div>

              {/* Tags and Features */}
              <div className="mt-3 space-y-1">
                <div className="flex flex-wrap gap-1">
                  {/* Stock Status Badge */}
                  {product.quantity_available > 0 ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs px-1.5 py-0.5">
                      In Stock
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs px-1.5 py-0.5">
                      Out of Stock
                    </Badge>
                  )}
                  
                  {product.account_type && (
                    <Badge className={`${getAccountTypeColor(product.account_type)} text-xs px-1.5 py-0.5`}>
                      {product.account_type.replace('_', ' ').toUpperCase()}
                    </Badge>
                  )}
                  {product.verification_level && (
                    <Badge className={`${getVerificationColor(product.verification_level)} text-xs px-1.5 py-0.5`}>
                      {product.verification_level.toUpperCase()}
                    </Badge>
                  )}
                  {product.delivery_method && (
                    <Badge className={`${getDeliveryMethodColor(product.delivery_method)} text-xs px-1.5 py-0.5`}>
                      {product.delivery_method.toUpperCase()}
                    </Badge>
                  )}
                </div>
                {product.escrow_enabled && (
                  <div className="flex">
                    <Badge className="bg-gradient-to-r from-yellow-500/90 to-amber-500/90 text-black border border-yellow-400/60 hover:from-yellow-500 hover:to-amber-500 transition-all duration-200 shadow-lg text-xs px-1.5 py-0.5">
                      <Lock className="w-2.5 h-2.5 mr-0.5" />
                      ESCROW
                    </Badge>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mt-4">
                <Button
                  onClick={handleViewProduct}
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700/50"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
                
                {/* Buy Now Button - Disabled if out of stock */}
                <Button
                  onClick={handleBuyNow}
                  size="sm"
                  disabled={product.quantity_available <= 0}
                  className={`${
                    product.quantity_available > 0 
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white shadow-lg' 
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  {product.quantity_available > 0 ? 'Buy Now' : 'Out of Stock'}
                </Button>
                
                {/* Cart Button - Disabled if out of stock */}
                {isInCart(product.id) ? (
                  <Button
                    onClick={handleRemoveFromCart}
                    size="sm"
                    className="w-24 sm:w-20 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    In Cart
                  </Button>
                ) : (
                  <Button
                    onClick={handleAddToCart}
                    size="sm"
                    disabled={product.quantity_available <= 0}
                    className={`${
                      product.quantity_available > 0 
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white shadow-lg' 
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {product.quantity_available > 0 ? 'Add' : 'Out of Stock'}
                  </Button>
                )}
                
                <Button
                  onClick={handleWishlistToggle}
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700/50"
                  disabled={wishlistLoading}
                >
                  <Heart className={`w-4 h-4 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border border-gray-600/30 hover:border-gray-500/50 transition-all duration-200 group overflow-hidden">
      <CardContent className="p-0">
        {/* Product Image - Reduced height */}
        <div className="relative h-32 bg-gray-800/30 overflow-hidden border-b border-gray-600/20">
          {getProductImage() ? (
            <img
              src={getProductImage() || undefined}
              alt={product.listing_title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-gray-400 text-4xl">📦</span>
            </div>
          )}
          
          {/* Status Badges - Smaller */}
          <div className="absolute top-1 left-1 flex flex-col space-y-0.5">
            {/* Stock Status Badge */}
            {product.quantity_available > 0 ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs px-1 py-0.5">
                In Stock
              </Badge>
            ) : (
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

        {/* Product Info */}
        <div className="p-3 space-y-2">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white truncate">
              {product.listing_title}
            </h3>
            <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Price and Availability */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-white">
                {formatPrice(product.price)} BTC
              </p>
              <p className="text-gray-400 text-xs">
                {product.quantity_available || 0} available
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-1 text-xs text-gray-400">
                <Star className="w-3 h-3 fill-current text-yellow-400" />
                <span>{product.rating || '0.0'}</span>
                <span>({product.review_count || 0})</span>
              </div>
            </div>
          </div>

          {/* Delivery Method */}
          <div className="flex items-center justify-between">
            {product.delivery_method && (
              <Badge className={getDeliveryMethodColor(product.delivery_method)}>
                {product.delivery_method.toUpperCase()}
              </Badge>
            )}
            <div className="flex items-center space-x-1 text-xs text-gray-400">
              <User className="w-3 h-3" />
              <span>{product.vendor.username}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-1 pt-1">
            <Button
              onClick={handleViewProduct}
              variant="outline"
              size="sm"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700/50 text-xs py-1"
            >
              <Eye className="w-3 h-3 mr-1" />
              View
            </Button>
            
            {/* Buy Button - Disabled if out of stock */}
            <Button
              onClick={handleBuyNow}
              size="sm"
              disabled={product.quantity_available <= 0}
              className={`flex-1 text-xs py-1 shadow-lg ${
                product.quantity_available > 0 
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white' 
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              <ShoppingCart className="w-3 h-3 mr-1" />
              {product.quantity_available > 0 ? 'Buy' : 'Out of Stock'}
            </Button>
            
            {/* Cart Button - Disabled if out of stock */}
            {isInCart(product.id) ? (
              <Button
                onClick={handleRemoveFromCart}
                size="sm"
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs py-1 shadow-lg"
              >
                <Check className="w-3 h-3 mr-1" />
                In Cart
              </Button>
            ) : (
              <Button
                onClick={handleAddToCart}
                size="sm"
                disabled={product.quantity_available <= 0}
                className={`flex-1 text-xs py-1 shadow-lg ${
                  product.quantity_available > 0 
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white' 
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Plus className="w-3 h-3 mr-1" />
                {product.quantity_available > 0 ? 'Add' : 'Out of Stock'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      {/* Product Detail Modal */}
      {isModalOpen && (
        <ProductDetailModal
          product={product as any}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <PaymentModal
          product={product as any}
          isOpen={isPaymentModalOpen}
          onClose={handleClosePaymentModal}
          onBack={handleClosePaymentModal}
        />
      )}
    </Card>
  );
};

export default ProductCard;
