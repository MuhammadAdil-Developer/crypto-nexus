import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Star, Heart, ShoppingCart, Eye, Clock, Shield, CheckCircle, Star as StarIcon, X, ArrowLeft, ExternalLink, Flag, Copy, ChevronUp, ChevronDown, HelpCircle, MapPin, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
  views_count: number;
  favorites_count: number;
}

interface Review {
  id: number;
  user: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, isOpen, onClose }) => {
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isClientHistoryExpanded, setIsClientHistoryExpanded] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    if (product && product.main_images && product.main_images.length > 0) {
      setSelectedImage(product.main_images[0]);
    }
  }, [product]);

  useEffect(() => {
    if (product && isOpen) {
      fetchProductReviews();
    }
  }, [product, isOpen]);

  const fetchProductReviews = async () => {
    if (!product) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/v1/products/${product.id}/reviews/`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.results || []);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    }
  };

  const handleOrder = () => {
    setIsPaymentModalOpen(true);
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
    return `http://localhost:8000${url}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
    
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
    
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      {/* Backdrop - Enhanced with Better Blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content - Right Side - Enhanced with Smooth Animations */}
      <div className="relative w-full max-w-5xl h-screen bg-gray-900 shadow-2xl transform transition-all duration-500 ease-out flex flex-col overflow-y-auto animate-in slide-in-from-right-full">
        {/* Top Bar - Enhanced with Better Styling */}
        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-full w-10 h-10 p-0 transition-all duration-300"
                onClick={onClose}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
              Back
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-full w-10 h-10 p-0 transition-all duration-300"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content - Now fully scrollable */}
        <div className="flex flex-1 overflow-y-auto">
          {/* Left Content Area - Main Product Details */}
          <div className="flex-1 p-6">
            {/* Product Title */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-white leading-tight">
                {product.listing_title}
              </h1>
              <div className="flex items-center gap-4 text-gray-400 text-sm">
                <span>Posted {product.created_at ? formatDate(product.created_at) : 'Unknown time'} ago</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Worldwide
                </span>
              </div>
            </div>

            {/* Summary Section */}
            <div className="space-y-3 pt-8">
              <h2 className="text-xl font-semibold text-white">Descriptions</h2>
              <p className="text-gray-300 leading-relaxed text-base">
                {product.description || 'No description available for this product. This is a high-quality item that meets all your requirements.'}
              </p>
            </div>

            {/* Product Details */}
            <div className="space-y-3 pt-8">
              <h2 className="text-xl font-semibold text-white">Product Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm">Category</p>
                  <p className="text-gray-300">{product.category?.name || 'Uncategorized'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm">Sub Category</p>
                  <p className="text-gray-300">{product.sub_category?.name || 'General'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm">Delivery Method</p>
                  <p className="text-gray-300">{product.delivery_method || 'Standard'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm">Account Type</p>
                  <p className="text-gray-300">{product.account_type || 'Regular'}</p>
                </div>
              </div>
            </div>

            {/* Account Specifications */}
            <div className="space-y-3 pt-12">
              <h2 className="text-xl font-semibold text-white">Account Specifications</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm">Verification Level</p>
                  <Badge variant="outline" className="bg-gray-700 border-gray-500 text-gray-200">
                    {product.verification_level || 'Not Verified'}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm">Access Method</p>
                  <p className="text-gray-300">Username + Password</p>
                </div>
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm">Account Age</p>
                  <p className="text-gray-300">2+ years old</p>
                </div>
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm">Region</p>
                  <p className="text-gray-300">Worldwide</p>
                </div>
              </div>
            </div>

            {/* Special Features - Lighter Colors */}
            <div className="space-y-3 pt-12">
              <h2 className="text-xl font-semibold text-white">Special Features</h2>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-gray-700 border-gray-500 text-gray-200 px-3 py-1">
                  Instant Delivery
                </Badge>
                <Badge variant="outline" className="bg-gray-700 border-gray-500 text-gray-200 px-3 py-1">
                  API Access
                </Badge>
                <Badge variant="outline" className="bg-gray-700 border-gray-500 text-gray-200 px-3 py-1">
                  High Volume
                </Badge>
                <Badge variant="outline" className="bg-gray-700 border-gray-500 text-gray-200 px-3 py-1">
                  Premium Support
                </Badge>
              </div>
            </div>

            {/* Product Activity & Analytics */}
            <div className="space-y-3 pt-12">
              <h2 className="text-xl font-semibold text-white">Product Activity</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Views</span>
                    <span className="text-white font-medium">{product.views_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Favorites</span>
                    <span className="text-white font-medium">{product.favorites_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Rating</span>
                    <span className="text-white font-medium">{product.rating || '0.0'}/5.0</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Reviews</span>
                    <span className="text-white font-medium">{product.review_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Status</span>
                    <Badge variant="outline" className="bg-gray-700 border-green-500 text-green-300 text-xs">
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Quantity</span>
                    <span className="text-white font-medium">Available</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery & Support - Fixed Layout */}
            <div className="space-y-3 pt-12">
              <h2 className="text-xl font-semibold text-white">Delivery & Support</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Instant Auto-Delivery</p>
                    <p className="text-gray-400 text-sm">Get your account details immediately after payment</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">24/7</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">24/7 Customer Support</p>
                    <p className="text-gray-400 text-sm">We're here to help anytime you need assistance</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">🔒</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Secure Transaction</p>
                    <p className="text-gray-400 text-sm">All payments are encrypted and secure</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Specifics - Fixed Bottom Layout */}
            <div className="flex items-center gap-6 pt-6 pb-6 border-t border-gray-600 mt-8">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-400" />
                <span className="text-gray-300 text-lg font-medium">
                  {product.price || '0.00'} Fixed-price
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-gray-400" />
                <span className="text-gray-300 text-lg font-medium">Intermediate</span>
                <span className="text-gray-400 text-sm">I am looking for a mix of experience and value.</span>
              </div>
            </div>

            {/* Product Images - Moved below price section */}
            {product.main_images && product.main_images.length > 0 && (
              <div className="space-y-4 mt-8">
                <h2 className="text-xl font-semibold text-white">Product Images</h2>
                <div className="grid grid-cols-2 gap-4">
                  {/* Main Image */}
                  <div className="w-full h-64 bg-gray-800 rounded-lg overflow-hidden">
                    <img
                      src={getFullUrl(selectedImage)}
                      alt={product.listing_title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Gallery Images */}
                  <div className="grid grid-cols-2 gap-2">
                    {product.gallery_images && product.gallery_images.slice(0, 4).map((image, index) => (
                      <div
                        key={index}
                        className="w-full h-32 bg-gray-800 rounded cursor-pointer overflow-hidden hover:opacity-80 transition-opacity"
                        onClick={() => setSelectedImage(image)}
                      >
                        <img
                          src={getFullUrl(image)}
                          alt={`Gallery ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Vendor Reviews Section - Similar to screenshot layout */}
            <div className="space-y-4 mt-8">
              <h2 className="text-xl font-semibold text-white">Vendor Reviews ({reviews.length})</h2>
              
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="bg-gray-800 rounded-lg p-4 space-y-3">
                      {/* Review Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-white font-medium text-lg">Product Review</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} 
                                />
                              ))}
                            </div>
                            <span className="text-white font-medium">{review.rating}.0</span>
                          </div>
                        </div>
                        <div className="text-right text-gray-400 text-sm">
                          <div>{formatDate(review.created_at)}</div>
                          <div className="text-xs">Fixed-price</div>
                        </div>
                      </div>

                      {/* Review Content */}
                      {review.comment && (
                        <div className="text-gray-300 text-sm leading-relaxed">
                          "{review.comment}"
                        </div>
                      )}

                      {/* Reviewer Info */}
                      <div className="text-gray-400 text-sm">
                        To vendor: <span className="text-green-400">{review.user}</span>
                        {!review.comment && <span className="ml-2">No feedback given</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-900 rounded-lg p-6 ml-18 mt-12">
                  <div className="space-y-3">
                    <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto">
                      <Star className="w-8 h-8 text-gray-500" />
                    </div>
                    <h3 className="text-white font-medium text-lg ml-12">No Reviews Available</h3>
                    <p className="text-gray-400 text-sm ml-12">Be the first to review this vendor!</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Now scrolls with left side */}
          <div className="w-80 bg-gray-900 border-l border-gray-600 flex flex-col">
            {/* Action Buttons */}
            <div className="space-y-3 px-6 pt-6">
              <Button 
                size="lg" 
                className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3"
                onClick={handleOrder}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Order Now
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full border-gray-500 text-white hover:bg-gray-700 py-3"
                onClick={handleAddToWishlist}
              >
                <Heart className={`w-5 h-5 mr-2 ${isInWishlist ? 'fill-current text-red-500' : ''}`} />
                {isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
              </Button>
            </div>

            {/* Flag Option */}
            <div className="text-center px-6 pb-6">
              <Button variant="ghost" className="text-green-400 hover:text-green-300 hover:bg-gray-700">
                <Flag className="w-4 h-4 mr-2" />
                Report Product
              </Button>
            </div>

            {/* Border Line - Full Width */}
            <div className="w-full h-px bg-gray-600"></div>

            {/* About the Vendor Section */}
            <div className="space-y-4 pt-6 px-6">
              <h3 className="text-lg font-semibold text-white">About the Vendor</h3>
                            
              {/* Vendor Name and Join Date */}
              <div className="space-y-1">
                <p className="text-white font-medium text-lg">{product.vendor?.username || 'Unknown Vendor'}</p>
                <p className="text-gray-400 text-sm">Member since {product.vendor?.date_joined ? formatDate(product.vendor.date_joined) : 'Unknown'}</p>
              </div>

              {/* Verification Status */}
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-gray-300 text-sm">Account verified</span>
              </div>

              {/* Rating */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${i < (product.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-500'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-white font-medium">{product.rating || '0.00'}</span>
                </div>
                <p className="text-gray-400 text-xs">{product.rating || '0.00'} of {product.review_count || 0} reviews</p>
              </div>

              {/* Vendor Stats */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total Products</span>
                  <span className="text-white font-medium">12</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Active Listings</span>
                  <span className="text-white font-medium">8</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Response Rate</span>
                  <span className="text-white font-medium">98%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Avg. Response Time</span>
                  <span className="text-white font-medium">2 hours</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total Sales</span>
                  <span className="text-white font-medium">89</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Success Rate</span>
                  <span className="text-white font-medium">96%</span>
                </div>
              </div>

              {/* Vendor Location */}
              <div className="space-y-1">
                <p className="text-gray-300 text-sm">Location: Worldwide</p>
                <p className="text-gray-400 text-xs">Available 24/7</p>
              </div>
            </div>

            {/* Border Line - Full Width */}
            <div className="w-full h-px bg-gray-600"></div>

            {/* Product Link Section */}
            <div className="pt-6 px-6 pb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Product link</h3>
              <div className="bg-gray-700 border border-gray-500 rounded p-3">
                <p className="text-gray-300 text-sm break-all">
                  https://cryptonexus.com/products/{product.id}
                </p>
              </div>
              <Button 
                variant="ghost" 
                className="text-green-400 hover:text-green-300 hover:bg-gray-700 p-0 h-auto mt-3"
                onClick={() => {
                  navigator.clipboard.writeText(`https://cryptonexus.com/products/${product.id}`);
                  toast({
                    title: "Link Copied",
                    description: "Product link copied to clipboard!",
                  });
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy link
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        product={product}
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onBack={() => setIsPaymentModalOpen(false)}
      />
    </div>
  );
};

export default ProductDetailModal;