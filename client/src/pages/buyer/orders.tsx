import { useState, useEffect } from "react";
import { Package, Filter, Calendar, Download, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
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

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, statusFilter, dateFilter]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, dateFilter]);

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

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const ordersData = await orderService.getOrders();
      const ordersArray = ordersData.results || ordersData || [];
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
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
    { label: "Total Orders", value: stats.totalOrders.toString(), color: "from-blue-500 to-purple-600" },
    { label: "Delivered", value: stats.delivered.toString(), color: "from-green-500 to-emerald-600" },
    { label: "In Progress", value: stats.inProgress.toString(), color: "from-yellow-500 to-orange-600" },
    { label: "Cancelled", value: stats.cancelled.toString(), color: "from-red-500 to-pink-600" }
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
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 text-white border border-gray-700">
          <div className="flex items-center space-x-3">
            <Package className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Your Orders</h1>
              <p className="text-gray-300">Track and manage your purchases</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {orderStats.map((stat, index) => (
            <div 
              key={stat.label}
              className="bg-gray-900 rounded-xl p-6 border border-gray-700 hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <Package className="w-6 h-6 text-white" />
                </div>
              </div>
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
                  <Button variant="outline" size="sm">
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
                  <Button variant="outline" size="sm">
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
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        {isLoading ? (
          <div className="bg-gray-900 rounded-xl p-12 border border-gray-700 text-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
            <p className="text-gray-400 mt-4">Loading your orders...</p>
          </div>
        ) : (
          <>
            <OrdersTable orders={currentOrders} />
            
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
                              ? "bg-blue-600 text-white"
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
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
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
                    <div className={`w-2 h-2 rounded-full ${
                      order.order_status === 'completed' ? 'bg-green-500' :
                      order.order_status === 'processing' ? 'bg-blue-500' :
                      order.order_status === 'pending' ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`}></div>
              <div className="flex-1">
                      <p className="font-medium text-white">
                        {order.order_status === 'completed' ? 'Order delivered' :
                         order.order_status === 'processing' ? 'Order confirmed' :
                         order.order_status === 'pending' ? 'Payment verified' :
                         'Order updated'}
                      </p>
                      <p className="text-sm text-gray-400">{order.product.headline} • {timeAgo}</p>
                    </div>
                    <Badge className={
                      order.order_status === 'completed' ? 'bg-green-100 text-green-800' :
                      order.order_status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      order.order_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1)}
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