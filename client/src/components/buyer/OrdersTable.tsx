import { useState, useEffect, useRef } from "react";
import { MoreVertical, Package, Truck, CheckCircle, XCircle, Clock, Shield, Lock, Star, AlertTriangle, Timer, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Order, orderService } from "@/services/orderService";
import { OrderProductModal } from "./OrderProductModal";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/config/api";
import { ReviewModal } from "./ReviewModal";
import { RequestRefundModal } from "./RequestRefundModal";
import { useNavigate } from "react-router-dom";

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
      return "text-blue-400 bg-blue-900/20";
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
  const [isApproving, setIsApproving] = useState<string | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewProductId, setReviewProductId] = useState<number | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [orderToConfirm, setOrderToConfirm] = useState<Order | null>(null);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [orderForRefund, setOrderForRefund] = useState<Order | null>(null);
  const [timers, setTimers] = useState<Record<string, number>>({});
  const [expiredOrders, setExpiredOrders] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const navigate = useNavigate();
  const displayOrders = compact ? orders.slice(0, 3) : orders;
  const intervalRefs = useRef<Record<string, NodeJS.Timeout>>({});

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
    const expiresAt = orderCreatedAt + (30 * 60 * 1000); // 30 minutes
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

  const handleViewDetails = (order: Order) => {
    setSelectedProduct(order);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
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

  const handleRequestRefund = (order: Order) => {
    setOrderForRefund(order);
    setRefundModalOpen(true);
  };

  const handleRefundSuccess = () => {
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
                className="text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-white"
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

                return (
                  <div 
                    key={order.order_id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors duration-200"
                  >
                    <div className="flex items-start sm:items-center space-x-4 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getStatusColor(order.order_status)}`}>
                        {getStatusIcon(order.order_status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white truncate">
                          {order.product.headline}
                        </h4>
                        <p className="text-sm text-gray-400">
                          {order.vendor.username} • {formattedDate}
                        </p>
                        
                        {/* Timer for pending orders */}
                        {(order.payment_status === 'pending' || order.payment_status === 'pending_payment') &&
                         (order.order_status === 'pending_payment' || order.order_status === 'pending') &&
                         !expiredOrders.has(order.id.toString()) && (
                          <div className="mt-2 flex items-center space-x-2">
                            <Timer className="w-4 h-4 text-yellow-400" />
                            <span className={`text-sm font-semibold ${
                              (timers[order.id.toString()] || 0) <= 300 
                                ? 'text-red-400 animate-pulse' 
                                : 'text-yellow-400'
                            }`}>
                              {formatTime(timers[order.id.toString()] || calculateTimeRemaining(order))}
                            </span>
                            <span className="text-xs text-gray-500">remaining to pay</span>
                          </div>
                        )}
                        
                        {/* Expired indicator */}
                        {expiredOrders.has(order.id.toString()) && (
                          <div className="mt-2 flex items-center space-x-2">
                            <XCircle className="w-4 h-4 text-red-400" />
                            <span className="text-sm font-semibold text-red-400">Order Expired</span>
                          </div>
                        )}
                        
                        {/* Credentials Display - For paid, confirmed, and delivered orders */}
                        {order.product_credentials && Object.keys(order.product_credentials).length > 0 && 
                         (order.order_status === 'paid' || order.order_status === 'confirmed' || order.order_status === 'delivered' || order.order_status === 'completed') && (
                          <div className="mt-2">
                            <button 
                              onClick={() => {
                                // Extract credentials data
                                const credentialsData = order.product_credentials.credentials || 'No credentials available';
                                const releaseDate = order.product_credentials.released_at || order.created_at;
                                const productHeadline = order.product.headline || 'product';
                                
                                // Create modal element
                                const modal = document.createElement('div');
                                modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4';
                                modal.style.animation = 'fadeIn 0.2s ease-out';
                                
                                // Add CSS animation
                                const style = document.createElement('style');
                                style.textContent = `
                                  @keyframes fadeIn {
                                    from { opacity: 0; }
                                    to { opacity: 1; }
                                  }
                                  .credentials-hidden { 
                                    filter: blur(4px); 
                                    transition: all 0.3s ease; 
                                  }
                                  .credentials-visible { 
                                    filter: none; 
                                    transition: all 0.3s ease; 
                                  }
                                `;
                                document.head.appendChild(style);
                                
                                modal.innerHTML = `
                                  <div class="bg-gray-900 border border-gray-600/30 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                                    <div class="flex items-center justify-between p-6 border-b border-gray-600/20">
                                      <div>
                                        <h2 class="text-xl font-bold text-white">Product Credentials</h2>
                                        <p class="text-sm text-gray-400 mt-1">${productHeadline}</p>
                                      </div>
                                      <button id="closeModal" class="p-2 hover:bg-gray-700/50 rounded-lg transition-colors">
                                        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                        </svg>
                                      </button>
                                    </div>
                                    
                                    <div class="p-6 overflow-y-auto max-h-[60vh]">
                                      <div class="space-y-6">
                                        <!-- Release Information -->
                                        <div class="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
                                          <div class="flex items-center space-x-2 mb-2">
                                            <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1M8 7h8m-8 0l-2 14h12l-2-14M8 7v1a2 2 0 002 2h4a2 2 0 002-2V7"></path>
                                            </svg>
                                            <span class="text-sm font-medium text-blue-300">Release:</span>
                                          </div>
                                          <p class="text-sm text-gray-300">
                                            <span class="text-gray-400">Released on:</span> 
                                            ${new Date(releaseDate).toLocaleString('en-US', {
                                              year: 'numeric',
                                              month: 'long',
                                              day: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </p>
                                        </div>

                                        <!-- Credentials Section -->
                                        <div class="bg-gray-800/50 rounded-lg p-4">
                                          <div class="flex items-center justify-between mb-4">
                                            <div class="flex items-center space-x-2">
                                              <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2 2 2 0 01-2 2m-2-4a2 2 0 00-2-2m0 0a2 2 0 00-2 2m0 0a2 2 0 002 2m0 0a2 2 0 002-2m0 0a2 2 0 00-2-2m0 0a2 2 0 00-2 2"></path>
                                              </svg>
                                              <span class="text-sm font-medium text-green-300">Account Credentials</span>
                                            </div>
                                            <button id="toggleVisibility" class="flex items-center space-x-2 px-3 py-1 bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 rounded-lg transition-colors text-green-400 hover:text-green-300">
                                              <svg id="eyeIcon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                              </svg>
                                              <span id="toggleText">Show</span>
                                            </button>
                                          </div>
                                          
                                          <div class="relative">
                                            <pre id="credentialsText" class="text-white font-mono text-sm whitespace-pre-wrap break-all p-4 bg-gray-900/50 rounded-lg border border-gray-700/50 credentials-hidden min-h-[100px] overflow-auto">${credentialsData}</pre>
                                            <div id="blurOverlay" class="absolute inset-0 flex items-center justify-center">
                                              <span class="text-gray-400 font-medium">Click "Show" to reveal credentials</span>
                                            </div>
                                          </div>
                                        </div>

                                        <!-- Action Buttons -->
                                        <div class="flex justify-center space-x-4">
                                          <button id="copyBtn" class="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                            </svg>
                                            <span>Copy</span>
                                          </button>
                                          
                                          <button id="downloadBtn" class="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                            </svg>
                                            <span>Download</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                `;
                                
                                document.body.appendChild(modal);
                                
                                // Add functionality
                                let isVisible = false;
                                const credentialsText = modal.querySelector('#credentialsText');
                                const blurOverlay = modal.querySelector('#blurOverlay');
                                const toggleBtn = modal.querySelector('#toggleVisibility');
                                const eyeIcon = modal.querySelector('#eyeIcon');
                                const toggleText = modal.querySelector('#toggleText');
                                const copyBtn = modal.querySelector('#copyBtn');
                                const downloadBtn = modal.querySelector('#downloadBtn');
                                const closeBtn = modal.querySelector('#closeModal');
                                
                                // Toggle visibility
                                toggleBtn?.addEventListener('click', () => {
                                  isVisible = !isVisible;
                                  
                                  if (isVisible) {
                                    credentialsText?.classList.remove('credentials-hidden');
                                    credentialsText?.classList.add('credentials-visible');
                                    (blurOverlay as HTMLElement).style.display = 'none';
                                    (toggleText as HTMLElement).textContent = 'Hide';
                                    (eyeIcon as HTMLElement).innerHTML = `
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                                    `;
                                  } else {
                                    credentialsText?.classList.remove('credentials-visible');
                                    credentialsText?.classList.add('credentials-hidden');
                                    (blurOverlay as HTMLElement).style.display = 'flex';
                                    (toggleText as HTMLElement).textContent = 'Show';
                                    (eyeIcon as HTMLElement).innerHTML = `
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                    `;
                                  }
                                });
                                
                                // Copy functionality
                                copyBtn?.addEventListener('click', async () => {
                                  try {
                                    await navigator.clipboard.writeText(credentialsData);
                                    copyBtn.innerHTML = `
                                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                      </svg>
                                      <span>Copied!</span>
                                    `;
                                    setTimeout(() => {
                                      copyBtn.innerHTML = `
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                        </svg>
                                        <span>Copy</span>
                                      `;
                                    }, 2000);
                                  } catch (err) {
                                    console.error('Copy failed:', err);
                                  }
                                });
                                
                                // Download functionality
                                downloadBtn?.addEventListener('click', () => {
                                  const timestamp = new Date().toISOString().slice(0, 10);
                                  const filename = `${productHeadline.replace(/[^a-z0-9]/gi, '_')}_credentials_${timestamp}.txt`;
                                  const content = `Product: ${productHeadline}\\nOrder ID: ${order.order_id}\\nReleased: ${new Date(releaseDate).toLocaleString()}\\n\\nCredentials:\\n${credentialsData}`;
                                  
                                  const blob = new Blob([content], { type: 'text/plain' });
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = filename;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  window.URL.revokeObjectURL(url);
                                  
                                  downloadBtn.innerHTML = `
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                    <span>Downloaded!</span>
                                  `;
                                  setTimeout(() => {
                                    downloadBtn.innerHTML = `
                                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                      </svg>
                                      <span>Download</span>
                                    `;
                                  }, 2000);
                                });
                                
                                // Close functionality
                                closeBtn?.addEventListener('click', () => {
                                  modal.remove();
                                  style.remove();
                                });
                                
                                // Click outside to close
                                modal.addEventListener('click', (e: Event) => {
                                  if (e.target === modal) {
                                    modal.remove();
                                    style.remove();
                                  }
                                });
                                
                                // Escape key to close
                                const handleEscape = (e: KeyboardEvent) => {
                                  if (e.key === 'Escape') {
                                    modal.remove();
                                    style.remove();
                                    document.removeEventListener('keydown', handleEscape);
                                  }
                                };
                                document.addEventListener('keydown', handleEscape);
                              }}
                              className="text-xs text-green-400 hover:text-green-300 underline cursor-pointer"
                            >
                              View credentials
                            </button>
                          </div>
                        )}

                        {/* Escrow Badge */}
                        {order.use_escrow && (
                          <div className="mt-2">
                            <Badge className="bg-gradient-to-r from-yellow-500/90 to-amber-500/90 text-black border border-yellow-400/60 shadow-lg">
                              <Lock className="w-3 h-3 mr-1" />
                              ESCROW PROTECTED
                            </Badge>
                          </div>
                        )}

                        {/* Escrow Approval Button - Only for escrow orders in paid status */}
                        {order.use_escrow && order.order_status === 'paid' && (
                          <div className="mt-2 p-2 bg-green-500/5 border border-green-500/20 rounded max-w-md">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-1">
                                <Lock className="w-3 h-3 text-green-400" />
                                <span className="text-xs font-medium text-green-300">Escrow Active</span>
                              </div>
                              <Button
                                onClick={() => handleApproveOrderClick(order)}
                                disabled={isApproving === order.order_id}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 h-6"
                              >
                                {isApproving === order.order_id ? (
                                  <Clock className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Approve
                                  </>
                                )}
                              </Button>
                            </div>
                            <p className="text-xs text-gray-400">
                              Test your product and approve to release payment
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center sm:space-x-4 sm:flex-row flex-col w-full sm:w-auto">
                      <div className="text-right w-full sm:w-auto">
                        <p className="font-semibold text-white">
                          {order.total_amount} {order.crypto_currency}
                        </p>
                        <Badge 
                          className={`text-xs ${getStatusColor(order.order_status)}`}
                          variant="secondary"
                        >
                          {getStatusDisplay(order.order_status)}
                        </Badge>
                        {/* Quick Review Button for completed orders */}
                        {(order.order_status === "paid" || order.order_status === "delivered" || order.order_status === "confirmed") && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 w-full sm:w-auto border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                            onClick={() => handleLeaveReview(order)}
                          >
                            <Star className="w-3 h-3 mr-1" />
                            Review
                          </Button>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="self-end sm:self-auto">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(order)}>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Track Order</DropdownMenuItem>
                          {(order.order_status === "paid" || order.order_status === "delivered" || order.order_status === "confirmed") && (
                            <DropdownMenuItem onClick={() => handleLeaveReview(order)}>
                              <Star className="w-4 h-4 mr-2" />
                              Leave Review
                            </DropdownMenuItem>
                          )}
                          {(order.order_status === "paid" || order.order_status === "delivered" || order.order_status === "confirmed" || order.order_status === "processing") && (
                            <DropdownMenuItem onClick={() => handleRequestRefund(order)} className="text-blue-400">
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Request Refund
                            </DropdownMenuItem>
                          )}
                          {(order.order_status === "paid" || order.order_status === "delivered" || order.order_status === "confirmed") && (
                            <DropdownMenuItem onClick={() => handleCreateDispute(order)} className="text-orange-600">
                              <AlertTriangle className="w-4 h-4 mr-2" />
                              Create Dispute
                            </DropdownMenuItem>
                          )}
                          {(order.order_status === "processing" || order.order_status === "pending") && (
                            <DropdownMenuItem className="text-red-600">Cancel Order</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product Detail Modal */}
      {isModalOpen && selectedProduct && (
        <OrderProductModal
          order={selectedProduct}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}

      {/* Review Modal */}
      {isReviewOpen && reviewProductId && (
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
      )}

      {/* Order Confirmation Modal */}
      {confirmModalOpen && orderToConfirm && (
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

            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-yellow-300 font-semibold text-sm">⚠️ Important</span>
              </div>
              <p className="text-yellow-200 text-sm">
                This action will send real cryptocurrency from the admin wallet to the vendor's wallet.
              </p>
            </div>

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
      )}

      {/* Refund Request Modal */}
      {orderForRefund && (
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
      )}
    </>
  );
}
