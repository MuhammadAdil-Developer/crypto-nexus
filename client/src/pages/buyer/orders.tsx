import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Package, Filter, Calendar, Download, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CheckCircle, Clock, XCircle } from "lucide-react";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { OrdersTable } from "@/components/buyer/OrdersTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { orderService, Order } from "@/services/orderService";
import { useToast } from "@/hooks/use-toast";
import { PageBanner } from "@/components/PageBanner";

interface OrderStats {
  totalOrders: number;
  delivered: number;
  inProgress: number;
  cancelled: number;
}

export default function BuyerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    delivered: 0,
    inProgress: 0,
    cancelled: 0
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { toast } = useToast();
  const location = useLocation();

  useEffect(() => {
    fetchOrders();

    // Auto-refresh every 20 seconds to check for payment detections/status updates
    const interval = setInterval(() => {
      // Logic: Only poll if there's at least one active order that could change status
      // (pending_payment, pending, paid, processing)
      const hasActiveOrders = orders.some(o =>
        ['pending', 'pending_payment', 'paid', 'processing'].includes(o.order_status || '')
      );

      if (hasActiveOrders || orders.length === 0) {
        fetchOrders(true); // Silent refresh
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [orders.length]);

  // Use a ref to ensure auto-open only happens once per navigation
  const hasOpenedInitialOrder = useRef(false);

  // Show toast if navigated with state and auto-open order details
  useEffect(() => {
    const navState: any = location.state as any;
    if (!navState) return;

    if (navState?.toast) {
      toast({
        title: navState.toast.title,
        description: navState.toast.description,
        variant: navState.toast.variant,
      });
      // Clean the state so it doesn't show again on refresh
      window.history.replaceState({}, document.title);
    }

    // Auto-open order details if orderId is provided - ONLY ONCE
    if (navState?.openOrderId && orders.length > 0 && !hasOpenedInitialOrder.current) {
      const orderToOpen = orders.find(o =>
        (o.order_id && o.order_id.toString() === navState.openOrderId.toString()) ||
        (o.id && o.id.toString() === navState.openOrderId.toString())
      );

      if (orderToOpen) {
        hasOpenedInitialOrder.current = true;
        // Trigger order details modal opening
        setTimeout(() => {
          const event = new CustomEvent('openOrderDetails', {
            detail: { orderId: navState.openOrderId }
          });
          window.dispatchEvent(event);
        }, 500);

        // Clean the state
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, orders]);

  useEffect(() => {
    filterOrders();
  }, [orders, statusFilter, dateFilter]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, dateFilter]);

  // Calculate pagination
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

  const handleExport = (format: 'csv' | 'excel') => {
    try {
      // Prepare data
      const headers = ['Order ID', 'Product', 'Vendor', 'Quantity', 'Amount', 'Currency', 'Status', 'Payment Status', 'Created At'];
      const rows = filteredOrders.map(order => [
        order.order_id || 'N/A',
        order.product?.listing_title || order.product?.headline || 'N/A',
        order.vendor?.username || 'N/A',
        order.quantity || 0,
        order.total_amount || '0',
        order.crypto_currency || 'BTC',
        order.order_status || 'N/A',
        order.payment_status || 'N/A',
        new Date(order.created_at).toLocaleString()
      ]);

      if (format === 'csv') {
        // Create CSV
        const csvContent = [
          headers.join(','),
          ...rows.map(row => row.map(cell => {
            const stringCell = String(cell);
            if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n')) {
              return `"${stringCell.replace(/"/g, '""')}"`;
            }
            return stringCell;
          }).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const filename = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        toast({
          title: "Export Successful",
          description: "Orders exported as CSV",
        });
      } else if (format === 'excel') {
        // For Excel, we'll create a CSV with .csv extension (since .xlsx requires binary format)
        // This opens correctly in Excel without errors
        const csvContent = [
          headers.join(','),
          ...rows.map(row => row.map(cell => {
            const stringCell = String(cell);
            if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n')) {
              return `"${stringCell.replace(/"/g, '""')}"`;
            }
            return stringCell;
          }).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const filename = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        toast({
          title: "Export Successful",
          description: "Orders exported as CSV (Excel compatible)",
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export orders",
        variant: "destructive",
      });
    }
  };

  const fetchOrders = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      // Use getBuyerOrders to fetch all orders
      const ordersArray = await orderService.getBuyerOrders();
      setOrders(ordersArray);

      // Calculate stats
      const statsData = {
        totalOrders: ordersArray.length,
        delivered: ordersArray.filter((order: Order) => order.order_status === 'completed').length,
        inProgress: ordersArray.filter((order: Order) => order.order_status === 'processing' || order.order_status === 'pending').length,
        cancelled: ordersArray.filter((order: Order) => order.order_status === 'cancelled').length
      };
      setStats(statsData);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to fetch orders",
          variant: "destructive",
        });
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => {
        switch (statusFilter) {
          case "delivered":
            return order.order_status === 'completed';
          case "processing":
            return order.order_status === 'processing' || order.order_status === 'pending';
          case "cancelled":
            return order.order_status === 'cancelled';
          default:
            return true;
        }
      });
    }

    // Apply date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case "Last 7 days":
          filterDate.setDate(now.getDate() - 7);
          break;
        case "Last 30 days":
          filterDate.setDate(now.getDate() - 30);
          break;
        case "Last 3 months":
          filterDate.setMonth(now.getMonth() - 3);
          break;
      }

      filtered = filtered.filter(order => new Date(order.created_at) >= filterDate);
    }

    setFilteredOrders(filtered);
  };

  const orderStats = [
    { label: "Total Orders", value: stats.totalOrders.toString(), color: "from-blue-600 to-indigo-700", icon: <Package className="w-6 h-6" /> },
    { label: "Delivered", value: stats.delivered.toString(), color: "from-emerald-500 to-teal-600", icon: <CheckCircle className="w-6 h-6" /> },
    { label: "In Progress", value: stats.inProgress.toString(), color: "from-amber-500 to-orange-600", icon: <Clock className="w-6 h-6" /> },
    { label: "Cancelled", value: stats.cancelled.toString(), color: "from-rose-500 to-red-600", icon: <XCircle className="w-6 h-6" /> }
  ];

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) {
      return `${seconds}s ago`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ago`;
    } else if (seconds < 86400) {
      return `${Math.floor(seconds / 3600)}h ago`;
    } else {
      return `${Math.floor(seconds / 86400)}d ago`;
    }
  };

  return (
    <BuyerLayout>
      <div className="space-y-6">
        {/* Header Banner */}
        <PageBanner
          title="Orders"
          subtitle="Track and manage your purchases"
          type="buyer"
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {orderStats.map((stat, index) => (
            <div
              key={stat.label}
              className="group bg-gray-900/40 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-700/50 hover:border-gray-600 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 overflow-hidden relative"
            >
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-xl sm:text-3xl font-black text-white">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <div className="text-white">
                    {stat.icon}
                  </div>
                </div>
              </div>
              <div className={`absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-[0.03] group-hover:opacity-[0.08] rounded-full transition-opacity duration-300`} />
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <h3 className="font-semibold text-white">Filter Orders</h3>

            <div className="flex flex-wrap gap-3">
              {/* Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <Filter className="w-4 h-4 mr-2" />
                    Status: {statusFilter === "all" ? "All" : statusFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                    All Orders
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("delivered")}>
                    Delivered
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("processing")}>
                    Processing
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("cancelled")}>
                    Cancelled
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Date Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <Calendar className="w-4 h-4 mr-2" />
                    {dateFilter === "all" ? "All Time" : dateFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setDateFilter("all")}>
                    All Time
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDateFilter("Last 7 days")}>
                    Last 7 days
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDateFilter("Last 30 days")}>
                    Last 30 days
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDateFilter("Last 3 months")}>
                    Last 3 months
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Export */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('excel')}>
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        {isLoading ? (
          <div className="bg-gray-900 rounded-xl p-12 border border-gray-700 text-center">
            <Loader2 className="w-12 h-12 text-theme-cyan animate-spin mx-auto" />
            <p className="text-gray-400 mt-4">Loading your orders...</p>
          </div>
        ) : (
          <>
            <OrdersTable orders={currentOrders} onOrderUpdate={fetchOrders} />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Items per page selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Items per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                {/* Pagination info */}
                <div className="text-sm text-gray-400">
                  Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} orders
                </div>

                {/* Pagination controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToFirstPage}
                    disabled={currentPage === 1}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
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
                              ? "bg-theme-red text-white"
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
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToLastPage}
                    disabled={currentPage === totalPages}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Order Summary */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
          <h3 className="font-semibold text-white mb-4">Recent Activity</h3>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-theme-cyan animate-spin mx-auto" />
              <p className="text-gray-400 mt-2">Loading recent activity...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No orders found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.slice(0, 3).map((order) => {
                const orderDate = new Date(order.created_at);
                const timeAgo = getTimeAgo(orderDate);

                return (
                  <div key={order.order_id} className="flex items-center space-x-4 p-4 bg-gray-800 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${['completed', 'delivered', 'confirmed'].includes(order.order_status) ? 'bg-green-500' :
                      order.order_status === 'processing' || order.order_status === 'paid' ? 'bg-theme-cyan' :
                        order.order_status === 'pending' || order.order_status === 'pending_payment' ? 'bg-yellow-500' :
                          'bg-gray-500'
                      }`}></div>
                    <div className="flex-1">
                      <p className="font-medium text-white">
                        {['completed', 'delivered', 'confirmed'].includes(order.order_status) ? 'Order completed' :
                          order.order_status === 'processing' || order.order_status === 'paid' ? 'Payment received' :
                            order.order_status === 'pending' || order.order_status === 'pending_payment' ? 'Payment pending' :
                              'Order updated'}
                      </p>
                      <p className="text-sm text-gray-400">{order.product.headline} • {timeAgo}</p>
                    </div>
                    <Badge className={
                      ['completed', 'delivered', 'confirmed'].includes(order.order_status) ? 'bg-green-900/20 text-green-400 border-green-500/30' :
                        order.order_status === 'processing' || order.order_status === 'paid' ? 'bg-theme-cyan-dim text-theme-cyan border border-theme-cyan/30' :
                          order.order_status === 'pending' || order.order_status === 'pending_payment' ? 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30' :
                            'bg-gray-800 text-gray-400'
                    }>
                      {['completed', 'delivered', 'confirmed'].includes(order.order_status) ? 'Completed' :
                        order.order_status === 'paid' ? 'Paid' :
                          order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1).replace('_', ' ')}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </BuyerLayout>
  );
}
