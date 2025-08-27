import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Star, Heart, ShoppingCart, Eye, Clock, Shield, CheckCircle, Star as StarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isInWishlist, setIsInWishlist] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProductDetails();
      fetchProductReviews();
    }
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/products/${id}/`);
      if (response.ok) {
        const data = await response.json();
        setProduct(data);
        if (data.main_images && data.main_images.length > 0) {
          setSelectedImage(data.main_images[0]);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to load product details",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load product details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProductReviews = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/products/${id}/reviews/`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.results || []);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    }
  };

  const handleOrder = () => {
    toast({
      title: "Order Placed",
      description: "Your order has been placed successfully!",
    });
    // Navigate to checkout or order confirmation
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
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="w-full h-96 bg-gray-800 rounded-lg overflow-hidden">
              {selectedImage ? (
                <img
                  src={getFullUrl(selectedImage)}
                  alt={product.listing_title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <span className="text-gray-400 text-lg">No Image</span>
                </div>
              )}
            </div>

            {/* Gallery Images */}
            {product.gallery_images && product.gallery_images.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {product.gallery_images.map((image, index) => (
                  <div
                    key={index}
                    className="w-full h-20 bg-gray-800 rounded cursor-pointer overflow-hidden hover:opacity-80 transition-opacity"
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
            )}
          </div>

          {/* Right Column - Product Info */}
          <div className="space-y-6">
            {/* Product Header */}
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {product.listing_title}
              </h1>
              <div className="flex items-center gap-4 text-gray-400">
                <span>Category: {product.category.name}</span>
                <span>•</span>
                <span>{product.sub_category.name}</span>
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                <span className="text-white font-medium text-lg">{product.rating || '0.00'}</span>
                <span className="text-gray-400">({product.review_count || 0} reviews)</span>
              </div>
            </div>

            {/* Price */}
            <div className="text-3xl font-bold text-blue-400">
              {product.price} BTC
              <span className="text-gray-400 text-lg ml-2">≈ $45.60</span>
            </div>

            {/* Product Details */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Product Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-400">Delivery Method:</span>
                    <p className="text-white font-medium">{product.delivery_method}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Account Type:</span>
                    <p className="text-white font-medium">{product.account_type}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Verification Level:</span>
                    <p className="text-white font-medium">{product.verification_level}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Listed:</span>
                    <p className="text-white font-medium">{formatDate(product.created_at)}</p>
                  </div>
                </div>
                
                <Separator className="bg-gray-700" />
                
                <div>
                  <span className="text-gray-400">Description:</span>
                  <p className="text-white mt-2 leading-relaxed">{product.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Vendor Information */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  Vendor Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-lg">{product.vendor.username}</p>
                    <p className="text-gray-400 text-sm">Member since {formatDate(product.vendor.date_joined)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 text-sm">Verified</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button 
                size="lg" 
                className="flex-1 bg-gradient-to-r from-indigo-900 to-purple-600 hover:from-indigo-800 hover:to-purple-500 text-white font-medium"
                onClick={handleOrder}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Order Now
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
                onClick={handleAddToWishlist}
              >
                <Heart className={`w-5 h-5 mr-2 ${isInWishlist ? 'fill-current text-red-500' : ''}`} />
                {isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
              </Button>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <StarIcon className="w-5 h-5 text-yellow-400" />
                Customer Reviews ({reviews.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-700 pb-4 last:border-b-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{review.user}</span>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} 
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-gray-400 text-sm">{formatDate(review.created_at)}</span>
                      </div>
                      <p className="text-gray-300">{review.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">No reviews yet. Be the first to review this product!</p>
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