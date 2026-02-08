import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { orderService, Order } from '@/services/orderService';
import { orderExpirationService } from '@/services/orderExpirationService';
import { useToast } from '@/hooks/use-toast';

interface PendingOrderContextType {
  activeOrder: Order | null;
  timeRemaining: number;
  pendingOrdersCount: number;
  refreshPendingOrders: () => Promise<void>;
}

const PendingOrderContext = createContext<PendingOrderContextType | undefined>(undefined);

export function PendingOrderProvider({ children }: { children: ReactNode }) {
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const { toast } = useToast();

  const refreshPendingOrders = async () => {
    try {
      const response = await orderService.getOrders();
      if (response && Array.isArray(response)) {
        const orders = response;
        const pendingOrders = orders.filter((order: Order) =>
          (order.payment_status === 'pending' || order.payment_status === 'pending_payment') &&
          (order.order_status === 'pending_payment' || order.order_status === 'pending')
        );

        if (pendingOrders.length > 0) {
          const sortedPending = pendingOrders.sort((a: Order, b: Order) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          const lastOrder = sortedPending[0];

          setActiveOrder(lastOrder);
          setPendingOrdersCount(pendingOrders.length);

          const orderCreatedAt = new Date(lastOrder.created_at).getTime();
          const expiresAt = orderCreatedAt + (120 * 60 * 1000); // 2 hours
          const now = Date.now();
          const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));

          setTimeRemaining(remainingSeconds);

          // Start global expiration monitoring
          orderExpirationService.startMonitoring(
            lastOrder.id.toString(),
            lastOrder.created_at,
            async (orderId) => {
              // Order expired
              try {
                await orderService.expireOrder(orderId);
                toast({
                  title: "Order Expired",
                  description: "Your order has expired due to payment timeout",
                  variant: "destructive",
                });
                // Refresh pending orders
                await refreshPendingOrders();
              } catch (error) {
                console.error('Error expiring order:', error);
              }
            }
          );
        } else {
          setActiveOrder(null);
          setPendingOrdersCount(0);
          setTimeRemaining(0);
        }
      }
    } catch (error) {
      console.error('Error fetching pending orders:', error);
    }
  };

  // Fetch pending orders on mount and when payment status changes
  useEffect(() => {
    refreshPendingOrders();

    // Listen for payment confirmation events
    const handlePaymentConfirmed = () => {
      refreshPendingOrders();
    };

    // Listen for order updates
    const handleOrderUpdate = () => {
      refreshPendingOrders();
    };

    window.addEventListener('payment_confirmed', handlePaymentConfirmed);
    window.addEventListener('order_created', handleOrderUpdate);
    window.addEventListener('order_updated', handleOrderUpdate);

    // Refresh every 10 seconds to check for new orders or status changes (more frequent for real-time updates)
    const interval = setInterval(refreshPendingOrders, 10000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('payment_confirmed', handlePaymentConfirmed);
      window.removeEventListener('order_created', handleOrderUpdate);
      window.removeEventListener('order_updated', handleOrderUpdate);
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (activeOrder && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [activeOrder, timeRemaining]);

  return (
    <PendingOrderContext.Provider value={{ activeOrder, timeRemaining, pendingOrdersCount, refreshPendingOrders }}>
      {children}
    </PendingOrderContext.Provider>
  );
}

export function usePendingOrder() {
  const context = useContext(PendingOrderContext);
  if (context === undefined) {
    throw new Error('usePendingOrder must be used within a PendingOrderProvider');
  }
  return context;
}

