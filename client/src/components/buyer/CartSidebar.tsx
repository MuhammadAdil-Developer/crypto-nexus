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
import brandLogo from "@/assets/banner/logo.png";
import { useCart, CartItem } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { useCryptoPrices } from '@/contexts/PriceContext';

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
  const { btc: btcPrice, xmr: xmrPrice } = useCryptoPrices();
  const { toast } = useToast();

  // Format USD price with 2 decimal places
  const formatUSD = (price: string) => {
    return parseFloat(price).toFixed(2);
  };

  // Format BTC equivalent
  const formatBTCEquivalent = (price: number | string) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return parseFloat((num / btcPrice).toFixed(8)).toString();
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
      description: `${productName} removed from your cart`,
    });
  };

  const handleClearCart = () => {
    clearCart();
    toast({
      title: "Cart Cleared",
      description: "All items removed from your cart",
    });
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to your cart before checkout",
        variant: "destructive"
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
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-theme-cyan/10 rounded-lg border border-theme-cyan/20">
                <div className="w-10 h-10 bg-theme-cyan/15 rounded-xl flex items-center justify-center shrink-0 border border-theme-cyan/20 overflow-hidden">
                  <img src={brandLogo} alt="AC Logo" className="w-6 h-6 object-contain" />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-widest" style={{ fontFamily: "'Orbitron', sans-serif" }}>Your Vault</h2>
                {getTotalItems() > 0 && (
                  <Badge className="bg-theme-red text-white border-none text-[10px] font-bold">
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
                              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                <img src={brandLogo} alt="AC Logo" className="w-6 h-6 opacity-30 object-contain grayscale" />
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
                                <span className="text-sm font-bold text-white font-mono">
                                  {formatBTCEquivalent(item.price)} BTC
                                </span>
                                <span className="text-xs text-gray-400 ml-1">
                                  ≈ ${formatUSD(item.price)}
                                </span>
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
                              <span className="text-sm font-bold text-theme-cyan font-mono">
                                {formatBTCEquivalent(parseFloat(item.price) * item.quantity)} BTC
                              </span>
                              <span className="text-xs text-gray-400 ml-1">
                                ≈ ${(parseFloat(item.price) * item.quantity).toFixed(2)}
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
              <div className="border-t border-white/5 p-6 space-y-6 bg-[#0E1A26]">
                {/* Total */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Vault Value</span>
                  <div className="flex flex-col items-end">
                    <span className="text-xl font-black text-theme-cyan font-mono">
                      {formatBTCEquivalent(getTotalPrice())} BTC
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                      ≈ ${getTotalPrice().toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={handleCheckout}
                    className="w-full bg-theme-red hover:bg-[#850231] text-white text-xs font-bold uppercase tracking-widest py-6 shadow-lg shadow-theme-red/20 transition-all active:scale-[0.98]"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Initiate Checkout
                  </Button>

                  <Button
                    onClick={handleClearCart}
                    variant="outline"
                    className="w-full border-white/10 text-gray-400 hover:bg-white/5 text-xs font-bold uppercase tracking-widest py-6 transition-all"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Vault
                  </Button>
                </div>
                <p className="text-[9px] text-gray-600 text-center uppercase tracking-[0.2em] font-bold">
                  Secure Anonymous Transaction • Escrow Protected
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      );
};

      export default CartSidebar;
