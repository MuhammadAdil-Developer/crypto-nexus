import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MoreVertical, Eye, MessageSquare, Package, Check, X, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Lock, CheckCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { orderService, Order } from "@/services/orderService";
import { useToast } from "@/components/ui/ToastContainer";
import { OrderProductModal } from "@/components/buyer/OrderProductModal";

// Transform API data to match existing structure
const transformOrderData = (apiOrder: Order) => {
  const orderDate = new Date(apiOrder.created_at);
  const date = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD
  const time = orderDate.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  }); // HH:MM AM/PM

  // Map API status to UI status with proper capitalization
  // Consider both payment_status and order_status
  const getStatusDisplay = (apiOrder: Order) => {
    const paymentStatus = apiOrder.payment_status?.toLowerCase();
    const orderStatus = apiOrder.order_status?.toLowerCase();
    
    // If payment is paid, order should be completed
    if (paymentStatus === 'paid') {
      if (orderStatus === 'completed') {
        return 'Completed';
      } else if (orderStatus === 'paid') {
        return 'Completed'; // Payment is paid, order is paid - should be completed
      } else if (orderStatus === 'processing' || orderStatus === 'pending_payment') {
        return 'Completed'; // Payment received, order should be completed
      } else if (orderStatus === 'pending') {
        return 'Completed'; // Payment received, order should be completed
      }
    }
    
    // If payment is pending, check order status
    if (paymentStatus === 'pending') {
      if (orderStatus === 'pending_payment') {
        return 'Pending';
      } else if (orderStatus === 'cancelled') {
        return 'Cancelled';
      }
    }
    
    // Fallback to order status
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
        return 'Completed'; // If order status is paid, it should be completed
      default:
        return 'Pending';
    }
  };

  return {
    // Basic order info for table display
    id: apiOrder.order_id, // Use the order_id string for display
    numericId: apiOrder.id, // Keep numeric ID for API calls
    buyer: apiOrder.buyer.username,
    product: apiOrder.product.headline, // Keep as string for table display
    amount: `${apiOrder.total_amount} ${apiOrder.crypto_currency}`,
    usdAmount: `$${(parseFloat(apiOrder.total_amount) * 40000).toFixed(2)}`, // Approximate USD conversion
    status: getStatusDisplay(apiOrder),
    priority: "normal", // Default priority
    date: date,
    time: time,
    paymentMethod: apiOrder.crypto_currency,
    escrow: apiOrder.use_escrow || false,
    // Add raw status for debugging
    rawPaymentStatus: apiOrder.payment_status,
    rawOrderStatus: apiOrder.order_status,
    
    // Complete order object for modal - separate from table display
    id: apiOrder.order_id, // Use order_id for display
    numericId: apiOrder.id, // Add numeric ID for API calls
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
      return "bg-green-200 text-green-800 border-green-200";
    case "Processing":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Shipped":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "Pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Cancelled":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-700 text-gray-800 border-gray-700 bg-gray-900";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent":
      return "bg-red-500";
    case "high":
      return "bg-orange-500";
    case "normal":
      return "bg-gray-400";
    default:
      return "bg-gray-400";
  }
};

export default function VendorOrders() {
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
  const { showToast } = useToast();

  // Pagination state
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
      
      // Transform API data to match existing structure
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

  // Manual refresh function
  const refreshOrders = () => {
    fetchOrders();
    showToast({
      title: "Orders Refreshed",
      message: "Order status updated",
      type: "success"
    });
  };

  // Modal handlers
  const handleViewDetails = (order: any) => {
    // Transform the order data to match OrderProductModal expected structure
    const modalOrder = {
      order_id: order.order_id,
      order_status: order.order_status,
      payment_status: order.payment_status,
      total_amount: order.total_amount,
      crypto_currency: order.crypto_currency,
      created_at: order.created_at,
      buyer: order.buyer_details, // Include buyer information
      product: order.product_details, // Use the complete product details
      product_credentials: order.product_credentials
    };
    setSelectedOrder(modalOrder);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  // Status update handlers
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
      // Map UI status to backend status
      const statusMapping: { [key: string]: string } = {
        'Pending': 'pending_payment',
        'Processing': 'payment_received', 
        'Shipped': 'paid',
        'Completed': 'delivered',
        'Cancelled': 'cancelled'
      };

      const backendStatus = statusMapping[newStatus] || newStatus.toLowerCase();
      
      // Use the numeric ID for API calls
      await orderService.updateOrderStatus(orderToUpdate.numericId, {
        order_status: backendStatus
      });

      // Update local state after successful API call
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
      console.error('Status update error:', error);
      
      // Extract error message from API response
      let errorMessage = "Failed to update order status";
      
      if (error.response?.data) {
        // Handle different error response formats
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data)) {
          // Handle array of error messages
          errorMessage = error.response.data.join(', ');
        } else if (error.response.data.order_status) {
          // Handle field-specific validation errors
          errorMessage = Array.isArray(error.response.data.order_status) 
            ? error.response.data.order_status.join(', ')
            : error.response.data.order_status;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showToast({
        title: "Status Update Failed",
        message: errorMessage,
        type: "error"
      });
    } finally {
      setIsUpdatingStatus(false);
      setUpdatingStatusType(null);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.buyer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    // Date filtering logic
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

  // Pagination logic
  const totalItems = filteredOrders.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateFilter]);

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Orders & Sales</h1>
            <p className="text-gray-400">Manage your customer orders and track sales</p>
          </div>
          <Button variant="outline">
            Export Orders
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-white">{orders.length}</div>
              <p className="text-sm text-gray-400">Total Orders</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-blue-600">{orders.filter(order => order.status === "Processing").length}</div>
              <p className="text-sm text-gray-400">Processing</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-purple-600">{orders.filter(order => order.status === "Shipped").length}</div>
              <p className="text-sm text-gray-400">Shipped</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600">{orders.filter(order => order.status === "Completed").length}</div>
              <p className="text-sm text-gray-400">Completed</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-white">{orders.reduce((sum, order) => sum + parseFloat(order.amount.split(' ')[0]), 0).toFixed(8)} BTC</div>
              <p className="text-sm text-gray-400">Total Revenue</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search orders, buyers, products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
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
                <SelectTrigger className="w-full sm:w-48">
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

        {/* Orders Table */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">
              Orders ({filteredOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
                  <p className="text-gray-400 mt-4">Loading orders...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Package className="w-12 h-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No orders found</h3>
                  <p className="text-gray-400">Try adjusting your search or filter criteria.</p>
                </div>
              ) : (
                currentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(order.priority)} mb-1`}></div>
                      <span className="text-xs text-gray-400 uppercase">{order.priority}</span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-white">{order.id}</h3>
                        {order.escrow && (
                          <Badge variant="outline" className="text-xs">
                            Escrow
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {order.paymentMethod}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mb-1">{order.product}</p>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-400">by {order.buyer}</span>
                        <span className="text-sm text-gray-400">{order.date} at {order.time}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="font-semibold text-blue-600">{order.amount}</div>
                      <div className="text-sm text-gray-400">{order.usdAmount}</div>
                    </div>

                    <div className="space-y-1">
                      <Badge className={`border ${getStatusColor(order.status)}`}>
                        {order.status}
                      </Badge>
                      {order.use_escrow && (
                        <div className="flex items-center gap-1 mt-1">
                          <Badge className="bg-gradient-to-r from-yellow-500/90 to-amber-500/90 text-black text-[10px] px-1 py-0 h-4">
                            <Lock className="w-2 h-2 mr-0.5" />
                            ESCROW
                          </Badge>
                          {order.order_status === 'paid' && !order.confirmed_at && (
                            <Badge className="bg-orange-500/20 text-orange-300 text-[10px] px-1 py-0 h-4 whitespace-nowrap">
                              Awaiting
                            </Badge>
                          )}
                          {order.confirmed_at && (
                            <Badge className="bg-green-500/20 text-green-300 text-[10px] px-1 py-0 h-4">
                              <CheckCircle className="w-2 h-2 mr-0.5" />
                              Approved
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {order.status === "Processing" && (
                        <>
                          <Button size="sm" variant="outline" className="text-green-600 border-green-300">
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-300">
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(order)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Message Buyer
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(order)}>
                            <Package className="w-4 h-4 mr-2" />
                            Update Status
                          </DropdownMenuItem>
                          {order.status === "Processing" && (
                            <>
                              <DropdownMenuItem className="text-green-600">
                                <Check className="w-4 h-4 mr-2" />
                                Mark as Shipped
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
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

            {/* Pagination */}
            {filteredOrders.length > 0 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Items per page selector */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">Show:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                    setItemsPerPage(parseInt(value));
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-400">per page</span>
                </div>

                {/* Pagination info */}
                <div className="text-sm text-gray-400">
                  Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} orders
                </div>

                {/* Pagination controls */}
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToFirstPage}
                    disabled={currentPage === 1}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  {/* Page numbers */}
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
                          className={
                            currentPage === pageNum
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "border-gray-600 text-gray-300 hover:bg-gray-700"
                          }
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
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToLastPage}
                    disabled={currentPage === totalPages}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    
      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderProductModal
          order={selectedOrder}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}

      {/* Status Update Modal */}
      {isStatusModalOpen && orderToUpdate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Update Order Status</h3>
              <button
                onClick={handleCloseStatusModal}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="text-sm text-gray-400">
                <p>Order ID: <span className="text-white font-mono">{orderToUpdate.id}</span></p>
                <p>Product: <span className="text-white">{orderToUpdate.product}</span></p>
                <p>Current Status: <span className="text-white font-medium">{orderToUpdate.status}</span></p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Select New Status:</label>
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
                    className="border-red-600 text-red-400 hover:bg-red-900/20 disabled:opacity-50"
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
    </>
  );
}