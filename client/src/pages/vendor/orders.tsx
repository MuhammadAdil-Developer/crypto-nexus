import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MoreVertical, Eye, MessageSquare, Package, Check, X, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Lock, CheckCircle, Star, RefreshCw } from "lucide-react";
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

    if (paymentStatus === 'paid') {
      if (orderStatus === 'completed') {
        return 'Completed';
      } else if (orderStatus === 'paid') {
        return 'Completed';
      } else if (orderStatus === 'processing' || orderStatus === 'pending_payment') {
        return 'Completed';
      } else if (orderStatus === 'pending') {
        return 'Completed';
      }
    }

    if (paymentStatus === 'pending') {
      if (orderStatus === 'pending_payment') {
        return 'Pending';
      } else if (orderStatus === 'cancelled') {
        return 'Cancelled';
      }
    }

    switch (orderStatus) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'shipped':
        return 'Shipped';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'paid':
        return 'Completed';
      default:
        return 'Pending';
    }
  };

  return {
    id: apiOrder.order_id,
    numericId: apiOrder.id,
    buyer: apiOrder.buyer.username,
    product: apiOrder.product.headline,
    amount: `${apiOrder.total_amount} ${apiOrder.crypto_currency}`,
    usdAmount: `$${(parseFloat(apiOrder.total_amount) * (apiOrder.crypto_currency === 'XMR' ? 170 : 100000)).toFixed(2)}`,
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
      id: apiOrder.buyer.id,
      username: apiOrder.buyer.username,
      email: apiOrder.buyer.email
    },
    product_details: {
      id: apiOrder.product.id,
      headline: apiOrder.product.headline,
      website: apiOrder.product.website || '',
      account_type: apiOrder.product.account_type || '',
      access_type: apiOrder.product.access_type || '',
      account_balance: apiOrder.product.account_balance || '',
      description: apiOrder.product.description || '',
      price: apiOrder.product.price || '',
      additional_info: apiOrder.product.additional_info || '',
      delivery_time: apiOrder.product.delivery_time || '',
      credentials_display: apiOrder.product.credentials_display || '',
      main_image: apiOrder.product.main_image || '',
      gallery_images: apiOrder.product.gallery_images || [],
      main_images: apiOrder.product.main_images || [],
      status: apiOrder.product.status || '',
      is_featured: apiOrder.product.is_featured || false,
      views_count: apiOrder.product.views_count || 0,
      favorites_count: apiOrder.product.favorites_count || 0,
      rating: apiOrder.product.rating || '0',
      review_count: apiOrder.product.review_count || 0,
      created_at: apiOrder.product.created_at || '',
      vendor_username: apiOrder.vendor.username,
      vendor: {
        id: apiOrder.vendor.id,
        username: apiOrder.vendor.username,
        email: apiOrder.vendor.email
      },
      category: apiOrder.product.category || { id: 0, name: 'General' },
      sub_category: apiOrder.product.sub_category || null,
      tags: apiOrder.product.tags || [],
      special_features: apiOrder.product.special_features || [],
      quantity_available: apiOrder.product.quantity_available || 0,
      access_method: apiOrder.product.access_method || '',
      account_age: apiOrder.product.account_age || '',
      delivery_method: apiOrder.product.delivery_method || '',
      region_restrictions: apiOrder.product.region_restrictions || '',
      auto_delivery_script: apiOrder.product.auto_delivery_script || '',
      notes_for_buyer: apiOrder.product.notes_for_buyer || '',
      discount_percentage: apiOrder.product.discount_percentage || ''
    },
    product_credentials: apiOrder.product_credentials || null
  };
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Completed":
      return "bg-theme-cyan/10 text-theme-cyan border-theme-cyan/20";
    case "Processing":
      return "bg-theme-cyan/10 text-theme-cyan border-theme-cyan/20";
    case "Shipped":
      return "bg-theme-cyan/20 text-theme-cyan border-theme-cyan/30";
    case "Pending":
      return "bg-theme-red/10 text-theme-red border-theme-red/20";
    case "Cancelled":
      return "bg-theme-red/10 text-theme-red border-theme-red/20";
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
  const navigate = useNavigate();
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
  const { showToast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchOrders();
  }, []);

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
      console.log('🔍 Loading reviews for product:', productId, 'Title:', productTitle, 'Reviews:', res.data);
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

  const handleStatusChange = async (newStatus: string) => {
    if (!orderToUpdate) return;

    setIsUpdatingStatus(true);
    setUpdatingStatusType(newStatus);

    try {
      const statusMapping: { [key: string]: string } = {
        'Pending': 'pending_payment',
        'Processing': 'payment_received',
        'Shipped': 'paid',
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Orders & Sales</h1>
            <p className="text-gray-400 text-sm sm:text-base">Manage your customer orders and track sales</p>
          </div>
          <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
            Export Orders
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
          <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
            <CardContent className="p-4 sm:p-6">
              <div className="text-xl sm:text-2xl font-bold text-white">{orders.length}</div>
              <p className="text-xs sm:text-sm text-gray-400 truncate">Total Orders</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
            <CardContent className="p-4 sm:p-6">
              <div className="text-xl sm:text-2xl font-bold text-theme-cyan">{orders.filter(order => order.status === "Processing").length}</div>
              <p className="text-xs sm:text-sm text-gray-400 truncate">Processing</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
            <CardContent className="p-4 sm:p-6">
              <div className="text-xl sm:text-2xl font-bold text-theme-cyan">{orders.filter(order => order.status === "Shipped").length}</div>
              <p className="text-xs sm:text-sm text-gray-400 truncate">Shipped</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
            <CardContent className="p-4 sm:p-6">
              <div className="text-xl sm:text-2xl font-bold text-theme-cyan">{orders.filter(order => order.status === "Completed").length}</div>
              <p className="text-xs sm:text-sm text-gray-400 truncate">Completed</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10 col-span-2 lg:col-span-1">
            <CardContent className="p-4 sm:p-6">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-theme-cyan break-words">
                ${orders.reduce((sum, order) => {
                  const amount = parseFloat(order.amount.split(' ')[0]);
                  const rate = order.paymentMethod === 'XMR' ? 170 : 100000;
                  return sum + (amount * rate);
                }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs sm:text-sm text-gray-400 truncate">Total Revenue (USD)</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search orders, buyers, products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 text-sm sm:text-base focus:border-theme-cyan focus:ring-theme-cyan bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 text-sm sm:text-base">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Processing">Processing</SelectItem>
                  <SelectItem value="Shipped">Shipped</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-48 text-sm sm:text-base">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl font-bold text-theme-red">
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
                  <div key={order.id} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors overflow-hidden">
                    <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className={`w-3 h-3 rounded-full ${getPriorityColor(order.priority)} mb-1`}></div>
                        <span className="text-[10px] sm:text-xs text-gray-400 uppercase">{order.priority}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1 sm:mb-2">
                          <h3 className="font-semibold text-white text-sm sm:text-base truncate">{order.id}</h3>
                          {order.escrow && (
                            <Badge variant="outline" className="text-[10px] sm:text-xs">
                              Escrow
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] sm:text-xs">
                            {order.paymentMethod}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-400 mb-1 break-words">{order.product}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-1 sm:gap-0">
                          <span className="text-xs sm:text-sm text-gray-400">by {order.buyer}</span>
                          <span className="text-xs sm:text-sm text-gray-400">{order.date} at {order.time}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start sm:items-center lg:items-end xl:items-center gap-3 sm:gap-4 lg:gap-2 xl:gap-6 flex-shrink-0">
                      <div className="text-left sm:text-right lg:text-right">
                        <div className="font-semibold text-theme-cyan text-sm sm:text-base">{order.amount}</div>
                        <div className="text-xs sm:text-sm text-gray-400">{order.usdAmount}</div>
                      </div>

                      <div className="space-y-1">
                        <Badge className={`border text-[10px] sm:text-xs ${getStatusColor(order.status)}`}>
                          {order.status}
                        </Badge>
                        {order.use_escrow && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            <Badge className="bg-gradient-to-r from-yellow-500/90 to-amber-500/90 text-black text-[9px] sm:text-[10px] px-1 py-0 h-4">
                              <Lock className="w-2 h-2 mr-0.5" />
                              ESCROW
                            </Badge>
                            {order.order_status === 'paid' && !order.confirmed_at && (
                              <Badge className="bg-orange-500/20 text-orange-300 text-[9px] sm:text-[10px] px-1 py-0 h-4 whitespace-nowrap">
                                Awaiting
                              </Badge>
                            )}
                            {order.confirmed_at && (
                              <Badge className="bg-theme-cyan/20 text-theme-cyan text-[9px] sm:text-[10px] px-1 py-0 h-4">
                                <CheckCircle className="w-2 h-2 mr-0.5" />
                                Approved
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {order.status === "Processing" && (
                          <>
                            <Button size="sm" variant="outline" className="text-theme-cyan border-theme-cyan/30 h-8 w-8 p-0 hover:bg-theme-cyan/10">
                              <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-theme-red border-theme-red/30 h-8 w-8 p-0 hover:bg-theme-red/10">
                              <X className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                          </>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[90vw] sm:w-auto">
                            <DropdownMenuItem onClick={() => handleViewDetails(order)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              const buyerUsername = order.buyer_details?.username || order.buyer || order.buyer_username;
                              if (buyerUsername) {
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
                            }}>
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Message Buyer
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(order)}>
                              <Package className="w-4 h-4 mr-2" />
                              Update Status
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openReviewsForProduct(order.product_details.id, order.product_details.headline)}>
                              <Star className="w-4 h-4 mr-2" />
                              View Reviews
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRequestRefund(order)}
                              className={order.status === "Completed" || order.status === "Processing" ? "text-orange-600" : "text-gray-400 cursor-not-allowed"}
                              disabled={order.status !== "Completed" && order.status !== "Processing"}
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Request Refund
                            </DropdownMenuItem>
                            {order.status === "Processing" && (
                              <>
                                <DropdownMenuItem className="text-theme-cyan focus:text-theme-cyan focus:bg-theme-cyan/10">
                                  <Check className="w-4 h-4 mr-2" />
                                  Mark as Shipped
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-theme-red focus:text-theme-red focus:bg-theme-red/10">
                                  <X className="w-4 h-4 mr-2" />
                                  Cancel Order
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
      </div>

      {selectedOrder && (
        <OrderProductModal
          order={selectedOrder}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}

      {isStatusModalOpen && orderToUpdate && (
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
                    onClick={() => handleStatusChange("Shipped")}
                    variant="outline"
                    disabled={isUpdatingStatus}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                  >
                    {isUpdatingStatus && updatingStatusType === "Shipped" ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Shipped"
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