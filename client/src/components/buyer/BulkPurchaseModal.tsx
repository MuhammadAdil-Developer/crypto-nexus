import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, CreditCard, Package, Bitcoin, AlertCircle, ShoppingCart, ChevronRight } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import PaymentModal from './PaymentModal';
import { useToast } from '@/hooks/use-toast';
import { formatBTC } from '@/lib/priceUtils';
import { useCryptoPrices } from '@/contexts/PriceContext';

interface BulkPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

// Helper to get the best available image URL from a cart item
function getItemImage(item: any): string | null {
  const candidates = [
    item?.main_images?.[0],
    item?.images?.[0],
    item?.image,
    item?.product_image,
    item?.thumbnail,
  ];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return null;
}

const BulkPurchaseModal: React.FC<BulkPurchaseModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const { btc: btcPrice } = useCryptoPrices();
  const { cartItems, getTotalItems, clearCart } = useCart();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
  const [isCreatingOrders, setIsCreatingOrders] = React.useState(false);
  const { toast } = useToast();

  const calculatedTotal = useMemo(() => {
    return cartItems.reduce((total, item) => {
      const price = parseFloat(item.price) || 0;
      return total + price * item.quantity;
    }, 0);
  }, [cartItems]);

  const handlePayNow = async () => {
    if (cartItems.length === 0) {
      toast({
        title: 'Empty Cart',
        description: 'Please add items to your cart before checkout',
        variant: 'destructive',
      });
      return;
    }
    setIsPaymentModalOpen(true);
  };

  const handlePaymentClose = () => {
    setIsPaymentModalOpen(false);
    onClose();
  };

  const handlePaymentSuccess = () => {
    clearCart();
    setIsPaymentModalOpen(false);
    onClose();
    toast({
      title: 'Payment Processing',
      description: 'Your payment is being processed. Orders will be confirmed shortly.',
    });
  };

  const handlePaymentBack = () => {
    setIsPaymentModalOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg bg-gray-900 border border-gray-700/60 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-700/70 bg-gray-900/95 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-theme-red/15 rounded-xl flex items-center justify-center shrink-0">
              <ShoppingCart className="w-4.5 h-4.5 text-theme-red" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base sm:text-lg leading-tight">Bulk Purchase Summary</h2>
              <p className="text-gray-400 text-xs">{getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'} in cart</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-4 sm:px-6 py-4 space-y-4">

            {/* Cart Items */}
            {cartItems.length === 0 ? (
              <div className="py-10 flex flex-col items-center text-gray-500 gap-3">
                <Package className="w-12 h-12 opacity-30" />
                <p className="text-sm">Your cart is empty</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {cartItems.map((item) => {
                  const itemTotal = (parseFloat(item.price) || 0) * item.quantity;
                  const imageUrl = getItemImage(item);

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 bg-gray-800/60 border border-gray-700/50 rounded-xl hover:border-gray-600/70 transition-colors"
                    >
                      {/* Product Image */}
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-gray-700 shrink-0 ring-1 ring-white/5">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.listing_title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to icon on broken URL
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center');
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-500" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium text-sm truncate leading-tight">{item.listing_title}</h4>
                        <p className="text-gray-500 text-xs mt-0.5 truncate">@{item.vendor?.username || 'Unknown'}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-gray-700 text-gray-300">
                            ×{item.quantity}
                          </Badge>
                          <span className="text-gray-500 text-[10px]">
                            ${parseFloat(item.price).toFixed(2)} each
                          </span>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right shrink-0">
                        <p className="text-white font-bold text-sm font-mono">{formatBTC(itemTotal / (btcPrice || 100000))}</p>
                        <p className="text-gray-500 text-[10px] mt-0.5">${itemTotal.toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Price Breakdown */}
            {cartItems.length > 0 && (
              <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Subtotal ({getTotalItems()} items)</span>
                  <span className="text-white">${calculatedTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Network Fees</span>
                  <span className="text-gray-300 text-xs">Calculated at checkout</span>
                </div>
                <div className="border-t border-gray-700 pt-2.5 flex justify-between items-center">
                  <span className="text-white font-bold">Total</span>
                  <div className="text-right">
                    <p className="text-theme-cyan font-bold text-lg font-mono">{formatBTC(calculatedTotal / (btcPrice || 100000))}</p>
                    <p className="text-gray-400 text-xs">≈ ${calculatedTotal.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Info Note */}
            <div className="flex items-start gap-2.5 bg-theme-cyan/5 border border-theme-cyan/20 rounded-xl p-3.5">
              <AlertCircle className="w-4 h-4 text-theme-cyan shrink-0 mt-0.5" />
              <p className="text-theme-cyan/80 text-xs leading-relaxed">
                Payment will be consolidated into a single address. You'll select your cryptocurrency and protection level in the next step.
              </p>
            </div>
          </div>
        </div>

        {/* Sticky Footer Buttons */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-700/70 bg-gray-900/95 backdrop-blur-sm shrink-0">
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300 text-sm h-11 rounded-xl"
            >
              Continue Shopping
            </Button>
            <Button
              onClick={handlePayNow}
              disabled={isCreatingOrders || cartItems.length === 0}
              className="flex-[2] bg-theme-red hover:bg-theme-red-dark disabled:opacity-50 text-white text-sm h-11 rounded-xl font-semibold"
            >
              {isCreatingOrders ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Proceed to Payment
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

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
