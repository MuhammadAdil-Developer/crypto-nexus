import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, CreditCard, Package, Bitcoin, AlertCircle, ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import PaymentModal from './PaymentModal';
import { orderService } from '@/services/orderService';
import { useToast } from '@/hooks/use-toast';
import { CRYPTO_PRICES, formatBTC } from '@/lib/priceUtils';

interface BulkPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

interface BulkProduct {
  id: number;
  listing_title: string;
  price: string;
  vendor: {
    username: string;
  };
  accepted_crypto?: string[];
  escrow_available?: boolean;
}

const BulkPurchaseModal: React.FC<BulkPurchaseModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const { cartItems, getTotalPrice, getTotalItems, clearCart } = useCart();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
  const [isCreatingOrders, setIsCreatingOrders] = React.useState(false);
  const { toast } = useToast();

  // Calculate total with proper price parsing
  const calculatedTotal = useMemo(() => {
    return cartItems.reduce((total, item) => {
      const price = parseFloat(item.price) || 0;
      return total + (price * item.quantity);
    }, 0);
  }, [cartItems]);

  // Bulk purchase uses real cart items; no combined placeholder ID
  const combinedTitle = cartItems.length > 0 ? `Bulk Purchase (${getTotalItems()} items)` : null;

  const handlePayNow = async () => {
    if (cartItems.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to your cart before checkout",
        variant: "destructive",
      });
      return;
    }

    // Do not create orders here. Open payment modal and let PaymentModal handle order creation after payment selection.
    setIsPaymentModalOpen(true);
  };;

  const handlePaymentClose = () => {
    setIsPaymentModalOpen(false);
    onClose();
  };

  const handlePaymentSuccess = () => {
    clearCart();
    setIsPaymentModalOpen(false);
    onClose();
    toast({
      title: "Payment Processing",
      description: "Your payment is being processed. Orders will be confirmed shortly."
    });
  };

  const handlePaymentBack = () => {
    setIsPaymentModalOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative w-full max-w-2xl bg-gray-900 border-gray-700 max-h-[90vh] overflow-y-auto">
        <CardHeader className="sticky top-0 bg-gray-900 border-b border-gray-700 flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Bulk Purchase Summary
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {/* Items List */}
          <div>
            <h3 className="text-white font-semibold mb-4 flex items-center">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Items in Cart ({getTotalItems()})
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {cartItems.length === 0 ? (
                <div className="p-4 bg-gray-800/50 rounded-lg text-gray-400 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Your cart is empty
                </div>
              ) : (
                cartItems.map((item) => {
                  const itemTotal = (parseFloat(item.price) || 0) * item.quantity;
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                          {item.main_images?.[0] ? (
                            <img src={item.main_images[0]} alt={item.listing_title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                              No Image
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-medium truncate text-sm">{item.listing_title}</h4>
                          <p className="text-gray-400 text-xs">
                            Vendor: {item.vendor?.username || 'Unknown'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              Qty: {item.quantity}
                            </Badge>
                            <span className="text-gray-400 text-xs font-mono">
                              @ {formatBTC(parseFloat(item.price) / (CRYPTO_PRICES.BTC || 100000))} each
                            </span>
                            <span className="text-gray-500 text-xs ml-1">
                              (≈ ${parseFloat(item.price).toFixed(2)})
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-white font-bold text-sm font-mono">{formatBTC(itemTotal / (CRYPTO_PRICES.BTC || 100000))}</p>
                        <p className="text-gray-400 text-xs">≈ ${itemTotal.toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Price Summary */}
          <div className="border-t border-gray-700 pt-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Subtotal:</span>
              <span className="text-white font-medium">${calculatedTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Network Fees:</span>
              <span className="text-white font-medium">Calculated at checkout</span>
            </div>
            <div className="border-t border-gray-600 pt-2 mt-2 flex justify-between items-center">
              <span className="text-xl font-bold text-white">Total:</span>
              <div className="flex flex-col items-end">
                <span className="text-2xl font-bold text-theme-cyan font-mono">{formatBTC(calculatedTotal / (CRYPTO_PRICES.BTC || 100000))}</span>
                <span className="text-sm text-gray-400">≈ ${calculatedTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Info */}
          <div className="bg-theme-cyan-dim border border-theme-cyan/50 rounded-lg p-3">
            <p className="text-theme-cyan text-sm flex items-start">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
              <span>
                Payment will be divided among vendors based on their portions. Click "Proceed to Payment" to continue.
              </span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 bg-gray-800 border-gray-700 hover:bg-gray-700"
            >
              Continue Shopping
            </Button>
            <Button
              onClick={handlePayNow}
              disabled={isCreatingOrders || cartItems.length === 0}
              className="flex-1 bg-theme-red hover:bg-theme-red-dark disabled:opacity-50 text-white"
            >
              {isCreatingOrders ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Proceed to Payment
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Modal */}
      {cartItems.length > 0 && (
        <PaymentModal
          items={cartItems}
          isOpen={isPaymentModalOpen}
          onClose={handlePaymentClose}
          onBack={handlePaymentBack}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default BulkPurchaseModal;
