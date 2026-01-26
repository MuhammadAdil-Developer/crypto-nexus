import { useState, useEffect, useRef } from "react";
import { MoreVertical, Package, Truck, CheckCircle, XCircle, Clock, Shield, Key, Lock, Star, AlertTriangle, Timer, RefreshCw, Copy, Wallet, Loader2, DollarSign, Calendar, User, Info, MessageSquare, Gift } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Order as ServiceOrder, orderService } from "@/services/orderService";

export interface Order extends ServiceOrder {
  is_giveaway?: boolean;
}
import { OrderProductModal } from "./OrderProductModal";
import { useToast } from "@/hooks/use-toast";
import { formatCryptoAmountInString } from "@/lib/utils";
import { useCryptoPrices } from "@/contexts/PriceContext";
import { getApiUrl } from "@/config/api";
import { ReviewModal } from "./ReviewModal";
import { RequestRefundModal } from "./RequestRefundModal";
import { useNavigate } from "react-router-dom";
import { refundService } from "@/services/refundService";

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case "completed":
      return <CheckCircle className="w-4 h-4" />;
    case "shipped":
      return <Truck className="w-4 h-4" />;
    case "processing":
    case "pending":
    case "pending_payment":
      return <Clock className="w-4 h-4" />;
    case "cancelled":
      return <XCircle className="w-4 h-4" />;
    default:
      return <Package className="w-4 h-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "completed":
      return "text-green-400 bg-green-900/20";
    case "shipped":
      return "text-yellow-400 bg-yellow-900/20";
    case "processing":
      return "text-theme-cyan bg-theme-cyan-dim";
    case "pending":
      return "text-yellow-400 bg-yellow-900/20";
    case "pending_payment":
      return "text-yellow-300 bg-yellow-200/20";
    case "cancelled":
      return "text-red-400 bg-red-900/20";
    default:
      return "text-gray-400 bg-gray-900/20";
  }
};

const getStatusDisplay = (status: string) => {
  switch (status.toLowerCase()) {
    case "completed":
      return "Delivered";
    case "shipped":
      return "In Transit";
    case "processing":
      return "Processing";
    case "pending":
      return "Pending";
    case "pending_payment":
      return "Pending Payment";
    case "cancelled":
      return "Cancelled";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

interface OrdersTableProps {
  compact?: boolean;
  orders?: Order[];
  onOrderUpdate?: () => void; // Callback to refresh orders
}

export function OrdersTable({ compact = false, orders = [], onOrderUpdate }: OrdersTableProps) {
  const [selectedProduct, setSelectedProduct] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scrollToCredentials, setScrollToCredentials] = useState(false);
  const [isApproving, setIsApproving] = useState<string | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewProductId, setReviewProductId] = useState<number | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [orderToConfirm, setOrderToConfirm] = useState<Order | null>(null);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [orderForRefund, setOrderForRefund] = useState<Order | null>(null);
  const [timers, setTimers] = useState<Record<string, number>>({});
  const [expiredOrders, setExpiredOrders] = useState<Set<string>>(new Set());
  const [refundRequests, setRefundRequests] = useState<Record<string, any>>({});
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { btc: btcPrice, xmr: xmrPrice } = useCryptoPrices();
  const displayOrders = compact ? orders.slice(0, 3) : orders;
  const intervalRefs = useRef<Record<string, NodeJS.Timeout>>({});

  const getCorrectedAmounts = (order: Order) => {
    const currency = order.crypto_currency || 'BTC';
    const amountStr = order.total_amount;
    const amount = parseFloat(amountStr);

    if (order.is_giveaway || amount === 0) {
      return { crypto: 0, usd: 0, currency };
    }

    // Default rates if we need to convert USD -> Crypto
    const rates: Record<string, number> = {
      'BTC': btcPrice || 100000,
      'XMR': xmrPrice || 170
    };
    const rate = rates[currency] || (rates['BTC'] || 100000);

    let cryptoAmount = amount;
    let usdAmount = amount * rate;

    // Heuristic: If amount is suspiciously large for crypto, assume it's USD
    // For BTC, > 50 is probably USD.
    // For XMR, we look at both amount and precision.
    // XMR amounts like 0.00588235 have high precision.
    // USD amounts like 1.00 or 5.0 have low precision.
    const decimalPlaces = (amountStr.split('.')[1] || '').length;

    let isProbablyUsd = false;
    if (currency === 'BTC') {
      isProbablyUsd = amount > 50;
    } else if (currency === 'XMR') {
      // If it looks like a flat USD amount (e.g. 1.0, 10.0) 
      // instead of a fractional XMR amount (e.g. 0.0058823)
      isProbablyUsd = amount >= 0.1 && decimalPlaces <= 4;
    }

    if (isProbablyUsd) {
      usdAmount = amount;
      cryptoAmount = amount / rate;
    }

    return { crypto: cryptoAmount, usd: usdAmount, currency };
  };

  // Calculate time remaining for pending orders
  const calculateTimeRemaining = (order: Order): number => {
    if (expiredOrders.has(order.id.toString())) {
      return 0;
    }

    // Check if order is pending payment
    const isPending = (order.payment_status === 'pending' || order.payment_status === 'pending_payment') &&
      (order.order_status === 'pending_payment' || order.order_status === 'pending');

    if (!isPending) {
      return 0;
    }

    const orderCreatedAt = new Date(order.created_at).getTime();
    const expiresAt = orderCreatedAt + (120 * 60 * 1000); // 2 hours
    const now = Date.now();
    const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));

    return remainingSeconds;
  };

  // Format time remaining as MM:SS
  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle order expiration
  const handleOrderExpire = async (order: Order) => {
    if (expiredOrders.has(order.id.toString())) {
      return; // Already expired
    }

    try {
      await orderService.expireOrder(order.id.toString());
      setExpiredOrders(prev => new Set(prev).add(order.id.toString()));

      toast({
        title: "Order Expired",
        description: `Order #${order.order_id} has been expired due to payment timeout.`,
        variant: "destructive",
      });

      // Refresh orders list
      if (onOrderUpdate) {
        onOrderUpdate();
      } else {
        // Fallback: reload page
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Error expiring order:', error);
      toast({
        title: "Error",
        description: "Failed to expire order. Please refresh the page.",
        variant: "destructive",
      });
    }
  };

  // Initialize and manage timers for all pending orders
  useEffect(() => {
    // Clear all existing intervals
    Object.values(intervalRefs.current).forEach(interval => clearInterval(interval));
    intervalRefs.current = {};

    // Initialize timers for pending orders
    const pendingOrders = displayOrders.filter(order => {
      const isPending = (order.payment_status === 'pending' || order.payment_status === 'pending_payment') &&
        (order.order_status === 'pending_payment' || order.order_status === 'pending');
      return isPending && !expiredOrders.has(order.id.toString());
    });

    const newTimers: Record<string, number> = {};

    pendingOrders.forEach(order => {
      const timeRemaining = calculateTimeRemaining(order);
      newTimers[order.id.toString()] = timeRemaining;

      // Set up interval for this order - AGGRESSIVE: Check every 100ms for immediate expiration
      const interval = setInterval(() => {
        setTimers(prev => {
          const current = prev[order.id.toString()] || 0;

          // Recalculate time remaining to ensure accuracy
          const actualTimeRemaining = calculateTimeRemaining(order);
          const newTime = Math.max(0, actualTimeRemaining);

          // AGGRESSIVE: If timer reaches 0 or is already 0, expire immediately
          if (newTime === 0 && !expiredOrders.has(order.id.toString())) {
            // Clear this interval immediately to prevent multiple calls
            if (intervalRefs.current[order.id.toString()]) {
              clearInterval(intervalRefs.current[order.id.toString()]);
              delete intervalRefs.current[order.id.toString()];
            }

            // Mark as expired immediately to prevent duplicate calls
            setExpiredOrders(prev => new Set(prev).add(order.id.toString()));

            // Call expire order IMMEDIATELY - no delay
            console.log(`⏰ Timer reached 0 for order ${order.id}, expiring immediately...`);
            orderService.expireOrder(order.id.toString())
              .then((response) => {
                console.log('✅ Order expired successfully:', response);
                toast({
                  title: "Order Expired",
                  description: `Order #${order.order_id} has been expired due to payment timeout.`,
                  variant: "destructive",
                });

                // Force immediate UI update
                setTimers(prev => ({
                  ...prev,
                  [order.id.toString()]: 0
                }));

                // Refresh orders immediately
                if (onOrderUpdate) {
                  setTimeout(() => {
                    onOrderUpdate();
                  }, 500); // Small delay to ensure backend processed
                } else {
                  setTimeout(() => {
                    window.location.reload();
                  }, 500);
                }
              })
              .catch((error: any) => {
                console.error('❌ Error expiring order:', error);
                // Remove from expired set so it can retry
                setExpiredOrders(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(order.id.toString());
                  return newSet;
                });
                toast({
                  title: "Error",
                  description: error.response?.data?.error || "Failed to expire order. Please refresh the page.",
                  variant: "destructive",
                });
              });

            return {
              ...prev,
              [order.id.toString()]: 0
            };
          }

          return {
            ...prev,
            [order.id.toString()]: newTime
          };
        });
      }, 100); // Check every 100ms for more aggressive expiration

      intervalRefs.current[order.id.toString()] = interval;
    });

    setTimers(newTimers);

    // Cleanup on unmount
    return () => {
      Object.values(intervalRefs.current).forEach(interval => clearInterval(interval));
      intervalRefs.current = {};
    };
  }, [displayOrders, expiredOrders, onOrderUpdate, toast]);

  // Update timers when orders change
  useEffect(() => {
    const newTimers: Record<string, number> = {};
    displayOrders.forEach(order => {
      if (!expiredOrders.has(order.id.toString())) {
        newTimers[order.id.toString()] = calculateTimeRemaining(order);
      }
    });
    setTimers(prev => ({ ...prev, ...newTimers }));
  }, [orders]);

  const handleViewDetails = (order: Order, scrollToCreds = false) => {
    setSelectedProduct(order);
    setScrollToCredentials(scrollToCreds);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
    setScrollToCredentials(false);
  };

  const handleLeaveReview = (order: Order) => {
    if (order.product && order.product.id) {
      setReviewProductId(order.product.id);
      setIsReviewOpen(true);
    } else {
      toast({
        title: "Error",
        description: "Cannot find product information for this order",
        variant: "destructive",
      });
    }
  };

  const handleCreateDispute = (order: Order) => {
    navigate(`/buyer/create-dispute?orderId=${order.id}`);
  };

  const handleMessageSeller = (order: Order) => {
    if (!order.product || !order.vendor) {
      toast({
        title: "Error",
        description: "Cannot message seller: missing product or vendor info",
        variant: "destructive",
      });
      return;
    }

    console.log('Navigating to messages with:', {
      autoOpenProductId: order.product.id,
      autoOpenRecipientId: order.vendor.id,
      autoOpenRecipientUsername: order.vendor.username,
      autoOpenOrderId: order.order_id
    });

    navigate('/buyer/messages', {
      state: {
        autoOpenProductId: order.product.id,
        autoOpenRecipientId: order.vendor.id,
        autoOpenRecipientUsername: order.vendor.username,
        autoOpenOrderId: order.order_id
      }
    });
  };

  useEffect(() => {
    // Fetch refund requests for all orders
    const fetchRefundRequests = async () => {
      try {
        const result = await refundService.getBuyerRefundRequests(1, 100);
        if (result.success && result.data) {
          const refundMap: Record<string, any> = {};
          result.data.forEach((refund: any) => {
            refundMap[refund.order_id] = refund;
          });
          setRefundRequests(refundMap);
        }
      } catch (error) {
        console.error('Error fetching refund requests:', error);
      }
    };
    fetchRefundRequests();
  }, []);

  const handleRequestRefund = (order: Order) => {
    // Check if order is already refunded
    if (order.order_status === 'refunded') {
      toast({
        title: "Already Refunded",
        description: "This order has already been refunded.",
        variant: "destructive",
      });
      return;
    }

    // Check if there's already a pending refund request
    const existingRefund = refundRequests[order.order_id];
    if (existingRefund) {
      if (existingRefund.status === 'pending_vendor' || existingRefund.status === 'pending_admin' || existingRefund.status === 'disputed') {
        toast({
          title: "Pending Refund Request",
          description: "You already have a pending refund request for this order. Please wait until the vendor approves it or open a dispute if the estimated time is up.",
          variant: "destructive",
        });
        return;
      }
      if (existingRefund.status === 'completed' || existingRefund.status === 'vendor_approved') {
        toast({
          title: "Already Processed",
          description: "A refund request for this order has already been processed.",
          variant: "destructive",
        });
        return;
      }
    }

    setOrderForRefund(order);
    setRefundModalOpen(true);
  };

  const handleRefundSuccess = () => {
    // Refresh refund requests
    refundService.getBuyerRefundRequests(1, 100).then(result => {
      if (result.success && result.data) {
        const refundMap: Record<string, any> = {};
        result.data.forEach((refund: any) => {
          refundMap[refund.order_id] = refund;
        });
        setRefundRequests(refundMap);
      }
    });

    if (onOrderUpdate) {
      onOrderUpdate();
    } else {
      window.location.reload();
    }
  };

  const handleApproveOrderClick = (order: Order) => {
    setOrderToConfirm(order);
    setConfirmModalOpen(true);
  };

  const handleApproveOrder = async (order: Order) => {
    try {
      setIsApproving(order.order_id);

      // Call the order confirmation API
      const response = await fetch(getApiUrl(`/orders/${order.id}/confirm/`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast({
          title: "Order Approved!",
          description: "Payment has been released to the vendor. Thank you for your purchase!",
        });

        // Refresh the page to update order status
        window.location.reload();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to approve order",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error approving order:', error);
      toast({
        title: "Error",
        description: "Failed to approve order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsApproving(null);
    }
  };

  const confirmOrderApproval = async () => {
    if (!orderToConfirm) return;

    await handleApproveOrder(orderToConfirm);
    setConfirmModalOpen(false);
    setOrderToConfirm(null);
  };

  const handleCancelOrderClick = (order: Order) => {
    setOrderToCancel(order);
    setCancelModalOpen(true);
  };

  const confirmCancelOrder = async () => {
    if (!orderToCancel) return;

    try {
      setIsCancelling(true);
      await orderService.cancelOrder(orderToCancel.id.toString(), "Buyer cancelled manually");

      toast({
        title: "Order Cancelled",
        description: "Your order has been cancelled successfully.",
      });

      if (onOrderUpdate) {
        onOrderUpdate();
      } else {
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel order",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
      setCancelModalOpen(false);
      setOrderToCancel(null);
    }
  };

  return (
    <>
      <Card className="border border-gray-700 bg-gray-900">
        {!compact && (
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-white">
                Your Orders
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/buyer/my-reviews')}
                className="text-theme-cyan border-theme-cyan hover:bg-theme-cyan hover:text-black"
              >
                <Star className="w-4 h-4 mr-2" />
                My Reviews
              </Button>
            </div>
          </CardHeader>
        )}
        <CardContent className={compact ? "p-0" : ""}>
          <div className="space-y-4">
            {displayOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No orders found</h3>
                <p className="text-gray-400">You haven't placed any orders yet.</p>
              </div>
            ) : (
              displayOrders.map((order) => {
                const orderDate = new Date(order.created_at);
                const formattedDate = orderDate.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                });

                // Refund & Dispute Logic
                const existingRefund = refundRequests[order.order_id];
                const isRefunded = order.order_status === 'refunded';
                const hasPendingRefund = existingRefund &&
                  (existingRefund.status === 'pending_vendor' ||
                    existingRefund.status === 'pending_admin' ||
                    existingRefund.status === 'disputed');

                const canRequestRefund = (order.order_status === "paid" ||
                  order.order_status === "delivered" ||
                  order.order_status === "confirmed" ||
                  order.order_status === "processing") &&
                  !isRefunded &&
                  !hasPendingRefund;

                // Dispute Logic:
                // 1. Must be Escrow
                // 2. Status must be paid, delivered, or confirmed
                // 3. Must be within the 72-hour window since delivery/created
                // 4. No existing dispute
                const disputeWindowHours = 72;
                const referenceTime = order.delivered_at || order.confirmed_at || order.created_at;
                const hoursSinceReference = (new Date().getTime() - new Date(referenceTime).getTime()) / (1000 * 60 * 60);
                const isWithinWindow = hoursSinceReference <= disputeWindowHours;

                const canCreateDispute = order.use_escrow &&
                  (order.order_status === "paid" || order.order_status === "delivered" || order.order_status === "confirmed") &&
                  !order.dispute_opened &&
                  isWithinWindow;

                return (
                  <div
                    key={order.id}
                    className="group relative overflow-hidden bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 sm:p-5 hover:bg-gray-800/60 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/5"
                  >
                    <div className="flex flex-col space-y-4">
                      {/* --- HEADER ROW --- */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4 min-w-0">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${getStatusColor(order.order_status)}`}>
                            {getStatusIcon(order.order_status)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-white text-base sm:text-lg truncate group-hover:text-blue-400 transition-colors">
                              {order.product?.headline || "Product Details"}
                            </h4>
                            <div className="flex items-center text-xs text-gray-400 mt-1 space-x-2">
                              <span className="flex items-center"><User className="w-3 h-3 mr-1" /> {order.vendor?.username || "Unknown"}</span>
                              <span>•</span>
                              <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {formattedDate}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center flex-wrap gap-2 justify-end max-w-[50%]">
                          <Badge
                            className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold tracking-wider uppercase border whitespace-nowrap ${getStatusColor(order.order_status)}`}
                            variant="outline"
                          >
                            {getStatusDisplay(order.order_status)}
                          </Badge>

                          {(order.is_giveaway || parseFloat(order.total_amount) === 0) && (
                            <Badge className="bg-cyan-500 text-black border-none text-[9px] sm:text-[10px] px-2 py-0.5 sm:px-3 sm:py-1 font-black">
                              GIVEAWAY
                            </Badge>
                          )}



                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-full hover:bg-gray-700">
                                <MoreVertical className="w-4 h-4 text-gray-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-gray-900 border-gray-700">
                              <DropdownMenuItem onClick={() => handleViewDetails(order, false)} className="text-gray-300">
                                <Info className="w-4 h-4 mr-2" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleMessageSeller(order)} className="text-gray-300">
                                <MessageSquare className="w-4 h-4 mr-2" /> Message Seller
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleLeaveReview(order)} className="text-gray-300">
                                <Star className="w-4 h-4 mr-2" /> Leave Review
                              </DropdownMenuItem>

                              {canRequestRefund && (
                                <DropdownMenuItem onClick={() => handleRequestRefund(order)} className="text-blue-400">
                                  <RefreshCw className="w-4 h-4 mr-2" /> Request Refund
                                </DropdownMenuItem>
                              )}

                              {isRefunded && (
                                <DropdownMenuItem disabled className="text-gray-500 opacity-50">
                                  <RefreshCw className="w-4 h-4 mr-2" /> Already Refunded
                                </DropdownMenuItem>
                              )}

                              {hasPendingRefund && (
                                <DropdownMenuItem disabled className="text-yellow-500/70">
                                  <RefreshCw className="w-4 h-4 mr-2" /> Refund Status: {existingRefund.status}
                                </DropdownMenuItem>
                              )}

                              {canCreateDispute && (
                                <DropdownMenuItem onClick={() => handleCreateDispute(order)} className="text-orange-500">
                                  <AlertTriangle className="w-4 h-4 mr-2" /> Create Dispute
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* --- DETAILS GRID --- */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3 border-y border-gray-700/30">
                        {/* LEFT COL: Payment Info */}
                        <div className="space-y-3">
                          {order.payment_address && !order.is_giveaway && (
                            <div className="flex flex-col space-y-1.5 p-3 bg-black/20 rounded-xl border border-gray-700/30">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center">
                                  <Wallet className="w-3 h-3 mr-1" /> Payment Address
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const text = order.payment_address;
                                    // Fallback for HTTP (non-HTTPS) contexts
                                    if (!navigator.clipboard && document.execCommand) {
                                      const textArea = document.createElement("textarea");
                                      textArea.value = text;
                                      textArea.style.position = "fixed";
                                      document.body.appendChild(textArea);
                                      textArea.focus();
                                      textArea.select();
                                      try {
                                        const successful = document.execCommand('copy');
                                        if (successful) {
                                          toast({ title: "Copied!", description: "Address copied to clipboard" });
                                        } else {
                                          toast({ title: "Error", description: "Failed to copy address", variant: "destructive" });
                                        }
                                      } catch (err) {
                                        toast({ title: "Error", description: "Failed to copy address", variant: "destructive" });
                                      }
                                      document.body.removeChild(textArea);
                                    } else {
                                      navigator.clipboard.writeText(text).then(() => {
                                        toast({ title: "Copied!", description: "Address copied to clipboard" });
                                      }).catch(() => {
                                        toast({ title: "Error", description: "Failed to copy address", variant: "destructive" });
                                      });
                                    }
                                  }}
                                  className="p-1 hover:bg-gray-600 rounded-md transition-colors"
                                >
                                  <Copy className="w-3 h-3 text-gray-400 hover:text-white" />
                                </button>
                              </div>
                              <span className="text-xs font-mono text-blue-400 break-all leading-relaxed">
                                {order.payment_address}
                              </span>
                            </div>
                          )}

                          {order.is_giveaway && (
                            <div className="flex flex-col space-y-1.5 p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                              <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest flex items-center">
                                <Gift className="w-3 h-3 mr-1" /> Giveaway Claim
                              </span>
                              <span className="text-xs text-cyan-400/80 leading-relaxed font-medium">
                                Free promotional order. No payment required.
                              </span>
                            </div>
                          )}

                          {/* Timer indicator */}
                          {(order.payment_status === 'pending' || order.payment_status === 'pending_payment') &&
                            (order.order_status === 'pending_payment' || order.order_status === 'pending') &&
                            !expiredOrders.has(order.id.toString()) && (
                              <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                                <Timer className="w-4 h-4 text-yellow-400 animate-pulse" />
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-yellow-500/70 font-bold uppercase tracking-widest">Expires In</span>
                                  <span className={`text-sm font-black ${(timers[order.id.toString()] || 0) <= 300 ? 'text-red-400' : 'text-yellow-400'}`}>
                                    {formatTime(timers[order.id.toString()] || calculateTimeRemaining(order))}
                                  </span>
                                </div>
                              </div>
                            )}
                        </div>

                        {/* RIGHT COL: Amount Info */}
                        <div className="flex flex-col justify-center items-end sm:items-end space-y-1">
                          {(() => {
                            const isGiveaway = order.is_giveaway || parseFloat(order.total_amount) === 0;
                            const { crypto: displayCrypto, usd: displayUsd, currency } = getCorrectedAmounts(order);

                            if (isGiveaway) {
                              return (
                                <div className="text-right">
                                  <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest block mb-1">PROMOTIONAL GIVEAWAY</span>
                                  <p className="text-xl sm:text-2xl font-black text-cyan-400 tracking-tight">
                                    FREE
                                  </p>
                                  <p className="text-[10px] font-bold text-gray-500 mt-0.5 uppercase tracking-tighter">
                                    Instant Claim • $0.00
                                  </p>
                                </div>
                              );
                            }

                            const decimals = currency === 'XMR' ? 4 : 8;
                            const formattedCrypto = formatCryptoAmountInString(`${displayCrypto.toFixed(decimals)} ${currency}`);
                            return (
                              <div className="text-right">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Total Amount</span>
                                <p className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                  {formattedCrypto}
                                </p>
                                <p className="text-sm font-medium text-theme-cyan/80">
                                  ≈ ${displayUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* --- FOOTER ACTIONS --- */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {order.use_escrow && (
                          <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 text-[10px] rounded-lg">
                            <Shield className="w-3 h-3 mr-1" /> ESCROW PROTECTED
                          </Badge>
                        )}

                        <div className="flex-1" />

                        <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto mt-1 sm:mt-0 justify-end">
                          {/* Cancel Button */}
                          {(order.order_status === "pending_payment" || order.order_status === "pending") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1 sm:flex-initial text-red-400 hover:text-red-300 hover:bg-red-400/10 border border-red-400/20 rounded-xl font-bold text-xs"
                              onClick={() => handleCancelOrderClick(order)}
                            >
                              <XCircle className="w-3 h-3 mr-2" /> Cancel
                            </Button>
                          )}

                          {/* Review Button - Only show after confirmed/completed to reduce clutter */}
                          {(order.order_status === "confirmed" || order.order_status === "completed") && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 sm:flex-initial border-theme-cyan/40 text-theme-cyan hover:bg-theme-cyan hover:text-black rounded-xl font-bold text-xs shadow-lg shadow-theme-cyan/5"
                              onClick={() => handleLeaveReview(order)}
                            >
                              <Star className="w-3 h-3 mr-2" /> Review
                            </Button>
                          )}

                          {/* Escrow Approve Button - Show for Paid or Delivered orders */}
                          {order.use_escrow && (order.order_status === 'paid' || order.order_status === 'delivered') && (
                            <Button
                              onClick={() => handleApproveOrderClick(order)}
                              disabled={isApproving === order.order_id}
                              className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-green-500/20 h-9 px-4"
                            >
                              {isApproving === order.order_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-2" /> Approve Escrow</>}
                            </Button>
                          )}

                          {/* Deliver/Credentials Section */}
                          {(order.order_status === "delivered" || order.order_status === "paid" || order.order_status === "confirmed" || order.order_status === "completed" || (order.product_credentials && Object.keys(order.product_credentials).length > 0)) && (() => {
                            // Check if this is manual delivery
                            const deliveryTime = (order.product?.delivery_time || '').toLowerCase();
                            const deliveryMethod = (order.product?.delivery_method || '').toLowerCase();
                            const isManualDelivery = deliveryTime.includes('manual') || deliveryMethod.includes('manual');
                            const hasCredentials = order.product_credentials && Object.keys(order.product_credentials).length > 0;

                            if (isManualDelivery && !hasCredentials) {
                              // Manual delivery without credentials yet
                              return (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                                  <span className="text-[10px] sm:text-xs text-amber-400/80 flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Credentials will be delivered manually
                                  </span>
                                  <button
                                    onClick={() => handleMessageSeller(order)}
                                    className="text-theme-cyan text-[10px] sm:text-xs underline hover:text-cyan-300 transition-colors font-medium flex items-center"
                                  >
                                    <MessageSquare className="w-3 h-3 mr-1" />
                                    Contact Vendor
                                  </button>
                                </div>
                              );
                            }

                            // Auto delivery OR manual with credentials available
                            return (
                              <button
                                onClick={() => handleViewDetails(order, true)}
                                className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm underline font-medium transition-colors flex items-center gap-1"
                              >
                                <Key className="w-3 h-3" />
                                View Credentials
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product Detail Modal */}
      {
        isModalOpen && selectedProduct && (
          <OrderProductModal
            order={selectedProduct}
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            scrollToCredentials={scrollToCredentials}
          />
        )
      }

      {/* Review Modal */}
      {
        isReviewOpen && reviewProductId && (
          <ReviewModal
            productId={reviewProductId}
            isOpen={isReviewOpen}
            onClose={() => {
              setIsReviewOpen(false);
              setReviewProductId(null);
            }}
            onSuccess={() => {
              setIsReviewOpen(false);
              setReviewProductId(null);
              toast({
                title: "Review Submitted!",
                description: "Thank you for your feedback. The vendor will be notified.",
              });
            }}
          />
        )
      }

      {/* Order Confirmation Modal */}
      {
        confirmModalOpen && orderToConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Confirm Order Approval</h3>
                  <p className="text-sm text-gray-400">Release escrow payment to vendor</p>
                </div>
              </div>

              {orderToConfirm.use_escrow && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-red-300 font-semibold text-sm">Final Confirmation Required</span>
                  </div>
                  <p className="text-red-200 text-sm mb-2">
                    By confirming this order, you acknowledge that you have received the product in satisfactory condition.
                  </p>
                  <p className="text-red-200 text-sm font-semibold mb-2">
                    After confirmation, you will not be able to:
                  </p>
                  <ul className="text-red-200 text-sm space-y-1 list-disc list-inside mb-2">
                    <li>Request a refund through the platform</li>
                    <li>Open a dispute</li>
                  </ul>
                  <p className="text-red-200 text-xs">
                    The transaction will be considered complete. Any further arrangements must be made directly with the vendor.
                  </p>
                </div>
              )}

              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Vendor:</span>
                  <span className="text-white font-semibold">{orderToConfirm.product?.vendor?.username}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Order ID:</span>
                  <span className="text-white font-mono">{orderToConfirm.order_id}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Product:</span>
                  <span className="text-white">{orderToConfirm.product?.headline}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Amount:</span>
                  <span className="text-green-400 font-bold">
                    {orderToConfirm.total_amount} {orderToConfirm.crypto_currency}
                  </span>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setConfirmModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                  onClick={confirmOrderApproval}
                  disabled={isApproving === orderToConfirm.order_id}
                >
                  {isApproving === orderToConfirm.order_id ? (
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Confirm Release
                </Button>
              </div>
            </div>
          </div>
        )
      }

      {/* Refund Request Modal */}
      {
        orderForRefund && (
          <RequestRefundModal
            open={refundModalOpen}
            onClose={() => {
              setRefundModalOpen(false);
              setOrderForRefund(null);
            }}
            orderId={orderForRefund.order_id}
            orderAmount={orderForRefund.total_amount}
            currency={orderForRefund.crypto_currency}
            onSuccess={handleRefundSuccess}
          />
        )
      }

      {/* Cancel Confirmation Modal */}
      {
        cancelModalOpen && orderToCancel && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Cancel Order?</h3>
                  <p className="text-sm text-gray-400">Are you sure you want to cancel this order?</p>
                </div>
              </div>

              <p className="text-gray-300 text-sm mb-6">
                Order <span className="font-mono text-white">#{orderToCancel.order_id}</span> will be cancelled. This action cannot be undone.
                Any reserved stock will be released back to the marketplace.
              </p>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setCancelModalOpen(false)}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                  disabled={isCancelling}
                >
                  Keep Order
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={confirmCancelOrder}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Confirm Cancel
                </Button>
              </div>
            </div>
          </div>
        )
      }
    </>
  );
}
