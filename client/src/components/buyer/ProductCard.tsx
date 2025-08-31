import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Heart, ShoppingCart, Eye, User, Shield, Clock } from 'lucide-react';
import ProductDetailModal from './ProductDetailModal';
import PaymentModal from './PaymentModal';

interface Product {
  id: number;
  listing_title: string;
  description: string;
  price: string;
  category: { name: string };
  sub_category: { name: string };
  delivery_method: string;
  account_type: string;
  verification_level: string;
  main_images: string[];
  gallery_images: string[];
  documents: string[];
  vendor: {
    username: string;
    email: string;
    date_joined: string;
  };
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

interface ProductCardProps {
  product: Product;
  viewMode: 'grid' | 'list';
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, viewMode }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const getFullUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    return `http://localhost:8000${url}`;
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

  const handleViewClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleOpenPaymentModal = () => {
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
  };

  return (
    <>
      {/* Grid View */}
      {viewMode === "grid" && (
        <Card className="bg-gray-900 border-gray-600 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 cursor-pointer group transform hover:scale-[1.02] hover:-translate-y-1">
          <CardContent className="p-4">
            {/* Product Image - Large and Prominent with Amazing Effects */}
            <div className="w-full h-48 bg-gray-800 rounded-lg overflow-hidden mb-4 relative group-hover:shadow-lg">
              {product.main_images && product.main_images.length > 0 ? (
                <img
                  src={getFullUrl(product.main_images[0])}
                  alt={product.listing_title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center group-hover:bg-gray-600 transition-colors duration-300">
                  <span className="text-gray-400 text-lg group-hover:text-gray-300 transition-colors duration-300">No Image</span>
                </div>
              )}
              
              {/* Stock Status Badge - Enhanced */}
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="bg-green-600 text-white text-xs shadow-lg group-hover:bg-green-500 transition-colors duration-300">
                  In Stock
                </Badge>
              </div>
              
              {/* Heart Icon for Favorites - Enhanced */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                <Button size="sm" variant="ghost" className="w-8 h-8 p-0 bg-black/50 hover:bg-black/70 text-white rounded-full">
                  <Heart className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Product Info */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                {product.listing_title}
              </h3>
              
              <p className="text-gray-300 text-sm line-clamp-2">
                {product.description}
              </p>

              {/* Vendor and Rating */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <User className="w-4 h-4" />
                  <span>{product.vendor?.username || 'Unknown Vendor'}</span>
                </div>
                {product.rating && (
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{product.rating}</span>
                    <span className="text-gray-400">({product.review_count || 0})</span>
                  </div>
                )}
              </div>

              {/* Price - Ultra Clean & Professional */}
              <div className="text-sm font-semibold text-blue-400  px-3 py-1 rounded-full border border-blue-400/20">
                {product.price || '0.00'} BTC
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                  {product.category?.name || 'Uncategorized'}
                </Badge>
                <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                  {product.delivery_method || 'Standard'}
                </Badge>
                <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                  {product.account_type || 'Regular'}
                </Badge>
              </div>
              
              {/* Action Buttons - Enhanced with Amazing Effects */}
              <div className="flex items-center gap-2 pt-3">
                <Button 
                  variant="outline" size="sm" className="flex-1"
                  onClick={handleViewClick}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
                
                <Button size="sm" className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700" onClick={handleOpenPaymentModal}>
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  Order Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex gap-6">
              {/* Product Image */}
              <div className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {product.main_images && product.main_images.length > 0 ? (
                  <img
                    src={getFullUrl(product.main_images[0])}
                    alt={product.listing_title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/128x128?text=No+Image';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">No Image</span>
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 cursor-pointer">
                      {product.listing_title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {product.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-blue-600 bg-blue-600/10 px-3 py-1 rounded-full border border-blue-600/20">{product.price} BTC</div>
                    <div className="text-xs text-gray-500 mt-1">{product.price} XMR</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{product.vendor?.username || 'Unknown Vendor'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    <span>{product.verification_level || 'Not Verified'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{product.created_at ? formatDate(product.created_at) : 'Unknown Date'}</span>
                  </div>
                  {product.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span>{product.rating}</span>
                      <span className="text-gray-400">({product.review_count || 0})</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {product.category?.name || 'Uncategorized'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {product.delivery_method || 'Standard'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {product.account_type || 'Regular'}
                  </Badge>
                </div>

                <div className="flex items-center gap-3">
                  <Button 
                    size="sm" 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={handleViewClick}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    onClick={handleOpenPaymentModal}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Order Now
                  </Button>
                  <Button size="sm" variant="outline">
                    <Heart className="w-4 h-4 mr-2" />
                    Wishlist
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={product}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      {/* Payment Modal */}
      <PaymentModal
        product={product}
        isOpen={isPaymentModalOpen}
        onClose={handleClosePaymentModal}
        onBack={handleClosePaymentModal}
      />
    </>
  );
};