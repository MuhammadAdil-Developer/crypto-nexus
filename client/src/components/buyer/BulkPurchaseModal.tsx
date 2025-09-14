import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, CreditCard, Package, Bitcoin } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import PaymentModal from './PaymentModal';
import { orderService } from '@/services/orderService';
import { useToast } from '@/hooks/use-toast';

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
  accepted_cryptocurrencies?: string[];
  escrow_available?: boolean;
}

const BulkPurchaseModal: React.FC<BulkPurchaseModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const { cartItems, getTotalPrice, getTotalItems, clearCart } = useCart();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
  const [isCreatingOrders, setIsCreatingOrders] = React.useState(false);
  const { toast } = useToast();

  // Create a combined product for payment modal
  const combinedProduct: BulkProduct | null = cartItems.length > 0 ? {
    id: 999999, // Special ID for bulk purchase
    listing_title: `Bulk Purchase (${getTotalItems()} items)`,
    price: getTotalPrice().toString(),
    vendor: {
      username: 'Multiple Vendors'
    },
    accepted_cryptocurrencies: ['BTC', 'ETH', 'LTC'],
    escrow_available: true
  } : null;

  const handlePayNow = async () => {
    try {
      setIsCreatingOrders(true);
      
      // Create individual orders for each cart item
      const orderPromises = cartItems.map(async (item) => {
        return await orderService.createOrder({
          product_id: item.id,
          quantity: item.quantity,
          crypto_currency: 'BTC', // Default to BTC, user can change in payment modal
          use_escrow: true
        });
      });
      
      // Wait for all orders to be created
      const createdOrders = await Promise.all(orderPromises);
      
      console.log('Bulk orders created:', createdOrders);
      
      // Clear cart after successful order creation
      clearCart();
      
      toast({
        title: "Orders Created Successfully",
        message: `${createdOrders.length} orders have been created and are ready for payment`
      });
      
      // Open payment modal for the first order (or we can create a combined payment)
      setIsPaymentModalOpen(true);
      
    } catch (error) {
      console.error('Failed to create bulk orders:', error);
      toast({
        title: "Order Creation Failed",
        message: "Failed to create orders. Please try again."
      });
    } finally {
      setIsCreatingOrders(false);
    }
  };

  const handlePaymentClose = () => {
    setIsPaymentModalOpen(false);
  };

  const handlePaymentBack = () => {
    setIsPaymentModalOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative w-full max-w-2xl bg-gray-900 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Bulk Purchase ({getTotalItems()} items)
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {cartItems.map((item) => (
              <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                <div className="w-12 h-12 bg-gray-700 rounded overflow-hidden">
                  {item.main_images?.[0] ? (
                    <img src={item.main_images[0]} alt={item.listing_title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">📦</div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-medium">{item.listing_title}</h4>
                  <p className="text-gray-400 text-sm">Qty: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold">{(parseFloat(item.price) * item.quantity).toFixed(8)} BTC</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-700 pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xl font-bold text-white">Total Amount:</span>
              <span className="text-2xl font-bold text-blue-400">{getTotalPrice().toFixed(8)} BTC</span>
            </div>
            
            <div className="flex space-x-3">
              <Button onClick={onClose} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handlePayNow} 
                disabled={isCreatingOrders}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isCreatingOrders ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Orders...
                  </>
                ) : (
                  <>
                    <Bitcoin className="w-4 h-4 mr-2" />
                    Pay Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Payment Modal */}
      {combinedProduct && (
        <PaymentModal
          product={combinedProduct}
          isOpen={isPaymentModalOpen}
          onClose={handlePaymentClose}
          onBack={handlePaymentBack}
        />
      )}
    </div>
  );
};

export default BulkPurchaseModal;
