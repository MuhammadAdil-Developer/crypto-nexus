import { useState } from "react";
import { Heart, Star, Eye, ShoppingCart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: number;
  title: string;
  vendor: string;
  price: string;
  image: string;
  rating: number;
  inStock: boolean;
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <Card className="group overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg">
      <div className="relative">
        {/* Product Image */}
        <div className="relative h-48 bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <img
            src={product.image}
            alt={product.title}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
          />
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
          )}
        </div>

        {/* Wishlist Button */}
        <Button
          size="sm"
          variant="ghost"
          className={`absolute top-3 right-3 w-8 h-8 rounded-full backdrop-blur-sm transition-all duration-200 ${
            isWishlisted 
              ? 'bg-red-500 text-white hover:bg-red-600' 
              : 'bg-white/80 text-gray-600 hover:bg-white hover:text-red-500'
          }`}
          onClick={() => setIsWishlisted(!isWishlisted)}
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
        </Button>

        {/* Stock Status */}
        <div className="absolute top-3 left-3">
          <Badge 
            variant={product.inStock ? "default" : "destructive"}
            className="text-xs"
          >
            {product.inStock ? "In Stock" : "Out of Stock"}
          </Badge>
        </div>
      </div>

      <CardContent className="p-6">
        {/* Vendor */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{product.vendor}</p>
        
        {/* Title */}
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 line-clamp-2 leading-snug">
          {product.title}
        </h3>

        {/* Rating */}
        <div className="flex items-center space-x-1 mb-4">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {product.rating}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">(127 reviews)</span>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {product.price}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">≈ $45.60</span>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
          <Button 
            size="sm" 
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            disabled={!product.inStock}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Order
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}