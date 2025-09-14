import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { Search, Filter, Eye, RefreshCw, DollarSign, Package, AlertTriangle, User, Calendar, CreditCard, Shield, Truck, Lock, CheckCircle } from "lucide-react";
import { SAMPLE_ORDERS } from "@/lib/constants";
import { orderService, Order } from "@/services/orderService";
import { useToast } from "@/hooks/use-toast";

export default function AdminOrders() {
  const { toast } = useToast();
  const [viewOrderModalOpen, setViewOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  
  // Pagination state - Changed default to 10
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Load orders and dashboard data
  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersData, dashboardData] = await Promise.all([
        orderService.getOrders(),
        orderService.getAdminDashboard()
      ]);
      
      console.log('Orders data:', ordersData);
      console.log('Dashboard data:', dashboardData);
      
      // Handle paginated response from getOrders()
      const ordersArray = ordersData.results || ordersData || [];
      setOrders(ordersArray);
      setDashboardData(dashboardData);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: "Error loading orders",
        description: error.message || "Failed to load orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadData();
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, currencyFilter, itemsPerPage]);
  
  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setViewOrderModalOpen(true);
  };
  
  const handleReleaseEscrow = async (orderId: string) => {
    try {
      await orderService.confirmOrder(orderId);
      toast({
        title: "Escrow Released",
        description: "Payment has been released to vendor",
      });
      loadData(); // Refresh data
    } catch (error: any) {
      toast({
        title: "Error releasing escrow",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  
  const handleResolveDispute = async (orderId: string, resolution: 'buyer_wins' | 'vendor_wins' | 'partial_refund') => {
    try {
      await orderService.resolveDispute(orderId, {
        resolution,
        notes: "Dispute resolved by admin"
      });
      toast({
        title: "Dispute Resolved",
        description: "Dispute has been resolved successfully",
      });
      loadData(); // Refresh data
    } catch (error: any) {
      toast({
        title: "Error resolving dispute",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  
  const handleRefundOrder = async (orderId: string) => {
    try {
      await orderService.updateOrderStatus(orderId, 'refunded');
      toast({
        title: "Order Refunded",
        description: "Order has been refunded successfully",
      });
      loadData(); // Refresh data
    } catch (error: any) {
      toast({
        title: "Error refunding order",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Safe string conversion helper
  const safeString = (value: any): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (value && typeof value === 'object') {
      // If it's an object, try to get a meaningful string representation
      if (value.username) return value.username;
      if (value.email) return value.email;
      if (value.first_name) return value.first_name;
      if (value.headline) return value.headline;
      if (value.listing_title) return value.listing_title;
      if (value.name) return value.name;
      // Handle empty objects
      if (Object.keys(value).length === 0) return 'N/A';
      return 'Unknown';
    }
    return 'Unknown';
  };

  // Safe credentials display
  const getCredentialsDisplay = (credentials: any): string => {
    if (!credentials || typeof credentials !== 'object') return 'N/A';
    if (Object.keys(credentials).length === 0) return 'No credentials provided';
    
    // If it's an object with data, try to stringify it safely
    try {
      return JSON.stringify(credentials);
    } catch {
      return 'Credentials available';
    }
  };

  // Filter orders based on search and filters
  const getFilteredOrders = () => {
    return (orders || []).filter(order => {
      const matchesSearch = searchTerm === '' || 
        (order.order_id && order.order_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.buyer?.username && order.buyer.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.vendor?.username && order.vendor.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.product?.headline && order.product.headline.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || order.order_status === statusFilter;
      const matchesCurrency = currencyFilter === 'all' || order.crypto_currency === currencyFilter.toUpperCase();
      
      return matchesSearch && matchesStatus && matchesCurrency;
    });
  };

  // Get paginated orders
  const getPaginatedOrders = () => {
    const filteredOrders = getFilteredOrders();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredOrders.slice(startIndex, endIndex);
  };

  const filteredOrders = getFilteredOrders();
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  return (
    <main className="flex-1 overflow-y-auto bg-bg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Order Management</h1>
            <p className="text-gray-300 mt-1">Monitor and manage all marketplace orders</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" className="border-border text-gray-300 hover:bg-surface-2">
              Export Orders
            </Button>
            <Button className="bg-accent text-bg hover:bg-accent-2" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="crypto-card">
            <CardContent className="p-4">
              <div className="flex items-center">
                <Package className="w-6 h-6 text-accent mr-3 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-400 truncate">Total Orders</p>
                  <p className="text-lg font-bold text-white truncate">{dashboardData?.statistics?.total_orders || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-success/20 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                  <Package className="w-4 h-4 text-success" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-400 truncate">Completed Today</p>
                  <p className="text-lg font-bold text-white truncate">{dashboardData?.statistics?.paid_orders || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-4">
              <div className="flex items-center">
                <DollarSign className="w-6 h-6 text-warning mr-3 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-400 truncate">In Escrow</p>
                  <p className="text-lg font-bold text-white truncate">{dashboardData?.statistics?.pending_payments || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-6 h-6 text-danger mr-3 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-400 truncate">Disputed</p>
                  <p className="text-lg font-bold text-white truncate">{dashboardData?.statistics?.disputed_orders || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="crypto-card mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input 
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-surface-2 border-border text-white placeholder:text-gray-400"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                  <SelectContent className="bg-surface-2 border-border">
                    <SelectItem value="all" className="text-white">All Status</SelectItem>
                    <SelectItem value="pending_payment" className="text-white">Pending Payment</SelectItem>
                    <SelectItem value="paid" className="text-white">Paid</SelectItem>
                    <SelectItem value="confirmed" className="text-white">Confirmed</SelectItem>
                    <SelectItem value="delivered" className="text-white">Delivered</SelectItem>
                    <SelectItem value="disputed" className="text-white">Disputed</SelectItem>
                    <SelectItem value="cancelled" className="text-white">Cancelled</SelectItem>
                    <SelectItem value="refunded" className="text-white">Refunded</SelectItem>
                </SelectContent>
              </Select>
                <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                  <SelectTrigger className="w-32 bg-surface-2 border-border text-white">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                  <SelectContent className="bg-surface-2 border-border">
                    <SelectItem value="all" className="text-white">All</SelectItem>
                    <SelectItem value="btc" className="text-white">BTC</SelectItem>
                    <SelectItem value="xmr" className="text-white">XMR</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="border-border hover:bg-surface-2">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card className="crypto-card">
          <CardHeader>
            <CardTitle className="text-white">Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
                <p className="text-gray-400 mt-2">Loading orders...</p>
              </div>
            ) : (
            <div className="overflow-x-auto">
                <table className="w-full min-w-full">
                <thead className="bg-surface-2">
                  <tr>
                      <th className="text-left p-3 text-xs font-medium text-gray-300">Order ID</th>
                      <th className="text-left p-3 text-xs font-medium text-gray-300">Buyer</th>
                      <th className="text-left p-3 text-xs font-medium text-gray-300">Vendor</th>
                      <th className="text-left p-3 text-xs font-medium text-gray-300">Product</th>
                      <th className="text-left p-3 text-xs font-medium text-gray-300 min-w-[120px]">Amount</th>
                      <th className="text-left p-3 text-xs font-medium text-gray-300 min-w-[100px]">Status</th>
                      <th className="text-left p-3 text-xs font-medium text-gray-300 min-w-[100px]">Payment</th>
                      <th className="text-left p-3 text-xs font-medium text-gray-300">Created</th>
                      <th className="text-left p-3 text-xs font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {getPaginatedOrders().map((order) => (
                    <tr key={order.id} className="hover:bg-surface-2/50" data-testid={`order-row-${order.id}`}>
                      <td className="p-4">
                        <span className="font-mono text-accent">{order.order_id || 'N/A'}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center mr-3">
                            <span className="text-accent text-sm">
                              {safeString(order.buyer).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-white">{safeString(order.buyer)}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-300">{safeString(order.vendor)}</td>
                      <td className="p-4">
                        <div className="max-w-xs">
                          <p className="text-white truncate">{safeString(order.product)}</p>
                        </div>
                      </td>
                      {/* Updated Amount column with single line and proper spacing */}
                      <td className="p-4 pl-6">
                        <div className="font-mono text-white text-sm whitespace-nowrap">
                          {order.total_amount || '0'} {order.crypto_currency || 'BTC'}
                        </div>
                      </td>
                      {/* Updated Status column with background colors and single line text */}
                    <td className="p-4 pl-6">
                        <div className="space-y-1">
                          <Badge 
                            className={`text-xs whitespace-nowrap ${
                              order.payment_status === "paid" 
                                ? "border-green-500 text-green-400 bg-green-500/10 hover:bg-green-500/20" 
                                : order.payment_status === "pending" 
                                ? "border-yellow-500 text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20" 
                                : "border-red-500 text-red-400 bg-red-500/10 hover:bg-red-500/20"
                            }`}
                          >
                            {order.order_status === "pending_payment" ? "Order Pending" : 
                             order.order_status === "paid" ? "Order Paid" : 
                             order.order_status === "confirmed" ? "Order Confirmed" : 
                             order.order_status === "delivered" ? "Order Delivered" : 
                             order.order_status === "disputed" ? "Order Disputed" : 
                             order.order_status === "processing" ? "Order Processing" : 
                             order.order_status === "cancelled" ? "Order Cancelled" : 
                             order.order_status === "payment_received" ? "Order Payment Received" : 
                             order.order_status === "refunded" ? "Order Refunded" : 
                             order.order_status || 'Unknown'}
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
                      </td>
                      {/* Updated Payment column with consistent styling */}
                      <td className="p-4 pl-6">
                        <Badge 
                          className={`text-xs whitespace-nowrap ${
                            order.payment_status === "paid" 
                              ? "border-green-500 text-green-400 bg-green-500/10 hover:bg-green-500/20" 
                              : order.payment_status === "pending" 
                              ? "border-yellow-500 text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20" 
                              : "border-red-500 text-red-400 bg-red-500/10 hover:bg-red-500/20"
                          }`}
                        >
                          {order.payment_status_display || order.payment_status || 'Unknown'}
                        </Badge>
                      </td>

                      <td className="p-4 text-gray-300">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-gray-400 hover:text-white" 
                            onClick={() => handleViewOrder(order)}
                            data-testid={`view-order-${order.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {order.order_status === 'escrow' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-green-400 hover:text-green-300" 
                              onClick={() => handleReleaseEscrow(order.id)}
                              data-testid={`release-escrow-${order.id}`}>
                              <Shield className="w-4 h-4" />
                            </Button>
                          )}
                          {order.order_status === 'disputed' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-400 hover:text-red-300" 
                                onClick={() => handleResolveDispute(order.id, 'buyer_wins')}
                                data-testid={`resolve-dispute-buyer-${order.id}`}>
                                <User className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-400 hover:text-red-300" 
                                onClick={() => handleResolveDispute(order.id, 'vendor_wins')}
                                data-testid={`resolve-dispute-vendor-${order.id}`}>
                                <User className="w-4 h-4" />
                              </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                                className="text-red-400 hover:text-red-300" 
                                onClick={() => handleResolveDispute(order.id, 'partial_refund')}
                                data-testid={`resolve-dispute-partial-${order.id}`}>
                                <DollarSign className="w-4 h-4" />
                            </Button>
                            </>
                          )}
                          {order.order_status === 'pending_payment' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-blue-400 hover:text-blue-300" 
                              onClick={() => handleRefundOrder(order.id)}
                              data-testid={`refund-order-${order.id}`}>
                              <CreditCard className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredOrders.length}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
          )}
          </CardContent>
        </Card>
        
      {/* Order Details Modal - VERTICAL LAYOUT FOR DESCRIPTION & PAYMENT ADDRESS */}
        <Dialog open={viewOrderModalOpen} onOpenChange={setViewOrderModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] bg-card text-white border border-gray-600/30 shadow-2xl overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-gray-600/20 bg-card">
            <DialogTitle className="text-xl font-bold text-white">Order Details</DialogTitle>
            </DialogHeader>
          
            {selectedOrder && (
            <div className="overflow-y-auto max-h-[calc(85vh-120px)]">
              <div className="p-6 space-y-6">
                {/* Order Header - Clean 3 Column Layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                    <Label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Order ID</Label>
                    <p className="text-lg font-mono text-accent font-semibold mt-1">{selectedOrder.order_id || 'N/A'}</p>
                      </div>
                  <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                    <Label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Status</Label>
                    <div className="mt-1">
                      <Badge 
                        className={`text-xs font-medium px-2 py-1 ${
                          selectedOrder.payment_status === "paid" 
                            ? "bg-green-500/20 text-green-400 border-green-500/30" 
                            : selectedOrder.payment_status === "pending" 
                            ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" 
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        }`}
                      >
                        {selectedOrder.order_status || 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                  <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                    <Label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Created</Label>
                    <p className="text-white font-medium mt-1 text-sm">{selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>
                
                {/* Buyer & Vendor Info - Clean Side by Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                    <div className="flex items-center space-x-2 mb-3">
                      <User className="w-4 h-4 text-accent" />
                      <h3 className="text-sm font-semibold text-white">Buyer Information</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-1">
                        <span className="text-gray-400 text-xs font-medium">Username</span>
                        <span className="text-white font-medium text-sm">{safeString(selectedOrder.buyer)}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-gray-400 text-xs font-medium">Email</span>
                        <span className="text-white font-medium text-sm">{selectedOrder.buyer?.email || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                    <div className="flex items-center space-x-2 mb-3">
                      <User className="w-4 h-4 text-accent" />
                      <h3 className="text-sm font-semibold text-white">Vendor Information</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-1">
                        <span className="text-gray-400 text-xs font-medium">Username</span>
                        <span className="text-white font-medium text-sm">{safeString(selectedOrder.vendor)}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-gray-400 text-xs font-medium">Email</span>
                        <span className="text-white font-medium text-sm">{selectedOrder.vendor?.email || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Product Information - VERTICAL LAYOUT FOR DESCRIPTION */}
                <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                  <div className="flex items-center space-x-2 mb-3">
                    <Package className="w-4 h-4 text-accent" />
                    <h3 className="text-sm font-semibold text-white">Product Information</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between py-1">
                        <span className="text-gray-400 text-xs font-medium">Product Name</span>
                        <span className="text-white font-medium text-sm text-right">{safeString(selectedOrder.product)}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-gray-400 text-xs font-medium">Account Type</span>
                        <span className="text-white font-medium text-sm">{selectedOrder.product?.account_type || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-gray-400 text-xs font-medium">Access Type</span>
                        <span className="text-white font-medium text-sm">{selectedOrder.product?.access_type || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-gray-400 text-xs font-medium">Website</span>
                        <span className="text-white font-medium text-sm">{selectedOrder.product?.website || 'N/A'}</span>
                </div>
                    </div>
                    {/* VERTICAL LAYOUT: Description label above, value below */}
                    <div className="pt-2 border-t border-gray-600/20">
                      <div className="space-y-1">
                        <span className="text-gray-400 text-xs font-medium">Description</span>
                        <p className="text-white font-medium text-sm leading-relaxed">{selectedOrder.product?.description || 'N/A'}</p>
                  </div>
                    </div>
                    </div>
                  </div>
                  
                {/* Payment Information - VERTICAL LAYOUT FOR PAYMENT ADDRESS */}
                <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                  <div className="flex items-center space-x-2 mb-3">
                    <DollarSign className="w-4 h-4 text-accent" />
                    <h3 className="text-sm font-semibold text-white">Payment Information</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="flex items-center justify-between py-1">
                        <span className="text-gray-400 text-xs font-medium">Total Amount</span>
                        <span className="text-white font-mono font-semibold text-sm">{selectedOrder.total_amount || '0'} {selectedOrder.crypto_currency || 'BTC'}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-gray-400 text-xs font-medium">Unit Price</span>
                        <span className="text-white font-mono font-semibold text-sm">{selectedOrder.unit_price || '0'} {selectedOrder.crypto_currency || 'BTC'}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-gray-400 text-xs font-medium">Quantity</span>
                        <span className="text-white font-semibold text-sm">{selectedOrder.quantity || '0'}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-gray-400 text-xs font-medium">Payment Status</span>
                        <Badge 
                          className={`text-xs font-medium px-2 py-1 ${
                            selectedOrder.payment_status === "paid" 
                              ? "bg-green-500/20 text-green-400 border-green-500/30" 
                              : selectedOrder.payment_status === "pending" 
                              ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" 
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                          }`}
                        >
                          {selectedOrder.payment_status_display || selectedOrder.payment_status || 'Unknown'}
                        </Badge>
                      </div>
                    </div>
                    {/* VERTICAL LAYOUT: Payment Address label above, value below */}
                    {selectedOrder.payment_address && (
                      <div className="pt-2 border-t border-gray-600/20">
                        <div className="space-y-1">
                          <span className="text-gray-400 text-xs font-medium">Payment Address</span>
                          <p className="text-white font-mono text-xs break-all">{selectedOrder.payment_address}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Escrow Information - Only if enabled */}
                {selectedOrder.use_escrow && (
                  <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                    <div className="flex items-center space-x-2 mb-3">
                      <Shield className="w-4 h-4 text-accent" />
                      <h3 className="text-sm font-semibold text-white">Escrow Information</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="flex items-center justify-between py-1">
                          <span className="text-gray-400 text-xs font-medium">Escrow Enabled</span>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-2 py-1 text-xs">Yes</Badge>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="text-gray-400 text-xs font-medium">Escrow Fee</span>
                          <span className="text-white font-mono font-semibold text-sm">{selectedOrder.escrow_fee || '0'} {selectedOrder.crypto_currency || 'BTC'}</span>
                        </div>
                      </div>
                      {selectedOrder.payment_expires_at && (
                        <div className="pt-2 border-t border-gray-600/20">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-xs font-medium">Payment Expires</span>
                            <span className="text-white font-semibold text-sm">{new Date(selectedOrder.payment_expires_at).toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Dispute Information - Only if disputed */}
                {selectedOrder.dispute_opened && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <h3 className="text-sm font-semibold text-white">Dispute Information</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-1">
                        <span className="text-gray-400 text-xs font-medium">Dispute Status</span>
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 px-2 py-1 text-xs">Open</Badge>
                      </div>
                      {selectedOrder.dispute_reason && (
                        <div className="pt-2 border-t border-red-500/20">
                          <div className="flex items-start justify-between">
                            <span className="text-gray-400 text-xs font-medium">Reason</span>
                            <span className="text-white font-medium text-sm text-right max-w-xs">{selectedOrder.dispute_reason}</span>
                          </div>
                        </div>
                      )}
                      {selectedOrder.dispute_opened_at && (
                        <div className="pt-2 border-t border-red-500/20">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-xs font-medium">Opened At</span>
                            <span className="text-white font-semibold text-sm">{new Date(selectedOrder.dispute_opened_at).toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Product Credentials - Only if not empty */}
                {selectedOrder.product_credentials && Object.keys(selectedOrder.product_credentials).length > 0 && (
                  <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                    <div className="flex items-center space-x-2 mb-3">
                      <Package className="w-4 h-4 text-accent" />
                      <h3 className="text-sm font-semibold text-white">Product Credentials</h3>
                    </div>
                    <div className="flex items-start justify-between">
                      <span className="text-gray-400 text-xs font-medium">Credentials</span>
                      <span className="text-white font-mono text-xs break-all text-right max-w-xs">{getCredentialsDisplay(selectedOrder.product_credentials)}</span>
                    </div>
                  </div>
                )}
                  </div>
                </div>
          )}
                
          {/* Clean Footer with Action Buttons */}
          <div className="px-6 py-4 border-t border-gray-600/20 bg-card">
            <div className="flex justify-end space-x-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setViewOrderModalOpen(false)}
                className="border-gray-600/30 text-gray-300 hover:bg-gray-700/50 px-4 py-2"
                  >
                    Close
                  </Button>
              {selectedOrder?.order_status === 'escrow' && (
                    <Button 
                  onClick={() => handleReleaseEscrow(selectedOrder.id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Release Escrow
                    </Button>
                  )}
              {selectedOrder?.order_status === 'disputed' && (
                <div className="flex space-x-2">
                  <Button 
                    onClick={() => handleResolveDispute(selectedOrder.id, 'buyer_wins')}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 text-sm"
                  >
                    <User className="w-4 h-4 mr-1" />
                    Buyer Wins
                  </Button>
                  <Button 
                    onClick={() => handleResolveDispute(selectedOrder.id, 'vendor_wins')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm"
                  >
                    <User className="w-4 h-4 mr-1" />
                    Vendor Wins
                  </Button>
                  <Button 
                    onClick={() => handleResolveDispute(selectedOrder.id, 'partial_refund')}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 text-sm"
                  >
                    <DollarSign className="w-4 h-4 mr-1" />
                    Partial Refund
                  </Button>
                </div>
              )}
              {selectedOrder?.order_status === 'pending_payment' && (
                    <Button 
                  onClick={() => handleRefundOrder(selectedOrder.id)}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Refund Order
                    </Button>
                  )}
                </div>
              </div>
          </DialogContent>
        </Dialog>
      </main>
  );
}
