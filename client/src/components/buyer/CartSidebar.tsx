import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard,
  Package,
  User
} from 'lucide-react';
import { useCart, CartItem } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

const CartSidebar: React.FC<CartSidebarProps> = ({ isOpen, onClose, onCheckout }) => {
  const { 
    cartItems, 
    updateQuantity, 
    removeFromCart, 
    clearCart, 
    getTotalPrice, 
    getTotalItems 
  } = useCart();
  const { toast } = useToast();

  const formatPrice = (price: string) => {
    return parseFloat(price).toFixed(8);
  };

  const handleQuantityChange = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const handleRemoveItem = (productId: number, productName: string) => {
    removeFromCart(productId);
    toast({
      title: "Removed from Cart",
      message: `${productName} removed from your cart`,
      type: "success"
    });
  };

  const handleClearCart = () => {
    clearCart();
    toast({
      title: "Cart Cleared",
      message: "All items removed from your cart",
      type: "success"
    });
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Empty Cart",
        message: "Please add items to your cart before checkout",
        type: "error"
      });
      return;
    }
    onCheckout();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-gray-900 border-l border-gray-700/50 shadow-2xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
            <div className="flex items-center space-x-3">
              <ShoppingCart className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-bold text-white">Shopping Cart</h2>
              {getTotalItems() > 0 && (
                <Badge className="bg-blue-600 text-white">
                  {getTotalItems()}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6">
            {cartItems.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Your cart is empty</h3>
                <p className="text-gray-400">Add some products to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <Card key={item.id} className="bg-gray-800/50 border-gray-700/50">
                    <CardContent className="p-4">
                      <div className="flex space-x-3">
                        {/* Product Image */}
                        <div className="w-16 h-16 bg-gray-700/50 rounded-lg overflow-hidden flex-shrink-0">
                          {item.main_images && item.main_images.length > 0 ? (
                            <img
                              src={item.main_images[0]}
                              alt={item.listing_title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-gray-400 text-lg">📦</span>
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-white text-sm truncate">
                            {item.listing_title}
                          </h4>
                          <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                            {item.description}
                          </p>
                          
                          {/* Vendor */}
                          <div className="flex items-center space-x-1 mt-2">
                            <User className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-400">{item.vendor.username}</span>
                          </div>

                          {/* Price and Quantity */}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-bold text-white">
                                {formatPrice(item.price)} BTC
                              </span>
                              <span className="text-xs text-gray-400">each</span>
                            </div>
                            
                            {/* Quantity Controls */}
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                className="h-6 w-6 p-0 border-gray-600 text-gray-300 hover:bg-gray-700"
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="text-sm text-white min-w-[20px] text-center">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                className="h-6 w-6 p-0 border-gray-600 text-gray-300 hover:bg-gray-700"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Item Total */}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">Total:</span>
                            <span className="text-sm font-bold text-blue-400">
                              {(parseFloat(item.price) * item.quantity).toFixed(8)} BTC
                            </span>
                          </div>

                          {/* Remove Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id, item.listing_title)}
                            className="mt-2 h-6 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {cartItems.length > 0 && (
            <div className="border-t border-gray-700/50 p-6 space-y-4">
              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-white">Total:</span>
                <span className="text-xl font-bold text-blue-400">
                  {getTotalPrice().toFixed(8)} BTC
                </span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  onClick={handleCheckout}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Checkout ({getTotalItems()} items)
                </Button>
                
                <Button
                  onClick={handleClearCart}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Cart
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>                                  
  );
};

export default CartSidebar;
