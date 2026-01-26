import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MoreVertical, Eye, MessageSquare, Package, Check, X, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Lock, CheckCircle, Star, RefreshCw, Clock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { orderService, Order } from "@/services/orderService";
import { useToast } from "@/components/ui/ToastContainer";
import { OrderProductModal } from "@/components/buyer/OrderProductModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { productService } from "@/services/productService";
import { RefundModal } from "@/components/vendor/RefundModal";
import { PageBanner } from "@/components/PageBanner";
import { useCryptoPrices } from "@/contexts/PriceContext";



const getStatusColor = (status: string) => {
  switch (status) {
    case "Completed":
      return "bg-theme-cyan/10 text-theme-cyan border-theme-cyan/20";
    case "Processing":
      return "bg-theme-cyan/10 text-theme-cyan border-theme-cyan/20";
    case "Pending":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "Cancelled":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "Paid":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "Delivered":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    default:
      return "bg-gray-700 text-gray-300 border-gray-600";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent":
      return "bg-theme-red";
    case "high":
      return "bg-theme-red/80";
    case "normal":
      return "bg-gray-500";
    default:
      return "bg-gray-400";
  }
};

export default function VendorOrders() {
  const { btc: btcPrice, xmr: xmrPrice } = useCryptoPrices();

  // Transform API data to match existing structure
  const transformOrderData = (apiOrder: Order) => {
    const orderDate = new Date(apiOrder.created_at);
    const date = orderDate.toISOString().split('T')[0];
    const time = orderDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const getStatusDisplay = (apiOrder: Order) => {
      const paymentStatus = apiOrder.payment_status?.toLowerCase();
      const orderStatus = apiOrder.order_status?.toLowerCase();

      // For giveaway orders, always show as "Completed" if paid/confirmed
      if (apiOrder.is_giveaway && (paymentStatus === 'paid' || orderStatus === 'confirmed')) {
        return 'Completed';
      }

      if (paymentStatus === 'paid') {
        if (orderStatus === 'completed' || orderStatus === 'confirmed') {
          return 'Completed';
        } else if (orderStatus === 'delivered') {
          return 'Delivered';
        } else if (orderStatus === 'paid' || orderStatus === 'processing' || orderStatus === 'payment_received') {
          return 'Paid';
        }
      }

      if (paymentStatus === 'pending') {
        if (orderStatus === 'pending_payment') {
          return 'Pending';
        } else if (orderStatus === 'cancelled') {
          return 'Cancelled';
        }
      }

      // For giveaway orders, show as "Completed" if status is confirmed or paid
      if (apiOrder.is_giveaway && (orderStatus === 'confirmed' || orderStatus === 'paid')) {
        return 'Completed';
      }
      
      switch (orderStatus) {
        case 'pending':
          return 'Pending';
        case 'processing':
          return 'Processing';
        case 'delivered':
          return 'Delivered';
        case 'completed':
        case 'confirmed':
          return 'Completed';
        case 'cancelled':
          return 'Cancelled';
        case 'paid':
          return 'Paid';
        default:
          return 'Pending';
      }
    };

    return {
      id: apiOrder.order_id,
      numericId: apiOrder.id,
      buyer: apiOrder.buyer?.username || 'Unknown',
      product: apiOrder.product?.headline || apiOrder.product?.listing_title || 'Product Deleted',
      amount: `${apiOrder.total_amount} ${apiOrder.crypto_currency}`,
      usdAmount: `$${(parseFloat(apiOrder.total_amount) * (apiOrder.crypto_currency === 'XMR' ? xmrPrice : btcPrice)).toFixed(2)}`,
      status: getStatusDisplay(apiOrder),
      priority: "normal",
      date: date,
      time: time,
      paymentMethod: apiOrder.crypto_currency,
      escrow: apiOrder.use_escrow || false,
      rawPaymentStatus: apiOrder.payment_status,
      rawOrderStatus: apiOrder.order_status,

      order_id: apiOrder.order_id,
      order_status: apiOrder.order_status,
      payment_status: apiOrder.payment_status,
      total_amount: apiOrder.total_amount,
      crypto_currency: apiOrder.crypto_currency,
      created_at: apiOrder.created_at,
      buyer_details: {
        id: apiOrder.buyer?.id,
        username: apiOrder.buyer?.username || 'Unknown',
        email: apiOrder.buyer?.email
      },
      product_details: apiOrder.product || {
        id: null,
        headline: 'Product Deleted',
        listing_title: 'Product Deleted'
      },
      product_credentials: apiOrder.product_credentials,
      delivery_time: apiOrder.product?.delivery_time || 'manual',
      is_giveaway: apiOrder.is_giveaway || false
    };
  };

  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [orderToUpdate, setOrderToUpdate] = useState<any>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [updatingStatusType, setUpdatingStatusType] = useState<string | null>(null);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [orderForRefund, setOrderForRefund] = useState<any>(null);
  const [isDeliverModalOpen, setIsDeliverModalOpen] = useState(false);
  const [orderToDeliver, setOrderToDeliver] = useState<any>(null);
  const [deliveryCredentials, setDeliveryCredentials] = useState("");
  const [isDelivering, setIsDelivering] = useState(false);
  const { showToast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchOrders();
  }, []);

  // Auto-open order details if openOrderId is provided in navigation state
  useEffect(() => {
    const navState = location.state as any;
    if (navState?.openOrderId && orders.length > 0) {
      const orderToOpen = orders.find(o =>
        (o.order_id && o.order_id.toString() === navState.openOrderId.toString()) ||
        (o.numericId && o.numericId.toString() === navState.openOrderId.toString())
      );

      if (orderToOpen) {
        handleViewDetails(orderToOpen);
        // Clean the state so it doesn't show again on refresh
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, orders]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const ordersData = await orderService.getOrders();
      const ordersArray = Array.isArray(ordersData) ? ordersData : (ordersData as any).results || [];

      const transformedOrders = ordersArray.map((order: any) => transformOrderData(order));

      setOrders(transformedOrders);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      showToast({
        title: "Error",
        message: "Failed to fetch orders",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshOrders = () => {
    fetchOrders();
    showToast({
      title: "Orders Refreshed",
      message: "Order status updated",
      type: "success"
    });
  };

  const openReviewsForProduct = async (productId: number, productTitle: string) => {
    try {
      setReviewsLoading(true);
      setIsReviewsOpen(true);
      setReviews([]);
      const res = await productService.getVendorProductReviewsSimple(productId, { page: 1, page_size: 10 });
      setReviews(res.data || []);
    } catch (e) {
      console.error('Failed to load reviews', e);
      showToast({ title: 'Error', message: 'Failed to load reviews', type: 'error' });
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleViewDetails = (order: any) => {
    const modalOrder = {
      order_id: order.order_id,
      order_status: order.order_status,
      payment_status: order.payment_status,
      total_amount: order.total_amount,
      crypto_currency: order.crypto_currency,
      created_at: order.created_at,
      buyer: order.buyer_details,
      product: order.product_details,
      product_credentials: order.product_credentials
    };
    setSelectedOrder(modalOrder);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const handleUpdateStatus = (order: any) => {
    setOrderToUpdate(order);
    setIsStatusModalOpen(true);
  };

  const handleCloseStatusModal = () => {
    setIsStatusModalOpen(false);
    setOrderToUpdate(null);
  };

  const handleOpenDeliverModal = (order: any) => {
    setOrderToDeliver(order);
    setDeliveryCredentials("");
    setIsDeliverModalOpen(true);
  };

  const handleCloseDeliverModal = () => {
    setIsDeliverModalOpen(false);
    setOrderToDeliver(null);
    setDeliveryCredentials("");
  };

  const handleDeliverSubmit = async () => {
    if (!orderToDeliver || !deliveryCredentials.trim()) {
      showToast({
        title: "Error",
        message: "Please enter product credentials",
        type: "error"
      });
      return;
    }

    setIsDelivering(true);
    try {
      await orderService.deliverOrder(orderToDeliver.numericId, {
        credentials: deliveryCredentials
      });

      showToast({
        title: "Success",
        message: "Product delivered successfully",
        type: "success"
      });

      // Update local state - mark as delivered and add credentials
      setOrders(prev => prev.map(o =>
        o.numericId === orderToDeliver.numericId
          ? { 
              ...o, 
              status: "Delivered", 
              rawOrderStatus: "delivered",
              product_credentials: {
                credentials: deliveryCredentials,
                delivered_at: new Date().toISOString(),
                delivery_method: 'manual'
              }
            }
          : o
      ));
      
      // Refresh orders to get latest data
      fetchOrders();

      handleCloseDeliverModal();
    } catch (error: any) {
      showToast({
        title: "Delivery Failed",
        message: error.message || "Failed to deliver product",
        type: "error"
      });
    } finally {
      setIsDelivering(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!orderToUpdate) return;

    setIsUpdatingStatus(true);
    setUpdatingStatusType(newStatus);

    try {
      const statusMapping: { [key: string]: string } = {
        'Pending': 'pending_payment',
        'Processing': 'payment_received',
        'Completed': 'delivered',
        'Cancelled': 'cancelled'
      };

      const backendStatus = statusMapping[newStatus] || newStatus.toLowerCase();

      console.log('🔄 Attempting to update order status:', {
        orderId: orderToUpdate.numericId,
        currentStatus: orderToUpdate.rawOrderStatus,
        newStatus: backendStatus
      });

      await orderService.updateOrderStatus(orderToUpdate.numericId, {
        order_status: backendStatus
      });

      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderToUpdate.id
            ? { ...order, status: newStatus, rawOrderStatus: backendStatus }
            : order
        )
      );

      showToast({
        title: "Status Updated",
        message: `Order status updated to ${newStatus}`,
        type: "success"
      });

      handleCloseStatusModal();
    } catch (error: any) {
      console.error('❌ Status update error:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error response data:', error.response?.data);

      let errorMessage = "Failed to update order status";

      // Check if error.response and error.response.data exist
      if (error.response && error.response.data) {
        const responseData = error.response.data;

        console.log('🔍 Full response.data:', JSON.stringify(responseData, null, 2));

        // PRIORITY 1: Check order_status field (API sends error here)
        if (responseData.order_status) {
          console.log('🎯 Found order_status field:', responseData.order_status);

          if (Array.isArray(responseData.order_status)) {
            errorMessage = responseData.order_status.join('. ');
            console.log('✅ Extracted from array:', errorMessage);
          } else {
            errorMessage = String(responseData.order_status);
            console.log('✅ Extracted as string:', errorMessage);
          }
        }
        // PRIORITY 2: Check non_field_errors
        else if (responseData.non_field_errors) {
          console.log('🔍 Found non_field_errors:', responseData.non_field_errors);
          errorMessage = Array.isArray(responseData.non_field_errors)
            ? responseData.non_field_errors.join('. ')
            : String(responseData.non_field_errors);
        }
        // PRIORITY 3: Check error field
        else if (responseData.error) {
          console.log('🔍 Found error field:', responseData.error);
          errorMessage = Array.isArray(responseData.error)
            ? responseData.error.join('. ')
            : String(responseData.error);
        }
        // PRIORITY 4: Check detail field
        else if (responseData.detail) {
          console.log('🔍 Found detail field:', responseData.detail);
          errorMessage = Array.isArray(responseData.detail)
            ? responseData.detail.join('. ')
            : String(responseData.detail);
        }
        // PRIORITY 5: Check message field
        else if (responseData.message) {
          console.log('🔍 Found message field:', responseData.message);
          errorMessage = String(responseData.message);
        }
        // PRIORITY 6: Check if response.data itself is a string
        else if (typeof responseData === 'string') {
          console.log('🔍 Response data is string:', responseData);
          errorMessage = responseData;
        }
        // PRIORITY 7: Try to get first key's value if it's an object
        else if (typeof responseData === 'object') {
          const keys = Object.keys(responseData);
          if (keys.length > 0) {
            const firstKey = keys[0];
            const firstValue = responseData[firstKey];
            console.log(`🔍 Using first key "${firstKey}":`, firstValue);

            if (Array.isArray(firstValue)) {
              errorMessage = firstValue.join('. ');
            } else {
              errorMessage = String(firstValue);
            }
          }
        }
      }
      // Fallback to error.message
      else if (error.message) {
        console.log('🔍 Using error.message:', error.message);
        errorMessage = error.message;
      }

      console.log('🔔 Final error message for toast:', errorMessage);

      showToast({
        title: "Status Update Failed",
        message: errorMessage,
        type: "error",
        duration: 10000
      });
    } finally {
      setIsUpdatingStatus(false);
      setUpdatingStatusType(null);
    }
  };

  const handleRequestRefund = (order: any) => {
    setOrderForRefund(order);
    setIsRefundModalOpen(true);
  };

  const handleRefundModalClose = () => {
    setIsRefundModalOpen(false);
    setOrderForRefund(null);
  };

  const handleRefundSuccess = () => {
    handleRefundModalClose();
    showToast({
      title: "Refund Requested",
      message: "Your refund request has been submitted. We'll process it within 24-48 hours.",
      type: "success"
    });
    fetchOrders();
  };

  const handleRefundError = (message: string) => {
    showToast({
      title: "Refund Error",
      message: message,
      type: "error"
    });
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.buyer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    const matchesDate = (() => {
      if (dateFilter === "all") return true;

      const orderDate = new Date(order.created_at);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      switch (dateFilter) {
        case "today":
          const orderToday = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
          return orderToday.getTime() === today.getTime();

        case "week":
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return orderDate >= weekAgo;

        case "month":
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return orderDate >= monthAgo;

        default:
          return true;
      }
    })();

    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalItems = filteredOrders.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateFilter]);

  return (
    <>
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 relative z-10 p-3 sm:p-0">
        <PageBanner
          title="My Orders"
          subtitle="Track sales performance"
          type="vendor"
        />

        <div className="flex flex-col sm:flex-row justify-end gap-3 mb-8">
          <Button
            variant="outline"
            onClick={() => {
              const csvContent = [
                ['Order ID', 'Buyer', 'Product', 'Amount', 'Currency', 'Status', 'Date'].join(','),
                ...filteredOrders.map(order => [
                  order.id,
                  order.buyer,
                  `\"${order.product}\"`,
                  order.amount,
                  order.paymentMethod,
                  order.status,
                  `${order.date} ${order.time}`
                ].join(','))
              ].join('\n');
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              window.URL.revokeObjectURL(url);
            }}
            className="bg-gray-800/50 border-gray-700/50 text-gray-300 hover:text-white hover:bg-gray-700/60 rounded-xl h-12 px-6 font-semibold shadow-sm backdrop-blur-sm self-start md:self-auto"
          >
            <Package className="w-5 h-5 mr-2" />
            Export CSV
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
          <Card className="bg-gray-900/40 backdrop-blur-sm border-gray-700/50 rounded-2xl overflow-hidden relative group hover:bg-gray-800/40 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-indigo-500/10 rounded-xl">
                  <span className="text-indigo-500 font-bold text-lg">#</span>
                </div>
                <Badge variant="outline" className="border-indigo-500/20 text-indigo-400 bg-indigo-500/5">Count</Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl sm:text-3xl font-black text-white">{orders.length}</h3>
                <p className="text-gray-400 text-sm font-medium">Total Orders</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/40 backdrop-blur-sm border-gray-700/50 rounded-2xl overflow-hidden relative group hover:bg-gray-800/40 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-amber-500/10 rounded-xl">
                  <span className="text-amber-500 font-bold text-lg">P</span>
                </div>
                <Badge variant="outline" className="border-amber-500/20 text-amber-400 bg-amber-500/5">Pending</Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl sm:text-3xl font-black text-white">{orders.filter(order => order.status === "Processing").length}</h3>
                <p className="text-gray-400 text-sm font-medium">Processing</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/40 backdrop-blur-sm border-gray-700/50 rounded-2xl overflow-hidden relative group hover:bg-gray-800/40 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                  <span className="text-emerald-500 font-bold text-lg">C</span>
                </div>
                <Badge variant="outline" className="border-emerald-500/20 text-emerald-400 bg-emerald-500/5">Done</Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl sm:text-3xl font-black text-white">{orders.filter(order => order.status === "Completed").length}</h3>
                <p className="text-gray-400 text-sm font-medium">Completed</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/40 backdrop-blur-sm border-gray-700/50 rounded-2xl overflow-hidden relative group hover:bg-gray-800/40 transition-colors col-span-2 lg:col-span-1">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-cyan-500/10 rounded-xl">
                  <span className="text-cyan-500 font-bold text-lg">$</span>
                </div>
                <Badge variant="outline" className="border-cyan-500/20 text-cyan-400 bg-cyan-500/5">Revenue</Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl sm:text-3xl font-black text-white truncate">
                  ${orders.reduce((sum, order) => {
                    const amount = parseFloat(order.amount.split(' ')[0]);
                    const rate = order.paymentMethod === 'XMR' ? xmrPrice : btcPrice;
                    return sum + (amount * rate);
                  }, 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </h3>
                <p className="text-gray-400 text-sm font-medium">Total Volume (USD)</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden mb-8">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    placeholder="Search your orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-800/50 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-blue-500/50 focus:ring-blue-500/20 rounded-xl h-11 transition-all"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48 bg-gray-800/50 border-gray-700/50 text-white rounded-xl h-11 focus:border-blue-500/50">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 rounded-xl overflow-hidden">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Processing">Processing</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-full sm:w-48 bg-gray-800/50 border-gray-700/50 text-white rounded-xl h-11 focus:border-blue-500/50">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 rounded-xl overflow-hidden">
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl font-bold text-white">
              Orders ({filteredOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {isLoading ? (
                <div className="text-center py-8 sm:py-12">
                  <Loader2 className="w-8 h-8 sm:w-12 sm:h-12 text-theme-cyan animate-spin mx-auto" />
                  <p className="text-gray-400 mt-4 text-sm sm:text-base">Loading orders...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="text-gray-400 mb-3 sm:mb-4">
                    <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto" />
                  </div>
                  <h3 className="text-base sm:text-lg font-medium text-white mb-2">No orders found</h3>
                  <p className="text-gray-400 text-sm sm:text-base">Try adjusting your search or filter criteria.</p>
                </div>
              ) : (
                currentOrders.map((order) => (
                  <div key={order.id} className="group bg-gray-900/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 sm:p-5 hover:bg-gray-800/60 transition-all duration-300 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full -mr-16 -mt-16 group-hover:from-indigo-500/10 transition-colors" />

                    <div className="flex flex-col lg:flex-row gap-4 relative z-10">

                      {/* Left: Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge className={`${getStatusColor(order.status)} text-[10px] sm:text-xs font-bold uppercase tracking-wider`}>
                            {order.status}
                          </Badge>
                          <span className="text-gray-500 text-xs font-bold text-[10px] uppercase">#{order.id}</span>
                        </div>
                        <h3 className="font-bold text-white text-lg mb-1 leading-snug">{order.product}</h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                          <div className="flex items-center">
                            <span className="opacity-50 mr-1 uppercase font-bold text-[10px]">Buyer:</span>
                            <span className="text-gray-300 font-medium">{order.buyer}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1 opacity-50" />
                            <span>{order.date}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amounts & Actions */}
                      <div className="flex flex-row lg:flex-col items-center lg:items-end gap-3 justify-between lg:justify-start lg:w-48 flex-shrink-0 border-t lg:border-t-0 border-gray-700/50 pt-3 lg:pt-0">
                        <div className="text-left lg:text-right">
                          <div className="font-black text-white text-lg">{order.amount}</div>
                          <div className="text-xs text-gray-500 font-medium">{order.usdAmount}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Deliver Account Button - Show for giveaway orders or manual delivery orders */}
                          {/* Button shows if:
                              1. Order status is Completed (giveaway) OR paid/processing/confirmed
                              2. AND (it's a giveaway order OR delivery_time is manual)
                              3. AND credentials are NOT yet delivered (product_credentials is empty/null)
                          */}
                          {(
                            order.status === "Completed" || 
                            ['paid', 'processing', 'confirmed', 'completed'].includes((order.rawOrderStatus || order.status || '').toLowerCase())
                          ) && (
                            order.is_giveaway || 
                            order.delivery_time === 'manual' || 
                            !order.delivery_time
                          ) && (
                            !order.product_credentials || 
                            (typeof order.product_credentials === 'object' && (!order.product_credentials.credentials || order.product_credentials.credentials === ''))
                          ) && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenDeliverModal(order)}
                              className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Deliver Account
                            </Button>
                          )}
                          {order.status === "Processing" && (
                            <>
                              <Button size="sm" variant="outline" className="text-theme-cyan border-theme-cyan/30 h-8 w-8 p-0 hover:bg-theme-cyan/10 rounded-lg">
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" className="text-theme-red border-theme-red/30 h-8 w-8 p-0 hover:bg-theme-red/10 rounded-lg">
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(order)}
                            className="h-8 border-gray-600 text-gray-300 hover:text-white rounded-lg text-xs"
                          >
                            View
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-gray-800">
                                <MoreVertical className="w-4 h-4 text-gray-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700 rounded-xl shadow-xl w-56">
                              <DropdownMenuItem onClick={() => handleViewDetails(order)} className="cursor-pointer">
                                <Eye className="w-4 h-4 mr-2" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                const buyerUsername = order.buyer_details?.username || order.buyer || order.buyer_username;
                                const buyerId = order.buyer_details?.id;
                                const productId = order.product_details?.id;

                                if (buyerUsername && buyerId && productId) {
                                  navigate('/vendor/messages', {
                                    state: {
                                      autoOpenBuyerUsername: buyerUsername,
                                      autoOpenBuyerId: buyerId,
                                      autoOpenProductId: productId,
                                      autoOpenOrderId: order.order_id,
                                      autoOpenChat: true
                                    }
                                  });
                                } else if (buyerUsername) {
                                  // Fallback if IDs are missing
                                  navigate('/vendor/messages', {
                                    state: {
                                      autoOpenBuyerUsername: buyerUsername,
                                      autoOpenChat: true
                                    }
                                  });
                                } else {
                                  showToast({
                                    title: 'Error',
                                    message: 'Buyer information not available. Please try again later.',
                                    type: 'error',
                                    duration: 4000
                                  });
                                }
                              }} className="cursor-pointer">
                                <MessageSquare className="w-4 h-4 mr-2" /> Message Buyer
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(order)} className="cursor-pointer">
                                <Package className="w-4 h-4 mr-2" /> Update Status
                              </DropdownMenuItem>
                              {order.product_details?.id && (
                                <DropdownMenuItem onClick={() => openReviewsForProduct(order.product_details.id, order.product_details.headline || order.product)} className="cursor-pointer">
                                  <Star className="w-4 h-4 mr-2" /> View Reviews
                                </DropdownMenuItem>
                              )}
                              {(order.status === "Paid" || order.rawOrderStatus === "paid") && (
                                <DropdownMenuItem onClick={() => handleOpenDeliverModal(order)} className="cursor-pointer text-green-400 hover:text-green-300">
                                  <CheckCircle className="w-4 h-4 mr-2" /> Deliver Product
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleRequestRefund(order)}
                                className={order.status === "Completed" || order.status === "Processing" ? "text-orange-400 cursor-pointer" : "text-gray-500 cursor-not-allowed"}
                                disabled={order.status !== "Completed" && order.status !== "Processing"}
                              >
                                <RefreshCw className="w-4 h-4 mr-2" /> Request Refund
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>

                    {/* Footer / Meta */}
                    <div className="mt-4 pt-3 border-t border-gray-700/50 flex flex-wrap items-center gap-2 relative z-10">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tags:</span>
                      {order.use_escrow && (
                        <Badge className="bg-gradient-to-r from-amber-500/10 to-yellow-600/10 text-yellow-500 border border-yellow-500/20 text-[10px] px-2 py-0.5 font-bold">
                          <Lock className="w-2.5 h-2.5 mr-1" />
                          Escrow Protected
                        </Badge>
                      )}
                      <Badge variant="outline" className="border-gray-700 text-gray-400 text-[10px] px-2 py-0.5 bg-gray-800/50">
                        {order.paymentMethod}
                      </Badge>
                      <Badge variant="outline" className="border-gray-700 text-gray-400 text-[10px] px-2 py-0.5 bg-gray-800/50 uppercase">
                        {order.priority} Priority
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>

            {filteredOrders.length > 0 && (
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-700">
                <div className="flex items-center space-x-2 w-full sm:w-auto justify-center sm:justify-start">
                  <span className="text-xs sm:text-sm text-gray-400">Show:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                    setItemsPerPage(parseInt(value));
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger className="w-16 sm:w-20 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs sm:text-sm text-gray-400">per page</span>
                </div>

                <div className="text-xs sm:text-sm text-gray-400 text-center sm:text-left">
                  Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} orders
                </div>

                <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToFirstPage}
                    disabled={currentPage === 1}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50 h-8 w-8 p-0"
                  >
                    <ChevronsLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50 h-8 w-8 p-0"
                  >
                    <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(pageNum)}
                          className={`text-xs sm:text-sm h-8 ${currentPage === pageNum
                            ? "bg-theme-cyan text-black hover:bg-theme-cyan/80 border-theme-cyan"
                            : "border-gray-600 text-gray-300 hover:bg-gray-700"
                            }`}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50 h-8 w-8 p-0"
                  >
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToLastPage}
                    disabled={currentPage === totalPages}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50 h-8 w-8 p-0"
                  >
                    <ChevronsRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div >

      {selectedOrder && (
        <OrderProductModal
          order={selectedOrder}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )
      }

      {
        isStatusModalOpen && orderToUpdate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 sm:p-6 w-full max-w-md mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-white">Update Order Status</h3>
                <button
                  onClick={handleCloseStatusModal}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="text-xs sm:text-sm text-gray-400">
                  <p className="break-words">Order ID: <span className="text-white font-mono">{orderToUpdate.id}</span></p>
                  <p className="break-words">Product: <span className="text-white">{orderToUpdate.product}</span></p>
                  <p>Current Status: <span className="text-white font-medium">{orderToUpdate.status}</span></p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs sm:text-sm text-gray-400">Select New Status:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleStatusChange("Pending")}
                      variant="outline"
                      disabled={isUpdatingStatus}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                    >
                      {isUpdatingStatus && updatingStatusType === "Pending" ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Pending"
                      )}
                    </Button>
                    <Button
                      onClick={() => handleStatusChange("Processing")}
                      variant="outline"
                      disabled={isUpdatingStatus}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                    >
                      {isUpdatingStatus && updatingStatusType === "Processing" ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Processing"
                      )}
                    </Button>

                    <Button
                      onClick={() => handleStatusChange("Completed")}
                      variant="outline"
                      disabled={isUpdatingStatus}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                    >
                      {isUpdatingStatus && updatingStatusType === "Completed" ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Completed"
                      )}
                    </Button>
                    <Button
                      onClick={() => handleStatusChange("Cancelled")}
                      variant="outline"
                      disabled={isUpdatingStatus}
                      className="border-theme-red text-theme-red hover:bg-theme-red/10 disabled:opacity-50"
                    >
                      {isUpdatingStatus && updatingStatusType === "Cancelled" ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Cancelled"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Delivery Modal */}
      {isDeliverModalOpen && orderToDeliver && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Package className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Deliver Product</h3>
              </div>
              <button onClick={handleCloseDeliverModal} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <p className="text-xs text-gray-400 uppercase font-black tracking-widest mb-1">Order Details</p>
                <p className="text-sm text-white font-medium mb-1">#{orderToDeliver.id}</p>
                <p className="text-sm text-theme-cyan font-bold">{orderToDeliver.product}</p>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-theme-red" />
                  Product Credentials / Message
                </label>
                <textarea
                  value={deliveryCredentials}
                  onChange={(e) => setDeliveryCredentials(e.target.value)}
                  placeholder="Enter login details, download links, or specific instructions for the buyer..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 transition-all h-40 resize-none font-mono text-sm"
                />
                <p className="text-[10px] text-gray-500 italic">
                  * Note: These details will be visible to the buyer once they access the order details.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleCloseDeliverModal}
                  className="flex-1 border-gray-700 text-gray-400 hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeliverSubmit}
                  disabled={isDelivering || !deliveryCredentials.trim()}
                  className="flex-3 bg-green-600 hover:bg-green-700 text-white font-bold"
                >
                  {isDelivering ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Delivering...
                    </>
                  ) : (
                    "Confirm Delivery"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={isReviewsOpen} onOpenChange={setIsReviewsOpen}>
        <DialogContent className="bg-gray-900 border border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Product Reviews</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-auto">
            {reviewsLoading ? (
              <div className="flex items-center justify-center py-10 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading reviews...
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-10 text-gray-400">No reviews yet for this product.</div>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} className={`w-4 h-4 ${i <= r.rating ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-gray-200 mb-1">{r.comment}</div>
                  <div className="text-xs text-gray-400">Buyer: {r.buyer?.username || 'Unknown'}</div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <RefundModal
        isOpen={isRefundModalOpen}
        order={orderForRefund}
        onClose={handleRefundModalClose}
        onSuccess={handleRefundSuccess}
        onError={handleRefundError}
      />
    </>
  );
}